import { ThemeConfig, ThemeName } from './types';

export const THEMES: Record<ThemeName, ThemeConfig> = {
    midnight: { 
        name: "Midnight", 
        bg: "#050508", 
        cardBg: "rgba(18, 18, 26, 0.7)", 
        accent: "#6366f1", 
        text: "#ffffff", 
        sub: "#94a3b8", 
        radius: "0rem", 
        font: "'Inter', sans-serif", 
        border: "rgba(255,255,255,0.1)",
        particleType: 'circle'
    },
    bond: { 
        name: "007 Protocol", 
        bg: "#0a0a0a", 
        cardBg: "rgba(20, 20, 20, 0.8)", 
        accent: "#dc2626", 
        text: "#e5e5e5", 
        sub: "#525252", 
        radius: "0rem", 
        font: "'Playfair Display', serif", 
        border: "rgba(220,38,38,0.3)",
        particleType: 'circle'
    },
    turing: { 
        name: "Turing", 
        bg: "#050505", 
        cardBg: "rgba(15, 15, 15, 0.9)", 
        accent: "#22c55e", 
        text: "#22c55e", 
        sub: "#14532d", 
        radius: "0rem", 
        font: "'JetBrains Mono', monospace", 
        border: "rgba(34,197,94,0.4)",
        particleType: 'binary'
    },
    solar: { 
        name: "Solar", 
        bg: "#fffdf0", 
        cardBg: "rgba(255, 255, 255, 0.6)", 
        accent: "#d97706", 
        text: "#451a03", 
        sub: "#92400e", 
        radius: "3rem", 
        font: "'Inter', sans-serif", 
        border: "rgba(217,119,6,0.15)",
        particleType: 'circle'
    },
    illojuan: { 
        name: "Andaluz", 
        bg: "#f0fdf4", 
        cardBg: "rgba(255, 255, 255, 0.7)", 
        accent: "#16a34a", 
        text: "#14532d", 
        sub: "#166534", 
        radius: "2rem", 
        font: "'Inter', sans-serif", 
        border: "rgba(22,163,74,0.2)",
        particleType: 'circle'
    },
    obsidian: { 
        name: "Obsidian", 
        bg: "#080706", 
        cardBg: "rgba(18, 17, 15, 0.8)", 
        accent: "#f59e0b", 
        text: "#ffffff", 
        sub: "#a8a29e", 
        radius: "1.5rem", 
        font: "'Inter', sans-serif", 
        border: "rgba(245,158,11,0.2)",
        particleType: 'circle'
    },
    cyber: { 
        name: "Night City", 
        bg: "#020205", 
        cardBg: "rgba(10, 10, 25, 0.7)", 
        accent: "#00ff9f", // Verde Neón
        text: "#fcee0a", // Amarillo Cyber
        sub: "#ff003c", // Rojo Magenta
        radius: "1rem", 
        font: "'JetBrains Mono', monospace", 
        border: "rgba(0, 255, 159, 0.4)",
        particleType: 'rain'
    },
    material: { 
        name: "Material You", 
        bg: "#f7f2fa", 
        cardBg: "rgba(234, 221, 255, 0.5)", 
        accent: "#6750a4", 
        text: "#1d1b20", 
        sub: "#49454f", 
        radius: "2.5rem", 
        font: "'Inter', sans-serif", 
        border: "rgba(103, 80, 164, 0.15)",
        particleType: 'circle'
    },
    zenith: { 
        name: "Zenith Glass", 
        bg: "#020617", 
        cardBg: "rgba(30, 41, 59, 0.5)", 
        accent: "#38bdf8", 
        text: "#f8fafc", 
        sub: "#94a3b8", 
        radius: "2.5rem", 
        font: "'Inter', sans-serif", 
        border: "rgba(56, 189, 248, 0.2)",
        particleType: 'circle'
    },
    protocol: { 
        name: "Crimson Protocol", 
        bg: "#0a0000", 
        cardBg: "rgba(20, 0, 0, 0.8)", 
        accent: "#ff0000", 
        text: "#ffcccc", 
        sub: "#660000", 
        radius: "0rem", 
        font: "'JetBrains Mono', monospace", 
        border: "rgba(255, 0, 0, 0.4)",
        particleType: 'rain'
    },
    ethereal: { 
        name: "Ethereal Gold", 
        bg: "#0f1115", 
        cardBg: "rgba(28, 30, 35, 0.6)", 
        accent: "#fbbf24", 
        text: "#ffffff", 
        sub: "#71717a", 
        radius: "1rem", 
        font: "'Playfair Display', serif", 
        border: "rgba(251, 191, 36, 0.15)",
        particleType: 'circle'
    },
    terminal84: { 
        name: "Terminal 1984", 
        bg: "#0d0d0d", 
        cardBg: "rgba(0, 20, 0, 0.9)", 
        accent: "#00ff41", 
        text: "#00ff41", 
        sub: "#003b00", 
        radius: "0rem", 
        font: "'JetBrains Mono', monospace", 
        border: "rgba(0, 255, 65, 0.5)",
        particleType: 'binary'
    },
    soft: { 
        name: "Neumorphic Soft", 
        bg: "#e0e5ec", 
        cardBg: "rgba(224, 229, 236, 0.6)", 
        accent: "#a3b1c6", 
        text: "#44475a", 
        sub: "#71717a", 
        radius: "3rem", 
        font: "'Inter', sans-serif", 
        border: "rgba(255, 255, 255, 0.8)",
        particleType: 'circle'
    },
    noir: { 
        name: "Noir Detective", 
        bg: "#1a1a1a", 
        cardBg: "rgba(35, 35, 35, 0.8)", 
        accent: "#e5e5e5", 
        text: "#ffffff", 
        sub: "#525252", 
        radius: "0.25rem", 
        font: "'Playfair Display', serif", 
        border: "rgba(255, 255, 255, 0.1)",
        particleType: 'circle'
    },
    paper: { 
        name: "Expediente 1950", 
        bg: "#f2e8cf", // Color hueso/papel antiguo
        cardBg: "rgba(255, 255, 255, 0.4)", 
        accent: "#386641", // Verde militar oscuro
        text: "#1a1a1a", 
        sub: "#6a6a6a", 
        radius: "0.25rem", 
        font: "'Playfair Display', serif", 
        border: "rgba(0, 0, 0, 0.1)",
        particleType: 'circle'
    },
    space: { 
        name: "Deep Space", 
        bg: "#000000", 
        cardBg: "rgba(255, 255, 255, 0.05)", 
        accent: "#ffffff", 
        text: "#ffffff", 
        sub: "#4b5563", 
        radius: "3rem", 
        font: "'Inter', sans-serif", 
        border: "rgba(255, 255, 255, 0.2)",
        particleType: 'circle'
    },
    nightclub: {
        name: "Nightclub",
        bg: "#1a0033",
        cardBg: "rgba(26, 0, 51, 0.85)",
        accent: "#ff00ff", // Neon Fuchsia
        text: "#00ffff", // Cyan
        sub: "#d1d5db",
        radius: "1.5rem",
        font: "'Inter', sans-serif",
        border: "rgba(255, 0, 255, 0.5)",
        particleType: 'circle'
    }
};

export const PARTY_PROMPTS = {
    setup: [
        "¡Somos una multitud! {RANDOM_PLAYER}, bebe un trago para celebrar la reunión.",
        "Batería al {BATTERY}%. Si tienes menos energía que el móvil, bebe un trago.",
        "¡{PLAYER_1}, por ser el primero en la lista, bebe un trago!",
        "{PLAYER_NAME_LONGEST}, tu nombre es tan largo como tu sed. ¡Bebe un trago!",
        "Son más de las {TIME}. Todos los que tengan sueño, beben un trago.",
    ],
    revealing: [
        "Móvil entregado. {CURRENT_PLAYER}, si el que te ha pasado el móvil ha sonreído, bebe un trago.",
        "¡STOP! Antes de pasar el móvil, el último en decir 'Impostor' bebe un trago.",
        "Ve con cuidado. Si al ver tu carta has hecho una mueca, bebe un trago disimuladamente.",
        "¡Atención! {CURRENT_PLAYER}, si llevas algo rojo, bebe un trago antes de pasar el móvil.",
    ],
    discussion: [
        "{RANDOM_PLAYER}, sospecho de ti. Bebe un trago y sigue defendiéndote.",
        "¡Brindis! Todos los que crean que {RANDOM_PLAYER} es el impostor, beben un trago.",
        "Si {RANDOM_PLAYER} y {RANDOM_PLAYER} no se han mirado a los ojos en esta ronda, beben un trago.",
        "El jugador que lleve más tiempo sin ser Impostor, bebe un trago.",
        "Cualquier jugador que lleve zapatillas blancas, bebe un trago.",
        "El jugador que esté sentado a la derecha del dueño del móvil, bebe un trago.",
        "El jugador que haya enviado el último WhatsApp del grupo, bebe un trago.",
        "Si has dicho la palabra 'literal' o 'en plan' hoy, bebe un trago.",
    ],
    results: {
        impostorWin: "¡Infiltración total! El Impostor se ha reído en vuestra cara. Todos los civiles beben un trago.",
        civilWin: "Cazado. {IMPOSTOR}, tu cara te ha delatado. Bebe un trago de la derrota.",
        troll: "¡TRAICIÓN! Todos erais impostores. ¡Nadie es inocente, todos beben un trago!",
    }
};

export const DRINKING_PROMPTS = PARTY_PROMPTS.discussion; // Keep compatibility for now

export const DEFAULT_PLAYERS = ["Agente 1", "Agente 2", "Agente 3", "Agente 4"];

export const PLAYER_COLORS = [
    "#3b82f6", // Blue
    "#ef4444", // Red
    "#10b981", // Emerald
    "#f59e0b", // Amber
    "#8b5cf6", // Violet
    "#ec4899", // Pink
    "#06b6d4", // Cyan
    "#f97316", // Orange
    "#84cc16", // Lime
    "#6366f1", // Indigo
    "#d946ef", // Fuchsia
    "#14b8a6", // Teal
];