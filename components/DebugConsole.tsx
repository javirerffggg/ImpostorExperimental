
import React, { useMemo } from 'react';
import { GameState, TrollScenario } from '../types';
import { getDebugPlayerStats } from '../utils/gameLogic';
import { Terminal, Database, AlertTriangle, ShieldCheck, RefreshCcw, Trash2, Power, Eye, Activity } from 'lucide-react';

interface Props {
    gameState: GameState;
    setGameState: React.Dispatch<React.SetStateAction<GameState>>;
}

export const DebugConsole: React.FC<Props> = ({ gameState, setGameState }) => {
    if (!gameState.debugState.isEnabled) return null;

    // Calculate real-time weights for the HUD
    const playerStats = useMemo(() => {
        return getDebugPlayerStats(gameState.players, gameState.history.playerStats, gameState.history.roundCounter);
    }, [gameState.players, gameState.history.playerStats, gameState.history.roundCounter]);

    const toggleForceTroll = (scenario: TrollScenario) => {
        setGameState(prev => ({
            ...prev,
            debugState: {
                ...prev.debugState,
                forceTroll: prev.debugState.forceTroll === scenario ? null : scenario
            }
        }));
    };

    const toggleForceArchitect = () => {
        setGameState(prev => ({
            ...prev,
            debugState: {
                ...prev.debugState,
                forceArchitect: !prev.debugState.forceArchitect
            }
        }));
    };

    const resetPlayerVault = (playerName: string) => {
        setGameState(prev => {
            const key = playerName.trim().toLowerCase();
            const newStats = { ...prev.history.playerStats };
            if (newStats[key]) {
                newStats[key] = {
                    ...newStats[key],
                    metrics: {
                        ...newStats[key].metrics,
                        civilStreak: 0,
                        impostorRatio: 0.1,
                        quarantineRounds: 0
                    }
                };
            }
            return { ...prev, history: { ...prev.history, playerStats: newStats } };
        });
    };

    const godModeVault = (playerName: string) => {
        setGameState(prev => {
            const key = playerName.trim().toLowerCase();
            const newStats = { ...prev.history.playerStats };
            if (newStats[key]) {
                newStats[key] = {
                    ...newStats[key],
                    metrics: {
                        ...newStats[key].metrics,
                        civilStreak: 50,
                        impostorRatio: 0.01
                    }
                };
            }
            return { ...prev, history: { ...prev.history, playerStats: newStats } };
        });
    };

    // Paranoia Visualization
    const pLevel = gameState.history.paranoiaLevel || 0;
    let pColor = "text-green-500";
    if (pLevel > 30) pColor = "text-amber-500";
    if (pLevel > 70) pColor = "text-red-500";

    const cooling = gameState.history.coolingDownRounds || 0;

    return (
        <div className="fixed top-0 left-0 w-full z-[100] bg-black/90 border-b border-amber-500/30 backdrop-blur-lg p-2 font-mono text-[10px] text-amber-500 shadow-2xl animate-in slide-in-from-top duration-300 max-h-[50vh] overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-2 border-b border-amber-500/20 pb-1">
                <div className="flex items-center gap-2">
                    <Terminal size={12} className="animate-pulse" />
                    <span className="font-bold tracking-widest">CENTINELA v6.1</span>
                </div>
                <div className="flex gap-2 text-xs">
                    <span>VAULT: {Object.keys(gameState.history.playerStats).length}</span>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                {/* LEFT COL: INFINITUM METRICS */}
                <div>
                    <h4 className="text-amber-300 font-bold mb-1 flex items-center gap-1">
                        <Database size={10} /> INFINITUM (ESTIMATED)
                    </h4>
                    <div className="bg-amber-900/10 rounded p-1 border border-amber-500/10">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="opacity-50">
                                    <th>ID</th>
                                    <th>WGHT</th>
                                    <th>STRK</th>
                                    <th>Q</th>
                                    <th>ACT</th>
                                </tr>
                            </thead>
                            <tbody>
                                {playerStats.map(p => {
                                    const vault = gameState.history.playerStats[p.name.toLowerCase()];
                                    const isQuarantined = vault?.metrics.quarantineRounds > 0;
                                    return (
                                        <tr key={p.name} className={`border-t border-amber-500/5 ${isQuarantined ? 'opacity-50 line-through' : ''}`}>
                                            <td className="py-0.5 font-bold truncate max-w-[50px]">{p.name}</td>
                                            <td className="text-amber-200">{p.weight}</td>
                                            <td>{p.streak}</td>
                                            <td>{isQuarantined ? vault.metrics.quarantineRounds : '-'}</td>
                                            <td className="flex gap-1">
                                                <button onClick={() => resetPlayerVault(p.name)} title="Reset" className="hover:text-white"><RefreshCcw size={8}/></button>
                                                <button onClick={() => godModeVault(p.name)} title="God Mode" className="hover:text-red-400"><Power size={8}/></button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* RIGHT COL: PARANOIA & TRIGGERS */}
                <div className="space-y-2">
                    
                    {/* PARANOIA ENGINE */}
                    <div className="bg-black/40 p-2 rounded border border-white/5">
                        <h4 className="text-white/80 font-bold mb-1 flex items-center gap-1">
                            <Activity size={10} /> PARANOIA NETWORK
                        </h4>
                        <div className="flex items-center justify-between mb-1">
                            <span>ALERT LEVEL:</span>
                            <span className={`font-black ${pColor}`}>{pLevel}%</span>
                        </div>
                        <div className="w-full bg-gray-800 h-1 rounded overflow-hidden mb-2">
                            <div className="h-full transition-all duration-500" style={{ width: `${pLevel}%`, backgroundColor: pLevel > 70 ? '#ef4444' : (pLevel > 30 ? '#f59e0b' : '#22c55e') }} />
                        </div>
                        
                        <div className="flex justify-between items-center text-[9px] opacity-70">
                            <span>COOLING: {cooling > 0 ? <span className="text-cyan-400 font-bold">ACTIVE ({cooling})</span> : 'READY'}</span>
                            <span>LAST: {gameState.history.lastBreakProtocol || 'NONE'}</span>
                        </div>
                    </div>

                    {/* FORCE TRIGGERS */}
                    <div>
                        <h4 className="text-amber-300 font-bold mb-1 flex items-center gap-1">
                            <AlertTriangle size={10} /> OVERRIDES
                        </h4>
                        <div className="flex flex-wrap gap-1">
                            <button onClick={() => toggleForceTroll('espejo_total')} className={`px-2 py-1 border rounded ${gameState.debugState.forceTroll === 'espejo_total' ? 'bg-amber-500 text-black font-bold' : 'border-amber-500/30'}`}>ESPEJO</button>
                            <button onClick={() => toggleForceTroll('civil_solitario')} className={`px-2 py-1 border rounded ${gameState.debugState.forceTroll === 'civil_solitario' ? 'bg-amber-500 text-black font-bold' : 'border-amber-500/30'}`}>SOLO</button>
                            <button onClick={toggleForceArchitect} className={`px-2 py-1 border rounded flex items-center gap-1 ${gameState.debugState.forceArchitect ? 'bg-amber-500 text-black font-bold' : 'border-amber-500/30'}`}><ShieldCheck size={8} /> ARQ</button>
                        </div>
                    </div>

                    {/* LEXICON */}
                    <div>
                        <h4 className="text-amber-300 font-bold mb-1">HISTORY (LAST 3)</h4>
                        <div className="text-[9px] opacity-50 break-words">
                            [{gameState.history.lastWords.slice(0, 3).join(', ')}]
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
