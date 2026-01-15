
import { CATEGORIES_DATA } from '../categories';
import { GamePlayer, Player, InfinityVault, TrollScenario, CategoryData, MatchLog } from '../types';
import { assignPartyRoles, calculatePartyIntensity } from './partyLogic'; // BACCHUS Integration

interface GameConfig {
    players: Player[];
    impostorCount: number;
    useHintMode: boolean;
    useTrollMode: boolean;
    useArchitectMode: boolean; // New config param
    selectedCats: string[];
    history: { 
        roundCounter: number;
        lastWords: string[]; 
        lastCategories: string[]; // LEXICON Omniscient Filter
        globalWordUsage: Record<string, number>; // LEXICON Vital Penalty
        playerStats: Record<string, InfinityVault>;
        lastTrollRound: number;
        lastArchitectRound: number;
        lastStartingPlayers: string[];
        
        // v6.1
        pastImpostorIds?: string[];
        paranoiaLevel?: number;
        coolingDownRounds?: number;
        lastBreakProtocol?: string | null;
        matchLogs?: MatchLog[];
        
        // v6.3 LETEO
        lastLeteoRound?: number;
    };
    debugOverrides?: {
        forceTroll: TrollScenario | null;
        forceArchitect: boolean;
    }
    // v4.0 BACCHUS Config
    isPartyMode?: boolean;
}

// --- HELPER: Fisher-Yates Shuffle ---
const shuffleArray = <T>(array: T[]): T[] => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
};

// --- INFINITUM HELPERS ---

const createNewVault = (uid: string): InfinityVault => ({
    uid,
    metrics: {
        totalSessions: 0,
        impostorRatio: 0,
        civilStreak: 0,
        totalImpostorWins: 0,
        quarantineRounds: 0 // v6.1
    },
    categoryDNA: {},
    sequenceAnalytics: {
        lastImpostorPartners: [],
        roleSequence: [],
        averageWaitTime: 0
    }
});

const getVault = (uid: string, stats: Record<string, InfinityVault>): InfinityVault => {
    return stats[uid] || createNewVault(uid);
};

// --- PROTOCOLO LETEO: Regularidad Aritmética ---
const detectLinearPattern = (pastImpostorIds: string[], currentPlayers: Player[]): boolean => {
    if (pastImpostorIds.length < 4) return false;
    
    const idToIndex = new Map(currentPlayers.map((p, i) => [p.id, i]));
    const indices: number[] = [];
    
    // Get latest 4 impostors
    for (let i = 0; i < 4; i++) {
        const idx = idToIndex.get(pastImpostorIds[i]);
        if (idx === undefined) return false; // Player missing, pattern broken
        indices.push(idx);
    }
    
    // Calculate jumps between rounds. Note: pastImpostorIds is [Recent, ..., Old]
    // Jump 1: From Imp[1] to Imp[0]
    // Jump 2: From Imp[2] to Imp[1]
    // Jump 3: From Imp[3] to Imp[2]
    
    const N = currentPlayers.length;
    const jumps: number[] = [];
    
    for (let i = 0; i < 3; i++) {
        // Calculate forward jump in modular arithmetic
        let jump = (indices[i] - indices[i+1]) % N;
        if (jump < 0) jump += N;
        jumps.push(jump);
    }
    
    // Check if jumps are constant
    return jumps[0] === jumps[1] && jumps[1] === jumps[2];
};

// --- FACTOR PARANOIA: PATTERN DETECTION (v2.0) ---
const calculateParanoiaScore = (
    pastImpostorIds: string[], 
    currentPlayers: Player[],
    currentRound: number
): number => {
    if (pastImpostorIds.length < 4) return 0; // Need data

    // Map IDs to current indices to detect linear patterns
    const idToIndex = new Map(currentPlayers.map((p, i) => [p.id, i]));
    const lastN = pastImpostorIds.slice(0, 5); // Look at last 5
    const indices = lastN.map(id => idToIndex.get(id)).filter(i => i !== undefined) as number[];

    if (indices.length < 3) return 0;

    let score = 0;

    // A. Detección de Secuencia Lineal (i_n = i_{n-1} + 1)
    let sequentialHits = 0;
    for (let i = 0; i < indices.length - 1; i++) {
        const diff = (indices[i] - indices[i+1]); // Checking reverse chronological
        if (Math.abs(diff) === 1 || Math.abs(diff) === currentPlayers.length - 1) {
            sequentialHits++;
        }
    }
    if (sequentialHits >= 2) score += 50; // High Alert
    if (sequentialHits >= 3) score += 50; // Critical

    // B. Detección de Sub-clanes (Repetición de parejas/personas)
    const frequency: Record<string, number> = {};
    lastN.forEach(id => { frequency[id] = (frequency[id] || 0) + 1; });
    const maxFreq = Math.max(...Object.values(frequency));
    
    if (maxFreq >= 3) score += 60; // Same person 3 times in 5 games? Sus.
    else if (maxFreq >= 2) score += 20;

    // C. Entropía de Sesión (Aburrimiento)
    // If round number is high and no anomaly detected, slowly creep paranoia up
    if (currentRound > 8) score += (currentRound % 5) * 5;

    return Math.min(100, score);
};

// 4. La Ecuación Maestra de INFINITUM (v6.3 - LETEO COMPATIBLE)
export const calculateInfinitumWeight = (
    player: Player, 
    vault: InfinityVault, 
    category: string, 
    currentRound: number,
    coolingDownFactor: number = 1.0, 
    averageWeightEstimate: number = 100,
    entropyLevel: number = 0 // LETEO Variable (0 to 1)
): number => {
    
    // Z. Quarantine Check
    if (vault.metrics.quarantineRounds > 0) {
        return 0.01; 
    }

    // A. Motor de Frecuencia y Karma (V_fk)
    const base = 100;
    const ratio = Math.max(vault.metrics.impostorRatio, 0.01); 
    const effectiveStreak = vault.metrics.civilStreak * coolingDownFactor; 
    const v_fk = base * Math.log(effectiveStreak + 2) * (1 / ratio);

    // B. Motor de Recencia y Secuencia (V_rs)
    let v_rs = 1.0;
    const history = vault.sequenceAnalytics.roleSequence; 
    
    if (history[0]) v_rs *= 0.05;      
    else if (history[1]) v_rs *= 0.30; 
    else if (history[2]) v_rs *= 0.60; 
    else if (history[3]) v_rs *= 1.0;  

    // C. Motor de Afinidad de Categoría (V_ac)
    let v_ac = 1.0;
    const catDNA = vault.categoryDNA[category];
    if (catDNA && catDNA.timesAsImpostor > 0) {
        v_ac *= 0.8; 
    }

    // D. Cálculo Ponderado Estándar
    const calculatedWeight = (v_fk * v_rs * v_ac);

    // E. Ruido Cuántico
    const noise = Math.random() * (averageWeightEstimate * 0.3);

    // --- ECUACIÓN LETEO (v6.3) ---
    // Peso_Final = (Calculated) * (1 - Entropía) + (100 * Entropía)
    // Si Entropía es 1 (Grade III), el peso es 100 para todos (Azar Puro).
    const finalWeight = (calculatedWeight * (1 - entropyLevel)) + (100 * entropyLevel);

    return finalWeight + noise;
};

// Helper for Debug Console
export const getDebugPlayerStats = (
    players: Player[], 
    stats: Record<string, InfinityVault>, 
    round: number
): { name: string, weight: number, prob: number, streak: number }[] => {
    const weights: number[] = [];
    const dummyCat = "General"; 
    
    // First pass
    const playerWeights = players.map(p => {
        const key = p.name.trim().toLowerCase();
        const vault = getVault(key, stats);
        // Estimate avg weight as 100 for debug vis
        const w = calculateInfinitumWeight(p, vault, dummyCat, round, 1.0, 100, 0);
        weights.push(w);
        return { p, w, v: vault };
    });

    const totalW = weights.reduce((a, b) => a + b, 0);

    return playerWeights.map(item => ({
        name: item.p.name,
        weight: Math.round(item.w),
        prob: totalW > 0 ? (item.w / totalW) * 100 : 0,
        streak: item.v.metrics.civilStreak
    })).sort((a, b) => b.weight - a.weight);
};

// D. Motor de Sinergia de Escuadrón (V_se)
const applySynergyFactor = (candidateWeight: number, candidateVault: InfinityVault, alreadySelectedIds: string[]): number => {
    let synergyFactor = 1.0;
    const lastPartners = candidateVault.sequenceAnalytics.lastImpostorPartners;
    const hasConflict = alreadySelectedIds.some(id => lastPartners.includes(id));
    if (hasConflict) synergyFactor = 0.1;
    return candidateWeight * synergyFactor;
};

// --- MOTOR DE DISPARO ENTRÓPICO (MDE v5.0) ---
const calculateArchitectTrigger = (
    history: GameConfig['history'], 
    firstCivilStreak: number
): boolean => {
    const currentRound = history.roundCounter + 1;
    const roundsSinceLast = currentRound - (history.lastArchitectRound || -999);
    
    // A. Coeficiente de Recencia Vital (C_rv)
    if (roundsSinceLast <= 1) return false; 

    let baseProb = 0.15; 

    if (roundsSinceLast >= 2 && roundsSinceLast <= 5) {
        baseProb = 0.05; 
    } else if (roundsSinceLast > 10) {
        baseProb = 0.25; 
    }

    if (currentRound > 10) baseProb = Math.max(baseProb, 0.20); 
    if (firstCivilStreak > 8) baseProb += 0.10; 

    const hour = new Date().getHours();
    if (hour >= 0 && hour < 3) baseProb *= 2; 

    return Math.random() < baseProb;
};

// --- PROTOCOL LEXICON ENGINE (v1.0) ---

interface LexiconSelection {
    categoryName: string;
    wordPair: CategoryData;
}

export const generateArchitectOptions = (selectedCats: string[]): [LexiconSelection, LexiconSelection] => {
    const allCategories = Object.keys(CATEGORIES_DATA);
    let pool = selectedCats.length > 0 ? selectedCats : allCategories;
    if (pool.length === 0) pool = allCategories;

    const getOption = (): LexiconSelection => {
        const categoryName = pool[Math.floor(Math.random() * pool.length)];
        const catWords = CATEGORIES_DATA[categoryName];
        const wordPair = catWords[Math.floor(Math.random() * catWords.length)];
        return { categoryName, wordPair };
    };

    const option1 = getOption();
    let option2 = getOption();

    let attempts = 0;
    while (option1.wordPair.civ === option2.wordPair.civ && attempts < 10) {
        option2 = getOption();
        attempts++;
    }

    return [option1, option2];
};

const selectLexiconWord = (
    selectedCats: string[], 
    history: GameConfig['history']
): LexiconSelection => {
    const allCategories = Object.keys(CATEGORIES_DATA);
    let activePoolCategories: string[] = [];

    const isSingleMode = selectedCats.length === 1;
    const isOmniscientMode = selectedCats.length === 0 || selectedCats.length === allCategories.length;

    if (isSingleMode) {
        activePoolCategories = selectedCats;
    } else if (isOmniscientMode) {
        activePoolCategories = allCategories.filter(cat => !history.lastCategories.includes(cat));
        if (activePoolCategories.length === 0) activePoolCategories = allCategories;
    } else {
        activePoolCategories = selectedCats;
    }

    const chosenCategoryName = activePoolCategories[Math.floor(Math.random() * activePoolCategories.length)];
    const categoryWords = CATEGORIES_DATA[chosenCategoryName];

    const validWords = categoryWords.filter(w => !history.lastWords.includes(w.civ));
    const poolToWeight = validWords.length > 0 ? validWords : categoryWords;

    const weightedPool = poolToWeight.map(w => {
        const usage = history.globalWordUsage[w.civ] || 0;
        const weight = 1 / (usage + 1);
        return { word: w, weight };
    });

    const totalWeight = weightedPool.reduce((sum, item) => sum + item.weight, 0);
    let randomTicket = Math.random() * totalWeight;
    let selectedPair: CategoryData = weightedPool[0].word;

    for (const item of weightedPool) {
        randomTicket -= item.weight;
        if (randomTicket <= 0) {
            selectedPair = item.word;
            break;
        }
    }

    return { categoryName: chosenCategoryName, wordPair: selectedPair };
};

export const generateSmartHint = (pair: CategoryData): string => {
    if (pair.hints && pair.hints.length > 0) {
        const randomIndex = Math.floor(Math.random() * pair.hints.length);
        return pair.hints[randomIndex];
    }
    return pair.hint || "Sin Pista";
};

// --- PROTOCOLO VOCALIS (v1.0) ---
const runVocalisProtocol = (
    players: Player[],
    history: GameConfig['history'],
    isParty: boolean,
    architectId?: string
): Player => {
    if (isParty) {
        const sortedByLength = [...players].sort((a, b) => b.name.length - a.name.length);
        const maxLength = sortedByLength[0].name.length;
        const candidates = sortedByLength.filter(p => p.name.length === maxLength);
        return candidates[Math.floor(Math.random() * candidates.length)];
    }

    let candidates = players;
    if (architectId && players.length > 2) {
        if (Math.random() < 0.9) {
            candidates = players.filter(p => p.id !== architectId);
        }
    }

    const weightedCandidates = candidates.map(p => {
        let weight = 100;
        const lastStartRound = history.lastStartingPlayers.indexOf(p.id); 
        
        if (lastStartRound === 0) weight *= 0.001; 
        else if (lastStartRound === 1) weight *= 0.05; 
        else if (lastStartRound === 2) weight *= 0.25;
        else if (lastStartRound === -1) weight *= 3.0; 

        const nameEntropy = p.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        weight += (nameEntropy % 20); 
        weight *= (0.8 + Math.random() * 0.4); 

        return { player: p, weight };
    });

    const totalWeight = weightedCandidates.reduce((sum, item) => sum + item.weight, 0);
    let ticket = Math.random() * totalWeight;
    
    for (const item of weightedCandidates) {
        ticket -= item.weight;
        if (ticket <= 0) return item.player;
    }
    
    return weightedCandidates[weightedCandidates.length - 1].player;
};


// --- MAIN GENERATOR ---

export const generateGameData = (config: GameConfig): { 
    players: GamePlayer[]; 
    isTrollEvent: boolean;
    trollScenario: TrollScenario | null;
    isArchitectTriggered: boolean; 
    designatedStarter: string; 
    newHistory: GameConfig['history'];
} => {
    const { players, impostorCount, useHintMode, useTrollMode, useArchitectMode, selectedCats, history, debugOverrides, isPartyMode } = config;
    
    const currentRound = history.roundCounter + 1;
    const availableCategories = selectedCats.length > 0 ? selectedCats : Object.keys(CATEGORIES_DATA);

    // --- PROTOCOLO PANDORA & DEBUG ---
    
    let isTrollEvent = false;
    let trollScenario: TrollScenario | null = null;

    if (debugOverrides?.forceTroll) {
        isTrollEvent = true;
        trollScenario = debugOverrides.forceTroll;
    }

    // --- PARANOIA ENGINE v2.0 & LETEO INTEGRATION ---
    
    // 1. Calculate Paranoia
    const pastImpostorIds = history.pastImpostorIds || [];
    const paranoiaLevel = calculateParanoiaScore(pastImpostorIds, players, currentRound);
    
    // 3. Post-Crisis Stabilization
    let coolingRounds = history.coolingDownRounds || 0;
    const coolingFactor = coolingRounds > 0 ? (1 - (coolingRounds * 0.25)) : 1.0;

    // 2. Determine if Break Protocol is needed (Red Level: > 70%)
    let breakProtocolType: 'pandora' | 'mirror' | 'blind' | 'leteo' | null = null;
    let leteoGrade: 0 | 1 | 2 | 3 = 0;
    let entropyLevel = 0; // 0 to 1
    
    // Ensure we do NOT trigger a new Break Protocol if we are actively cooling down.
    if (!isTrollEvent && paranoiaLevel > 70 && coolingRounds === 0) {
        const roll = Math.random() * 100;
        
        // PROTOCOLO LETEO (40% Probability)
        if (roll < 40) {
            breakProtocolType = 'leteo';
            
            // Determine LETEO Grade based on Linear Patterns or Paranoia Intensity
            const hasLinearPattern = detectLinearPattern(pastImpostorIds, players);
            
            if (paranoiaLevel > 90) {
                leteoGrade = 3; // Colapso Total
                entropyLevel = 1.0;
            } else if (hasLinearPattern) {
                // If a strict mathematical pattern exists, apply strong entropy
                leteoGrade = 2; // Entropía de Karma
                entropyLevel = 0.6;
            } else {
                leteoGrade = 1; // Entropía de Recencia
                entropyLevel = 0.3;
            }

        } else if (useTrollMode && roll < 65) { // 25% chance for Troll if enabled
            breakProtocolType = 'pandora';
            isTrollEvent = true;
        } else if (roll < 90) { // Mirror
            breakProtocolType = 'mirror';
        } else {
            breakProtocolType = 'blind';
        }
    }

    // --- TROLL EVENT EXECUTION ---
    if (isTrollEvent) {
        if (!trollScenario) { 
            const roll = Math.random() * 100;
            if (roll < 70) trollScenario = 'espejo_total';
            else if (roll < 90) trollScenario = 'civil_solitario';
            else trollScenario = 'falsa_alarma';
        }

        const catName = availableCategories[Math.floor(Math.random() * availableCategories.length)];
        const catDataList = CATEGORIES_DATA[catName];
        const basePair = catDataList[Math.floor(Math.random() * catDataList.length)];
        const noiseIndex = Math.floor(Math.random() * players.length);

        const generateBabylonHint = (playerIndex: number): string => {
            if (!useHintMode) return "ERES EL IMPOSTOR";
            if (playerIndex === noiseIndex) {
                const otherCats = Object.keys(CATEGORIES_DATA).filter(c => c !== catName);
                const noiseCat = otherCats[Math.floor(Math.random() * otherCats.length)];
                const noisePair = CATEGORIES_DATA[noiseCat][0];
                const noiseHint = noisePair.hints ? noisePair.hints[0] : (noisePair.hint || "RUIDO");
                return `PISTA: ${noiseHint} (RUIDO)`;
            }
            const randomRelatedPair = catDataList[Math.floor(Math.random() * catDataList.length)];
            return Math.random() > 0.5 ? `PISTA: ${catName}` : `PISTA: ${generateSmartHint(randomRelatedPair)}`;
        };

        let trollPlayers: GamePlayer[] = [];
        if (trollScenario === 'espejo_total') {
            trollPlayers = players.map((p, idx) => ({ ...p, role: 'Impostor', word: generateBabylonHint(idx), realWord: basePair.civ, isImp: true, category: catName, areScore: 0, impostorProbability: 100, viewTime: 0 }));
        } else if (trollScenario === 'civil_solitario') {
            const civilIndex = Math.floor(Math.random() * players.length);
            trollPlayers = players.map((p, idx) => ({ ...p, role: idx === civilIndex ? 'Civil' : 'Impostor', word: idx === civilIndex ? basePair.civ : generateBabylonHint(idx), realWord: basePair.civ, isImp: idx !== civilIndex, category: catName, areScore: 0, impostorProbability: idx === civilIndex ? 0 : 100, viewTime: 0 }));
        } else {
            trollPlayers = players.map(p => ({ ...p, role: 'Civil', word: basePair.civ, realWord: basePair.civ, isImp: false, category: catName, areScore: 0, impostorProbability: 0, viewTime: 0 }));
        }

        const vocalisStarter = runVocalisProtocol(players, history, false);
        const newStartingPlayers = [vocalisStarter.id, ...history.lastStartingPlayers].slice(0, 10);

        // FIX: Update Vaults for Troll Events too
        const trollStats = { ...history.playerStats };
        const trollNewPastImpostorIds = [...pastImpostorIds];

        trollPlayers.forEach(p => {
            const key = p.name.trim().toLowerCase();
            const originalVault = getVault(key, trollStats);
            const vault: InfinityVault = JSON.parse(JSON.stringify(originalVault));

            vault.metrics.totalSessions += 1;
            
            if (vault.metrics.quarantineRounds > 0) {
                vault.metrics.quarantineRounds -= 1;
            }

            if (p.isImp) {
                vault.metrics.civilStreak = 0;
                trollNewPastImpostorIds.unshift(p.id);
                vault.metrics.quarantineRounds = 3; 
            } else {
                 if (vault.metrics.quarantineRounds === 0) {
                    vault.metrics.civilStreak += 1;
                }
            }
            
            const currentImpCount = (vault.metrics.impostorRatio * (vault.metrics.totalSessions - 1)) + (p.isImp ? 1 : 0);
            vault.metrics.impostorRatio = currentImpCount / vault.metrics.totalSessions;

            trollStats[key] = vault;
        });
        
        if (trollNewPastImpostorIds.length > 20) trollNewPastImpostorIds.length = 20;

        // Apply BACCHUS Roles if Party Mode
        if (isPartyMode) {
            trollPlayers = assignPartyRoles(trollPlayers);
        }

        const newLog: MatchLog = {
            id: Date.now().toString(),
            timestamp: Date.now(),
            round: currentRound,
            category: catName,
            word: basePair.civ,
            impostors: trollPlayers.filter(p => p.isImp).map(p => p.name),
            civilians: trollPlayers.filter(p => !p.isImp).map(p => p.name),
            isTroll: true,
            trollScenario: trollScenario,
            paranoiaLevel: 0, // Reset
            breakProtocol: null,
            architect: null,
            leteoGrade: 0,
            entropyLevel: 0
        };
        const currentLogs = history.matchLogs || [];
        const updatedLogs = [newLog, ...currentLogs].slice(0, 100);

        return { 
            players: trollPlayers, isTrollEvent: true, trollScenario: trollScenario, isArchitectTriggered: false, designatedStarter: vocalisStarter.name,
            newHistory: { 
                ...history, 
                roundCounter: currentRound, 
                lastTrollRound: currentRound, 
                lastStartingPlayers: newStartingPlayers,
                playerStats: trollStats,
                pastImpostorIds: trollNewPastImpostorIds,
                paranoiaLevel: 0,
                coolingDownRounds: 3,
                lastBreakProtocol: breakProtocolType || 'manual',
                matchLogs: updatedLogs
            } 
        };
    }

    // --- INFINITUM CORE LOGIC (Standard or Modified) ---
    
    const { categoryName: catName, wordPair } = selectLexiconWord(selectedCats, history);
    const currentStats = { ...history.playerStats };
    
    // Shuffle Pre-Pick (v6.1 Feature C)
    const shuffledPlayers = shuffleArray(players);

    // --- LETEO SHADOW VAULT LOGIC ---
    // If LETEO is active, we create a manipulated stats object for calculation only
    let calculationStats = currentStats;
    
    if (breakProtocolType === 'leteo' && leteoGrade > 0) {
        // Create deep copy for the "Ghost Vault"
        calculationStats = JSON.parse(JSON.stringify(currentStats));
        
        if (leteoGrade >= 1) { 
            // Grade I: Recency Entropy (Clear role sequence)
            Object.values(calculationStats).forEach(v => {
                v.sequenceAnalytics.roleSequence = []; // Amnesia
            });
        }
        
        if (leteoGrade >= 2) {
            // Grade II: Karma Entropy (Average streaks)
            const allStreaks = Object.values(calculationStats).map(v => v.metrics.civilStreak);
            const avgStreak = allStreaks.reduce((a, b) => a + b, 0) / (allStreaks.length || 1);
            Object.values(calculationStats).forEach(v => {
                v.metrics.civilStreak = avgStreak; // Socialism
            });
        }
    }

    // Average Weight Calculation for Quantum Noise
    let totalEstimatedWeight = 0;
    shuffledPlayers.forEach(p => {
        const key = p.name.trim().toLowerCase();
        const vault = getVault(key, calculationStats);
        totalEstimatedWeight += calculateInfinitumWeight(p, vault, catName, currentRound, coolingFactor, 0, 0); // No noise, no entropy for estimate
    });
    const avgWeight = totalEstimatedWeight / (shuffledPlayers.length || 1);

    // Calculate Final Weights (using Shadow Vault if LETEO active)
    const playerWeights: { player: Player, weight: number, vault: InfinityVault }[] = [];
    
    shuffledPlayers.forEach(p => {
        const key = p.name.trim().toLowerCase();
        const vault = getVault(key, calculationStats); // Use shadow vault if Leteo active
        let weight = 0;

        if (breakProtocolType === 'blind') {
            weight = 100;
        } else {
            // Pass entropyLevel to master equation
            weight = (vault.metrics.totalSessions === 0) 
                ? 100 
                : calculateInfinitumWeight(p, vault, catName, currentRound, coolingFactor, avgWeight, entropyLevel);
        }
        
        // Pass original vault for updates later, but used weight derived from shadow vault
        playerWeights.push({ player: p, weight, vault: getVault(key, currentStats) });
    });

    // Mirror Inversion Logic
    if (breakProtocolType === 'mirror') {
        playerWeights.sort((a, b) => a.weight - b.weight); 
        playerWeights[0].weight = 999999; 
    }

    const grandTotalWeight = playerWeights.reduce((sum, pw) => sum + pw.weight, 0);

    // Cascade Selection
    const selectedImpostors: Player[] = [];
    const selectedKeys: string[] = []; 

    for (let i = 0; i < impostorCount; i++) {
        let availableCandidates = playerWeights.filter(pw => !selectedKeys.includes(pw.player.name.trim().toLowerCase()));
        if (availableCandidates.length === 0) break;

        if (i > 0) {
            availableCandidates = availableCandidates.map(pw => ({
                ...pw,
                weight: applySynergyFactor(pw.weight, pw.vault, selectedKeys)
            }));
        }

        const totalWeight = availableCandidates.reduce((sum, pw) => sum + pw.weight, 0);
        let randomTicket = Math.random() * totalWeight;
        let selectedIndex = -1;

        for (let j = 0; j < availableCandidates.length; j++) {
            randomTicket -= availableCandidates[j].weight;
            if (randomTicket <= 0) {
                selectedIndex = j;
                break;
            }
        }
        if (selectedIndex === -1) selectedIndex = availableCandidates.length - 1;

        const chosen = availableCandidates[selectedIndex];
        selectedImpostors.push(chosen.player);
        selectedKeys.push(chosen.player.name.trim().toLowerCase());
    }

    // Update REAL Vaults (Core Memory) - Always update real stats
    const newPlayerStats = { ...currentStats };
    const newPastImpostorIds = [...pastImpostorIds];

    players.forEach(p => {
        const key = p.name.trim().toLowerCase();
        const originalVault = getVault(key, newPlayerStats);
        const isImp = selectedKeys.includes(key);
        const vault: InfinityVault = JSON.parse(JSON.stringify(originalVault));

        vault.metrics.totalSessions += 1;
        
        if (vault.metrics.quarantineRounds > 0) {
            vault.metrics.quarantineRounds -= 1;
        }

        if (isImp) {
            vault.metrics.civilStreak = 0;
            newPastImpostorIds.unshift(p.id); 
            
            // Apply Quarantine if this was a Break Protocol
            if (breakProtocolType) {
                vault.metrics.quarantineRounds = 3; 
            }
        } else {
            if (vault.metrics.quarantineRounds === 0) {
                vault.metrics.civilStreak += 1;
            }
        }

        const currentImpostorCount = (vault.metrics.impostorRatio * (vault.metrics.totalSessions - 1)) + (isImp ? 1 : 0);
        vault.metrics.impostorRatio = currentImpostorCount / vault.metrics.totalSessions;

        if (!vault.categoryDNA[catName]) {
            vault.categoryDNA[catName] = { timesAsImpostor: 0, lastTimeAsImpostor: 0, affinityScore: 1 };
        }
        if (isImp) {
            vault.categoryDNA[catName].timesAsImpostor += 1;
            vault.categoryDNA[catName].lastTimeAsImpostor = Date.now();
        }

        vault.sequenceAnalytics.roleSequence.unshift(isImp);
        if (vault.sequenceAnalytics.roleSequence.length > 20) {
            vault.sequenceAnalytics.roleSequence.pop();
        }
        if (isImp) {
            vault.sequenceAnalytics.lastImpostorPartners = selectedKeys.filter(k => k !== key);
        }
        newPlayerStats[key] = vault;
    });

    const newHistoryWords = [wordPair.civ, ...history.lastWords].slice(0, 15);
    const newHistoryCategories = [catName, ...history.lastCategories].slice(0, 3);
    const newGlobalWordUsage = { ...history.globalWordUsage };
    newGlobalWordUsage[wordPair.civ] = (newGlobalWordUsage[wordPair.civ] || 0) + 1;

    // Check Architect
    let isArchitectTriggered = false;
    let architectId: string | undefined;

    if (debugOverrides?.forceArchitect) {
        if (players.length > 0) {
            const firstPlayer = players[0];
            const firstPlayerKey = firstPlayer.name.trim().toLowerCase();
            if (!selectedKeys.includes(firstPlayerKey)) {
                isArchitectTriggered = true;
                architectId = firstPlayer.id;
            }
        }
    } else if (useArchitectMode && players.length > 0) {
        const firstPlayer = players[0];
        const firstPlayerKey = firstPlayer.name.trim().toLowerCase();
        if (!selectedKeys.includes(firstPlayerKey)) {
            const vault = newPlayerStats[firstPlayerKey];
            const streak = vault?.metrics?.civilStreak || 0;
            if (calculateArchitectTrigger(history, streak)) {
                isArchitectTriggered = true;
                architectId = firstPlayer.id;
            }
        }
    }

    const vocalisStarter = runVocalisProtocol(players, history, false, architectId);
    const newStartingPlayers = [vocalisStarter.id, ...history.lastStartingPlayers].slice(0, 10);

    let gamePlayers: GamePlayer[] = players.map(p => {
        const key = p.name.trim().toLowerCase();
        const isImp = selectedKeys.includes(key);
        const weightObj = playerWeights.find(pw => pw.player.name.trim().toLowerCase() === key);
        const rawWeight = weightObj ? weightObj.weight : 0;
        const probability = grandTotalWeight > 0 ? (rawWeight / grandTotalWeight) * 100 : 0;

        let displayWord = wordPair.civ;
        if (isImp) {
            const hint = generateSmartHint(wordPair);
            displayWord = useHintMode ? `PISTA: ${hint}` : "ERES EL IMPOSTOR";
        }

        return {
            id: p.id,
            name: p.name,
            role: isImp ? 'Impostor' : 'Civil',
            word: displayWord,
            realWord: wordPair.civ,
            isImp: isImp,
            category: catName,
            areScore: rawWeight,
            impostorProbability: probability,
            viewTime: 0
        };
    });

    if (newPastImpostorIds.length > 20) newPastImpostorIds.length = 20;

    // Apply BACCHUS Roles if Party Mode
    if (isPartyMode) {
        gamePlayers = assignPartyRoles(gamePlayers);
    }

    // --- BLACK BOX LOGGING ---
    const newLog: MatchLog = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        round: currentRound,
        category: catName,
        word: wordPair.civ,
        impostors: gamePlayers.filter(p => p.isImp).map(p => p.name),
        civilians: gamePlayers.filter(p => !p.isImp).map(p => p.name),
        isTroll: false,
        trollScenario: null,
        paranoiaLevel: breakProtocolType ? 0 : paranoiaLevel,
        breakProtocol: breakProtocolType,
        architect: architectId ? players.find(p => p.id === architectId)?.name || "Unknown" : null,
        leteoGrade: leteoGrade,
        entropyLevel: entropyLevel
    };
    const currentLogs = history.matchLogs || [];
    const updatedLogs = [newLog, ...currentLogs].slice(0, 100);

    // RESET LOGIC
    // If LETEO was active (Grade III especially), we must HARD RESET cooling to 4 rounds.
    const finalCoolingRounds = (breakProtocolType === 'leteo' && leteoGrade === 3) 
        ? 4 // Hard Reset
        : (breakProtocolType ? 3 : Math.max(0, coolingRounds - 1));

    return { 
        players: gamePlayers, 
        isTrollEvent: isTrollEvent, 
        trollScenario: trollScenario,
        isArchitectTriggered: isArchitectTriggered,
        designatedStarter: vocalisStarter.name,
        newHistory: {
            roundCounter: currentRound,
            lastWords: newHistoryWords,
            lastCategories: newHistoryCategories,
            globalWordUsage: newGlobalWordUsage,
            playerStats: newPlayerStats,
            lastTrollRound: isTrollEvent ? currentRound : history.lastTrollRound,
            lastArchitectRound: isArchitectTriggered ? currentRound : history.lastArchitectRound,
            lastStartingPlayers: newStartingPlayers,
            
            // Update v6.1 & v6.3 State
            pastImpostorIds: newPastImpostorIds,
            paranoiaLevel: breakProtocolType ? 0 : paranoiaLevel, 
            coolingDownRounds: finalCoolingRounds,
            lastBreakProtocol: breakProtocolType,
            matchLogs: updatedLogs,
            lastLeteoRound: breakProtocolType === 'leteo' ? currentRound : history.lastLeteoRound
        }
    };
};
