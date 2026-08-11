import { Server as SocketIOServer, Socket } from 'socket.io';
import { prisma } from './db.js';
import { verifyKeystrokeLog } from '../middleware/antiCheat.js';
import { checkAndUnlockAchievements } from './achievements.js';

interface Player {
  userId: string;
  username: string;
  ready: boolean;
  percentComplete: number;
  wpm: number;
  accuracy: number;
  finished: boolean;
  left: boolean;
  socketId: string;
}

interface Room {
  code: string;
  status: 'lobby' | 'countdown' | 'racing' | 'finished';
  players: Player[];
  textId: string | null;
  textContent: string | null;
  hostId: string | null;
  countdownTimer?: NodeJS.Timeout;
  startedAt?: number;
}

// In-memory room store mimicking Redis for active rooms
const roomsStore = new Map<string, Room>();

export function initSocketService(io: SocketIOServer) {
  io.on('connection', (socket: Socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Helper: Find room by socket ID
    const findRoomBySocketId = (socketId: string): Room | null => {
      for (const room of roomsStore.values()) {
        if (room.players.some(p => p.socketId === socketId)) {
          return room;
        }
      }
      return null;
    };

    // Helper: Broadcast room state
    const broadcastRoomState = (roomCode: string) => {
      const room = roomsStore.get(roomCode);
      if (!room) return;

      const payload = {
        code: room.code,
        status: room.status,
        players: room.players.map(p => ({
          userId: p.userId,
          username: p.username,
          ready: p.ready,
          percentComplete: p.percentComplete,
          wpm: p.wpm,
          accuracy: p.accuracy,
          finished: p.finished,
          left: p.left
        })),
        textId: room.textId,
        textContent: room.textContent,
        hostId: room.hostId
      };

      io.to(roomCode).emit('room:state', payload);
    };

    // Join room
    socket.on('room:join', async ({ roomCode, userId, username }: { roomCode: string; userId: string; username: string }) => {
      const formattedCode = roomCode.toUpperCase().trim();
      socket.join(formattedCode);

      let room = roomsStore.get(formattedCode);

      if (!room) {
        // Create new room
        room = {
          code: formattedCode,
          status: 'lobby',
          players: [],
          textId: null,
          textContent: null,
          hostId: userId
        };
        roomsStore.set(formattedCode, room);

        // Fetch a default text to pre-warm the room
        const text = await prisma.text.findFirst({
          where: { mode: 'paragraph' }
        });
        if (text) {
          room.textId = text.id;
          room.textContent = text.content;
        }
      }

      // Check if player already in the room list
      let player = room.players.find(p => p.userId === userId);
      if (player) {
        player.socketId = socket.id;
        player.left = false;
      } else {
        // Prevent joining mid-race unless spectator (for now, allow returning)
        if (room.status !== 'lobby') {
          socket.emit('error', { message: 'Race has already started.' });
          return;
        }

        room.players.push({
          userId,
          username: username || 'Guest',
          ready: false,
          percentComplete: 0,
          wpm: 0,
          accuracy: 100,
          finished: false,
          left: false,
          socketId: socket.id
        });
      }

      console.log(`User ${username} (${userId}) joined room ${formattedCode}`);
      broadcastRoomState(formattedCode);
    });

    // Toggle Ready state
    socket.on('room:ready', ({ roomCode, userId, ready }: { roomCode: string; userId: string; ready: boolean }) => {
      const room = roomsStore.get(roomCode);
      if (!room || room.status !== 'lobby') return;

      const player = room.players.find(p => p.userId === userId);
      if (player) {
        player.ready = ready;
      }

      broadcastRoomState(roomCode);

      // Auto start countdown if at least 1 player, and all joined players are ready
      const activePlayers = room.players.filter(p => !p.left);
      const allReady = activePlayers.length > 0 && activePlayers.every(p => p.ready);

      if (allReady) {
        startCountdown(roomCode);
      }
    });

    // Manual start by Host
    socket.on('room:start', ({ roomCode, userId }: { roomCode: string; userId: string }) => {
      const room = roomsStore.get(roomCode);
      if (!room || room.status !== 'lobby') return;

      if (room.hostId !== userId) {
        socket.emit('error', { message: 'Only the host can start the race.' });
        return;
      }

      startCountdown(roomCode);
    });

    // Start countdown sequence
    const startCountdown = async (roomCode: string) => {
      const room = roomsStore.get(roomCode);
      if (!room || room.status !== 'lobby') return;

      room.status = 'countdown';
      broadcastRoomState(roomCode);

      // Select a random paragraph for the race
      const texts = await prisma.text.findMany({
        where: { mode: 'paragraph' }
      });
      if (texts.length > 0) {
        const selected = texts[Math.floor(Math.random() * texts.length)];
        room.textId = selected.id;
        room.textContent = selected.content;
      }

      let count = 3;
      room.countdownTimer = setInterval(() => {
        io.to(roomCode).emit('race:countdown', { secondsRemaining: count });
        count--;

        if (count < 0) {
          if (room.countdownTimer) clearInterval(room.countdownTimer);
          room.status = 'racing';
          room.startedAt = Date.now();
          
          // Reset player progress metrics
          room.players.forEach(p => {
            p.percentComplete = 0;
            p.wpm = 0;
            p.finished = false;
          });

          io.to(roomCode).emit('race:start', {
            textId: room.textId,
            textContent: room.textContent,
            startTimestamp: room.startedAt
          });
          broadcastRoomState(roomCode);
        }
      }, 1000);
    };

    // Race Progress sync
    socket.on('race:progress', ({ roomCode, userId, percentComplete, wpm }: { roomCode: string; userId: string; percentComplete: number; wpm: number }) => {
      const room = roomsStore.get(roomCode);
      if (!room || room.status !== 'racing') return;

      const player = room.players.find(p => p.userId === userId);
      if (player && !player.finished) {
        player.percentComplete = percentComplete;
        player.wpm = wpm;
      }

      // Broadcast throttled progress to all room players
      io.to(roomCode).emit('race:progress:broadcast', {
        players: room.players.map(p => ({
          userId: p.userId,
          percentComplete: p.percentComplete,
          wpm: p.wpm,
          finished: p.finished
        }))
      });
    });

    // Race Finish (Verify and Persist)
    socket.on('race:finish', async ({
      roomCode,
      userId,
      wpm,
      accuracy,
      durationSeconds,
      keystrokeLog
    }: {
      roomCode: string;
      userId: string;
      wpm: number;
      accuracy: number;
      durationSeconds: number;
      keystrokeLog: any[];
    }) => {
      const room = roomsStore.get(roomCode);
      if (!room || room.status !== 'racing') return;

      const player = room.players.find(p => p.userId === userId);
      if (!player || player.finished) return;

      // 1. Re-validate results on the server-side via anti-cheat
      const validation = verifyKeystrokeLog(
        room.textContent || '',
        durationSeconds,
        wpm,
        accuracy,
        keystrokeLog
      );

      if (!validation.isValid) {
        console.warn(`Cheating detected in room ${roomCode} for user ${player.username}: ${validation.message}`);
        socket.emit('error', { message: `Verification failed: ${validation.message}` });
        return;
      }

      player.finished = true;
      player.wpm = validation.computedWpm;
      player.accuracy = validation.computedAccuracy;

      // 2. Persist to DB if registered user (UUID vs guest marker)
      const isGuest = userId.startsWith('guest-');
      let savedResultId: string | null = null;
      let unlockedAchievements: any[] = [];

      if (!isGuest) {
        try {
          const result = await prisma.testResult.create({
            data: {
              userId,
              mode: 'paragraph',
              difficulty: 'medium', // multiplayer defaults to medium
              durationSeconds,
              wpm: validation.computedWpm,
              cpm: validation.computedWpm * 5,
              accuracy: validation.computedAccuracy,
              mistakes: keystrokeLog.filter(k => !k.isCorrect).length,
              correctWords: room.textContent?.split(' ').length || 0,
              incorrectWords: 0,
              backspaces: keystrokeLog.filter(k => k.char === 'Backspace').length,
              charactersTyped: keystrokeLog.length,
              rawKeystrokeLog: JSON.stringify(keystrokeLog),
              source: 'multiplayer',
              roomId: room.code
            }
          });
          savedResultId = result.id;
          
          // Check for achievements
          unlockedAchievements = await checkAndUnlockAchievements(userId);
        } catch (dbErr) {
          console.error('Failed to save multiplayer test result:', dbErr);
        }
      }

      socket.emit('race:finished:response', {
        resultId: savedResultId,
        unlockedAchievements
      });

      // 3. Check if all active players finished
      const activePlayers = room.players.filter(p => !p.left);
      const allFinished = activePlayers.every(p => p.finished);

      if (allFinished) {
        room.status = 'finished';

        // Save durable Room summary to PostgreSQL/SQLite
        try {
          await prisma.raceRoom.create({
            data: {
              code: room.code,
              hostUserId: room.hostId && !room.hostId.startsWith('guest-') ? room.hostId : null,
              textId: room.textId,
              status: 'finished',
              finishedAt: new Date()
            }
          });
        } catch (dbErr) {
          console.error('Failed to persist finished race room:', dbErr);
        }

        // Broadcast standings
        const standings = room.players
          .filter(p => p.finished || p.left)
          .sort((a, b) => {
            if (a.left && !b.left) return 1;
            if (!a.left && b.left) return -1;
            return b.wpm - a.wpm; // order by highest WPM
          })
          .map((p, idx) => ({
            userId: p.userId,
            username: p.username,
            wpm: p.wpm,
            accuracy: p.accuracy,
            rank: idx + 1,
            left: p.left
          }));

        io.to(roomCode).emit('race:results', { standings });
      }

      broadcastRoomState(roomCode);
    });

    // Leave Room / Disconnect
    const handleLeave = () => {
      const room = findRoomBySocketId(socket.id);
      if (!room) return;

      const player = room.players.find(p => p.socketId === socket.id);
      if (!player) return;

      player.left = true;
      console.log(`User ${player.username} left room ${room.code}`);

      if (room.status === 'lobby') {
        // In lobby, just remove them
        room.players = room.players.filter(p => p.socketId !== socket.id);
      } else {
        // Mid-race, mark them as left and finished so others aren't blocked
        player.finished = true;
        player.wpm = 0;
      }

      const activePlayers = room.players.filter(p => !p.left);

      if (activePlayers.length === 0) {
        // Clear empty room
        if (room.countdownTimer) clearInterval(room.countdownTimer);
        roomsStore.delete(room.code);
        console.log(`Cleaned up empty room ${room.code}`);
      } else {
        // Change host if needed
        if (room.hostId === player.userId) {
          room.hostId = activePlayers[0].userId;
        }

        broadcastRoomState(room.code);

        // Check if everyone remaining is done
        if (room.status === 'racing') {
          const allFinished = activePlayers.every(p => p.finished);
          if (allFinished) {
            room.status = 'finished';
            const standings = room.players
              .filter(p => p.finished || p.left)
              .sort((a, b) => {
                if (a.left && !b.left) return 1;
                if (!a.left && b.left) return -1;
                return b.wpm - a.wpm;
              })
              .map((p, idx) => ({
                userId: p.userId,
                username: p.username,
                wpm: p.wpm,
                accuracy: p.accuracy,
                rank: idx + 1,
                left: p.left
              }));

            io.to(room.code).emit('race:results', { standings });
            broadcastRoomState(room.code);
          }
        }
      }
    };

    socket.on('room:leave', handleLeave);
    socket.on('disconnect', handleLeave);
  });
}
