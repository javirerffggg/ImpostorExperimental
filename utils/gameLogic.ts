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
    };
}

// --- INFINITUM HELPERS ---

const createNewVault = (uid: string): InfinityVault => ({
    uid,
    metrics: {
        totalSessions: 0,
        impostorRatio: 0,
        civilStreak: 0,
        totalImpostorWins: 0
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

// 4. La Ecuación Maestra de INFINITUM
const calculateInfinitumWeight = (
    player: Player, 
    vault: InfinityVault, 
    category: string, 
    currentRound: number
): number => {
    // A. Motor de Frecuencia y Karma (V_fk)
    const base = 100;
    const ratio = Math.max(vault.metrics.impostorRatio, 0.01); 
    const v_fk = base * Math.log(vault.metrics.civilStreak + 2) * (1 / ratio);

    // B. Motor de Recencia y Secuencia (V_rs)
    let v_rs = 1.0;
    const history = vault.sequenceAnalytics.roleSequence; 
    
    if (history[0]) v_rs *= 0.0001; 
    else if (history[1]) v_rs *= 0.05; 
    else if (history[2]) v_rs *= 0.20; 
    else if (history[3] || history[4]) v_rs *= 0.50; 

    // C. Motor de Afinidad de Categoría (V_ac)
    let v_ac = 1.0;
    const catDNA = vault.categoryDNA[category];
    if (catDNA && catDNA.timesAsImpostor > 0) {
        v_ac *= 0.8; 
    }

    // Entropy (Ruido Cuántico)
    const entropy = Math.random() * 5;

    return (v_fk * v_rs * v_ac) + entropy;
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
    if (roundsSinceLast <= 1) return false; // Bloqueo inmediato

    let baseProb = 0.15; // 15% Base

    if (roundsSinceLast >= 2 && roundsSinceLast <= 5) {
        baseProb = 0.05; // Fatiga reciente
    } else if (roundsSinceLast > 10) {
        baseProb = 0.25; // Urgencia por sequía
    }

    // C. Inyección de Entropía Ambiental (Sesiones Largas)
    if (currentRound > 10) {
        baseProb = Math.max(baseProb, 0.20); 
    }

    // B. Factor de Justicia del Civil (F_jc)
    if (firstCivilStreak > 8) {
        baseProb += 0.10; // +10% bonus
    }

    // C. Hora Bruja (00:00 - 03:00)
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 3) {
        baseProb *= 2; // Doble probabilidad
    }

    return Math.random() < baseProb;
};

// --- PROTOCOL LEXICON ENGINE (v1.0) ---

interface LexiconSelection {
    categoryName: string;
    wordPair: CategoryData;
}

// Exported for Architect Regeneration
// Now returns TWO options for the user to choose from
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

    // Simple check to ensure they aren't identical (low probability but possible)
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

    // 1. Determine Mode
    const isSingleMode = selectedCats.length === 1;
    const isOmniscientMode = selectedCats.length === 0 || selectedCats.length === allCategories.length;
    // Hybrid mode is implied if neither above is true

    if (isSingleMode) {
        // A. Specialization Mode: Use the single category
        activePoolCategories = selectedCats;
    } else if (isOmniscientMode) {
        // C. Omniscient Mode: Use all, filter last 3 used categories
        activePoolCategories = allCategories.filter(cat => !history.lastCategories.includes(cat));
        // Fallback if filter removes everything (edge case)
        if (activePoolCategories.length === 0) activePoolCategories = allCategories;
    } else {
        // B. Hybrid Mode: Use selected categories
        activePoolCategories = selectedCats;
    }

    // Branch Equity: Pick one category first to ensure equal probability per branch
    const chosenCategoryName = activePoolCategories[Math.floor(Math.random() * activePoolCategories.length)];
    const categoryWords = CATEGORIES_DATA[chosenCategoryName];

    // 2. Historical Censorship Filter
    // Filter out Session Exclusion words (last 15)
    const validWords = categoryWords.filter(w => !history.lastWords.includes(w.civ));
    
    // Fallback if strict filter removes all words
    const poolToWeight = validWords.length > 0 ? validWords : categoryWords;

    // 3. Vital Penalty Calculation
    // W_w = 1 - (times_used / total_global_games)
    // We estimate total global games as sum of usages or just track a global counter. 
    // Simplified: W = 1 / (usage + 1)
    
    const weightedPool = poolToWeight.map(w => {
        const usage = history.globalWordUsage[w.civ] || 0;
        const weight = 1 / (usage + 1);
        return { word: w, weight };
    });

    // Weighted Random Pick for Word
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

// 4. Smart Hint Generator
export const generateSmartHint = (pair: CategoryData): string => {
    // Dynamic Mutation: Pick a random hint from the available array
    // This prevents memorization of a static hint
    if (pair.hints && pair.hints.length > 0) {
        const randomIndex = Math.floor(Math.random() * pair.hints.length);
        return pair.hints[randomIndex];
    }
    // Fallback for legacy data without array
    return pair.hint || "Sin Pista";
};

// --- PROTOCOLO VOCALIS (v1.0) ---
// Motor de Secuenciación Oratoria
const runVocalisProtocol = (
    players: Player[],
    history: GameConfig['history'],
    isParty: boolean,
    architectId?: string
): Player => {
    // 1. Estrategia "Brindis de Inicio" (Modo Fiesta)
    if (isParty) {
        // Jugador con el nombre más largo
        const sortedByLength = [...players].sort((a, b) => b.name.length - a.name.length);
        // Si hay empate, coger uno random de los más largos
        const maxLength = sortedByLength[0].name.length;
        const candidates = sortedByLength.filter(p => p.name.length === maxLength);
        return candidates[Math.floor(Math.random() * candidates.length)];
    }

    // 2. Filtrado de Arquitecto (90% probabilidad de NO empezar)
    let candidates = players;
    if (architectId && players.length > 2) {
        if (Math.random() < 0.9) {
            candidates = players.filter(p => p.id !== architectId);
        }
    }

    // 3. Cálculo de Pesos (Ecuación de Prioridad Oratoria)
    const weightedCandidates = candidates.map(p => {
        let weight = 100;

        // A. Índice de Fatiga Oratoria (I_fo)
        const lastStartRound = history.lastStartingPlayers.indexOf(p.id); // 0 es la última ronda
        
        if (lastStartRound === 0) weight *= 0.001; // Fue el último: bloqueo casi total
        else if (lastStartRound === 1) weight *= 0.05; // Hace 2 rondas
        else if (lastStartRound === 2) weight *= 0.25;
        else if (lastStartRound === -1) weight *= 3.0; // Nunca ha empezado recientemente

        // B. Entropía Nominal (Sesgo de Atributos)
        const nameEntropy = p.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        // Pequeño bono basado en la entropía para romper empates estadísticos
        weight += (nameEntropy % 20); 

        // Factor de Entropía Aleatoria (epsilon)
        weight *= (0.8 + Math.random() * 0.4); 

        return { player: p, weight };
    });

    // 4. Selección Ponderada
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
    designatedStarter: string; // VOCALIS Result
    newHistory: { 
        roundCounter: number;
        lastWords: string[];
        lastCategories: string[];
        globalWordUsage: Record<string, number>;
        playerStats: Record<string, InfinityVault>;
        lastTrollRound: number;
        lastArchitectRound: number;
        lastStartingPlayers: string[];
    } 
} => {
    const { players, impostorCount, useHintMode, useTrollMode, useArchitectMode, selectedCats, history } = config;
    
    const currentRound = history.roundCounter + 1;
    const availableCategories = selectedCats.length > 0 ? selectedCats : Object.keys(CATEGORIES_DATA);

    // --- PROTOCOLO PANDORA (Troll Logic) ---
    const roundsSinceLastTroll = currentRound - history.lastTrollRound;
    const isCooldownActive = history.lastTrollRound > 0 && roundsSinceLastTroll <= 5;
    const isTrollEvent = !isCooldownActive && useTrollMode && Math.random() < 0.15;

    // Determine starter purely randomly for Troll Event (Chaos)
    // Or apply VOCALIS anyway? Let's apply VOCALIS to keep consistency unless specified.
    // For now, let's calculate VOCALIS starter *before* returning data so it's consistent.
    
    if (isTrollEvent) {
        // TROLL LOGIC
        const roll = Math.random() * 100;
        let scenario: TrollScenario;
        if (roll < 70) scenario = 'espejo_total';
        else if (roll < 90) scenario = 'civil_solitario';
        else scenario = 'falsa_alarma';

        const catName = availableCategories[Math.floor(Math.random() * availableCategories.length)];
        const catDataList = CATEGORIES_DATA[catName];
        const basePair = catDataList[Math.floor(Math.random() * catDataList.length)];
        
        // Babylon Engine Noise Index
        const noiseIndex = Math.floor(Math.random() * players.length);

        const generateBabylonHint = (playerIndex: number): string => {
            if (!useHintMode) return "ERES EL IMPOSTOR";
            if (playerIndex === noiseIndex) {
                const otherCats = Object.keys(CATEGORIES_DATA).filter(c => c !== catName);
                const noiseCat = otherCats[Math.floor(Math.random() * otherCats.length)];
                // Use new hint array logic for noise too
                const noisePair = CATEGORIES_DATA[noiseCat][0];
                const noiseHint = noisePair.hints ? noisePair.hints[0] : (noisePair.hint || "RUIDO");
                return `PISTA: ${noiseHint} (RUIDO)`;
            }
            // Use smart hint logic for troll scenarios too to maintain illusion
            const randomRelatedPair = catDataList[Math.floor(Math.random() * catDataList.length)];
            return Math.random() > 0.5 ? `PISTA: ${catName}` : `PISTA: ${generateSmartHint(randomRelatedPair)}`;
        };

        // Construct Troll Players
        let trollPlayers: GamePlayer[] = [];
        if (scenario === 'espejo_total') {
            trollPlayers = players.map((p, idx) => ({
                ...p, 
                role: 'Impostor', 
                word: generateBabylonHint(idx), 
                realWord: basePair.civ, 
                isImp: true, 
                category: catName, 
                areScore: 0,
                impostorProbability: 100,
                viewTime: 0
            }));
        } else if (scenario === 'civil_solitario') {
            const civilIndex = Math.floor(Math.random() * players.length);
            trollPlayers = players.map((p, idx) => ({
                ...p, 
                role: idx === civilIndex ? 'Civil' : 'Impostor',
                word: idx === civilIndex ? basePair.civ : generateBabylonHint(idx),
                realWord: basePair.civ,
                isImp: idx !== civilIndex,
                category: catName, 
                areScore: 0,
                impostorProbability: idx === civilIndex ? 0 : 100,
                viewTime: 0
            }));
        } else {
            trollPlayers = players.map(p => ({
                ...p, 
                role: 'Civil', 
                word: basePair.civ, 
                realWord: basePair.civ, 
                isImp: false, 
                category: catName, 
                areScore: 0,
                impostorProbability: 0,
                viewTime: 0
            }));
        }

        // VOCALIS for Troll Mode (Just random or standard logic)
        const vocalisStarter = runVocalisProtocol(players, history, false); // No party mode bias for trolls usually
        const newStartingPlayers = [vocalisStarter.id, ...history.lastStartingPlayers].slice(0, 10);

        return { 
            players: trollPlayers, 
            isTrollEvent: true, 
            trollScenario: scenario,
            isArchitectTriggered: false,
            designatedStarter: vocalisStarter.name,
            newHistory: { 
                ...history, 
                roundCounter: currentRound, 
                lastTrollRound: currentRound,
                lastStartingPlayers: newStartingPlayers
            } 
        };
    }

    // --- LEXICON & INFINITUM CORE LOGIC ---
    
    // 1. Select Word using Protocol LEXICON
    const { categoryName: catName, wordPair } = selectLexiconWord(selectedCats, history);

    // 2. Prepare Vaults & Calculate Base Weights (Infinitum)
    const currentStats = { ...history.playerStats };
    const playerWeights: { player: Player, weight: number, vault: InfinityVault }[] = [];
    
    const existingWeights: number[] = [];
    players.forEach(p => {
        const key = p.name.trim().toLowerCase();
        if (currentStats[key]) {
            const w = calculateInfinitumWeight(p, currentStats[key], catName, currentRound);
            existingWeights.push(w);
        }
    });

    const newbieWeight = calculateNewbieBuffer(existingWeights);

    players.forEach(p => {
        const key = p.name.trim().toLowerCase();
        let vault = getVault(key, currentStats);
        let weight = (vault.metrics.totalSessions === 0) 
            ? newbieWeight 
            : calculateInfinitumWeight(p, vault, catName, currentRound);
        
        playerWeights.push({ player: p, weight, vault });
    });

    // CALCULATE PROBABILITY PERCENTAGES BEFORE MODIFICATION
    const grandTotalWeight = playerWeights.reduce((sum, pw) => sum + pw.weight, 0);

    // 3. Multi-Impostor Cascade Selection
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

    // 4. Update Infinity Vaults (Persistence)
    const newPlayerStats = { ...currentStats };
    players.forEach(p => {
        const key = p.name.trim().toLowerCase();
        const originalVault = getVault(key, newPlayerStats);
        const isImp = selectedKeys.includes(key);
        const vault: InfinityVault = JSON.parse(JSON.stringify(originalVault));

        vault.metrics.totalSessions += 1;
        if (isImp) {
            vault.metrics.civilStreak = 0;
            vault.metrics.totalImpostorWins += 0; 
        } else {
            vault.metrics.civilStreak += 1;
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

    // 5. Update LEXICON History
    const newHistoryWords = [wordPair.civ, ...history.lastWords].slice(0, 15);
    const newHistoryCategories = [catName, ...history.lastCategories].slice(0, 3);
    const newGlobalWordUsage = { ...history.globalWordUsage };
    newGlobalWordUsage[wordPair.civ] = (newGlobalWordUsage[wordPair.civ] || 0) + 1;

    // CHECK MDE v5.0 (Architect)
    let isArchitectTriggered = false;
    let architectId: string | undefined;

    if (useArchitectMode && players.length > 0) {
        const firstPlayer = players[0];
        const firstPlayerKey = firstPlayer.name.trim().toLowerCase();
        
        // STRICT RULE: Architect Mode only triggers if the FIRST player is a Civil.
        if (!selectedKeys.includes(firstPlayerKey)) {
            const vault = newPlayerStats[firstPlayerKey];
            const streak = vault?.metrics?.civilStreak || 0;
            
            if (calculateArchitectTrigger(history, streak)) {
                isArchitectTriggered = true;
                architectId = firstPlayer.id;
            }
        }
    }

    // --- VOCALIS EXECUTION ---
    // If Architect is triggered, passing their ID to exclude them from starting with 90% probability
    // Note: We check if `partyMode` is active from config passed in `selectLexiconWord` (it wasn't there before, assuming false for logic or need update).
    // Actually, `generateGameData` config doesn't explicitly have `partyMode` boolean, but we can infer or add it.
    // For now, passing `false` for party mode specific logic inside this function unless we update the interface, 
    // but the weights will still work. Let's assume standard logic if not passed.
    const vocalisStarter = runVocalisProtocol(players, history, false, architectId);
    
    // Update History with new starter
    const newStartingPlayers = [vocalisStarter.id, ...history.lastStartingPlayers].slice(0, 10);

    // 6. Construct Game Data
    const gamePlayers: GamePlayer[] = players.map(p => {
        const key = p.name.trim().toLowerCase();
        const isImp = selectedKeys.includes(key);
        const weightObj = playerWeights.find(pw => pw.player.name.trim().toLowerCase() === key);
        const rawWeight = weightObj ? weightObj.weight : 0;
        
        // Calculate Percentage Chance
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

    return { 
        players: gamePlayers, 
        isTrollEvent: false, 
        trollScenario: null,
        isArchitectTriggered: isArchitectTriggered,
        designatedStarter: vocalisStarter.name,
        newHistory: {
            roundCounter: currentRound,
            lastWords: newHistoryWords,
            lastCategories: newHistoryCategories, // Update Omniscient Filter
            globalWordUsage: newGlobalWordUsage, // Update Vital Penalty
            playerStats: newPlayerStats,
            lastTrollRound: history.lastTrollRound,
            lastArchitectRound: isArchitectTriggered ? currentRound : history.lastArchitectRound,
            lastStartingPlayers: newStartingPlayers
        }
    };
};