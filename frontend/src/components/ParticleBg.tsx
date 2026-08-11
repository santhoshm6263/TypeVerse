import React, { useEffect, useRef } from 'react';
import { useThemeStore } from '../store/themeStore.js';
import { useAuthStore } from '../store/authStore.js';

export const ParticleBg: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const theme = useThemeStore((state) => state.theme);
  const user = useAuthStore((state) => state.user);

  // Read animation setting (default to true)
  const animationOn = user?.settings?.animationOn ?? true;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Handle Resize
    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    if (!animationOn || theme === 'white-minimal') {
      // Just draw static dark bg or clean white, no canvas cycles
      ctx.clearRect(0, 0, width, height);
      return;
    }

    // Set colors based on theme
    let color = '#00ff41';
    if (theme === 'cyber-blue') color = '#00f0ff';
    if (theme === 'neon-purple') color = '#ff007f';
    if (theme === 'orange-sunset') color = '#ff6a00';
    if (theme === 'red-hacker') color = '#ff0000';

    // 1. Matrix Rain Configuration
    const columns = Math.floor(width / 20) + 1;
    const yPositions = Array(columns).fill(0).map(() => Math.random() * -100);
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ$#@&%?+-*/';

    // 2. Nodes Configuration (Cyber Blue / Red Hacker)
    const particleCount = 45;
    const particles: Array<{ x: number; y: number; vx: number; vy: number; radius: number }> = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        radius: Math.random() * 2 + 1
      });
    }

    // Render loop
    const render = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.08)'; // Trails
      
      // Override background transparent clear depending on theme
      if (theme === 'matrix-green') {
        ctx.fillStyle = 'rgba(6, 10, 6, 0.12)';
        ctx.fillRect(0, 0, width, height);
        ctx.font = '15px monospace';
        ctx.fillStyle = color;

        yPositions.forEach((y, index) => {
          const text = chars[Math.floor(Math.random() * chars.length)];
          const x = index * 20;
          ctx.fillText(text, x, y);
          
          if (y > 100 + Math.random() * 10000) {
            yPositions[index] = 0;
          } else {
            yPositions[index] = y + 12;
          }
        });
      } else if (theme === 'cyber-blue' || theme === 'red-hacker') {
        // Star node connection grid
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = theme === 'cyber-blue' ? '#030a16' : '#080101';
        ctx.fillRect(0, 0, width, height);
        
        ctx.fillStyle = color;
        ctx.strokeStyle = color;

        // Draw connections
        for (let i = 0; i < particleCount; i++) {
          const p = particles[i];
          p.x += p.vx;
          p.y += p.vy;

          if (p.x < 0 || p.x > width) p.vx *= -1;
          if (p.y < 0 || p.y > height) p.vy *= -1;

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();

          for (let j = i + 1; j < particleCount; j++) {
            const p2 = particles[j];
            const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
            if (dist < 120) {
              ctx.lineWidth = 1 - dist / 120;
              ctx.globalAlpha = (1 - dist / 120) * 0.12;
              ctx.beginPath();
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.stroke();
              ctx.globalAlpha = 1;
            }
          }
        }
      } else {
        // Floating bokeh nodes (Neon Purple / Orange Sunset)
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = theme === 'neon-purple' ? '#0a0414' : '#0f0702';
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = color;
        ctx.globalAlpha = 0.08;

        for (let i = 0; i < particleCount; i++) {
          const p = particles[i];
          p.x += p.vx * 0.5;
          p.y += p.vy * 0.5;

          if (p.x < 0 || p.x > width) p.vx *= -1;
          if (p.y < 0 || p.y > height) p.vy *= -1;

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius * 8, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, [theme, animationOn]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: -1,
        pointerEvents: 'none',
        display: theme === 'white-minimal' ? 'none' : 'block'
      }}
    />
  );
};
