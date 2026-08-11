import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/Navbar.js';
import { ParticleBg } from './components/ParticleBg.js';
import { useAuthStore } from './store/authStore.js';
import { Home } from './pages/Home.js';
import { Login } from './pages/Login.js';
import { Settings } from './pages/Settings.js';
import { Statistics } from './pages/Statistics.js';
import { Achievements } from './pages/Achievements.js';
import { Leaderboard } from './pages/Leaderboard.js';
import { MultiplayerRoom } from './pages/MultiplayerRoom.js';
import { About } from './pages/About.js';
import './index.css';

// Guard Route for authenticated paths
const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', height: '80vh', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', color: 'var(--primary-neon)' }}>
        AUTHENTICATING IMPLANT IDENTITY...
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

const App: React.FC = () => {
  const { checkAuth } = useAuthStore();

  // Validate session on start
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <BrowserRouter>
      {/* Visual cyber overlays */}
      <div className="scanlines" />
      <ParticleBg />

      {/* Navigation */}
      <Navbar />

      {/* Routing Main Panel */}
      <main style={{ paddingBottom: '60px' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/about" element={<About />} />
          
          {/* Protected Routes */}
          <Route path="/settings" element={
            <PrivateRoute>
              <Settings />
            </PrivateRoute>
          } />
          <Route path="/stats" element={
            <PrivateRoute>
              <Statistics />
            </PrivateRoute>
          } />
          <Route path="/achievements" element={
            <PrivateRoute>
              <Achievements />
            </PrivateRoute>
          } />
          <Route path="/multiplayer" element={<MultiplayerRoom />} />

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
