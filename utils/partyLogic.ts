import { GameState, PartyIntensity, GamePlayer, SocialRole, Player } from '../types';

// --- CONFIGURATION ---
const INTENSITY_THRESHOLDS = {
    aperitivo: 2, // Rounds 1-2
    hora_punta: 6, // Rounds 3-6
    after_hours: 10, // Rounds 7+
};

// --- CORE: INTENSITY CALCULATOR ---
export const calculatePartyIntensity = (round: number): PartyIntensity => {
    const hour = new Date().getHours();
    
    // Protocolo RESACA: Safety check for late hours
    if (hour >= 4 && hour < 11) return 'resaca';

    if (round <= INTENSITY_THRESHOLDS.aperitivo) return 'aperitivo';
    if (round <= INTENSITY_THRESHOLDS.hora_punta) return 'hora_punta';
    return 'after_hours';
};

// --- CORE: ROLE ASSIGNMENT ---
export const assignPartyRoles = (players: GamePlayer[]): GamePlayer[] => {
    // Determine Bartender (The Enforcer)
    // Logic: Pick someone who hasn't been Bartender recently (random for now)
    const bartenderIndex = Math.floor(Math.random() * players.length);
    
    return players.map((p, idx) => {
        let role: SocialRole = 'civil';
        if (idx === bartenderIndex) role = 'bartender';
        // Add more roles later (VIP, Alguacil, etc.)
        return { ...p, partyRole: role };
    });
};

// --- CORE: PUNISHMENT ALGORITHM (P_ci) ---
// Calculates who deserves to drink based on stats
const getTargetPlayer = (gameState: GameState): string => {
    const candidates = gameState.gameData.map(p => {
        let score = 0;
        const vault = gameState.history.playerStats[p.name.trim().toLowerCase()];
        
        // Factor 1: Global Impostor Ratio (Punish winners)
        if (vault) score += vault.metrics.impostorRatio * 30;
        
        // Factor 2: Civil Streak (Punish campers)
        if (vault) score += vault.metrics.civilStreak * 2;
        
        // Factor 3: View Time Deviation (Punish weird behavior)
        // Note: ViewTime is available in gameData but might be 0 during setup.
        // We use viewTime from previous rounds if available in vault logic, but simple random for now.
        score += Math.random() * 20;

        return { name: p.name, score };
    });

    candidates.sort((a, b) => b.score - a.score);
    return candidates[0]?.name || "alguien";
};

// --- PROMPT GENERATION ---

export const getBatteryLevel = async (): Promise<number> => {
    if ('getBattery' in navigator) {
        try {
            // @ts-ignore
            const battery = await navigator.getBattery();
            return Math.round(battery.level * 100);
        } catch (e) {
            return 100;
        }
    }
    return 100;
};

const injectVariables = (template: string, gameState: GameState, battery: number): string => {
    let result = template;
    const now = new Date();
    const timeString = now.getHours() + ":" + (now.getMinutes() < 10 ? '0' : '') + now.getMinutes();

    // {TARGET} - The algorithmically chosen victim
    if (result.includes("{TARGET}")) {
        result = result.replace(/{TARGET}/g, getTargetPlayer(gameState));
    }

    // {RANDOM_PLAYER}
    if (result.includes("{RANDOM_PLAYER}")) {
        const randomP = gameState.players[Math.floor(Math.random() * gameState.players.length)];
        result = result.replace(/{RANDOM_PLAYER}/g, randomP ? randomP.name : "alguien");
    }

    // {CURRENT_PLAYER}
    if (result.includes("{CURRENT_PLAYER}")) {
        const currentP = gameState.players[gameState.currentPlayerIndex];
        result = result.replace(/{CURRENT_PLAYER}/g, currentP ? currentP.name : "el jugador actual");
    }

    // {BARTENDER}
    if (result.includes("{BARTENDER}")) {
        const barman = gameState.gameData.find(p => p.partyRole === 'bartender');
        result = result.replace(/{BARTENDER}/g, barman ? barman.name : "el Bartender");
    }

    // {IMPOSTOR} - Only available if gameData exists
    if (result.includes("{IMPOSTOR}")) {
        const impostors = gameState.gameData.filter(p => p.isImp);
        const impName = impostors.length > 0 ? impostors[0].name : "El Impostor";
        result = result.replace(/{IMPOSTOR}/g, impName);
    }

    // {BATTERY}
    result = result.replace(/{BATTERY}/g, battery.toString());

    // {TIME}
    result = result.replace(/{TIME}/g, timeString);

    return result;
};

const PROMPTS = {
    aperitivo: [
        "CALIBRACIÓN: {TARGET}, tienes cara de sed. Inicia el protocolo con un trago corto.",
        "ROMPHIELO: {RANDOM_PLAYER}, cuenta un chiste malo o bebe un trago.",
        "DATOS: {PLAYER_1}, eres el primero en la lista. Bebe por liderazgo.",
        "Batería al {BATTERY}%. Si tienes menos energía que el móvil, bebe un trago.",
    ],
    hora_punta: [
        "KARMA: {TARGET} lleva demasiado tiempo siendo inocente. El sistema exige un sacrificio etílico.",
        "DUELO TÁCTICO: {RANDOM_PLAYER} elige a un rival. El primero en parpadear bebe 2 tragos.",
        "BARTENDER: {BARTENDER} elige a la persona más sospechosa. Esa persona bebe.",
        "Silencio incómodo detectado. El último en hablar bebe.",
        "Atención: Si llevas ropa blanca, el sistema te ha marcado. Bebe un trago.",
    ],
    after_hours: [
        "CAOS TOTAL: {TARGET}, vacía tu vaso. El sistema no admite discusiones.",
        "MÍMICA: {CURRENT_PLAYER}, debes describir tu palabra solo con gestos. Si hablas, bebes doble.",
        "CADENA: {RANDOM_PLAYER} bebe. El jugador a su derecha también. Y el siguiente...",
        "BORRACHERA VISUAL: Si puedes leer esto sin cerrar un ojo, bebe un trago.",
        "El Bartender ({BARTENDER}) es la ley. Si dice que bebas, bebes.",
    ],
    resaca: [
        "PROTOCOLO SEGURIDAD: Todos beben un trago de AGUA. Ahora.",
        "Silencio. Bajad el volumen. {RANDOM_PLAYER}, susurra tu defensa.",
        "La luz molesta. El primero en quejarse del brillo, bebe agua.",
    ]
};

const TRIBUNAL_SENTENCES = {
    impostorWin: "INFILTRACIÓN PERFECTA. Los civiles son degradados. Brindis de la Vergüenza (3 tragos).",
    civilWin: "CAZADO. {IMPOSTOR}, has fallado al sistema. Termina tu bebida y pide perdón.",
    troll: "PROTOCOLO GARRAFÓN. Nadie es inocente. Barra libre de sospechas: todos beben.",
    architectWin: "El Arquitecto ha diseñado vuestra derrota. {BARTENDER}, sírvele un trago de victoria."
};

export const getPartyMessage = (
    phase: 'setup' | 'revealing' | 'discussion' | 'results', 
    gameState: GameState, 
    battery: number,
    winState?: 'civil' | 'impostor' | 'troll'
): string => {
    const intensity = gameState.partyState.intensity;

    // TRIBUNAL DE CASTIGOS (Resultados)
    if (phase === 'results' && winState) {
        let template = "";
        if (winState === 'troll') template = TRIBUNAL_SENTENCES.troll;
        else if (winState === 'civil') template = TRIBUNAL_SENTENCES.civilWin;
        else template = TRIBUNAL_SENTENCES.impostorWin;
        
        // Architect specific sentence
        const architect = gameState.gameData.find(p => p.isArchitect);
        if (architect && winState === 'impostor' && architect.isImp) {
             template = TRIBUNAL_SENTENCES.architectWin;
        }

        return injectVariables(template, gameState, battery);
    }

    // EVENTOS FLASH-CRASH (Durante el juego)
    if (phase === 'revealing' || phase === 'setup') {
        const pool = PROMPTS[intensity];
        if (!pool || pool.length === 0) return "";
        const template = pool[Math.floor(Math.random() * pool.length)];
        return injectVariables(template, gameState, battery);
    }

    return "";
};