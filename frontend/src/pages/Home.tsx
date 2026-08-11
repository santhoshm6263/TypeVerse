import React, { useState, useEffect, useCallback } from 'react';
import { useTypingEngine } from '../hooks/useTypingEngine.js';
import { TypingArea } from '../components/TypingArea.js';
import { useAuthStore } from '../store/authStore.js';
import { Play, RotateCcw, ChevronRight, Pause, Info, Award } from 'lucide-react';

export const Home: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const soundOn = user?.settings?.soundOn ?? true;

  // Configurations
  const [mode, setMode] = useState<'words' | 'sentences' | 'paragraph' | 'numbers' | 'symbols' | 'custom'>('paragraph');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [limitType, setLimitType] = useState<'time' | 'words'>('time');
  const [durationLimit, setDurationLimit] = useState<number>(30);
  const [wordLimit, setWordLimit] = useState<number>(25);

  const [textRecord, setTextRecord] = useState<{ id: string; content: string } | null>(null);
  const [customText, setCustomText] = useState('');
  const [isCustomModeApplied, setIsCustomModeApplied] = useState(false);

  // Results State
  const [savedResult, setSavedResult] = useState<any>(null);
  const [unlockedAchievements, setUnlockedAchievements] = useState<any[]>([]);

  // Fetch Text from Backend
  const fetchNewText = useCallback(async () => {
    if (mode === 'custom') return;
    try {
      const res = await fetch(`/api/texts?mode=${mode}&difficulty=${difficulty}&count=1`);
      const data = await res.json();
      if (data && data.length > 0) {
        setTextRecord({ id: data[0].id, content: data[0].content });
      }
    } catch (err) {
      console.error('Error fetching text:', err);
      // Local offline fallback
      setTextRecord({
        id: 'local-fallback',
        content: 'Connection lost. Cybernetic backup systems online. The grid is waiting for your input protocol. Keep typing to maintain core synchronization.'
      });
    }
  }, [mode, difficulty]);

  useEffect(() => {
    fetchNewText();
  }, [fetchNewText]);

  // Handle Typing Test Completion
  const handleTestComplete = async (results: any) => {
    try {
      const payload = {
        mode,
        difficulty,
        durationSeconds: results.durationSeconds,
        wpm: results.wpm,
        accuracy: results.accuracy,
        mistakes: results.mistakes,
        correctWords: textRecord?.content.split(' ').length || 0,
        incorrectWords: 0,
        backspaces: results.backspaces,
        charactersTyped: results.charactersTyped,
        rawKeystrokeLog: results.keystrokeLog,
        source: 'solo',
        textId: textRecord?.id === 'local-fallback' ? undefined : textRecord?.id,
        customText: mode === 'custom' ? textRecord?.content : undefined
      };

      const res = await fetch('/api/tests/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok) {
        setSavedResult(data.result);
        setUnlockedAchievements(data.unlockedAchievements || []);
        
        // If guest, record local result ID for potential future signup claim migration
        if (!user) {
          useAuthStore.getState().addGuestResult(data.result.id);
        }
      } else {
        console.error('Failed to submit typing test:', data.error);
        alert(`Validation Error: ${data.error || 'Check console logs'}`);
      }
    } catch (err) {
      console.error('Submission error:', err);
    }
  };

  // Instantiating the engine
  const activeText = textRecord?.content || 'Loading text module...';
  const engine = useTypingEngine({
    text: activeText,
    mode: mode === 'custom' ? 'custom' : mode,
    durationLimit,
    wordLimit: limitType === 'words' ? wordLimit : undefined,
    soundOn,
    onComplete: handleTestComplete
  });

  const {
    typedText,
    isActive,
    isPaused,
    isCompleted,
    durationSeconds,
    wpm,
    accuracy,
    handleKeyDown,
    resetTest,
    pauseTest,
    resumeTest,
    skipWord
  } = engine;

  // Next Text Action
  const handleNextText = () => {
    setSavedResult(null);
    setUnlockedAchievements([]);
    setIsCustomModeApplied(false);
    resetTest();
    if (mode !== 'custom') {
      fetchNewText();
    }
  };

  // Custom text submission handler
  const handleApplyCustomText = () => {
    if (!customText.trim()) return;
    setTextRecord({
      id: 'custom-text',
      content: customText.trim()
    });
    setIsCustomModeApplied(true);
    setSavedResult(null);
    setUnlockedAchievements([]);
    resetTest();
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '40px auto', padding: '0 20px' }}>
      {/* Configuration Header Card */}
      {!isActive && !isCompleted && (
        <div
          className="glass-panel"
          style={{
            padding: '20px',
            marginBottom: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}
        >
          {/* Mode Selector */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-muted)' }}>
              [ MODE ]
            </span>
            {(['paragraph', 'words', 'sentences', 'numbers', 'symbols', 'custom'] as const).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setSavedResult(null);
                  setUnlockedAchievements([]);
                  resetTest();
                }}
                className="cyber-button"
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  background: mode === m ? 'var(--primary-neon)' : 'transparent',
                  color: mode === m ? 'var(--bg-color)' : 'var(--primary-neon)'
                }}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Difficulty & Limits */}
          {mode !== 'custom' && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
              {/* Difficulty */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-muted)' }}>
                  [ DIFFICULTY ]
                </span>
                {(['easy', 'medium', 'hard'] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => {
                      setDifficulty(d);
                      setSavedResult(null);
                      setUnlockedAchievements([]);
                      resetTest();
                    }}
                    className="cyber-button"
                    style={{
                      padding: '5px 10px',
                      fontSize: '11px',
                      background: difficulty === d ? 'var(--primary-neon)' : 'transparent',
                      color: difficulty === d ? 'var(--bg-color)' : 'var(--primary-neon)'
                    }}
                  >
                    {d}
                  </button>
                ))}
              </div>

              {/* Limits */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-muted)' }}>
                  [ LIMIT ]
                </span>
                <select
                  value={limitType}
                  onChange={(e) => setLimitType(e.target.value as 'time' | 'words')}
                  style={{
                    background: 'rgba(0,0,0,0.4)',
                    color: 'var(--primary-neon)',
                    border: '1px solid var(--border-color)',
                    padding: '4px 8px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '12px',
                    outline: 'none',
                    borderRadius: '4px'
                  }}
                >
                  <option value="time">Time</option>
                  <option value="words">Word Count</option>
                </select>

                {limitType === 'time' ? (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {[15, 30, 60, 120].map((t) => (
                      <button
                        key={t}
                        onClick={() => {
                          setDurationLimit(t);
                          resetTest();
                        }}
                        style={{
                          background: durationLimit === t ? 'rgba(var(--primary-neon), 0.2)' : 'transparent',
                          color: 'var(--primary-neon)',
                          border: 'none',
                          cursor: 'pointer',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '12px',
                          padding: '2px 6px'
                        }}
                      >
                        {t}s
                      </button>
                    ))}
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {[25, 50, 100].map((w) => (
                      <button
                        key={w}
                        onClick={() => {
                          setWordLimit(w);
                          resetTest();
                        }}
                        style={{
                          background: wordLimit === w ? 'rgba(var(--primary-neon), 0.2)' : 'transparent',
                          color: 'var(--primary-neon)',
                          border: 'none',
                          cursor: 'pointer',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '12px',
                          padding: '2px 6px'
                        }}
                      >
                        {w}w
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Custom Text input area */}
      {mode === 'custom' && !isCustomModeApplied && !isActive && !isCompleted && (
        <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
          <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '15px', color: 'var(--primary-neon)', marginBottom: '12px' }}>
            [ MOUNT CUSTOM DATA CORE ]
          </h3>
          <textarea
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            placeholder="Paste your custom test code or text parameters here..."
            style={{
              width: '100%',
              minHeight: '120px',
              background: 'rgba(0,0,0,0.5)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-color)',
              padding: '12px',
              fontFamily: 'var(--font-mono)',
              fontSize: '14px',
              borderRadius: '6px',
              outline: 'none',
              marginBottom: '16px',
              resize: 'vertical'
            }}
          />
          <button onClick={handleApplyCustomText} className="cyber-button" disabled={!customText.trim()}>
            <Play size={14} /> APPLY AND PRE-LOAD
          </button>
        </div>
      )}

      {/* Practice Panel */}
      {(mode !== 'custom' || isCustomModeApplied) && !isCompleted && (
        <div>
          {/* Live Telemetry Display */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
              padding: '0 8px'
            }}
          >
            <div style={{ display: 'flex', gap: '24px' }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>SPEED</div>
                <div style={{ fontSize: '28px', fontFamily: 'var(--font-mono)', color: 'var(--primary-neon)' }}>
                  {Math.round(wpm)} <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>WPM</span>
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>ACCURACY</div>
                <div style={{ fontSize: '28px', fontFamily: 'var(--font-mono)', color: 'var(--primary-neon)' }}>
                  {Math.round(accuracy)}<span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>%</span>
                </div>
              </div>
            </div>

            {/* Time / Word countdown */}
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {limitType === 'time' && mode !== 'custom' ? 'TIME REMAINING' : 'ELAPSED'}
              </div>
              <div style={{ fontSize: '28px', fontFamily: 'var(--font-mono)', color: 'var(--primary-neon)' }}>
                {durationSeconds}s
              </div>
            </div>
          </div>

          {/* Typing Area component */}
          <TypingArea
            text={activeText}
            typedText={typedText}
            isActive={isActive}
            isPaused={isPaused}
            isCompleted={isCompleted}
            onKeyDown={handleKeyDown}
          />

          {/* Controller buttons below */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '16px',
              padding: '0 4px'
            }}
          >
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={resetTest} className="cyber-button" style={{ padding: '8px 16px', fontSize: '12px' }}>
                <RotateCcw size={13} /> RESET
              </button>

              {isActive && (
                <button
                  onClick={isPaused ? resumeTest : pauseTest}
                  className="cyber-button"
                  style={{ padding: '8px 16px', fontSize: '12px', border: '1px solid var(--border-color)' }}
                >
                  <Pause size={13} /> {isPaused ? 'RESUME' : 'PAUSE'}
                </button>
              )}

              {mode === 'words' && isActive && (
                <button
                  onClick={skipWord}
                  className="cyber-button"
                  style={{ padding: '8px 16px', fontSize: '12px', border: '1px solid var(--border-color)' }}
                >
                  SKIP WORD
                </button>
              )}
            </div>

            <button onClick={handleNextText} className="cyber-button" style={{ padding: '8px 16px', fontSize: '12px' }}>
              NEXT MODULE <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}

      {/* Results Dashboard Summary (ResultsCard) */}
      {isCompleted && savedResult && (
        <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', position: 'relative' }}>
          <div className="scan-laser" />
          <h2 style={{ fontFamily: 'var(--font-mono)', color: 'var(--primary-neon)', fontSize: '24px', marginBottom: '24px' }}>
            [ DIAGNOSTICS COMPLETE ]
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '20px',
              marginBottom: '32px'
            }}
          >
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>NET SPEED</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '36px', color: 'var(--primary-neon)', margin: '8px 0' }}>
                {savedResult.wpm} <span style={{ fontSize: '16px', color: 'var(--text-muted)' }}>WPM</span>
              </div>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>ACCURACY</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '36px', color: 'var(--primary-neon)', margin: '8px 0' }}>
                {savedResult.accuracy}%
              </div>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>TIME ELAPSED</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '36px', color: 'var(--primary-neon)', margin: '8px 0' }}>
                {savedResult.durationSeconds}s
              </div>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>ERRORS / BACKSPACES</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '36px', color: 'var(--primary-neon)', margin: '8px 0' }}>
                {savedResult.mistakes} <span style={{ fontSize: '16px', color: 'var(--text-muted)' }}>/</span> {savedResult.backspaces}
              </div>
            </div>
          </div>

          {/* Achievement unlocks toast listing */}
          {unlockedAchievements.length > 0 && (
            <div
              className="toast-achievement"
              style={{
                background: 'rgba(var(--primary-neon), 0.1)',
                border: '1px solid var(--primary-neon)',
                borderRadius: '8px',
                padding: '16px',
                maxWidth: '500px',
                margin: '0 auto 24px auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                boxShadow: 'var(--glow-shadow)'
              }}
            >
              <h4 style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--primary-neon)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <Award size={16} /> NEURAL SYNC ACHIEVED!
              </h4>
              {unlockedAchievements.map((ach) => (
                <div key={ach.id} style={{ fontSize: '13px', color: 'var(--text-color)' }}>
                  <strong>{ach.name}</strong>: {ach.description}
                </div>
              ))}
            </div>
          )}

          {!user && (
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
              <Info size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
              Sign up or log in to lock these diagnostics permanently on the leaderboards.
            </p>
          )}

          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <button onClick={resetTest} className="cyber-button">
              <RotateCcw size={14} /> DIAGNOSE AGAIN
            </button>
            <button onClick={handleNextText} className="cyber-button">
              LOAD NEXT PARAMETER <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
