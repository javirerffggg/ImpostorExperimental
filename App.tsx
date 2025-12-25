import React, { useState, useEffect, useRef } from 'react';
import { Settings, Users, Ghost, Zap, Shuffle, RotateCcw, Monitor, ChevronRight, X, Check, ShieldAlert, Mic, LayoutGrid, CheckCheck, Eye, Lock, Fingerprint, Save, Trash2, Database, Beer, PartyPopper, MessageCircle, AlertTriangle, FileWarning, BarChart3, ScanEye, Flame, Timer, Percent, ShieldCheck, Unlock, FileText, Radio } from 'lucide-react';
import { Background } from './components/Background';
import { IdentityCard } from './components/IdentityCard';
import { PartyNotification } from './components/PartyNotification';
import { ArchitectCuration } from './components/ArchitectCuration';
import { generateGameData, generateArchitectOptions, generateSmartHint } from './utils/gameLogic';
import { THEMES, DEFAULT_PLAYERS, PLAYER_COLORS } from './constants';
import { CATEGORIES_DATA } from './categories';
import { GameState, ThemeName, Player, ThemeConfig, CategoryData } from './types';
import { getPartyMessage, getBatteryLevel } from './utils/partyLogic';

// --- Sub-components extracted to fix Hook Rules violations ---

const ResultsView: React.FC<{
    gameState: GameState;
    theme: ThemeConfig;
    onBack: () => void;
    onReplay: () => void;
}> = ({ gameState, theme, onBack, onReplay }) => {
    const impostors = gameState.gameData.filter(p => p.isImp);
    const civilWord = gameState.gameData.find(p => !p.isImp)?.realWord || "???";
    const isTroll = gameState.isTrollEvent;
    const trollScenario = gameState.trollScenario;
    const isParty = gameState.settings.partyMode;
    const architect = gameState.gameData.find(p => p.isArchitect);
    
    // --- METRICS CALCULATION (SUSPICION METER) ---
    const allViewTimes = gameState.gameData.map(p => p.viewTime || 0);
    const avgViewTime = allViewTimes.reduce((a, b) => a + b, 0) / (allViewTimes.length || 1);

    const getSuspicionTag = (time: number): { label: string, color: string } => {
        if (time === 0) return { label: "N/A", color: theme.sub };
        if (time > avgViewTime * 1.5) return { label: "DUDOSO", color: '#fbbf24' }; // Amber
        if (time < avgViewTime * 0.5) return { label: "PRECIPITADO", color: '#f87171' }; // Red
        return { label: "NORMAL", color: '#4ade80' }; // Green
    };
    
    // --- REVEAL LOGIC (GLOBAL LOCK) ---
    const [isDecrypted, setIsDecrypted] = useState(false);
    const [decryptProgress, setDecryptProgress] = useState(0);
    const [isHoldingDecrypt, setIsHoldingDecrypt] = useState(false);

    // --- VOCALIS ANIMATION STATE ---
    const [scannedName, setScannedName] = useState("CALCULANDO...");
    const [vocalisLocked, setVocalisLocked] = useState(false);

    // Vocalis Effect
    useEffect(() => {
        if (isDecrypted) return; // Stop if already revealed

        let interval: number;
        let counter = 0;
        const targetName = gameState.startingPlayer;
        const allNames = gameState.players.map(p => p.name);
        
        // Scan phase (1.5s)
        const scanDuration = 1500;
        const startTime = Date.now();

        interval = window.setInterval(() => {
            const elapsed = Date.now() - startTime;
            
            if (elapsed < scanDuration) {
                // Random cycling
                setScannedName(allNames[Math.floor(Math.random() * allNames.length)]);
            } else {
                // Lock on target
                setScannedName(targetName);
                setVocalisLocked(true);
                if (navigator.vibrate) navigator.vibrate([30, 80]); // "Hydraulic brake" feel
                clearInterval(interval);
            }
        }, 60);

        return () => clearInterval(interval);
    }, [isDecrypted, gameState.startingPlayer, gameState.players]);

    // Haptics & Progress Loop
    useEffect(() => {
        let interval: number;
        if (isHoldingDecrypt && !isDecrypted) {
            if (navigator.vibrate) navigator.vibrate(30); // Low rumble
            interval = window.setInterval(() => {
                setDecryptProgress(prev => {
                    const next = prev + 3; // Speed of decryption
                    return next >= 100 ? 100 : next;
                });
            }, 16);
        } else if (!isHoldingDecrypt && !isDecrypted) {
            setDecryptProgress(prev => Math.max(0, prev - 5)); // Decay if released
        }
        return () => clearInterval(interval);
    }, [isHoldingDecrypt, isDecrypted]);

    // Trigger Unlock
    useEffect(() => {
        if (decryptProgress >= 100 && !isDecrypted) {
            setIsDecrypted(true);
            if (navigator.vibrate) navigator.vibrate([100, 50, 100]); // Success pattern
        }
    }, [decryptProgress, isDecrypted]);

    // --- RENDER LOCKED SCREEN (CENSURA TOTAL + VOCALIS) ---
    if (!isDecrypted) {
        return (
            <div className="flex flex-col h-full items-center justify-center p-6 pb-32 relative z-10 animate-in fade-in duration-500">
                
                {/* VOCALIS WIDGET */}
                <div className="w-full max-w-sm text-center relative z-20 mb-24">
                    <h3 
                        className="text-xl font-bold uppercase tracking-[0.2em] transition-all duration-300"
                        style={{ color: theme.text, opacity: 0.9 }}
                    >
                        EMPIEZA A HABLAR
                    </h3>
                    
                    <div 
                        className={`mt-6 text-5xl font-black uppercase tracking-tighter leading-none transition-all duration-300 transform-gpu ${vocalisLocked ? 'scale-110' : 'blur-[2px]'}`}
                        style={{
                            color: vocalisLocked ? theme.accent : theme.text,
                            opacity: vocalisLocked ? 1 : 0.3,
                            textShadow: vocalisLocked ? `0 0 40px ${theme.accent}` : 'none'
                        }}
                    >
                        {scannedName}
                    </div>
                </div>

                {/* AURA BUTTON */}
                <div className="relative group">
                    {/* Aura Layers */}
                    <div 
                        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl transition-all duration-500 ease-out
                        ${isHoldingDecrypt ? 'w-56 h-56' : 'w-32 h-32 animate-pulse'}`} 
                        style={{ backgroundColor: theme.accent, opacity: isHoldingDecrypt ? 0.4 : 0.1 }}
                    />
                    <div 
                        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl transition-all duration-500
                        ${isHoldingDecrypt ? 'w-72 h-72' : 'w-0 h-0'}`}
                        style={{ backgroundColor: theme.accent, opacity: 0.2 }}
                    />

                    {/* The Button */}
                    <button
                        className="relative w-28 h-28 rounded-full bg-black/20 border-2 backdrop-blur-md flex items-center justify-center overflow-hidden touch-none select-none transition-all duration-200 active:scale-95"
                        style={{ 
                            borderColor: isHoldingDecrypt ? theme.accent : `${theme.accent}50`,
                            boxShadow: isHoldingDecrypt ? `0 0 20px ${theme.accent}80, inset 0 0 20px ${theme.accent}40` : 'none'
                        }}
                        onPointerDown={() => setIsHoldingDecrypt(true)}
                        onPointerUp={() => setIsHoldingDecrypt(false)}
                        onPointerLeave={() => setIsHoldingDecrypt(false)}
                    >
                        {/* Fill Progress */}
                        <div 
                            className="absolute bottom-0 left-0 w-full transition-all duration-75 ease-linear"
                            style={{ 
                                height: `${decryptProgress}%`,
                                backgroundColor: theme.accent 
                            }}
                        />
                        
                        <Fingerprint 
                            size={48} 
                            className={`relative z-10 transition-all duration-300 ${isHoldingDecrypt ? 'scale-110 text-white' : 'scale-100'}`}
                            style={{ color: isHoldingDecrypt ? '#fff' : theme.accent }}
                        />
                    </button>
                    
                    <p 
                        className={`absolute -bottom-12 left-1/2 -translate-x-1/2 w-max text-[10px] font-black uppercase tracking-widest transition-opacity duration-300 ${isHoldingDecrypt ? 'opacity-100' : 'opacity-70 animate-pulse'}`}
                        style={{ color: theme.accent }}
                    >
                        MANTENER
                    </p>
                </div>
            </div>
        );
    }

    // --- RENDER DECRYPTED REPORT (INFORME FINAL) ---
    return (
        <div className="flex flex-col h-full items-center p-6 pb-24 animate-in slide-in-from-bottom duration-500 relative z-10 pt-[calc(1.5rem+env(safe-area-inset-top))] overflow-y-auto">
            
            {/* 1. HEADER: CIVIL WORD */}
            <div className="w-full max-w-sm mb-8 text-center relative">
                {/* Glow effect matching theme */}
                <div 
                    className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 blur-3xl rounded-full pointer-events-none opacity-20"
                    style={{ backgroundColor: theme.text }}
                />
                
                <p style={{ color: theme.sub }} className="text-[10px] font-black uppercase tracking-[0.4em] mb-2 flex items-center justify-center gap-2">
                    <FileText size={10} /> INFORME DE MISIÓN
                </p>
                
                <h1 
                    className="text-5xl font-black uppercase break-words leading-none tracking-tighter relative z-10"
                    style={{ 
                        color: isTroll ? '#ef4444' : theme.text,
                        textShadow: `0 0 40px ${theme.accent}20`
                    }}
                >
                    {isTroll ? "ERROR" : civilWord}
                </h1>

                {/* Architect Badge */}
                {architect && !isTroll && (
                    <div 
                        className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full border backdrop-blur-sm"
                        style={{ 
                            borderColor: '#eab308', 
                            backgroundColor: 'rgba(234, 179, 8, 0.1)'
                        }}
                    >
                        <ShieldAlert size={10} className="text-yellow-500" />
                        <span className="text-[9px] font-bold text-yellow-500 uppercase tracking-widest">
                            Arq: {architect.name}
                        </span>
                    </div>
                )}
            </div>

            {/* 2. THREAT CARD (IMPOSTORS) */}
            <div className="w-full max-w-sm mb-8">
                <div 
                    className="relative overflow-hidden rounded-xl border p-5 backdrop-blur-md"
                    style={{ 
                        backgroundColor: theme.cardBg,
                        borderColor: isTroll ? '#ef4444' : theme.accent,
                        boxShadow: `0 4px 20px ${isTroll ? '#ef4444' : theme.accent}20`
                    }}
                >
                    {/* Background Strip */}
                    <div 
                        className="absolute top-0 left-0 w-1 h-full"
                        style={{ backgroundColor: isTroll ? '#ef4444' : theme.accent }} 
                    />

                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <p className="text-[10px] uppercase tracking-widest font-bold mb-1 opacity-70" style={{ color: theme.text }}>
                                {isTroll ? "PROTOCOLO PANDORA" : "AMENAZA IDENTIFICADA"}
                            </p>
                            <h3 className="font-black text-lg uppercase tracking-wide" style={{ color: theme.text }}>
                                {isTroll ? "FALLO DE SISTEMA" : "IMPOSTORES"}
                            </h3>
                        </div>
                        {isTroll ? <AlertTriangle className="text-red-500 animate-pulse" /> : <Ghost style={{ color: theme.text, opacity: 0.8 }} />}
                    </div>

                    <div className="space-y-2">
                        {isTroll ? (
                            <p className="text-xs text-red-500 font-mono font-bold">
                                {trollScenario === 'espejo_total' && ">> TODOS SON IMPOSTORES"}
                                {trollScenario === 'civil_solitario' && ">> SOLO 1 CIVIL"}
                                {trollScenario === 'falsa_alarma' && ">> 0 IMPOSTORES"}
                            </p>
                        ) : (
                            impostors.map(imp => (
                                <div 
                                    key={imp.id} 
                                    className="flex items-center gap-3 p-2 rounded-lg border"
                                    style={{ 
                                        backgroundColor: theme.bg,
                                        borderColor: theme.border
                                    }}
                                >
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center bg-red-500/10 text-red-500">
                                        <ScanEye size={16} />
                                    </div>
                                    <span className="text-lg font-bold tracking-wide" style={{ color: theme.text }}>{imp.name}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* 3. PLAYER METRICS LIST */}
            <div className="w-full max-w-sm space-y-4">
                <div className="flex items-center gap-2 px-1 opacity-60" style={{ color: theme.text }}>
                    <BarChart3 size={14} />
                    <h4 className="text-[10px] font-black uppercase tracking-widest">ANÁLISIS DE COMPORTAMIENTO</h4>
                </div>

                <div className="grid gap-2">
                    {gameState.gameData.map((p, idx) => {
                        const isImp = p.isImp && !isTroll;
                        const suspicion = getSuspicionTag(p.viewTime);
                        
                        return (
                            <div 
                                key={p.id}
                                className="flex items-center justify-between p-3 rounded-lg border backdrop-blur-sm"
                                style={{ 
                                    backgroundColor: theme.cardBg,
                                    borderColor: theme.border 
                                }}
                            >
                                <div className="flex items-center gap-3">
                                    <div 
                                        className="w-1 h-8 rounded-full" 
                                        style={{ backgroundColor: isImp ? '#ef4444' : PLAYER_COLORS[idx % PLAYER_COLORS.length] }} 
                                    />
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-sm" style={{ color: theme.text }}>{p.name}</span>
                                            {isImp && <span className="text-[8px] px-1 rounded bg-red-500/20 text-red-500 font-black">IMP</span>}
                                            {p.isArchitect && <span className="text-[8px] px-1 rounded bg-yellow-500/20 text-yellow-600 font-black">ARQ</span>}
                                        </div>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <Timer size={10} style={{ color: theme.sub }} />
                                            <span className="text-[10px] font-mono" style={{ color: theme.sub }}>{(p.viewTime / 1000).toFixed(1)}s</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <span 
                                        className="text-[9px] font-bold uppercase tracking-wide block"
                                        style={{ color: suspicion.color }}
                                    >
                                        {suspicion.label}
                                    </span>
                                    {/* Mini bar chart visual */}
                                    <div className="w-16 h-1 rounded-full mt-1 overflow-hidden ml-auto" style={{ backgroundColor: theme.border }}>
                                        <div 
                                            className="h-full rounded-full"
                                            style={{ 
                                                width: `${Math.min((p.viewTime / (avgViewTime * 2)) * 100, 100)}%`,
                                                backgroundColor: suspicion.color 
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* 4. ACTIONS */}
            <div className="w-full max-w-sm mt-8 grid grid-cols-2 gap-3">
                <button 
                    onClick={onBack}
                    style={{ borderColor: theme.border, color: theme.text }}
                    className="py-4 rounded-xl border font-bold uppercase tracking-widest text-xs hover:opacity-70 transition-all"
                >
                    Menú Principal
                </button>
                <button 
                    onClick={onReplay}
                    style={{ backgroundColor: theme.accent, color: '#ffffff' }}
                    className="py-4 rounded-xl font-black uppercase tracking-widest text-xs shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                    <RotateCcw size={16} strokeWidth={3} /> Nueva Misión
                </button>
            </div>

            {/* Animations Styles */}
            <style>{`
                @keyframes scan {
                    0% { top: -20%; opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { top: 120%; opacity: 0; }
                }
            `}</style>
        </div>
    );
};


// --- MAIN APP COMPONENT ---

function App() {
    // -- State --
    // Diseño "andaluz" activado por defecto
    const [themeName, setThemeName] = useState<ThemeName>('illojuan');
    const theme = THEMES[themeName];
    
    // -- Initialization with Persistence for INFINITUM VAULT & LEXICON --
    const [gameState, setGameState] = useState<GameState>(() => {
        // Default History
        let loadedHistory = { 
            roundCounter: 0,
            lastWords: [],
            lastCategories: [],
            globalWordUsage: {},
            playerStats: {}, // Infinity Vault
            lastTrollRound: -10,
            lastArchitectRound: -999,
            lastStartingPlayers: []
        };

        // Try to recover The Infinity Vault from LocalStorage
        try {
            const savedVault = localStorage.getItem('impostor_infinite_vault_v6');
            if (savedVault) {
                const parsed = JSON.parse(savedVault);
                // Validation and Migration for LEXICON structure
                if (parsed.playerStats) {
                    loadedHistory = {
                        ...loadedHistory, // Ensure defaults for new fields
                        ...parsed,
                        globalWordUsage: parsed.globalWordUsage || {},
                        lastCategories: parsed.lastCategories || [],
                        lastArchitectRound: parsed.lastArchitectRound || -999,
                        lastStartingPlayers: parsed.lastStartingPlayers || []
                    };
                }
            }
        } catch (e) {
            console.error("Protocol Infinitum: Memory Corrupted. Resetting Vault.", e);
        }

        return {
            phase: 'setup',
            players: DEFAULT_PLAYERS.map((name, i) => ({ id: i.toString(), name })),
            gameData: [],
            impostorCount: 1,
            currentPlayerIndex: 0,
            startingPlayer: "",
            isTrollEvent: false,
            trollScenario: null,
            isArchitectRound: false,
            history: loadedHistory,
            settings: {
                hintMode: false,
                trollMode: false,
                partyMode: false,
                architectMode: false, // Default to DISABLED
                selectedCategories: []
            },
            currentDrinkingPrompt: "",
            theme: 'illojuan'
        };
    });

    // -- Database State --
    const [savedPlayers, setSavedPlayers] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem('impostor_saved_players');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    });

    const [newPlayerName, setNewPlayerName] = useState("");
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [categoriesOpen, setCategoriesOpen] = useState(false);
    const [hasSeenCurrentCard, setHasSeenCurrentCard] = useState(false);
    
    // UI States
    const [isExiting, setIsExiting] = useState(false); 
    const [isPixelating, setIsPixelating] = useState(false); 
    
    // -- Architect State --
    const [architectOptions, setArchitectOptions] = useState<[ { categoryName: string, wordPair: CategoryData }, { categoryName: string, wordPair: CategoryData } ] | null>(null);
    const [architectRegenCount, setArchitectRegenCount] = useState(0);

    // -- Party Mode Specific State --
    const [batteryLevel, setBatteryLevel] = useState(100);
    const promptTimeoutRef = useRef<number | null>(null);

    // -- Derived State for Aesthetics --
    const currentPlayerColor = PLAYER_COLORS[gameState.currentPlayerIndex % PLAYER_COLORS.length];

    // -- Effects --

    // Battery Listener
    useEffect(() => {
        const fetchBattery = async () => {
            const level = await getBatteryLevel();
            setBatteryLevel(level);
        };
        fetchBattery();
        // Poll battery every minute
        const interval = setInterval(fetchBattery, 60000);
        return () => clearInterval(interval);
    }, []);

    // Save players to local storage
    useEffect(() => {
        localStorage.setItem('impostor_saved_players', JSON.stringify(savedPlayers));
    }, [savedPlayers]);

    // PERSISTENCE: Save The Infinity Vault & Lexicon Data whenever history changes
    useEffect(() => {
        localStorage.setItem('impostor_infinite_vault_v6', JSON.stringify(gameState.history));
    }, [gameState.history]);

    // Helper to set ephemeral party prompt (8 seconds)
    const triggerPartyMessage = (phase: 'setup' | 'revealing' | 'discussion' | 'results', winState?: 'civil' | 'impostor' | 'troll') => {
        if (!gameState.settings.partyMode) return;
        
        // Clear existing timeout
        if (promptTimeoutRef.current) {
            clearTimeout(promptTimeoutRef.current);
        }

        const msg = getPartyMessage(phase, gameState, batteryLevel, winState);
        
        setGameState(prev => ({ ...prev, currentDrinkingPrompt: msg }));

        // Auto-dismiss after 8 seconds
        promptTimeoutRef.current = window.setTimeout(() => {
            setGameState(prev => ({ ...prev, currentDrinkingPrompt: "" }));
        }, 8000);
    };

    // Periodic Party Prompts for Setup & Discussion
    useEffect(() => {
        if (!gameState.settings.partyMode) return;

        const interval = setInterval(() => {
            // Discussion phase is removed from main flow, but kept in types just in case.
            // Keeping setup prompt logic.
            if (gameState.phase === 'setup') {
                 triggerPartyMessage(gameState.phase);
                 if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
            }
        }, 120000); // Every 2 minutes

        return () => clearInterval(interval);
    }, [gameState.settings.partyMode, gameState.phase, batteryLevel]);


    // -- Handlers --

    const startGame = () => {
        if (gameState.players.length < 3) return;

        // Generate data returns the updated history including new drought stats
        const { players, isTrollEvent, trollScenario, isArchitectTriggered, newHistory, designatedStarter } = generateGameData({
            players: gameState.players,
            impostorCount: gameState.impostorCount,
            useHintMode: gameState.settings.hintMode,
            useTrollMode: gameState.settings.trollMode,
            useArchitectMode: gameState.settings.architectMode,
            selectedCats: gameState.settings.selectedCategories,
            history: gameState.history 
        });

        // Use the Vocalis designated starter
        const startingPlayer = designatedStarter;

        // -- ARCHITECT FLOW INTERCEPTION --
        if (isArchitectTriggered) {
            // Find first civil to be the Architect
            const firstCivilIndex = players.findIndex(p => !p.isImp);
            
            if (firstCivilIndex !== -1) {
                players[firstCivilIndex].isArchitect = true;
                
                // Set Architect as current player (he sees selection screen first)
                // Generate initial options for curation
                const initialOptions = generateArchitectOptions(gameState.settings.selectedCategories);
                setArchitectOptions(initialOptions);
                setArchitectRegenCount(0);

                setGameState(prev => ({
                    ...prev,
                    phase: 'architect',
                    gameData: players,
                    isTrollEvent,
                    trollScenario,
                    isArchitectRound: true,
                    currentPlayerIndex: firstCivilIndex, // Architect goes first
                    startingPlayer,
                    history: newHistory,
                    currentDrinkingPrompt: ""
                }));
                setIsExiting(false);
                setIsPixelating(false);
                return; // Stop here, wait for Architect confirmation
            }
        }

        // -- STANDARD FLOW --
        setGameState(prev => ({
            ...prev,
            phase: 'revealing',
            gameData: players,
            isTrollEvent,
            trollScenario,
            isArchitectRound: false,
            currentPlayerIndex: 0,
            startingPlayer,
            history: newHistory, 
            currentDrinkingPrompt: ""
        }));
        setHasSeenCurrentCard(false);
        setIsExiting(false);
        setIsPixelating(false);
    };

    // Handler for Architect Selection
    const handleArchitectRegenerate = () => {
        if (architectRegenCount >= 3) return;
        setArchitectRegenCount(prev => prev + 1);
        const newOptions = generateArchitectOptions(gameState.settings.selectedCategories);
        setArchitectOptions(newOptions);
    };

    const handleArchitectConfirm = (selection: { categoryName: string, wordPair: CategoryData }) => {
        
        // Apply selected word to game data
        const updatedGameData = gameState.gameData.map(p => {
            // Calculate Hint for Impostor (Hidden from Architect UI)
            const hint = generateSmartHint(selection.wordPair);
            let displayWord = selection.wordPair.civ;
            
            if (p.isImp) {
                displayWord = gameState.settings.hintMode ? `PISTA: ${hint}` : "ERES EL IMPOSTOR";
            }

            return {
                ...p,
                word: displayWord,
                realWord: selection.wordPair.civ,
                category: selection.categoryName
            };
        });

        // Update History to reflect the manually chosen word
        const updatedHistory = { ...gameState.history };
        updatedHistory.lastWords = [selection.wordPair.civ, ...updatedHistory.lastWords].slice(0, 15);
        updatedHistory.lastCategories = [selection.categoryName, ...updatedHistory.lastCategories].slice(0, 3);
        updatedHistory.globalWordUsage[selection.wordPair.civ] = (updatedHistory.globalWordUsage[selection.wordPair.civ] || 0) + 1;

        // Transition to revealing phase
        setGameState(prev => ({
            ...prev,
            phase: 'revealing',
            gameData: updatedGameData,
            history: updatedHistory,
            // Architect keeps current index, will see their card next
        }));
        setHasSeenCurrentCard(false);
    };

    const handleNextPlayer = (viewTime: number) => {
        if (isExiting) return;

        // Save view time for current player
        setGameState(prev => {
            const newData = [...prev.gameData];
            if (newData[prev.currentPlayerIndex]) {
                newData[prev.currentPlayerIndex].viewTime = viewTime;
            }
            return { ...prev, gameData: newData };
        });

        // Trigger Party Message between turns (Revealing phase)
        if (gameState.settings.partyMode && gameState.currentPlayerIndex < gameState.players.length - 1) {
             triggerPartyMessage('revealing');
        }

        setIsExiting(true);

        setTimeout(() => {
            if (gameState.currentPlayerIndex < gameState.players.length - 1) {
                setGameState(prev => ({ ...prev, currentPlayerIndex: prev.currentPlayerIndex + 1 }));
                setHasSeenCurrentCard(false);
            } else {
                // DIRECTLY TO RESULTS (Skip Discussion)
                setGameState(prev => ({ 
                    ...prev, 
                    phase: 'results',
                    currentDrinkingPrompt: "" 
                }));
                // Trigger results message
                if (gameState.settings.partyMode) {
                    let winState: 'troll' | 'impostor' | 'civil' = Math.random() > 0.5 ? 'impostor' : 'civil';
                    if (gameState.isTrollEvent) winState = 'troll';
                    setTimeout(() => triggerPartyMessage('results', winState), 500);
                }
            }
            setIsExiting(false);
        }, 300);
    };

    const handleBackToSetup = () => {
        setIsPixelating(true);
        setTimeout(() => {
            setGameState(prev => ({...prev, phase: 'setup', currentDrinkingPrompt: ""}));
            setIsPixelating(false);
        }, 800);
    };

    const handleReplay = () => {
        setIsPixelating(true);
        setTimeout(() => {
            startGame();
        }, 800);
    };

    const addPlayer = (name: string = newPlayerName) => {
        if (!name.trim()) return;
        if (gameState.players.some(p => p.name.toLowerCase() === name.trim().toLowerCase())) return;

        const newPlayer: Player = { id: Date.now().toString() + Math.random(), name: name.trim() };
        setGameState(prev => ({ ...prev, players: [...prev.players, newPlayer] }));
        if (name === newPlayerName) setNewPlayerName("");
    };

    const removePlayer = (id: string) => {
        setGameState(prev => ({ ...prev, players: prev.players.filter(p => p.id !== id) }));
    };

    // -- Database Handlers --
    const saveToBank = () => {
        if (!newPlayerName.trim()) return;
        const name = newPlayerName.trim();
        if (!savedPlayers.includes(name)) {
            setSavedPlayers(prev => [...prev, name]);
        }
        setNewPlayerName("");
    };

    const deleteFromBank = (name: string) => {
        setSavedPlayers(prev => prev.filter(p => p !== name));
    };

    const toggleCategory = (cat: string) => {
        setGameState(prev => {
            const current = prev.settings.selectedCategories;
            const updated = current.includes(cat) 
                ? current.filter(c => c !== cat) 
                : [...current, cat];
            return { ...prev, settings: { ...prev.settings, selectedCategories: updated } };
        });
    };

    const toggleAllCategories = () => {
        const allCats = Object.keys(CATEGORIES_DATA);
        const currentCount = gameState.settings.selectedCategories.length;
        const allSelected = currentCount === allCats.length;

        setGameState(prev => ({
            ...prev,
            settings: {
                ...prev.settings,
                selectedCategories: allSelected ? [] : allCats
            }
        }));
    };

    const togglePartyMode = () => {
        setGameState(prev => {
            const newPartyMode = !prev.settings.partyMode;
            if (newPartyMode) {
                setThemeName('nightclub');
                // Trigger immediate setup message
                setTimeout(() => triggerPartyMessage('setup'), 500);
            } else {
                setThemeName('illojuan'); 
                setGameState(p => ({...p, currentDrinkingPrompt: ""}));
            }
            return {
                ...prev,
                settings: { ...prev.settings, partyMode: newPartyMode }
            };
        });
    };

    // -- Renders --

    const renderSetup = () => {
        const isValidToStart = gameState.players.length >= 3;
        const isParty = gameState.settings.partyMode;

        return (
            <div className={`flex flex-col h-full relative z-10 animate-in fade-in duration-500 pt-[env(safe-area-inset-top)] ${isPixelating ? 'animate-dissolve' : ''}`}>
                 {/* PARTY NOTIFICATION OVERLAY */}
                 {isParty && gameState.currentDrinkingPrompt && (
                    <div className="absolute top-20 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
                         <PartyNotification 
                            key={gameState.currentDrinkingPrompt} // Re-mounts to trigger animation
                            prompt={gameState.currentDrinkingPrompt} 
                            theme={theme} 
                        />
                    </div>
                )}

                <div className="flex-1 overflow-y-auto px-6 pb-48 space-y-6">
                    <header className="pt-6 text-center space-y-2 mb-2">
                        <h1 style={{ color: theme.text, fontFamily: theme.font }} className="text-5xl font-black italic tracking-tighter">IMPOSTOR</h1>
                        {isParty && <p style={{ color: theme.accent }} className="text-xs font-black uppercase tracking-[0.3em] animate-pulse">DRINKING EDITION</p>}
                    </header>

                    {/* Players Section */}
                    <div 
                        style={{ 
                            backgroundColor: theme.cardBg, 
                            borderColor: theme.border, 
                            borderRadius: theme.radius,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                        }} 
                        className="p-5 border backdrop-blur-md"
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h3 style={{ color: theme.sub }} className="text-xs font-black uppercase tracking-widest">Jugadores ({gameState.players.length})</h3>
                            <Users size={16} color={theme.accent} />
                        </div>
                        
                        <div className="space-y-2 mb-4">
                            {gameState.players.map(p => (
                                <div key={p.id} style={{ backgroundColor: theme.border }} className="flex justify-between items-center p-3 rounded-lg animate-in slide-in-from-left duration-300">
                                    <span style={{ color: theme.text }} className="font-bold">{p.name}</span>
                                    <button onClick={() => removePlayer(p.id)} style={{ color: theme.sub }} className="hover:text-red-500 transition-colors">
                                        <X size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-2 mb-4">
                            <input 
                                value={newPlayerName}
                                onChange={(e) => setNewPlayerName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addPlayer()}
                                placeholder="Nuevo Jugador..."
                                className="flex-1 min-w-0 rounded-lg px-4 py-3 outline-none text-sm font-bold border border-transparent focus:border-white/30 transition-colors placeholder:text-inherit placeholder:opacity-40"
                                style={{ backgroundColor: theme.border, color: theme.text }}
                            />
                            <button 
                                onClick={saveToBank}
                                style={{ backgroundColor: theme.border, color: theme.sub }}
                                className="w-12 rounded-lg font-bold hover:bg-white/10 active:scale-90 transition-transform flex items-center justify-center shrink-0"
                                title="Guardar en banco"
                            >
                                <Save size={20} />
                            </button>
                            <button 
                                onClick={() => addPlayer()}
                                style={{ backgroundColor: theme.accent }}
                                className="w-12 rounded-lg text-white font-bold active:scale-90 transition-transform shadow-lg flex items-center justify-center shrink-0"
                            >
                                <Check size={24} />
                            </button>
                        </div>

                        {savedPlayers.length > 0 && (
                             <div className="mt-6 pt-4 border-t border-white/5">
                                <div className="flex items-center gap-2 mb-3">
                                    <Database size={12} color={theme.sub}/>
                                    <h4 style={{ color: theme.sub }} className="text-[10px] font-black uppercase tracking-widest">Banco de Agentes</h4>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {savedPlayers.map((name, idx) => {
                                        const isInGame = gameState.players.some(p => p.name === name);
                                        return (
                                            <div 
                                                key={idx}
                                                style={{ 
                                                    backgroundColor: isInGame ? theme.accent : theme.border,
                                                    opacity: isInGame ? 0.5 : 1,
                                                    borderColor: theme.border
                                                }}
                                                className="pl-3 pr-1 py-1.5 rounded-full border flex items-center gap-2 transition-all"
                                            >
                                                <button 
                                                    onClick={() => !isInGame && addPlayer(name)}
                                                    disabled={isInGame}
                                                    style={{ color: isInGame ? 'white' : theme.text }}
                                                    className="text-xs font-bold disabled:cursor-not-allowed"
                                                >
                                                    {name}
                                                </button>
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        deleteFromBank(name);
                                                    }}
                                                    className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-white/10"
                                                    style={{ color: theme.sub }}
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                             </div>
                        )}
                    </div>

                    <div 
                        style={{ 
                            backgroundColor: theme.cardBg, 
                            borderColor: theme.border, 
                            borderRadius: theme.radius,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                        }} 
                        className="p-5 border backdrop-blur-md space-y-6"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p style={{ color: theme.sub }} className="text-xs font-black uppercase tracking-widest">Impostores</p>
                            </div>
                            <div style={{ backgroundColor: theme.border }} className="flex items-center gap-4 rounded-lg p-1">
                                <button 
                                    onClick={() => setGameState(prev => ({...prev, impostorCount: Math.max(1, prev.impostorCount - 1)}))}
                                    style={{ color: theme.text }}
                                    className="w-8 h-8 flex items-center justify-center font-bold hover:opacity-70 active:scale-75 transition-transform rounded"
                                >-</button>
                                <span style={{ color: theme.text }} className="font-bold w-4 text-center">{gameState.impostorCount}</span>
                                <button 
                                    onClick={() => setGameState(prev => ({...prev, impostorCount: Math.min(gameState.players.length - 1, prev.impostorCount + 1)}))}
                                    style={{ color: theme.text }}
                                    className="w-8 h-8 flex items-center justify-center font-bold hover:opacity-70 active:scale-75 transition-transform rounded"
                                >+</button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <p style={{ color: theme.text }} className="text-sm font-bold">Modo Pista</p>
                                <p style={{ color: theme.sub }} className="text-[10px]">El impostor recibe una pista genérica</p>
                            </div>
                            <button 
                                onClick={() => setGameState(prev => ({...prev, settings: {...prev.settings, hintMode: !prev.settings.hintMode}}))}
                                style={{ backgroundColor: gameState.settings.hintMode ? theme.accent : theme.border }}
                                className="w-12 h-6 rounded-full relative transition-colors active:scale-90 transform-gpu"
                            >
                                <div className={`w-4 h-4 bg-white shadow-md rounded-full absolute top-1 transition-all ${gameState.settings.hintMode ? 'left-7' : 'left-1'}`} />
                            </button>
                        </div>

                        <div className="flex items-center justify-between">
                             <div className="space-y-1">
                                <p style={{ color: theme.text }} className="text-sm font-bold flex items-center gap-2">
                                    Modo Troll <Ghost size={12}/>
                                </p>
                                <p style={{ color: theme.sub }} className="text-[10px]">15% prob. Protocolo Pandora</p>
                            </div>
                             <button 
                                onClick={() => setGameState(prev => ({...prev, settings: {...prev.settings, trollMode: !prev.settings.trollMode}}))}
                                style={{ backgroundColor: gameState.settings.trollMode ? theme.accent : theme.border }}
                                className="w-12 h-6 rounded-full relative transition-colors active:scale-90 transform-gpu"
                            >
                                <div className={`w-4 h-4 bg-white shadow-md rounded-full absolute top-1 transition-all ${gameState.settings.trollMode ? 'left-7' : 'left-1'}`} />
                            </button>
                        </div>

                        <div className="flex items-center justify-between">
                             <div className="space-y-1">
                                <p style={{ color: theme.text }} className="text-sm font-bold flex items-center gap-2">
                                    Modo Arquitecto <ShieldCheck size={12}/>
                                </p>
                                <p style={{ color: theme.sub }} className="text-[10px]">Curaduría Ciega (15% prob.)</p>
                            </div>
                             <button 
                                onClick={() => setGameState(prev => ({...prev, settings: {...prev.settings, architectMode: !prev.settings.architectMode}}))}
                                style={{ backgroundColor: gameState.settings.architectMode ? theme.accent : theme.border }}
                                className="w-12 h-6 rounded-full relative transition-colors active:scale-90 transform-gpu"
                            >
                                <div className={`w-4 h-4 bg-white shadow-md rounded-full absolute top-1 transition-all ${gameState.settings.architectMode ? 'left-7' : 'left-1'}`} />
                            </button>
                        </div>
                    </div>

                    <button 
                        onClick={() => setCategoriesOpen(true)}
                        style={{ 
                            borderColor: theme.border, 
                            color: theme.text, 
                            backgroundColor: theme.cardBg, 
                            borderRadius: theme.radius,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                        }}
                        className="w-full py-4 border flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest hover:opacity-80 active:scale-95 transition-all backdrop-blur-md transform-gpu"
                    >
                        <LayoutGrid size={16} /> Categorías de palabras
                    </button>

                    <button 
                        onClick={() => setSettingsOpen(true)}
                        style={{ 
                            borderColor: theme.border, 
                            color: theme.sub,
                            backgroundColor: theme.border,
                            borderRadius: theme.radius,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                        }}
                        className="w-full py-4 border flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest hover:opacity-80 active:scale-95 transition-all backdrop-blur-md transform-gpu"
                    >
                        <Settings size={16} /> Ajustes
                    </button>
                </div>

                <div className="fixed bottom-0 left-0 w-full p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] z-20 pointer-events-none flex justify-center items-center">
                    <div className="relative w-full max-w-xs group">
                        {isValidToStart && (
                            <div
                                className="absolute inset-1 rounded-full opacity-50 blur-xl"
                                style={{
                                    backgroundColor: theme.accent,
                                    animation: 'aura-pulse 2s ease-in-out infinite'
                                }}
                            />
                        )}

                        <button 
                            onClick={startGame}
                            disabled={!isValidToStart}
                            style={{ 
                                backgroundColor: !isValidToStart ? 'gray' : theme.accent,
                                boxShadow: '0 0 0 1px rgba(255,255,255,0.1)'
                            }}
                            className="w-full py-3.5 relative z-10 text-white font-black text-base active:scale-90 transition-all duration-100 flex items-center justify-center gap-3 pointer-events-auto rounded-full overflow-hidden transform-gpu"
                        >
                            {isValidToStart && (
                                <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite]" 
                                     style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)' }} 
                                />
                            )}
                            
                            <span className="relative z-10 flex items-center gap-3">
                                {isParty ? "COMENZAR EL BOTELLÓN" : "EMPEZAR PARTIDA"} <ChevronRight strokeWidth={4} size={20} />
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const renderReveal = () => {
        const cardColor = currentPlayerColor;
        const isLastPlayer = gameState.currentPlayerIndex === gameState.players.length - 1;
        const isParty = gameState.settings.partyMode;

        const auraExplosion = isExiting && (
            <div className="fixed inset-0 z-0 flex items-center justify-center pointer-events-none">
                <div 
                    style={{
                        backgroundColor: cardColor,
                        animation: 'aura-expand 0.6s ease-out forwards',
                    }}
                    className="w-64 h-64 rounded-full blur-3xl opacity-80"
                />
            </div>
        );

        return (
            <div className="flex flex-col h-full items-center justify-center p-6 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-[calc(1.5rem+env(safe-area-inset-bottom))] relative z-10">
                {auraExplosion}
                
                {/* PARTY NOTIFICATION OVERLAY */}
                {isParty && gameState.currentDrinkingPrompt && (
                    <div className="absolute top-20 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
                         <PartyNotification 
                            key={gameState.currentDrinkingPrompt}
                            prompt={gameState.currentDrinkingPrompt} 
                            theme={theme} 
                        />
                    </div>
                )}

                <div 
                    key={gameState.currentPlayerIndex} 
                    className={`w-full max-w-sm flex flex-col items-center ${isExiting ? 'card-exit' : 'card-enter'}`}
                >
                    <IdentityCard 
                        player={gameState.gameData[gameState.currentPlayerIndex]}
                        theme={theme}
                        color={cardColor}
                        onRevealStart={() => {}}
                        onRevealEnd={() => setHasSeenCurrentCard(true)}
                        nextAction={handleNextPlayer}
                        readyForNext={hasSeenCurrentCard}
                        isLastPlayer={isLastPlayer}
                        isParty={gameState.settings.partyMode}
                    />
                </div>
                
                <div className="mt-auto mb-4 text-center opacity-50 space-y-2 shrink-0">
                     <p style={{ color: theme.sub }} className="text-[10px] uppercase tracking-widest">
                        Jugador {gameState.currentPlayerIndex + 1} de {gameState.players.length}
                    </p>
                    <div className="flex gap-2 justify-center items-center h-4">
                        {gameState.players.map((_, i) => {
                            const isActive = i === gameState.currentPlayerIndex;
                            const isPast = i < gameState.currentPlayerIndex;
                            return (
                                <div 
                                    key={i} 
                                    style={{ 
                                        backgroundColor: isActive || isPast
                                            ? PLAYER_COLORS[i % PLAYER_COLORS.length] 
                                            : 'rgba(255,255,255,0.2)',
                                        animation: isActive ? 'echo-pulse 2s cubic-bezier(0, 0, 0.2, 1) infinite' : 'none',
                                        boxShadow: isActive ? `0 0 10px ${PLAYER_COLORS[i % PLAYER_COLORS.length]}` : 'none'
                                    }}
                                    className={`rounded-full transition-all duration-500 ${isActive ? 'w-3 h-3' : 'w-1.5 h-1.5'}`}
                                />
                            );
                        })}
                    </div>
                </div>
                <style>{`
                    .card-enter { animation: slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                    .card-exit { animation: slideOutLeft 0.3s cubic-bezier(0.7, 0, 0.84, 0) forwards; }
                    @keyframes slideInRight {
                        from { opacity: 0; transform: translateX(100px) scale(0.95) rotate(2deg); filter: blur(4px); }
                        to { opacity: 1; transform: translateX(0) scale(1) rotate(0deg); filter: blur(0); }
                    }
                    @keyframes slideOutLeft {
                        from { opacity: 1; transform: translateX(0) scale(1) rotate(0deg); filter: blur(0); }
                        to { opacity: 0; transform: translateX(-100px) scale(0.95) rotate(-2deg); filter: blur(4px); }
                    }
                    @keyframes aura-expand {
                        0% { transform: scale(0.5); opacity: 0; }
                        30% { opacity: 0.6; }
                        100% { transform: scale(20); opacity: 0; }
                    }
                `}</style>
            </div>
        );
    };

    const renderDiscussion = () => {
        return (
            <div className="flex flex-col h-full items-center justify-center p-6 relative z-10 animate-in fade-in">
                <div className="text-center mb-8">
                     <Ghost size={48} className="mx-auto mb-4 opacity-50" style={{ color: theme.accent }} />
                     <h2 style={{ color: theme.text, fontFamily: theme.font }} className="text-4xl font-black uppercase tracking-tighter mb-2">
                        DEBATE
                    </h2>
                    <p style={{ color: theme.sub }} className="text-xs font-bold uppercase tracking-widest">
                        ¿Quién es el impostor?
                    </p>
                </div>

                <button 
                    onClick={() => setGameState(prev => ({ ...prev, phase: 'results' }))}
                    style={{ 
                        backgroundColor: theme.accent,
                        boxShadow: `0 0 20px ${theme.accent}40`
                    }}
                    className="px-8 py-4 rounded-full font-black text-white uppercase tracking-widest text-sm active:scale-95 transition-transform"
                >
                    Ver Veredicto
                </button>
            </div>
        );
    };

    const renderDrawer = () => (
        <div className={`fixed inset-0 z-50 transform transition-transform duration-300 ${settingsOpen ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSettingsOpen(false)} />
            <div style={{ backgroundColor: theme.bg }} className="absolute right-0 h-full w-80 shadow-2xl p-6 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-[calc(1.5rem+env(safe-area-inset-bottom))] overflow-y-auto flex flex-col border-l border-white/10">
                <div className="flex justify-between items-center mb-8">
                    <h2 style={{ color: theme.text }} className="text-2xl font-black italic">Ajustes</h2>
                    <button style={{ color: theme.text }} onClick={() => setSettingsOpen(false)}><X /></button>
                </div>

                <div className="mb-8 p-4 rounded-xl border border-dashed border-pink-500/50 bg-pink-500/10">
                     <div className="flex items-center justify-between">
                         <div className="space-y-1">
                            <p className="text-sm font-black text-pink-400 flex items-center gap-2">
                                MODO FIESTA <Beer size={14}/>
                            </p>
                            <p className="text-[10px] text-pink-300/70">Drinking Edition (Nightclub Theme)</p>
                        </div>
                         <button 
                            onClick={togglePartyMode}
                            style={{ backgroundColor: gameState.settings.partyMode ? '#ec4899' : 'rgba(255,255,255,0.1)' }}
                            className="w-12 h-6 rounded-full relative transition-colors active:scale-90 transform-gpu"
                        >
                            <div className={`w-4 h-4 bg-white shadow-md rounded-full absolute top-1 transition-all ${gameState.settings.partyMode ? 'left-7' : 'left-1'}`} />
                        </button>
                    </div>
                </div>

                <div className="flex-1">
                    <h3 style={{ color: theme.sub }} className="text-xs font-black uppercase tracking-widest mb-4">Interfaz Visual</h3>
                    <div className="grid grid-cols-2 gap-3">
                        {(Object.keys(THEMES) as ThemeName[]).map(t => (
                            <button 
                                key={t}
                                onClick={() => {
                                    setThemeName(t);
                                }}
                                style={{ 
                                    backgroundColor: themeName === t ? THEMES[t].accent : THEMES[t].border,
                                    borderColor: THEMES[t].accent 
                                }}
                                className={`p-3 rounded border text-xs font-bold text-left transition-all ${themeName === t ? 'text-white' : 'border-transparent'}`}
                            >
                                <span style={{ color: themeName === t ? 'white' : theme.text }}>{THEMES[t].name}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Back to Home Button added inside Drawer for Navigation consistency */}
                <div className="mt-4">
                     <button 
                        onClick={() => {
                            setSettingsOpen(false);
                            handleBackToSetup();
                        }}
                        style={{ 
                            borderColor: theme.border, 
                            color: theme.sub 
                        }}
                        className="w-full py-3 border rounded-lg font-bold uppercase tracking-widest text-xs hover:bg-white/5 active:scale-95 transition-all"
                    >
                        Volver al Inicio
                    </button>
                </div>

                <div className="mt-auto pt-6 border-t border-white/10 text-center">
                    <p style={{ color: theme.sub }} className="text-[10px] font-mono opacity-50">v5.0 ARCHITECT EDITION</p>
                </div>
            </div>
        </div>
    );

    const renderCategories = () => {
        const allCats = Object.keys(CATEGORIES_DATA);
        const selected = gameState.settings.selectedCategories;
        const isNoneSelected = selected.length === 0;

        return (
            <div className={`fixed inset-0 z-50 transform transition-transform duration-300 ${categoriesOpen ? 'translate-y-0' : 'translate-y-full'}`}>
                <div style={{ backgroundColor: theme.bg }} className="absolute inset-0 flex flex-col">
                    <div className="p-6 pt-[calc(1.5rem+env(safe-area-inset-top))] flex items-center justify-between border-b border-white/10 shrink-0 bg-inherit z-10">
                        <h2 style={{ color: theme.text }} className="text-2xl font-black italic">Categorías</h2>
                        <button style={{ color: theme.text }} onClick={() => setCategoriesOpen(false)}><X /></button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="mb-6">
                             <button 
                                onClick={toggleAllCategories}
                                style={{ 
                                    borderColor: theme.accent, 
                                    color: theme.accent,
                                    backgroundColor: theme.cardBg 
                                }}
                                className="w-full py-4 border rounded-xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 backdrop-blur-md transition-all active:scale-95 transform-gpu"
                            >
                                <CheckCheck size={16} />
                                {selected.length === allCats.length ? 'Resetear (Todas Activas)' : 'Seleccionar Todo'}
                            </button>
                            {isNoneSelected && (
                                <p style={{ color: theme.sub }} className="text-center text-[10px] mt-2 font-bold uppercase tracking-widest opacity-70">
                                    Todas las categorías están activas por defecto
                                </p>
                            )}
                        </div>

                        <div className="grid grid-cols-1 gap-3 pb-32">
                            {allCats.map(cat => {
                                const isActive = selected.includes(cat);
                                return (
                                    <button
                                        key={cat}
                                        onClick={() => toggleCategory(cat)}
                                        style={{ 
                                            backgroundColor: isActive ? theme.accent : 'transparent',
                                            borderColor: isActive ? theme.accent : theme.border,
                                            color: isActive ? '#fff' : theme.text,
                                            boxShadow: isActive ? `0 4px 12px ${theme.accent}40` : 'none'
                                        }}
                                        className="p-4 rounded-xl border font-bold text-left flex justify-between items-center transition-all active:scale-95 backdrop-blur-sm transform-gpu"
                                    >
                                        <span className="opacity-90 text-sm uppercase tracking-wide">{cat}</span>
                                        {isActive && <Check size={18} strokeWidth={3} />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div 
            style={{ backgroundColor: theme.bg, color: theme.text }} 
            className="w-full h-full relative overflow-hidden transition-colors duration-700"
        >
            <Background 
                theme={theme} 
                phase={gameState.phase} 
                isTroll={gameState.isTrollEvent} 
                activeColor={currentPlayerColor} 
                isParty={gameState.settings.partyMode}
            />
            
            {gameState.phase === 'setup' && renderSetup()}
            
            {/* ARCHITECT CURATION PHASE */}
            {gameState.phase === 'architect' && architectOptions && (
                <ArchitectCuration 
                    architect={gameState.gameData[gameState.currentPlayerIndex]}
                    currentOptions={architectOptions}
                    onRegenerate={handleArchitectRegenerate}
                    onConfirm={handleArchitectConfirm}
                    regenCount={architectRegenCount}
                    theme={theme}
                />
            )}

            {gameState.phase === 'revealing' && renderReveal()}
            {/* Discussion phase is effectively skipped, but render kept for type safety or future use */}
            {gameState.phase === 'discussion' && renderDiscussion()} 
            {gameState.phase === 'results' && (
                <ResultsView 
                    gameState={gameState} 
                    theme={theme} 
                    onBack={handleBackToSetup} 
                    onReplay={handleReplay} 
                />
            )}
            
            {renderDrawer()}
            {renderCategories()}
            
            {/* Global Keyframes for new effects */}
            <style>{`
                @keyframes particle-flow {
                    0% { background-position: 0 0; }
                    100% { background-position: 20px 20px; }
                }
                @keyframes echo-pulse {
                    0% { box-shadow: 0 0 0 0px currentColor; opacity: 1; transform: scale(1.2); }
                    70% { box-shadow: 0 0 0 10px transparent; opacity: 1; transform: scale(1); }
                    100% { box-shadow: 0 0 0 0 transparent; opacity: 1; transform: scale(1); }
                }
                @keyframes heartbeat {
                    0% { transform: scale(1); text-shadow: 0 0 0 transparent; }
                    15% { transform: scale(1.1); text-shadow: 0 0 20px currentColor; }
                    30% { transform: scale(1); text-shadow: 0 0 10px currentColor; }
                    45% { transform: scale(1.1); text-shadow: 0 0 20px currentColor; }
                    60% { transform: scale(1); text-shadow: 0 0 0 transparent; }
                }
                @keyframes dissolve {
                    0% { filter: blur(0px) brightness(1); opacity: 1; transform: scale(1); }
                    50% { filter: blur(4px) brightness(1.5); opacity: 0.8; transform: scale(1.02); }
                    100% { filter: blur(20px) brightness(5); opacity: 0; transform: scale(1.1); }
                }
                .animate-dissolve {
                    animation: dissolve 0.8s cubic-bezier(0.7, 0, 0.84, 0) forwards;
                }
                
                @keyframes aura-spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes aura-pulse {
                    0%, 100% { transform: scale(0.95); opacity: 0.5; }
                    50% { transform: scale(1.05); opacity: 0.8; }
                }
                @keyframes shimmer {
                    100% { transform: translateX(100%); }
                }
                @keyframes scan {
                    0% { top: -100%; }
                    100% { top: 200%; }
                }
                @keyframes scan_1s_infinite_linear {
                    0% { top: 0%; }
                    100% { top: 100%; }
                }
            `}</style>
        </div>
    );
}

export default App;