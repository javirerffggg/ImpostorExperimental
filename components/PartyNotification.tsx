import React, { useEffect } from 'react';
import { Beer } from 'lucide-react';
import { ThemeConfig } from '../types';

interface Props {
    prompt: string;
    theme: ThemeConfig;
}

export const PartyNotification: React.FC<Props> = ({ prompt, theme }) => {
    
    // Text-to-Speech Effect & Sound Simulation
    useEffect(() => {
        if (!prompt) return;

        // Cancel previous utterances
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(prompt);
        utterance.lang = 'es-ES'; 
        utterance.rate = 1.1; 
        
        const voices = window.speechSynthesis.getVoices();
        const spanishVoice = voices.find(v => v.lang.includes('es-ES') || v.lang.includes('es'));
        if (spanishVoice) utterance.voice = spanishVoice;

        window.speechSynthesis.speak(utterance);

    }, [prompt]);

    if (!prompt) return null;

    // Neon Colors hardcoded for consistency with Party Mode requirement
    const neonCyan = "#00ffff";
    const neonPink = "#ff00ff";

    return (
        <div className="w-full max-w-sm relative group my-4 z-50">
            {/* Glitch Container */}
            <div className="relative animate-glitch-enter">
                
                {/* Background Glass */}
                <div 
                    className="p-4 border-l-4 relative overflow-hidden backdrop-blur-xl shadow-[0_0_20px_rgba(255,0,255,0.3)]"
                    style={{ 
                        borderLeftColor: neonPink,
                        backgroundColor: 'rgba(20, 0, 40, 0.85)',
                        borderTopRightRadius: '1rem',
                        borderBottomRightRadius: '1rem'
                    }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                             <div className="animate-pulse">
                                <Beer size={18} color={neonCyan} />
                             </div>
                             <span style={{ color: neonPink }} className="text-[10px] font-black uppercase tracking-[0.2em] animate-pulse">
                                PARTY MODE
                             </span>
                        </div>
                        {/* Countdown bar visual */}
                        <div className="h-1 w-20 bg-gray-800 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-cyan-400 to-fuchsia-500 animate-shrink-width" />
                        </div>
                    </div>

                    {/* Glitch Text Prompt */}
                    <p 
                        style={{ color: neonCyan, textShadow: '2px 0 #ff00ff' }} 
                        className="text-sm font-bold leading-snug glitch-text"
                        data-text={prompt}
                    >
                        {prompt}
                    </p>
                </div>

                {/* Decorative particles */}
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full animate-ping" />
                <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-fuchsia-500 rounded-full animate-bounce" />
            </div>

            <style>{`
                .animate-shrink-width {
                    animation: shrink 8s linear forwards;
                }

                @keyframes shrink {
                    from { width: 100%; }
                    to { width: 0%; }
                }

                .animate-glitch-enter {
                    animation: glitch-anim 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
                }

                @keyframes glitch-anim {
                    0% { transform: translate(0); opacity: 0; }
                    20% { transform: translate(-2px, 2px); opacity: 1; }
                    40% { transform: translate(-2px, -2px); }
                    60% { transform: translate(2px, 2px); }
                    80% { transform: translate(2px, -2px); }
                    100% { transform: translate(0); opacity: 1; }
                }

                .glitch-text {
                    position: relative;
                }
                
                /* Subtle constant glitch jitter */
                .glitch-text:hover {
                    animation: glitch-skew 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) both infinite;
                }
                
                @keyframes glitch-skew {
                    0% { transform: skew(0deg); }
                    20% { transform: skew(-2deg); }
                    40% { transform: skew(2deg); }
                    60% { transform: skew(-1deg); }
                    80% { transform: skew(1deg); }
                    100% { transform: skew(0deg); }
                }
            `}</style>
        </div>
    );
};