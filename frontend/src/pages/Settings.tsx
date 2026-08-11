import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore.js';
import { useThemeStore } from '../store/themeStore.js';
import { Settings as SettingsIcon, Volume2, VolumeX, Eye, EyeOff, RotateCcw, AlertTriangle, Check } from 'lucide-react';

export const Settings: React.FC = () => {
  const { user, updateSettings, accessToken } = useAuthStore();
  const theme = useThemeStore((state) => state.theme);

  // Local configuration states initialized from store user preferences
  const [fontSize, setFontSize] = useState<number>(user?.settings?.fontSize || 18);
  const [soundOn, setSoundOn] = useState<boolean>(user?.settings?.soundOn ?? true);
  const [animationOn, setAnimationOn] = useState<boolean>(user?.settings?.animationOn ?? true);
  const [caretStyle, setCaretStyle] = useState<'line' | 'block' | 'underline'>(user?.settings?.caretStyle || 'line');

  const [isResetConfirm, setIsResetConfirm] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const handleSaveSettings = async () => {
    setSaveStatus('saving');
    await updateSettings(theme, {
      fontSize,
      soundOn,
      animationOn,
      caretStyle
    });
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  const handleResetStats = async () => {
    try {
      const res = await fetch('/api/stats/me', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      if (res.ok) {
        setResetSuccess(true);
        setIsResetConfirm(false);
        setTimeout(() => setResetSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Failed to reset statistics:', err);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '40px auto', padding: '0 20px' }}>
      <div className="glass-panel" style={{ padding: '32px', position: 'relative' }}>
        <div className="scan-laser" />

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
          <SettingsIcon size={20} style={{ color: 'var(--primary-neon)' }} />
          <h2 style={{ fontFamily: 'var(--font-mono)', fontSize: '20px', color: 'var(--primary-neon)' }}>
            [ SYSTEM CONFIGURATIONS ]
          </h2>
        </div>

        {/* Options Stack */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '32px' }}>
          {/* Font Size Selector */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-color)', fontWeight: 'bold' }}>TYPING TEXT SIZE</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--primary-neon)' }}>{fontSize}px</span>
            </div>
            <input
              type="range"
              min="14"
              max="28"
              value={fontSize}
              onChange={(e) => setFontSize(parseInt(e.target.value))}
              style={{
                width: '100%',
                accentColor: 'var(--primary-neon)',
                cursor: 'pointer'
              }}
            />
          </div>

          {/* Caret Style */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-color)', fontWeight: 'bold', marginBottom: '8px' }}>
              CURSOR INDICATOR STYLE
            </label>
            <select
              value={caretStyle}
              onChange={(e) => setCaretStyle(e.target.value as 'line' | 'block' | 'underline')}
              style={{
                width: '100%',
                background: 'rgba(0,0,0,0.4)',
                color: 'var(--primary-neon)',
                border: '1px solid var(--border-color)',
                padding: '10px 14px',
                borderRadius: '6px',
                fontFamily: 'var(--font-mono)',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="line">Line (Pulse Vertical)</option>
              <option value="block">Block (Retro Terminal Block)</option>
              <option value="underline">Underline (Cyber Underbar)</option>
            </select>
          </div>

          {/* Audio Toggles */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '13px', color: 'var(--text-color)', fontWeight: 'bold' }}>AUDITORY IMPLANTS (SOUNDS)</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Synthesize mechanical key clicks and errors.</div>
            </div>
            <button
              onClick={() => setSoundOn(!soundOn)}
              className="cyber-button"
              style={{ padding: '6px 12px', fontSize: '12px' }}
            >
              {soundOn ? <Volume2 size={14} /> : <VolumeX size={14} />}
              {soundOn ? 'SOUNDS: ACTIVE' : 'SOUNDS: DISABLED'}
            </button>
          </div>

          {/* Grid/Particle Toggles */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '13px', color: 'var(--text-color)', fontWeight: 'bold' }}>NEON PARTICLE ANIMATION</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Toggle background canvas matrix/node renderings.</div>
            </div>
            <button
              onClick={() => setAnimationOn(!animationOn)}
              className="cyber-button"
              style={{ padding: '6px 12px', fontSize: '12px' }}
            >
              {animationOn ? <Eye size={14} /> : <EyeOff size={14} />}
              {animationOn ? 'ANIMATION: ON' : 'ANIMATION: OFF'}
            </button>
          </div>
        </div>

        {/* Save button */}
        <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '24px', marginBottom: '24px' }}>
          <button onClick={handleSaveSettings} className="cyber-button" style={{ width: '100%', justifyContent: 'center' }}>
            {saveStatus === 'saving' ? 'WRITING PREFERENCES...' : saveStatus === 'saved' ? 'PREFERENCES COMMITTED' : 'SAVE CONFIGURATIONS'}
          </button>
        </div>

        {/* Destructive Stats Reset Section */}
        {user && user.role !== 'admin' && (
          <div>
            <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--error-color)', marginBottom: '8px' }}>
              [ DESTRUCTIVE ACTIONS ]
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Clear all telemetry records and achievement history permanently.
            </p>

            {resetSuccess && (
              <div style={{ color: 'var(--primary-neon)', fontSize: '13px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Check size={16} /> Statistics reset successfully. Re-routing mainframe.
              </div>
            )}

            {!isResetConfirm ? (
              <button
                onClick={() => setIsResetConfirm(true)}
                className="cyber-button"
                style={{
                  borderColor: 'var(--error-color)',
                  color: 'var(--error-color)',
                  width: '100%',
                  justifyContent: 'center'
                }}
              >
                <RotateCcw size={14} /> RESET STATISTICS
              </button>
            ) : (
              <div
                style={{
                  border: '1px dashed var(--error-color)',
                  padding: '16px',
                  borderRadius: '6px',
                  background: 'rgba(255,51,51,0.05)'
                }}
              >
                <p style={{ color: 'var(--error-color)', fontSize: '13px', marginBottom: '16px', display: 'flex', gap: '8px' }}>
                  <AlertTriangle size={18} /> WARNING: This deletes all WPM telemetry logs and unlocked badges. This action cannot be reversed!
                </p>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={handleResetStats}
                    className="cyber-button"
                    style={{
                      background: 'var(--error-color)',
                      color: '#fff',
                      borderColor: 'var(--error-color)',
                      flex: 1,
                      justifyContent: 'center'
                    }}
                  >
                    CONFIRM PURGE
                  </button>
                  <button
                    onClick={() => setIsResetConfirm(false)}
                    className="cyber-button"
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    CANCEL
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
