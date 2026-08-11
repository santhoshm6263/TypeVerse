import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore.js';
import { Award, Lock, CheckCircle, Zap, Shield, Activity, Disc, Calendar } from 'lucide-react';

interface Achievement {
  id: string;
  key: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt: string | null;
}

export const Achievements: React.FC = () => {
  const { accessToken } = useAuthStore();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAchievements = async () => {
      try {
        const headers: any = {};
        if (accessToken) {
          headers['Authorization'] = `Bearer ${accessToken}`;
        }
        const res = await fetch('/api/achievements', { headers });
        const data = await res.json();
        if (res.ok) {
          setAchievements(data);
        }
      } catch (err) {
        console.error('Error fetching achievements:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAchievements();
  }, [accessToken]);

  // Map icon strings to Lucide components
  const renderIcon = (key: string, unlocked: boolean) => {
    const size = 24;
    const color = unlocked ? 'var(--primary-neon)' : 'var(--text-muted)';
    
    switch (key) {
      case 'zap': return <Zap size={size} color={color} />;
      case 'activity': return <Activity size={size} color={color} />;
      case 'shield': return <Shield size={size} color={color} />;
      case 'award': return <Award size={size} color={color} />;
      case 'disc': return <Disc size={size} color={color} />;
      case 'calendar': return <Calendar size={size} color={color} />;
      default: return <Award size={size} color={color} />;
    }
  };

  const unlockedCount = achievements.filter(a => a.unlocked).length;

  return (
    <div style={{ maxWidth: '800px', margin: '40px auto', padding: '0 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-mono)', fontSize: '24px', color: 'var(--primary-neon)' }}>
            [ NEURAL IMPLANT ACHIEVEMENT LOG ]
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Earn achievements server-side by completing solo and multiplayer diagnostics.
          </p>
        </div>
        
        <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>SYNC PROGRESS</div>
          <div style={{ fontSize: '20px', color: 'var(--primary-neon)' }}>
            {unlockedCount} / {achievements.length} <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>UNLOCKED</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', padding: '40px', color: 'var(--primary-neon)' }}>
          READING DATABASE ENTRIES...
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {achievements.map((ach) => (
            <div
              key={ach.id}
              className="glass-panel"
              style={{
                padding: '20px',
                display: 'flex',
                gap: '16px',
                alignItems: 'center',
                borderColor: ach.unlocked ? 'var(--primary-neon)' : 'var(--border-color)',
                opacity: ach.unlocked ? 1 : 0.6,
                boxShadow: ach.unlocked ? 'var(--glow-shadow)' : 'none',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <div className="scan-laser" />
              
              {/* Icon Container */}
              <div
                style={{
                  background: 'rgba(0,0,0,0.4)',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid',
                  borderColor: ach.unlocked ? 'var(--primary-neon)' : 'var(--border-color)'
                }}
              >
                {renderIcon(ach.icon, ach.unlocked)}
              </div>

              {/* Text Container */}
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '16px', color: ach.unlocked ? 'var(--primary-neon)' : 'var(--text-color)', fontFamily: 'var(--font-mono)' }}>
                  {ach.name.toUpperCase()}
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {ach.description}
                </p>
                {ach.unlocked && ach.unlockedAt && (
                  <div style={{ fontSize: '10px', color: 'var(--primary-neon)', fontFamily: 'var(--font-mono)', marginTop: '8px', opacity: 0.8 }}>
                    UNLOCKED: {new Date(ach.unlockedAt).toLocaleDateString()}
                  </div>
                )}
              </div>

              {/* Status indicator */}
              <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
                {ach.unlocked ? (
                  <CheckCircle size={14} color="var(--primary-neon)" />
                ) : (
                  <Lock size={14} color="var(--text-muted)" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
