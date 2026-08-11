import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { register, login, refresh, logout, getMe, updateSettings } from './controllers/auth.js';
import { getTexts, createText } from './controllers/texts.js';
import { submitTest, getStatsMe, getHistoryMe, resetStats, getAchievements, getLeaderboard } from './controllers/stats.js';
import { authenticateToken, optionalAuthenticateToken, requireAdmin } from './middleware/auth.js';
import { initSocketService } from './services/socket.js';

const app = express();
const port = process.env.PORT || 5000;

// Enable CORS with credentials for local client
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(cookieParser());

// Authentication Routes
app.post('/api/auth/register', register);
app.post('/api/auth/login', login);
app.post('/api/auth/refresh', refresh);
app.post('/api/auth/logout', logout);
app.get('/api/users/me', authenticateToken, getMe);
app.patch('/api/users/me/settings', authenticateToken, updateSettings);

// Texts Library Routes
app.get('/api/texts', getTexts);
app.post('/api/texts', authenticateToken, requireAdmin, createText);

// Statistics and Submissions Routes
app.post('/api/tests/submit', optionalAuthenticateToken, submitTest);
app.get('/api/stats/me', authenticateToken, getStatsMe);
app.get('/api/history/me', authenticateToken, getHistoryMe);
app.delete('/api/stats/me', authenticateToken, resetStats);
app.get('/api/achievements', optionalAuthenticateToken, getAchievements);
app.get('/api/leaderboard', getLeaderboard);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

// Setup server and real-time socket layer
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Initialize WebSocket Room Coordinator
initSocketService(io);

server.listen(port, () => {
  console.log(`[TypeMaster Backend] Server running at http://localhost:${port}`);
});
