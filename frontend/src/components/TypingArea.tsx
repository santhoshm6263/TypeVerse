import React, { useRef, useEffect } from 'react';
import { useAuthStore } from '../store/authStore.js';

interface TypingAreaProps {
  text: string;
  typedText: string;
  isActive: boolean;
  isPaused: boolean;
  isCompleted: boolean;
  onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
}

export const TypingArea: React.FC<TypingAreaProps> = ({
  text,
  typedText,
  isActive,
  isPaused,
  isCompleted,
  onKeyDown
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const user = useAuthStore((state) => state.user);

  // Read caret style (default: 'line')
  const caretStyle = user?.settings?.caretStyle || 'line';
  const fontSize = user?.settings?.fontSize || 18;

  // Auto-focus container on load or reset
  useEffect(() => {
    if (containerRef.current && !isCompleted && !isPaused) {
      containerRef.current.focus();
    }
  }, [text, isCompleted, isPaused]);

  // Focus helper
  const handleFocusClick = () => {
    if (containerRef.current) {
      containerRef.current.focus();
    }
  };

  const letters = text.split('');
  const currentIndex = typedText.length;

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* Keyboard Focus Wrapper */}
      <div
        ref={containerRef}
        tabIndex={0}
        onKeyDown={onKeyDown}
        className="glass-panel"
        style={{
          outline: 'none',
          padding: '24px',
          minHeight: '140px',
          lineHeight: '1.6',
          fontSize: `${fontSize}px`,
          position: 'relative',
          cursor: 'text',
          overflow: 'hidden',
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
        }}
        onClick={handleFocusClick}
      >
        {/* CRT Scanline effect inside typing card */}
        <div className="scan-laser" />

        {/* Word container */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.1em',
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.05em',
            transition: 'filter 0.3s ease',
            filter: isPaused ? 'blur(6px)' : 'none'
          }}
        >
          {letters.map((char, index) => {
            let style: React.CSSProperties = {
              color: 'var(--text-muted)',
              position: 'relative',
              display: 'inline-block'
            };

            const isTyped = index < currentIndex;
            const isCurrent = index === currentIndex;

            if (isTyped) {
              const typedChar = typedText[index];
              const isCorrect = typedChar === char;
              if (isCorrect) {
                style.color = 'var(--primary-neon)';
                style.textShadow = '0 0 4px var(--primary-neon)';
              } else {
                style.color = 'var(--error-color)';
                style.textShadow = '0 0 6px var(--error-color)';
                style.textDecoration = 'underline';
              }
            }

            // Caret style attachment
            return (
              <span key={index} style={style}>
                {isCurrent && !isCompleted && (
                  <span
                    style={{
                      position: 'absolute',
                      left: 0,
                      backgroundColor: 'var(--primary-neon)',
                      boxShadow: 'var(--glow-shadow)',
                      animation: 'blink 1s steps(2, start) infinite',
                      zIndex: 10,
                      ...(caretStyle === 'line' && {
                        width: '2px',
                        height: '1.2em',
                        bottom: '0.1em'
                      }),
                      ...(caretStyle === 'block' && {
                        width: '100%',
                        height: '1.2em',
                        bottom: '0.1em',
                        opacity: 0.5
                      }),
                      ...(caretStyle === 'underline' && {
                        width: '100%',
                        height: '3px',
                        bottom: '-0.1em'
                      })
                    }}
                  />
                )}
                {/* Visual rendering for space spaces or newline */}
                {char === ' ' ? '\u00A0' : char}
              </span>
            );
          })}
        </div>

        {/* Overlay when user blurs typing card */}
        {(!isActive && !isCompleted && typedText.length === 0) && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(0, 0, 0, 0.45)',
              backdropFilter: 'blur(3px)',
              cursor: 'pointer',
              borderRadius: '11px',
              fontFamily: 'var(--font-mono)',
              color: 'var(--primary-neon)',
              fontSize: '16px',
              letterSpacing: '1px'
            }}
          >
            [ CLICK OR PRESS ANY KEY TO INITIALIZE IMPLANT ]
          </div>
        )}
      </div>

      {/* Styles for blinking cursor */}
      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
};
