
import { CATEGORIES_DATA } from '../categories';
import { GamePlayer, Player, InfinityVault, TrollScenario, CategoryData } from '../types';

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
    };
    debugOverrides?: {
        forceTroll: TrollScenario | null;
        forceArchitect: boolean;
    }
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

// 5. Casos Especiales: Efecto Novato
const calculateNewbieBuffer = (weights: number[]): number => {
    if (weights.length === 0) return 100;
    const sorted = [...weights].sort((a, b) => a - b);
    const index = Math.floor(sorted.length * 0.6); // 60th percentile
    return sorted[index];
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

// 4. La Ecuación Maestra de INFINITUM (v6.1)
export const calculateInfinitumWeight = (
    player: Player, 
    vault: InfinityVault, 
    category: string, 
    currentRound: number,
    coolingDownFactor: number = 1.0, // 1.0 = Normal, 0.25 = Strong Cooling
    averageWeightEstimate: number = 100 // For Noise Calculation
): number => {
    
    // Z. Quarantine Check (Marcador de Agente)
    // CRITICAL: If quarantined, return extremely low weight to prevent selection in normal modes
    // but not 0 to avoid division errors in ratios.
    if (vault.metrics.quarantineRounds > 0) {
        return 0.01; 
    }

    // A. Motor de Frecuencia y Karma (V_fk) + Atenuación
    const base = 100;
    const ratio = Math.max(vault.metrics.impostorRatio, 0.01); 
    
    // v6.1: Attenuation during Cooling Phase
    const effectiveStreak = vault.metrics.civilStreak * coolingDownFactor; 
    
    const v_fk = base * Math.log(effectiveStreak + 2) * (1 / ratio);

    // B. Motor de Recencia y Secuencia (V_rs) - v6.1 SMOOTHED
    let v_rs = 1.0;
    const history = vault.sequenceAnalytics.roleSequence; // [Most Recent, ..., Oldest]
    
    if (history[0]) v_rs *= 0.05;      // Before: 0.0001 -> Now: 5% (Uncertainty Multiplier)
    else if (history[1]) v_rs *= 0.30; // Before: 0.05 -> Now: 30%
    else if (history[2]) v_rs *= 0.60; // Before: 0.20 -> Now: 60%
    else if (history[3]) v_rs *= 1.0;  // Before: 0.50 -> Now: 100% (Clean Slate earlier)

    // C. Motor de Afinidad de Categoría (V_ac)
    let v_ac = 1.0;
    const catDNA = vault.categoryDNA[category];
    if (catDNA && catDNA.timesAsImpostor > 0) {
        v_ac *= 0.8; 
    }

    // D. Ruido Cuántico (v6.1)
    // Random float between 0 and 30% of average weight
    const noise = Math.random() * (averageWeightEstimate * 0.3);

    return (v_fk * v_rs * v_ac) + noise;
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
        const w = calculateInfinitumWeight(p, vault, dummyCat, round, 1.0, 100);
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
    const { players, impostorCount, useHintMode, useTrollMode, useArchitectMode, selectedCats, history, debugOverrides } = config;
    
    const currentRound = history.roundCounter + 1;
    const availableCategories = selectedCats.length > 0 ? selectedCats : Object.keys(CATEGORIES_DATA);

    // --- PROTOCOLO PANDORA & DEBUG ---
    // Calculate simple troll stats if needed
    
    let isTrollEvent = false;
    let trollScenario: TrollScenario | null = null;

    if (debugOverrides?.forceTroll) {
        isTrollEvent = true;
        trollScenario = debugOverrides.forceTroll;
    }

    // --- PARANOIA ENGINE v2.0 & DISTRIBUTIVE SINGULARITY ---
    
    // 1. Calculate Paranoia
    const pastImpostorIds = history.pastImpostorIds || [];
    const paranoiaLevel = calculateParanoiaScore(pastImpostorIds, players, currentRound);
    
    // 3. Post-Crisis Stabilization
    // If coolingDownRounds > 0, we are recovering from a break protocol.
    // Factor: 3->0.25, 2->0.50, 1->0.75, 0->1.0
    let coolingRounds = history.coolingDownRounds || 0;
    const coolingFactor = coolingRounds > 0 ? (1 - (coolingRounds * 0.25)) : 1.0;

    // 2. Determine if Break Protocol is needed (Red Level: > 70%)
    let breakProtocolType: 'pandora' | 'mirror' | 'blind' | null = null;
    
    // CRITICAL FIX: Ensure we do NOT trigger a new Break Protocol if we are actively cooling down.
    // This prevents the "Mirror Loop" bug where quarantined players (low weight) get inverted 
    // to high weight immediately after serving a sentence.
    if (!isTrollEvent && paranoiaLevel > 70 && coolingRounds === 0) {
        const roll = Math.random() * 100;
        if (useTrollMode && roll < 50) {
            breakProtocolType = 'pandora';
            isTrollEvent = true;
        } else if (roll < 80) { // 30% chance (or 80% if troll mode off)
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

        // FIX: Update Vaults for Troll Events too, especially to apply Quarantine/Reset Streaks
        const trollStats = { ...history.playerStats };
        const trollNewPastImpostorIds = [...pastImpostorIds];

        trollPlayers.forEach(p => {
            const key = p.name.trim().toLowerCase();
            const originalVault = getVault(key, trollStats);
            const vault: InfinityVault = JSON.parse(JSON.stringify(originalVault));

            vault.metrics.totalSessions += 1;
            
            // Decrement existing quarantine
            if (vault.metrics.quarantineRounds > 0) {
                vault.metrics.quarantineRounds -= 1;
            }

            if (p.isImp) {
                vault.metrics.civilStreak = 0;
                // Add to history
                trollNewPastImpostorIds.unshift(p.id);

                // For ANY troll event (chaos mode), we should quarantine the "Impostors" 
                // to ensure a lottery reset in the next cooling rounds.
                // In "Espejo Total", everyone gets quarantined -> Pure Lottery next round.
                vault.metrics.quarantineRounds = 3; 

            } else {
                 // Only increase streak if not in quarantine
                 if (vault.metrics.quarantineRounds === 0) {
                    vault.metrics.civilStreak += 1;
                }
            }
            
            // Update other metrics roughly
            const currentImpCount = (vault.metrics.impostorRatio * (vault.metrics.totalSessions - 1)) + (p.isImp ? 1 : 0);
            vault.metrics.impostorRatio = currentImpCount / vault.metrics.totalSessions;

            trollStats[key] = vault;
        });
        
        // Truncate ID history
        if (trollNewPastImpostorIds.length > 20) trollNewPastImpostorIds.length = 20;

        // RESET Paranoia after a crash/troll event
        return { 
            players: trollPlayers, isTrollEvent: true, trollScenario: trollScenario, isArchitectTriggered: false, designatedStarter: vocalisStarter.name,
            newHistory: { 
                ...history, 
                roundCounter: currentRound, 
                lastTrollRound: currentRound, 
                lastStartingPlayers: newStartingPlayers,
                playerStats: trollStats, // UPDATE STATS
                pastImpostorIds: trollNewPastImpostorIds, // UPDATE IDS
                paranoiaLevel: 0, // Reset
                coolingDownRounds: 3, // Start cooling
                lastBreakProtocol: breakProtocolType || 'manual'
            } 
        };
    }

    // --- INFINITUM CORE LOGIC (Standard or Modified) ---
    
    const { categoryName: catName, wordPair } = selectLexiconWord(selectedCats, history);
    const currentStats = { ...history.playerStats };
    
    // Shuffle Pre-Pick (v6.1 Feature C)
    const shuffledPlayers = shuffleArray(players);

    // Prepare weights
    const playerWeights: { player: Player, weight: number, vault: InfinityVault }[] = [];
    const existingWeights: number[] = [];
    
    // First, verify vaults exist and check newbies
    shuffledPlayers.forEach(p => {
        const key = p.name.trim().toLowerCase();
        if (currentStats[key]) existingWeights.push(currentStats[key].metrics.civilStreak); // rough usage
    });
    const newbieWeight = 100; // Base value

    // Average Weight Calculation for Quantum Noise
    let totalEstimatedWeight = 0;
    shuffledPlayers.forEach(p => {
        const key = p.name.trim().toLowerCase();
        const vault = getVault(key, currentStats);
        totalEstimatedWeight += calculateInfinitumWeight(p, vault, catName, currentRound, coolingFactor, 0); // No noise for estimation
    });
    const avgWeight = totalEstimatedWeight / (shuffledPlayers.length || 1);

    // Calculate Final Weights
    shuffledPlayers.forEach(p => {
        const key = p.name.trim().toLowerCase();
        let vault = getVault(key, currentStats);
        let weight = 0;

        if (breakProtocolType === 'blind') {
            weight = 100; // Blind Lottery
        } else {
            // Standard Infinitum with v6.1 features
            weight = (vault.metrics.totalSessions === 0) 
                ? newbieWeight 
                : calculateInfinitumWeight(p, vault, catName, currentRound, coolingFactor, avgWeight);
        }
        
        playerWeights.push({ player: p, weight, vault });
    });

    // Mirror Inversion Logic
    if (breakProtocolType === 'mirror') {
        // Invert weights: heaviest becomes lightest
        // Simple way: sort ascending instead of weighted random
        playerWeights.sort((a, b) => a.weight - b.weight); 
        // Force the lowest weight (likely a quarantined player) to be super high just for selection
        // This causes the Quarantined player to be picked IF mirror is active.
        // The fix above (checking coolingRounds) ensures this block doesn't run during quarantine.
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

    // Update Vaults & Quarantine
    const newPlayerStats = { ...currentStats };
    const newPastImpostorIds = [...pastImpostorIds];

    players.forEach(p => {
        const key = p.name.trim().toLowerCase();
        const originalVault = getVault(key, newPlayerStats);
        const isImp = selectedKeys.includes(key);
        const vault: InfinityVault = JSON.parse(JSON.stringify(originalVault));

        vault.metrics.totalSessions += 1;
        
        // Handle Quarantine Decrement
        if (vault.metrics.quarantineRounds > 0) {
            vault.metrics.quarantineRounds -= 1;
        }

        if (isImp) {
            vault.metrics.civilStreak = 0;
            newPastImpostorIds.unshift(p.id); // Add to Paranoia History
            
            // Apply Quarantine if this was a Break Protocol selection
            if (breakProtocolType) {
                vault.metrics.quarantineRounds = 3; // Lock them out for cooldown duration
            }
        } else {
            // Only increase streak if not in quarantine
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

    const gamePlayers: GamePlayer[] = players.map(p => {
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

    // Clean up history size
    if (newPastImpostorIds.length > 20) newPastImpostorIds.length = 20;

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
            
            // Update v6.1 State
            pastImpostorIds: newPastImpostorIds,
            paranoiaLevel: breakProtocolType ? 0 : paranoiaLevel, // Reset on break
            coolingDownRounds: breakProtocolType ? 3 : Math.max(0, coolingRounds - 1),
            lastBreakProtocol: breakProtocolType
        }
    };
};
