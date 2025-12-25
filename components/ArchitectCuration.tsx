import React, { useState } from 'react';
import { CategoryData, GamePlayer, ThemeConfig } from '../types';
import { RefreshCw, CheckCircle, Fingerprint, ShieldCheck, EyeOff, MousePointerClick } from 'lucide-react';

interface Props {
    architect: GamePlayer;
    currentOptions: [{ categoryName: string, wordPair: CategoryData }, { categoryName: string, wordPair: CategoryData }];
    onRegenerate: () => void;
    onConfirm: (selection: { categoryName: string, wordPair: CategoryData }) => void;
    regenCount: number;
    theme: ThemeConfig;
}

export const ArchitectCuration: React.FC<Props> = ({ architect, currentOptions, onRegenerate, onConfirm, regenCount, theme }) => {
    const [step, setStep] = useState<'auth' | 'selection'>('auth');
    const [isScanning, setIsScanning] = useState(false);

    const handleAuth = () => {
        setIsScanning(true);
        if (navigator.vibrate) navigator.vibrate([50, 30, 50, 30, 100]);
        setTimeout(() => {
            setIsScanning(false);
            setStep('selection');
        }, 2000);
    };

    if (step === 'auth') {
        return (
            <div className="flex flex-col h-full items-center justify-center p-6 relative z-10 animate-in fade-in duration-500">
                <div className="text-center space-y-6 max-w-sm">
                    <div 
                        className="w-24 h-24 mx-auto rounded-full border-2 border-dashed flex items-center justify-center relative overflow-hidden" 
                        style={{ borderColor: theme.accent }}
                    >
                        {isScanning && (
                            <div className="absolute inset-0 opacity-20 animate-[scan_1s_infinite]" style={{ backgroundColor: theme.text }} />
                        )}
                        <Fingerprint 
                            size={48} 
                            className={`transition-all duration-500 ${isScanning ? 'scale-110' : 'scale-100'}`} 
                            style={{ color: theme.accent }} 
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <p style={{ color: theme.sub }} className="text-[10px] font-black uppercase tracking-[0.3em]">
                            NIVEL DE ACCESO REQUERIDO
                        </p>
                        <h2 style={{ color: theme.text }} className="text-2xl font-black uppercase">
                            Agente {architect.name}
                        </h2>
                    </div>

                    <button 
                        onClick={handleAuth}
                        disabled={isScanning}
                        style={{ backgroundColor: theme.accent, color: '#ffffff' }}
                        className="w-full py-4 rounded-xl font-bold uppercase tracking-widest text-xs shadow-lg active:scale-95 transition-all"
                    >
                        {isScanning ? 'ESCANEANDO...' : 'CONFIRMAR BIOMETRÍA'}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full items-center justify-between p-6 pb-12 relative z-10 animate-in slide-in-from-right duration-500 pt-[calc(2rem+env(safe-area-inset-top))]">
            {/* Header */}
            <div className="text-center w-full">
                <div 
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full border mb-4 backdrop-blur-md"
                    style={{ borderColor: theme.border, backgroundColor: theme.cardBg }}
                >
                    <ShieldCheck size={12} className="text-yellow-500" />
                    <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: theme.text }}>PROTOCOLO ARQUITECTO v5.0</span>
                </div>
                <h3 className="text-xl font-bold mb-1" style={{ color: theme.text }}>Selección de Misión</h3>
                <p style={{ color: theme.sub }} className="text-xs max-w-xs mx-auto">
                    Elige la palabra clave para los civiles. La del impostor permanecerá oculta.
                </p>
            </div>

            {/* Selection Area */}
            <div className="w-full max-w-sm flex-1 flex flex-col justify-center gap-4 my-4">
                
                {currentOptions.map((option, idx) => (
                    <button 
                        key={idx}
                        onClick={() => onConfirm(option)}
                        className="group relative w-full p-6 rounded-2xl border active:scale-[0.98] transition-all duration-200 text-left overflow-hidden backdrop-blur-md"
                        style={{ 
                            borderColor: theme.border, 
                            backgroundColor: theme.cardBg,
                            boxShadow: `0 4px 12px rgba(0,0,0,0.05)`
                        }}
                    >
                        <div 
                            className="absolute inset-0 translate-x-[-100%] group-hover:animate-[shimmer_1.5s_infinite]" 
                            style={{ 
                                background: `linear-gradient(90deg, transparent, ${theme.text}10, transparent)` 
                            }}
                        />
                        
                        <div className="flex justify-between items-start mb-2">
                            <span style={{ color: theme.sub }} className="text-[10px] font-black uppercase tracking-[0.2em]">
                                OPCIÓN 0{idx + 1}
                            </span>
                            <MousePointerClick size={16} style={{ color: theme.sub }} className="transition-colors group-hover:opacity-100 opacity-50" />
                        </div>
                        
                        <div className="space-y-1">
                            <p style={{ color: theme.accent }} className="text-xs font-bold uppercase tracking-wide opacity-90">
                                {option.categoryName}
                            </p>
                            <h3 
                                className="text-3xl font-black uppercase tracking-tight transition-colors"
                                style={{ color: theme.text }}
                            >
                                {option.wordPair.civ}
                            </h3>
                        </div>
                    </button>
                ))}

            </div>

            {/* Controls */}
            <div className="w-full max-w-sm space-y-3">
                <div className="flex items-center justify-center gap-2 mb-2 opacity-70">
                    <EyeOff size={14} style={{ color: theme.text }} />
                    <span className="text-[10px] uppercase tracking-wide" style={{ color: theme.text }}>Palabra Impostor: Oculta</span>
                </div>

                <button 
                    onClick={onRegenerate}
                    disabled={regenCount >= 3}
                    style={{ 
                        borderColor: theme.border, 
                        color: theme.text,
                        backgroundColor: theme.cardBg
                    }}
                    className="w-full py-4 rounded-xl border font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 hover:opacity-80 backdrop-blur-md"
                >
                    <RefreshCw size={16} className={regenCount < 3 ? "" : ""} />
                    Nuevas Órdenes ({3 - regenCount} restantes)
                </button>
            </div>
        </div>
    );
};