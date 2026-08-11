import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore.js';
import { useTypingEngine } from '../hooks/useTypingEngine.js';
import { TypingArea } from '../components/TypingArea.js';
import { io, Socket } from 'socket.io-client';
import { Users, Play, AlertCircle, Copy, ArrowRight, Home as HomeIcon } from 'lucide-react';

interface Player {
  userId: string;
  username: string;
  ready: boolean;
  percentComplete: number;
  wpm: number;
  accuracy: number;
  finished: boolean;
  left: boolean;
}

interface Standing {
  userId: string;
  username: string;
  wpm: number;
  accuracy: number;
  rank: number;
  left: boolean;
}

export const MultiplayerRoom: React.FC = () => {
  const { user } = useAuthStore();
  const userId = user?.id || useRef('guest-' + Math.random().toString(36).substr(2, 9)).current;
  const username = user?.username || 'Guest_' + userId.substr(6, 4);

  const [inputRoomCode, setInputRoomCode] = useState('');
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [roomState, setRoomState] = useState<{
    status: 'lobby' | 'countdown' | 'racing' | 'finished';
    players: Player[];
    textId: string | null;
    textContent: string | null;
    hostId: string | null;
  } | null>(null);

  const [countdown, setCountdown] = useState<number | null>(null);
  const [standings, setStandings] = useState<Standing[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);

  // References to keep state available in callback triggers
  const roomCodeRef = useRef<string | null>(null);
  const textContentRef = useRef<string | null>(null);

  // Initialize socket client connection
  useEffect(() => {
    const s = io({
      transports: ['websocket'],
      autoConnect: true
    });
    setSocket(s);

    s.on('connect', () => {
      console.log('Multiplayer connected to socket server');
    });

    s.on('room:state', (state) => {
      setRoomState(state);
      if (state.status === 'lobby') {
        setCountdown(null);
        setStandings([]);
      }
    });

    s.on('race:countdown', ({ secondsRemaining }: { secondsRemaining: number }) => {
      setCountdown(secondsRemaining);
    });

    s.on('race:start', () => {
      setCountdown(null);
      setErrorMessage('');
    });

    s.on('race:progress:broadcast', ({ players }: { players: Player[] }) => {
      setRoomState((prev) => {
        if (!prev) return null;
        // Merge progress update details
        const updatedPlayers = prev.players.map((p) => {
          const match = players.find((u) => u.userId === p.userId);
          if (match) {
            return {
              ...p,
              percentComplete: match.percentComplete,
              wpm: match.wpm,
              finished: match.finished
            };
          }
          return p;
        });
        return { ...prev, players: updatedPlayers };
      });
    });

    s.on('race:results', ({ standings }: { standings: Standing[] }) => {
      setStandings(standings);
    });

    s.on('error', ({ message }: { message: string }) => {
      setErrorMessage(message);
    });

    return () => {
      s.disconnect();
    };
  }, []);

  // Sync refs
  useEffect(() => {
    roomCodeRef.current = roomCode;
  }, [roomCode]);

  useEffect(() => {
    if (roomState?.textContent) {
      textContentRef.current = roomState.textContent;
    }
  }, [roomState]);

  // Create Room action
  const handleCreateRoom = () => {
    const code = Math.random().toString(36).substr(2, 4).toUpperCase();
    setRoomCode(code);
    setErrorMessage('');
    socket?.emit('room:join', { roomCode: code, userId, username });
  };

  // Join Room action
  const handleJoinRoom = () => {
    if (!inputRoomCode.trim()) return;
    const code = inputRoomCode.toUpperCase().trim();
    setRoomCode(code);
    setErrorMessage('');
    socket?.emit('room:join', { roomCode: code, userId, username });
  };

  // Ready action
  const handleToggleReady = () => {
    if (!roomCode || !roomState) return;
    const self = roomState.players.find((p) => p.userId === userId);
    const nextReady = !self?.ready;
    socket?.emit('room:ready', { roomCode, userId, ready: nextReady });
  };

  // Host Start action
  const handleHostStart = () => {
    if (!roomCode) return;
    socket?.emit('room:start', { roomCode, userId });
  };

  // Leave Room action
  const handleLeaveRoom = () => {
    if (roomCode) {
      socket?.emit('room:leave');
      setRoomCode(null);
      setRoomState(null);
      setCountdown(null);
      setStandings([]);
      setErrorMessage('');
    }
  };

  // ----------------------------------------------------
  // Typing Engine Integration
  // ----------------------------------------------------
  const activeText = roomState?.textContent || 'Grid parameters loading...';
  const isRacing = roomState?.status === 'racing';

  const handleTestComplete = (results: any) => {
    if (!roomCodeRef.current) return;
    socket?.emit('race:finish', {
      roomCode: roomCodeRef.current,
      userId,
      wpm: results.wpm,
      accuracy: results.accuracy,
      durationSeconds: results.durationSeconds,
      keystrokeLog: results.keystrokeLog
    });
  };

  const engine = useTypingEngine({
    text: activeText,
    mode: 'paragraph',
    durationLimit: 120, // max duration fallback
    soundOn: user?.settings?.soundOn ?? true,
    onComplete: handleTestComplete
  });

  const {
    typedText,
    isActive,
    isCompleted,
    wpm,
    durationSeconds,
    handleKeyDown,
    resetTest
  } = engine;

  // Sync typing engine reset when race starts
  useEffect(() => {
    if (isRacing) {
      resetTest();
    }
  }, [isRacing, resetTest]);

  // Stream live typing progress every character typed
  useEffect(() => {
    if (isRacing && isActive && !isCompleted && roomCode && typedText.length > 0) {
      const percent = (typedText.length / activeText.length) * 100;
      socket?.emit('race:progress', {
        roomCode,
        userId,
        percentComplete: Math.round(percent),
        wpm: Math.round(wpm)
      });
    }
  }, [typedText, isRacing, isActive, isCompleted, roomCode, wpm, activeText.length, socket, userId]);

  // Copy Room Link Helper
  const handleCopyCode = () => {
    if (roomCode) {
      navigator.clipboard.writeText(roomCode);
      alert('Room code copied to clipboard!');
    }
  };

  // Return markup for lobby creation/joining
  if (!roomCode) {
    return (
      <div style={{ maxWidth: '480px', margin: '60px auto', padding: '0 20px' }}>
        <div className="glass-panel" style={{ padding: '32px', position: 'relative' }}>
          <div className="scan-laser" />

          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <Users size={32} style={{ color: 'var(--primary-neon)', marginBottom: '8px' }} />
            <h2 style={{ fontFamily: 'var(--font-mono)', fontSize: '20px', color: 'var(--primary-neon)' }}>
              [ REAL-TIME MULTIPLAYER GRID ]
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '6px' }}>
              Race head-to-head against other operators in synchronous text compilation.
            </p>
          </div>

          {errorMessage && (
            <div style={{ color: 'var(--error-color)', fontSize: '13px', background: 'rgba(255,51,51,0.05)', border: '1px solid var(--error-color)', padding: '10px', borderRadius: '6px', marginBottom: '16px', display: 'flex', gap: '8px' }}>
              <AlertCircle size={16} /> {errorMessage}
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <button onClick={handleCreateRoom} className="cyber-button" style={{ width: '100%', justifyContent: 'center' }}>
              FABRICATE NEW PRIVATE SECTOR
            </button>

            <div style={{ display: 'flex', alignItems: 'center', margin: '8px 0' }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></div>
              <span style={{ padding: '0 10px', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>OR JOIN SECTOR</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                value={inputRoomCode}
                onChange={(e) => setInputRoomCode(e.target.value.toUpperCase())}
                placeholder="SECTOR CODE"
                maxLength={4}
                className="cyber-input"
                style={{ fontFamily: 'var(--font-mono)', fontSize: '16px', textTransform: 'uppercase', textAlign: 'center', flex: 1 }}
              />
              <button onClick={handleJoinRoom} className="cyber-button" disabled={inputRoomCode.length < 4}>
                CONNECT <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const self = roomState?.players.find((p) => p.userId === userId);
  const isHost = roomState?.hostId === userId;

  return (
    <div style={{ maxWidth: '1000px', margin: '40px auto', padding: '0 20px' }}>
      {/* Lobby header info */}
      <div
        className="glass-panel"
        style={{
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          position: 'relative'
        }}
      >
        <div className="scan-laser" />
        <div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>ACTIVE ROOM CODE</span>
          <h2 style={{ fontFamily: 'var(--font-mono)', color: 'var(--primary-neon)', fontSize: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {roomCode}
            <button onClick={handleCopyCode} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary-neon)' }} title="Copy Code">
              <Copy size={16} />
            </button>
          </h2>
        </div>

        <button onClick={handleLeaveRoom} className="cyber-button" style={{ borderColor: 'var(--error-color)', color: 'var(--error-color)' }}>
          DISCONNECT SECTOR
        </button>
      </div>

      {errorMessage && (
        <div style={{ color: 'var(--error-color)', fontSize: '13px', border: '1px solid var(--error-color)', background: 'rgba(255,51,51,0.05)', padding: '12px', borderRadius: '6px', marginBottom: '16px' }}>
          {errorMessage}
        </div>
      )}

      {/* LOBBY LOBBY STATE */}
      {roomState?.status === 'lobby' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', alignItems: 'start' }}>
          {/* Players List */}
          <div className="glass-panel" style={{ padding: '24px', position: 'relative' }}>
            <div className="scan-laser" />
            <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--primary-neon)', marginBottom: '16px' }}>
              [ RUNNERS CONNECTED TO CHANNEL ]
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {roomState.players.map((p) => (
                <div
                  key={p.userId}
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    padding: '12px',
                    borderRadius: '6px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    border: '1px solid',
                    borderColor: p.ready ? 'var(--primary-neon)' : 'transparent'
                  }}
                >
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>
                    {p.username} {p.userId === roomState.hostId && <span style={{ color: '#ffbf00', fontSize: '10px' }}>[HOST]</span>}
                  </span>
                  
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '12px',
                      color: p.ready ? 'var(--primary-neon)' : 'var(--text-muted)'
                    }}
                  >
                    {p.ready ? 'READY TO SYNC' : 'STANDBY'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Lobby Controller */}
          <div className="glass-panel" style={{ padding: '24px', position: 'relative', textAlign: 'center' }}>
            <div className="scan-laser" />
            <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--primary-neon)', marginBottom: '16px' }}>
              [ SYNCHRONIZATION CONTROLS ]
            </h3>
            
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>
              Once all connected operators switch to READY status, countdown protocols will automatically initialize.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                onClick={handleToggleReady}
                className="cyber-button"
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  background: self?.ready ? 'var(--primary-neon)' : 'transparent',
                  color: self?.ready ? 'var(--bg-color)' : 'var(--primary-neon)'
                }}
              >
                {self?.ready ? 'STAY READY' : 'INITIALIZE SYNC (READY)'}
              </button>

              {isHost && (
                <button onClick={handleHostStart} className="cyber-button" style={{ width: '100%', justifyContent: 'center' }}>
                  <Play size={14} /> HOST BYPASS: START COUNTDOWN
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* COUNTDOWN COUNTDOWN STATE */}
      {roomState?.status === 'countdown' && (
        <div className="glass-panel" style={{ padding: '60px', textAlign: 'center', position: 'relative' }}>
          <div className="scan-laser" />
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>COMMENCING TRANS-GRID TRANSMISSION</span>
          <h1 style={{ fontFamily: 'var(--font-mono)', fontSize: '72px', color: 'var(--primary-neon)', margin: '20px 0' }}>
            {countdown ?? 3}
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Get ready. Compiling target quote structure...</p>
        </div>
      )}

      {/* RACING RACING STATE */}
      {roomState?.status === 'racing' && (
        <div>
          {/* Progress visual tracks */}
          <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px', position: 'relative' }}>
            <div className="scan-laser" />
            <h4 style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--primary-neon)', marginBottom: '16px' }}>
              [ REAL-TIME COMPILATION TRACKS ]
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {roomState.players.map((p) => (
                <div key={p.userId} style={{ position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontFamily: 'var(--font-mono)', marginBottom: '4px' }}>
                    <span style={{ color: p.userId === userId ? 'var(--primary-neon)' : 'var(--text-color)' }}>
                      {p.username} {p.userId === userId && '(YOU)'}
                    </span>
                    <span style={{ color: 'var(--primary-neon)' }}>
                      {p.wpm} WPM · {p.percentComplete}%
                    </span>
                  </div>

                  {/* Horizontal progress bar track */}
                  <div
                    style={{
                      height: '8px',
                      background: 'rgba(255,255,255,0.05)',
                      borderRadius: '4px',
                      overflow: 'hidden',
                      border: '1px solid var(--border-color)',
                      position: 'relative'
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${p.percentComplete}%`,
                        backgroundColor: p.userId === userId ? 'var(--primary-neon)' : 'var(--text-color)',
                        boxShadow: p.userId === userId ? 'var(--glow-shadow)' : 'none',
                        transition: 'width 0.25s linear'
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Typing Area */}
          <div style={{ marginBottom: '12px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontSize: '12px' }}>
            ELAPSED: {durationSeconds}s
          </div>

          <TypingArea
            text={activeText}
            typedText={typedText}
            isActive={isRacing}
            isPaused={false}
            isCompleted={isCompleted}
            onKeyDown={handleKeyDown}
          />
        </div>
      )}

      {/* FINISHED FINISHED/RESULTS STATE */}
      {roomState?.status === 'finished' && standings.length > 0 && (
        <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', position: 'relative' }}>
          <div className="scan-laser" />
          <h2 style={{ fontFamily: 'var(--font-mono)', color: 'var(--primary-neon)', fontSize: '22px', marginBottom: '24px' }}>
            [ PODIUM STANDINGS ]
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '600px', margin: '0 auto 32px auto' }}>
            {standings.map((st) => (
              <div
                key={st.userId}
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid',
                  borderColor: st.rank === 1 ? '#ffbf00' : 'var(--border-color)',
                  padding: '16px 20px',
                  borderRadius: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  boxShadow: st.rank === 1 ? '0 0 10px rgba(255, 191, 0, 0.2)' : 'none'
                }}
              >
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '18px',
                      color: st.rank === 1 ? '#ffbf00' : 'var(--text-muted)',
                      fontWeight: 'bold'
                    }}
                  >
                    #{st.rank}
                  </span>
                  <span style={{ fontWeight: '500' }}>
                    {st.username} {st.userId === userId && '(YOU)'}
                  </span>
                </div>

                <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                  <div style={{ color: 'var(--primary-neon)', fontWeight: 'bold', fontSize: '18px' }}>
                    {st.wpm} <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>WPM</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{st.accuracy}% accuracy</div>
                </div>
              </div>
            ))}
          </div>

          <button onClick={handleLeaveRoom} className="cyber-button">
            <HomeIcon size={14} /> LEAVE RACE PODIUM
          </button>
        </div>
      )}
    </div>
  );
};
