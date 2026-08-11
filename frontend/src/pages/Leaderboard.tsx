import React, { useState, useEffect } from 'react';
import { Zap, Shield, Crown } from 'lucide-react';

interface LeaderboardEntry {
  id: string;
  username: string;
  wpm: number;
  accuracy: number;
  createdAt: string;
}

export const Leaderboard: React.FC = () => {
  const [mode, setMode] = useState('paragraph');
  const [difficulty, setDifficulty] = useState('medium');
  const [duration, setDuration] = useState(30);

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/leaderboard?mode=${mode}&difficulty=${difficulty}&duration=${duration}`);
        const data = await res.json();
        if (res.ok) {
          setLeaderboard(data);
        }
      } catch (err) {
        console.error('Error fetching leaderboard:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [mode, difficulty, duration]);

  return (
    <div style={{ maxWidth: '900px', margin: '40px auto', padding: '0 20px' }}>
      {/* Title */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontFamily: 'var(--font-mono)', fontSize: '24px', color: 'var(--primary-neon)' }}>
          [ GLOBAL HIGH-SCORE MAINFRAME ]
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
          Server-verified metrics computed from raw keystroke records. Cheating scores are purged.
        </p>
      </div>

      {/* Filter Bar */}
      <div
        className="glass-panel"
        style={{
          padding: '16px 20px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '20px',
          alignItems: 'center',
          marginBottom: '24px'
        }}
      >
        {/* Mode Selector */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>MODE:</span>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            style={{
              background: 'rgba(0,0,0,0.4)',
              color: 'var(--primary-neon)',
              border: '1px solid var(--border-color)',
              padding: '6px 10px',
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              borderRadius: '4px',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="paragraph">Paragraph</option>
            <option value="words">Words</option>
            <option value="sentences">Sentences</option>
            <option value="numbers">Numbers</option>
            <option value="symbols">Symbols</option>
          </select>
        </div>

        {/* Difficulty Selector */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>DIFFICULTY:</span>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            style={{
              background: 'rgba(0,0,0,0.4)',
              color: 'var(--primary-neon)',
              border: '1px solid var(--border-color)',
              padding: '6px 10px',
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              borderRadius: '4px',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>

        {/* Duration Selector */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>DURATION:</span>
          <select
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value))}
            style={{
              background: 'rgba(0,0,0,0.4)',
              color: 'var(--primary-neon)',
              border: '1px solid var(--border-color)',
              padding: '6px 10px',
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              borderRadius: '4px',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="15">15 Seconds</option>
            <option value="30">30 Seconds</option>
            <option value="60">60 Seconds</option>
            <option value="120">120 Seconds</option>
          </select>
        </div>
      </div>

      {/* Leaderboard Table Container */}
      <div className="glass-panel" style={{ padding: '24px', overflowX: 'auto', position: 'relative' }}>
        <div className="scan-laser" />

        {loading ? (
          <div style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', padding: '40px', color: 'var(--primary-neon)' }}>
            DOWNLOADING GRID STANDINGS...
          </div>
        ) : leaderboard.length === 0 ? (
          <div style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', padding: '40px', color: 'var(--text-muted)' }}>
            [ NO SECTOR DATA RECORDED YET ]
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '12px 8px', fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>RANK</th>
                <th style={{ padding: '12px 8px', fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>OPERATOR</th>
                <th style={{ padding: '12px 8px', fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>SPEED (NET)</th>
                <th style={{ padding: '12px 8px', fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>ACCURACY</th>
                <th style={{ padding: '12px 8px', fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>DATE LOGGED</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry, index) => {
                const rank = index + 1;
                
                // Highlight podium styles
                let rankStyle: React.CSSProperties = {
                  color: 'var(--text-color)',
                  fontWeight: 'bold',
                  fontFamily: 'var(--font-mono)'
                };
                let rowStyle: React.CSSProperties = {
                  borderBottom: '1px solid rgba(255,255,255,0.03)'
                };

                if (rank === 1) {
                  rankStyle.color = '#ffbf00'; // Gold glow
                  rowStyle.background = 'rgba(255, 191, 0, 0.03)';
                } else if (rank === 2) {
                  rankStyle.color = '#c0c0c0'; // Silver
                  rowStyle.background = 'rgba(192, 192, 192, 0.02)';
                } else if (rank === 3) {
                  rankStyle.color = '#cd7f32'; // Bronze
                }

                return (
                  <tr key={entry.id} style={rowStyle}>
                    <td style={{ padding: '16px 8px', ...rankStyle }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        {rank === 1 && <Crown size={12} />}
                        {rank === 2 && <Shield size={12} />}
                        {rank === 3 && <Zap size={12} />}
                        #{rank}
                      </span>
                    </td>
                    <td style={{ padding: '16px 8px', fontFamily: 'var(--font-mono)', fontWeight: '500' }}>
                      {entry.username}
                    </td>
                    <td style={{ padding: '16px 8px', fontFamily: 'var(--font-mono)', color: 'var(--primary-neon)' }}>
                      <strong>{entry.wpm}</strong> <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>WPM</span>
                    </td>
                    <td style={{ padding: '16px 8px', fontFamily: 'var(--font-mono)', color: 'var(--primary-neon)' }}>
                      {entry.accuracy}%
                    </td>
                    <td style={{ padding: '16px 8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                      {new Date(entry.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
