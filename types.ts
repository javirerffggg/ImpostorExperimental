export type ThemeName = 'midnight' | 'obsidian' | 'solar' | 'cyber' | 'bond' | 'turing' | 'illojuan' | 'material' | 'zenith' | 'protocol' | 'ethereal' | 'terminal84' | 'soft' | 'noir' | 'paper' | 'space' | 'nightclub';

export interface ThemeConfig {
    name: string;
    bg: string;
    cardBg: string;
    accent: string;
    text: string;
    sub: string;
    radius: string; // Tailwind class equivalent or CSS value
    font: string;
    border: string;
    particleType: 'circle' | 'binary' | 'rain';
}

export interface Player {
    id: string;
    name: string;
}

export interface GamePlayer extends Player {
    role: 'Civil' | 'Impostor';
    word: string; // What they see on the card
    realWord: string; // The actual civil word (for results)
    isImp: boolean;
    category: string;
    areScore: number; // Represents the INFINITUM weight for this round
    impostorProbability: number; // The calculated % chance they had to be selected
    viewTime: number; // Milliseconds spent looking at the card
    isArchitect?: boolean; // New v5.0 Flag
}

// --- PROTOCOL INFINITUM STRUCTURES ---

export interface CategoryDNA {
    timesAsImpostor: number;
    lastTimeAsImpostor: number; // Timestamp
    affinityScore: number;
}

export interface SequenceAnalytics {
    lastImpostorPartners: string[]; // IDs of partners in last imp game
    roleSequence: boolean[]; // True = Impostor, False = Civil (Last 20 games)
    averageWaitTime: number;
}

export interface InfinityVault {
    uid: string;
    metrics: {
        totalSessions: number;
        impostorRatio: number;
        civilStreak: number;
        totalImpostorWins: number; // Placeholder for future logic
    };
    categoryDNA: Record<string, CategoryDNA>;
    sequenceAnalytics: SequenceAnalytics;
}

export type TrollScenario = 'espejo_total' | 'civil_solitario' | 'falsa_alarma';

export interface GameState {
    phase: 'setup' | 'architect' | 'revealing' | 'discussion' | 'results';
    players: Player[];
    gameData: GamePlayer[];
    impostorCount: number;
    currentPlayerIndex: number;
    startingPlayer: string;
    isTrollEvent: boolean;
    trollScenario: TrollScenario | null;
    isArchitectRound: boolean; // v5.0 Flag 
    history: {
        roundCounter: number; 
        lastWords: string[]; // Session Exclusion (Last 15)
        lastCategories: string[]; // Omniscient Filter (Last 3)
        globalWordUsage: Record<string, number>; // Vital Penalty (Lexicon Engine)
        playerStats: Record<string, InfinityVault>; // The Infinity Vault (Infinitum Engine)
        lastTrollRound: number; 
        lastArchitectRound: number; // MDE v5.0 Tracking
        lastStartingPlayers: string[]; // VOCALIS: Oratory Fatigue Tracking
    };
    settings: {
        hintMode: boolean;
        trollMode: boolean;
        partyMode: boolean;
        architectMode: boolean; // New setting
        selectedCategories: string[];
    };
    currentDrinkingPrompt: string;
    theme: ThemeName;
}

export interface CategoryData {
    civ: string;
    imp: string;
    hints: string[]; // Protocol LEXICON support for dynamic hints
    hint?: string; // Legacy support
}