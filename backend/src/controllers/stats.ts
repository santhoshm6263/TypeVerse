import { Request, Response } from 'express';
import { prisma } from '../services/db.js';
import { AuthRequest } from '../middleware/auth.js';
import { verifyKeystrokeLog } from '../middleware/antiCheat.js';
import { checkAndUnlockAchievements } from '../services/achievements.js';

export const submitTest = async (req: AuthRequest, res: Response) => {
  try {
    const {
      mode,
      difficulty,
      durationSeconds,
      wpm,
      accuracy,
      mistakes,
      correctWords,
      incorrectWords,
      backspaces,
      charactersTyped,
      rawKeystrokeLog,
      source,
      textId,
      customText
    } = req.body;

    // 1. Get the original text content to check anti-cheat
    let targetText = '';
    if (textId) {
      const dbText = await prisma.text.findUnique({ where: { id: textId } });
      if (dbText) targetText = dbText.content;
    } else if (customText) {
      targetText = customText;
    }

    if (!targetText) {
      return res.status(400).json({ error: 'Valid text reference or custom content required.' });
    }

    // 2. Perform server-side validation (anti-cheat)
    const verification = verifyKeystrokeLog(
      targetText,
      durationSeconds,
      wpm,
      accuracy,
      rawKeystrokeLog
    );

    if (!verification.isValid) {
      return res.status(400).json({
        error: 'Keystroke validation failed.',
        details: verification.message
      });
    }

    // 3. Save result (userId can be undefined for guests)
    const userId = req.userId || null;

    const result = await prisma.testResult.create({
      data: {
        userId,
        mode,
        difficulty,
        durationSeconds,
        wpm: verification.computedWpm,
        cpm: verification.computedWpm * 5,
        accuracy: verification.computedAccuracy,
        mistakes,
        correctWords,
        incorrectWords,
        backspaces,
        charactersTyped,
        rawKeystrokeLog: JSON.stringify(rawKeystrokeLog),
        source: source || 'solo'
      }
    });

    // 4. Trigger achievements if registered user
    let unlockedAchievements: any[] = [];
    if (userId) {
      unlockedAchievements = await checkAndUnlockAchievements(userId);
    }

    return res.status(201).json({
      message: 'Test saved successfully.',
      result,
      unlockedAchievements
    });
  } catch (err) {
    console.error('Submit test error:', err);
    return res.status(500).json({ error: 'Failed to submit test result.' });
  }
};

export const getStatsMe = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const userId = req.userId;

    const testResults = await prisma.testResult.findMany({
      where: { userId }
    });

    if (testResults.length === 0) {
      return res.json({
        highestWpm: 0,
        averageWpm: 0,
        bestAccuracy: 0,
        totalTests: 0,
        totalCharacters: 0,
        totalTimeSeconds: 0
      });
    }

    const highestWpm = Math.max(...testResults.map(r => r.wpm));
    const bestAccuracy = Math.max(...testResults.map(r => r.accuracy));
    const totalTests = testResults.length;
    const totalCharacters = testResults.reduce((acc, r) => acc + r.charactersTyped, 0);
    const totalTimeSeconds = testResults.reduce((acc, r) => acc + r.durationSeconds, 0);
    const averageWpm = testResults.reduce((acc, r) => acc + r.wpm, 0) / totalTests;

    return res.json({
      highestWpm: Math.round(highestWpm * 100) / 100,
      averageWpm: Math.round(averageWpm * 100) / 100,
      bestAccuracy: Math.round(bestAccuracy * 100) / 100,
      totalTests,
      totalCharacters,
      totalTimeSeconds
    });
  } catch (err) {
    console.error('Get stats error:', err);
    return res.status(500).json({ error: 'Failed to compute stats.' });
  }
};

export const getHistoryMe = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const userId = req.userId;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const mode = req.query.mode as string;
    const skip = (page - 1) * limit;

    const filter: any = { userId };
    if (mode && mode !== 'all') {
      filter.mode = mode;
    }

    const total = await prisma.testResult.count({ where: filter });
    const history = await prisma.testResult.findMany({
      where: filter,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    });

    return res.json({
      history,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('Get history error:', err);
    return res.status(500).json({ error: 'Failed to fetch history.' });
  }
};

export const resetStats = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const userId = req.userId;

    // Delete results and unlocked achievements
    await prisma.testResult.deleteMany({ where: { userId } });
    await prisma.userAchievement.deleteMany({ where: { userId } });

    return res.json({ message: 'Statistics reset successfully.' });
  } catch (err) {
    console.error('Reset stats error:', err);
    return res.status(500).json({ error: 'Failed to reset stats.' });
  }
};

export const getAchievements = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    const allAchievements = await prisma.achievement.findMany();
    
    if (!userId) {
      // Guests see unlocked as false
      return res.json(
        allAchievements.map((ach) => ({
          ...ach,
          unlocked: false,
          unlockedAt: null
        }))
      );
    }

    const userAchievements = await prisma.userAchievement.findMany({
      where: { userId }
    });

    const unlockedMap = new Map(userAchievements.map(ua => [ua.achievementId, ua.unlockedAt]));

    const response = allAchievements.map((ach) => ({
      ...ach,
      unlocked: unlockedMap.has(ach.id),
      unlockedAt: unlockedMap.get(ach.id) || null
    }));

    return res.json(response);
  } catch (err) {
    console.error('Get achievements error:', err);
    return res.status(500).json({ error: 'Failed to fetch achievements.' });
  }
};

export const getLeaderboard = async (req: Request, res: Response) => {
  try {
    const mode = (req.query.mode as string) || 'paragraph';
    const difficulty = (req.query.difficulty as string) || 'medium';
    const duration = parseInt(req.query.duration as string, 10) || 30;

    // Fetch test results matching filters. Filter out WPM > 250 (flagged/anti-cheat trigger)
    const results = await prisma.testResult.findMany({
      where: {
        mode,
        difficulty,
        durationSeconds: duration,
        wpm: { lte: 250 }, // Exclude anomalies
        userId: { not: null } // Only registered accounts on global board
      },
      orderBy: {
        wpm: 'desc'
      },
      include: {
        user: {
          select: {
            username: true,
            avatarUrl: true
          }
        }
      }
    });

    // Deduplicate: only keep highest WPM per user
    const seenUsers = new Set<string>();
    const leaderboard: any[] = [];

    for (const res of results) {
      if (res.userId && !seenUsers.has(res.userId)) {
        seenUsers.add(res.userId);
        leaderboard.push({
          id: res.id,
          username: res.user?.username || 'Unknown',
          wpm: res.wpm,
          accuracy: res.accuracy,
          createdAt: res.createdAt
        });
      }
      if (leaderboard.length >= 10) break; // Top 10 only
    }

    return res.json(leaderboard);
  } catch (err) {
    console.error('Get leaderboard error:', err);
    return res.status(500).json({ error: 'Failed to query leaderboard.' });
  }
};
