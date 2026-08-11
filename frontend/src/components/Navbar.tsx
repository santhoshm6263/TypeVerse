import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';
import { useThemeStore, ThemeName } from '../store/themeStore.js';
import { Terminal, Award, BarChart2, Users, Settings, LogOut, LogIn } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleThemeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextTheme = e.target.value as ThemeName;
    setTheme(nextTheme);
    // Persist to database if user logged in
    useAuthStore.getState().updateSettings(nextTheme, {});
  };

  const navItems = [
    { path: '/', label: 'Practice', icon: <Terminal size={16} /> },
    { path: '/multiplayer', label: 'Multiplayer', icon: <Users size={16} /> },
    { path: '/leaderboard', label: 'Leaderboard', icon: <Award size={16} /> },
    ...(isAuthenticated ? [
      { path: '/stats', label: 'Analytics', icon: <BarChart2 size={16} /> },
      { path: '/achievements', label: 'Achievements', icon: <Award size={16} /> }
    ] : [])
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <nav
      className="glass-panel"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 24px',
        margin: '16px auto',
        maxWidth: '1200px',
        width: 'calc(100% - 32px)',
        borderRadius: '8px'
      }}
    >
      {/* Brand logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Link 
          to="/" 
          className="cyber-title" 
          style={{ fontSize: '1.4rem', textDecoration: 'none', letterSpacing: '2px' }}
        >
          <span>TYPE</span>MASTER
        </Link>
      </div>

      {/* Nav links */}
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: isActive ? 'var(--primary-neon)' : 'var(--text-color)',
                textShadow: isActive ? 'var(--glow-shadow)' : 'none',
                textDecoration: 'none',
                fontFamily: 'var(--font-mono)',
                fontSize: '14px',
                padding: '6px 12px',
                borderRadius: '4px',
                border: '1px solid transparent',
                borderColor: isActive ? 'var(--border-color)' : 'transparent',
                transition: 'all 0.2s ease'
              }}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </div>

      {/* Right actions: Theme + User Panel */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Theme select */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <select
            value={theme}
            onChange={handleThemeChange}
            style={{
              background: 'rgba(0,0,0,0.4)',
              color: 'var(--primary-neon)',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              padding: '6px 10px',
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="matrix-green">Matrix Green</option>
            <option value="cyber-blue">Cyber Blue</option>
            <option value="neon-purple">Neon Purple</option>
            <option value="orange-sunset">Orange Sunset</option>
            <option value="red-hacker">Red Hacker</option>
            <option value="white-minimal">White Minimal</option>
          </select>
        </div>

        {/* User state panel */}
        {isAuthenticated && user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '13px',
                color: 'var(--text-color)',
                backgroundColor: 'rgba(255,255,255,0.05)',
                padding: '4px 8px',
                borderRadius: '4px',
                border: '1px solid var(--border-color)'
              }}
            >
              {user.username}
            </span>
            <button
              onClick={() => navigate('/settings')}
              className="cyber-button"
              style={{ padding: '6px 10px', fontSize: '12px', border: '1px solid var(--border-color)' }}
              title="Settings"
            >
              <Settings size={14} />
            </button>
            <button
              onClick={handleLogout}
              className="cyber-button"
              style={{ padding: '6px 10px', fontSize: '12px' }}
              title="Log Out"
            >
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '8px' }}>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                alignSelf: 'center',
                color: 'var(--text-muted)'
              }}
            >
              [ GUEST SESSION ]
            </span>
            <button
              onClick={() => navigate('/login')}
              className="cyber-button"
              style={{ padding: '6px 12px', fontSize: '12px' }}
            >
              <LogIn size={13} />
              LOG IN
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};
