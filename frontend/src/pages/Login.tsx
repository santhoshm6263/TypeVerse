import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';
import { User, Lock, Mail, ShieldAlert } from 'lucide-react';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, register } = useAuthStore();

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      if (isLogin) {
        // Login: username or email can be entered in "username" field
        const res = await login(username, password);
        if (res.success) {
          navigate('/');
        } else {
          setErrorMsg(res.error || 'Login failed.');
        }
      } else {
        // Register
        if (!email.trim() || !username.trim() || !password.trim()) {
          setErrorMsg('All fields are required.');
          setLoading(false);
          return;
        }
        const res = await register(email, username, password);
        if (res.success) {
          navigate('/');
        } else {
          setErrorMsg(res.error || 'Registration failed.');
        }
      }
    } catch (err) {
      setErrorMsg('Network connectivity issue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '420px', margin: '60px auto', padding: '0 20px' }}>
      <div className="glass-panel" style={{ padding: '32px', position: 'relative' }}>
        <div className="scan-laser" />

        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontFamily: 'var(--font-mono)', fontSize: '20px', color: 'var(--primary-neon)' }}>
            {isLogin ? '[ INITIALIZE CONNECTION ]' : '[ FABRICATE CORE IDENTITY ]'}
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '6px' }}>
            {isLogin ? 'Access your stats & global leaderboards.' : 'Setup a persistent profile to track achievements.'}
          </p>
        </div>

        {errorMsg && (
          <div
            style={{
              background: 'rgba(255, 51, 51, 0.1)',
              border: '1px solid var(--error-color)',
              borderRadius: '6px',
              padding: '12px',
              fontSize: '13px',
              color: 'var(--error-color)',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <ShieldAlert size={16} />
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {!isLogin && (
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: '6px' }}>
                EMAIL ADDRESS
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="cyber-input"
                  placeholder="runner@typemaster.io"
                  style={{ paddingLeft: '40px' }}
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: '6px' }}>
              {isLogin ? 'USERNAME OR EMAIL' : 'DESIRED USERNAME'}
            </label>
            <div style={{ position: 'relative' }}>
              <User size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="cyber-input"
                placeholder={isLogin ? "neon_runner" : "crypt_hack"}
                style={{ paddingLeft: '40px' }}
                required
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: '6px' }}>
              SECURITY PASSWORD
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="cyber-input"
                placeholder="••••••••"
                style={{ paddingLeft: '40px' }}
                required
              />
            </div>
          </div>

          <button type="submit" className="cyber-button" style={{ width: '100%', justifyContent: 'center', marginTop: '8px' }} disabled={loading}>
            {loading ? 'SYNCHRONIZING...' : isLogin ? 'SIGN IN' : 'FABRICATE CORE'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '13px' }}>
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setErrorMsg('');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--primary-neon)',
              fontFamily: 'var(--font-mono)',
              cursor: 'pointer',
              textDecoration: 'underline',
              fontSize: '12px'
            }}
          >
            {isLogin ? "[ CHOOSE NEW IDENTITY ]" : "[ RETRIEVE EXISTING ID ]"}
          </button>
        </div>
      </div>
    </div>
  );
};
