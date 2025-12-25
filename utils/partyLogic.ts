import { GameState } from '../types';
import { PARTY_PROMPTS } from '../constants';

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

export const injectVariables = (template: string, gameState: GameState, battery: number): string => {
    let result = template;
    const now = new Date();
    const timeString = now.getHours() + ":" + (now.getMinutes() < 10 ? '0' : '') + now.getMinutes();

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

    // {PLAYER_1}
    if (result.includes("{PLAYER_1}")) {
        result = result.replace(/{PLAYER_1}/g, gameState.players[0]?.name || "Jugador 1");
    }

    // {PLAYER_NAME_LONGEST}
    if (result.includes("{PLAYER_NAME_LONGEST}")) {
        const longest = [...gameState.players].sort((a, b) => b.name.length - a.name.length)[0];
        result = result.replace(/{PLAYER_NAME_LONGEST}/g, longest ? longest.name : "nadie");
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

export const getPartyMessage = (
    phase: 'setup' | 'revealing' | 'discussion' | 'results', 
    gameState: GameState, 
    battery: number,
    winState?: 'civil' | 'impostor' | 'troll'
): string => {
    let template = "";

    if (phase === 'results' && winState) {
        if (winState === 'troll') template = PARTY_PROMPTS.results.troll;
        else if (winState === 'civil') template = PARTY_PROMPTS.results.civilWin;
        else template = PARTY_PROMPTS.results.impostorWin;
    } else {
        const pool = PARTY_PROMPTS[phase] as string[];
        if (!pool || pool.length === 0) return "";
        template = pool[Math.floor(Math.random() * pool.length)];
    }

    return injectVariables(template, gameState, battery);
};