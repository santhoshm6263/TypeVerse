import React from 'react';
import { Terminal, Cpu, Database, Network } from 'lucide-react';

export const About: React.FC = () => {
  return (
    <div style={{ maxWidth: '800px', margin: '40px auto', padding: '0 20px' }}>
      <div className="glass-panel" style={{ padding: '32px', position: 'relative' }}>
        <div className="scan-laser" />

        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h2 style={{ fontFamily: 'var(--font-mono)', fontSize: '22px', color: 'var(--primary-neon)' }}>
            [ TYPEMASTER SYSTEM SPECS ]
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '6px' }}>
            Firmware Version 1.0.0 // AI-Assisted Implementation
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', lineHeight: '1.6' }}>
          <p>
            Welcome to <strong>TypeMaster</strong>, a premium, cyberpunk-themed typing training program designed to test your neural response latency and digit speed under pressure.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginTop: '16px' }}>
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <h4 style={{ fontFamily: 'var(--font-mono)', color: 'var(--primary-neon)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <Terminal size={14} /> CORE DECK
              </h4>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                React 18+ with TypeScript, styled using bespoke CSS custom variables.
              </p>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <h4 style={{ fontFamily: 'var(--font-mono)', color: 'var(--primary-neon)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <Cpu size={14} /> LOGIC BOARD
              </h4>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Express.js framework verifying keystroke telemetry logs to enforce zero-cheat leaderboards.
              </p>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <h4 style={{ fontFamily: 'var(--font-mono)', color: 'var(--primary-neon)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <Database size={14} /> CYBERNETIC MEMORY
              </h4>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Durable SQLite relational database run via Prisma ORM for seamless local deployment.
              </p>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <h4 style={{ fontFamily: 'var(--font-mono)', color: 'var(--primary-neon)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <Network size={14} /> NEURAL CHANNELS
              </h4>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Real-time, low-latency Socket.IO broadcasts for synchronized multi-operator speed matching.
              </p>
            </div>
          </div>

          <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '24px' }}>
            [ ACCESS TERMINAL SECURED · COMPILING PROTOCOLS... APPROVED ]
          </p>
        </div>
      </div>
    </div>
  );
};
