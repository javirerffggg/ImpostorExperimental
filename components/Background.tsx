import React, { useEffect, useRef } from 'react';
import { ThemeConfig } from '../types';

interface BackgroundProps {
    theme: ThemeConfig;
    phase?: string;
    isTroll?: boolean;
    isParty?: boolean;
    activeColor?: string;
}

export const Background: React.FC<BackgroundProps> = ({ theme, phase, isTroll, isParty, activeColor }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let particles: any[] = [];
        let time = 0;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        window.addEventListener('resize', resize);
        resize();

        // Particle Class
        class Particle {
            x: number;
            y: number;
            size: number;
            speedX: number;
            speedY: number;
            char: string;
            opacity: number;
            originalSpeedY: number;
            trail: {x: number, y: number, opacity: number}[]; // For Cyber theme
            hue: number; // For Party Mode

            constructor() {
                this.x = Math.random() * canvas!.width;
                this.y = Math.random() * canvas!.height;
                this.size = Math.random() * (theme.particleType !== 'circle' ? 14 : 3) + 1;
                
                this.originalSpeedY = theme.particleType === 'rain' || theme.particleType === 'binary' 
                    ? Math.random() * 3 + 2 
                    : (Math.random() - 0.5) * 0.5;
                
                this.speedY = this.originalSpeedY;
                this.speedX = theme.particleType === 'rain' || theme.particleType === 'binary' 
                    ? 0 
                    : (Math.random() - 0.5) * 0.5;
                
                this.char = theme.particleType === 'binary' ? (Math.random() > 0.5 ? "1" : "0") : "";
                if (theme.particleType === 'rain') {
                    // Matrix characters
                    const chars = "ﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵﾘｱﾎﾃﾏｹﾒｴｶｷﾑﾕﾗｾﾈｽﾀﾇﾍ";
                    this.char = chars[Math.floor(Math.random() * chars.length)];
                }
                this.opacity = Math.random() * 0.5 + 0.1;
                this.trail = [];
                this.hue = Math.random() * 360;
            }

            update() {
                // Game State Reactivity
                let speedMultiplier = 1;
                if (phase === 'revealing') speedMultiplier = 0.5; // Suspense
                if (isTroll) speedMultiplier = 4.0; // Chaos
                if (isParty) speedMultiplier = 2.0; // Party Energy

                // Store trail for Cyber theme
                if (theme.name === "Night City") {
                    this.trail.push({x: this.x, y: this.y, opacity: this.opacity});
                    if (this.trail.length > 5) this.trail.shift();
                }

                this.y += this.speedY * speedMultiplier;
                this.x += this.speedX * speedMultiplier;

                if (isTroll) {
                     // Add chaotic jitter in Troll mode
                     this.x += (Math.random() - 0.5) * 2;
                }
                
                // Party Mode Jitter (Disco lights effect)
                if (isParty) {
                    this.hue = (this.hue + 5) % 360;
                    if (Math.random() > 0.95) {
                        this.x += (Math.random() - 0.5) * 10;
                    }
                }

                if (this.y > canvas!.height) {
                    this.y = -20;
                    this.x = Math.random() * canvas!.width;
                    this.trail = [];
                }
                if (this.x < -20 || this.x > canvas!.width + 20) {
                    this.x = Math.random() * canvas!.width;
                }
            }

            draw() {
                if (!ctx) return;
                
                // Logic for Colors
                let drawColor = theme.accent;

                // Priority: Party Mode > Player Color > Troll > Theme Specifics
                if (isParty) {
                    drawColor = `hsl(${this.hue}, 100%, 60%)`;
                } else if (phase === 'revealing' && activeColor) {
                    drawColor = activeColor;
                } else if (isTroll) {
                     // Flicker color in troll mode
                     drawColor = Math.random() > 0.8 ? '#ef4444' : theme.accent;
                } else if (theme.name === "Turing") {
                     // Turing Theme: Encryption Pulse
                     const pulse = Math.sin(time * 0.05 + this.x * 0.01);
                     if (pulse > 0.8) {
                         drawColor = '#ffffff'; // Bright flash
                     } else if (pulse > 0.5) {
                         drawColor = theme.accent;
                     } else {
                         drawColor = theme.sub; // Dimmed
                     }
                }

                ctx.fillStyle = drawColor;
                ctx.globalAlpha = this.opacity;

                if (theme.particleType === 'circle') {
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    ctx.font = `${this.size}px ${theme.font}`;
                    ctx.fillText(this.char, this.x, this.y);
                }

                // Cyber Theme: Data Snow Trails
                if (theme.name === "Night City" && this.trail.length > 0 && !isParty) {
                    for (let i = 0; i < this.trail.length; i++) {
                        const point = this.trail[i];
                        const trailOpacity = (i / this.trail.length) * this.opacity * 0.5;
                        ctx.fillStyle = phase === 'revealing' && activeColor ? activeColor : theme.accent;
                        ctx.globalAlpha = trailOpacity;
                        ctx.fillText(this.char, point.x, point.y);
                        
                        // "Digital Collision" effect
                        // Randomly create a horizontal glitch line simulating hitting data
                        if (Math.random() > 0.98) {
                            ctx.fillStyle = "#fff";
                            ctx.fillRect(point.x - 5, point.y, 10, 1);
                        }
                    }
                }
            }
        }

        const initParticles = () => {
            particles = [];
            // Increase density in Troll mode or Party Mode
            const count = (theme.particleType === 'circle' ? 60 : 100) * (isTroll || isParty ? 2 : 1);
            for (let i = 0; i < count; i++) {
                particles.push(new Particle());
            }
        };

        initParticles();

        const render = () => {
            time++;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => {
                p.update();
                p.draw();
            });
            animationFrameId = requestAnimationFrame(render);
        };

        render();

        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('resize', resize);
        };
    }, [theme, phase, isTroll, activeColor, isParty]);

    return (
        <canvas 
            ref={canvasRef} 
            className="fixed inset-0 pointer-events-none z-0 opacity-40 transition-opacity duration-1000"
        />
    );
};