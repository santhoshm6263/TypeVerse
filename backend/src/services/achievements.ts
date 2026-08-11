import { prisma } from './db.js';
import { Achievement } from '@prisma/client';

export async function checkAndUnlockAchievements(userId: string): Promise<Achievement[]> {
  const unlockedNow: Achievement[] = [];

  // 1. Fetch user's unlocked achievements keys
  const alreadyUnlocked = await prisma.userAchievement.findMany({
    where: { userId },
    select: { achievement: { select: { key: true } } }
  });
  const unlockedKeys = new Set(alreadyUnlocked.map(ua => ua.achievement.key));

  // 2. Fetch user's test stats
  const totalTests = await prisma.testResult.count({ where: { userId } });
  if (totalTests === 0) return [];

  const bestResult = await prisma.testResult.findFirst({
    where: { userId },
    orderBy: { wpm: 'desc' }
  });

  const bestAccuracyResult = await prisma.testResult.findFirst({
    where: { userId },
    orderBy: { accuracy: 'desc' }
  });

  const maxWpm = bestResult ? bestResult.wpm : 0;
  const maxAccuracy = bestAccuracyResult ? bestAccuracyResult.accuracy : 0;

  // 3. Fetch all test dates for streak calculation
  const allTests = await prisma.testResult.findMany({
    where: { userId },
    select: { createdAt: true },
    orderBy: { createdAt: 'asc' }
  });

  // Calculate maximum consecutive days practiced
  let hasSevenDayStreak = false;
  if (allTests.length >= 7) {
    const uniqueDates = Array.from(
      new Set(
        allTests.map((t) => {
          const d = new Date(t.createdAt);
          return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
        })
      )
    ).sort();

    let consecutiveCount = 1;
    for (let i = 1; i < uniqueDates.length; i++) {
      const prev = new Date(uniqueDates[i - 1]).getTime();
      const curr = new Date(uniqueDates[i]).getTime();
      const diffDays = (curr - prev) / (1000 * 60 * 60 * 24);

      if (diffDays === 1) {
        consecutiveCount++;
        if (consecutiveCount >= 7) {
          hasSevenDayStreak = true;
          break;
        }
      } else if (diffDays > 1) {
        consecutiveCount = 1;
      }
    }
  }

  // 4. Define evaluation check helper
  const checkUnlock = async (key: string, condition: boolean) => {
    if (condition && !unlockedKeys.has(key)) {
      const achievement = await prisma.achievement.findUnique({ where: { key } });
      if (achievement) {
        await prisma.userAchievement.create({
          data: {
            userId,
            achievementId: achievement.id
          }
        });
        unlockedNow.push(achievement);
      }
    }
  };

  // 5. Evaluate conditions
  await checkUnlock('beginner', totalTests >= 1);
  await checkUnlock('fast_typer', maxWpm >= 60);
  await checkUnlock('speed_master', maxWpm >= 100);
  await checkUnlock('accuracy_king', maxAccuracy >= 98);
  await checkUnlock('marathon_typer', totalTests >= 100);
  await checkUnlock('consistency_streak', hasSevenDayStreak);

  return unlockedNow;
}
