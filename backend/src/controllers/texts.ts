import { Request, Response } from 'express';
import { prisma } from '../services/db.js';
import { AuthRequest } from '../middleware/auth.js';

export const getTexts = async (req: Request, res: Response) => {
  try {
    const { mode, difficulty, count } = req.query;

    const limit = count ? parseInt(count as string, 10) : 1;
    const filter: any = {};

    if (mode) filter.mode = mode as string;
    if (difficulty) filter.difficulty = difficulty as string;

    // Fetch texts matching criteria
    const matchingTexts = await prisma.text.findMany({
      where: filter
    });

    if (matchingTexts.length === 0) {
      // Fallback: fetch anything if no exact match
      const fallbackTexts = await prisma.text.findMany({
        take: limit
      });
      return res.json(fallbackTexts);
    }

    // Shuffle and pick 'limit' elements
    const shuffled = [...matchingTexts].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, limit);

    return res.json(selected);
  } catch (err) {
    console.error('Fetch texts error:', err);
    return res.status(500).json({ error: 'Failed to retrieve practice texts.' });
  }
};

export const createText = async (req: AuthRequest, res: Response) => {
  try {
    const { mode, difficulty, content } = req.body;

    if (!mode || !difficulty || !content) {
      return res.status(400).json({ error: 'Mode, difficulty, and content are required.' });
    }

    const newText = await prisma.text.create({
      data: {
        mode,
        difficulty,
        content
      }
    });

    return res.status(201).json(newText);
  } catch (err) {
    console.error('Create text error:', err);
    return res.status(500).json({ error: 'Failed to create text.' });
  }
};
