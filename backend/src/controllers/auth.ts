import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../services/db.js';
import { JWT_SECRET, JWT_REFRESH_SECRET, AuthRequest } from '../middleware/auth.js';

// Helper to generate access and refresh tokens
const generateTokens = (userId: string, role: string) => {
  const accessToken = jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ userId }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
};

// Set refresh token in httpOnly secure cookie
const setRefreshTokenCookie = (res: Response, token: string) => {
  res.cookie('refresh_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
};

export const register = async (req: Request, res: Response) => {
  try {
    const { email, username, password, guestResults } = req.body;

    if (!email || !username || !password) {
      return res.status(400).json({ error: 'Email, username, and password are required.' });
    }

    // Check if user exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }]
      }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Username or email already exists.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash: hashedPassword,
        role: 'user',
        theme: 'matrix-green',
        settings: JSON.stringify({ fontSize: 18, soundOn: true, caretStyle: 'line', animationOn: true })
      }
    });

    // Claim guest sessions if any
    if (guestResults && Array.isArray(guestResults) && guestResults.length > 0) {
      await prisma.testResult.updateMany({
        where: {
          id: { in: guestResults },
          userId: null // only update unowned results
        },
        data: {
          userId: user.id
        }
      });
      console.log(`Migrated ${guestResults.length} guest results to user ${user.username}`);
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user.id, user.role);
    setRefreshTokenCookie(res, refreshToken);

    return res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        theme: user.theme,
        settings: JSON.parse(user.settings)
      },
      accessToken
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { loginId, password, guestResults } = req.body; // loginId can be email or username

    if (!loginId || !password) {
      return res.status(400).json({ error: 'Username/email and password are required.' });
    }

    // Find user
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: loginId }, { username: loginId }]
      }
    });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    // Claim guest sessions on login as well
    if (guestResults && Array.isArray(guestResults) && guestResults.length > 0) {
      await prisma.testResult.updateMany({
        where: {
          id: { in: guestResults },
          userId: null
        },
        data: {
          userId: user.id
        }
      });
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user.id, user.role);
    setRefreshTokenCookie(res, refreshToken);

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        theme: user.theme,
        settings: JSON.parse(user.settings)
      },
      accessToken
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

export const refresh = async (req: Request, res: Response) => {
  const token = req.cookies?.refresh_token;

  if (!token) {
    return res.status(401).json({ error: 'Refresh token required.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as { userId: string };
    
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) {
      return res.status(401).json({ error: 'User not found.' });
    }

    const { accessToken, refreshToken } = generateTokens(user.id, user.role);
    setRefreshTokenCookie(res, refreshToken);

    return res.json({
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        theme: user.theme,
        settings: JSON.parse(user.settings)
      }
    });
  } catch (err) {
    return res.status(403).json({ error: 'Invalid refresh token.' });
  }
};

export const logout = async (req: Request, res: Response) => {
  res.clearCookie('refresh_token');
  return res.json({ message: 'Logged out successfully.' });
};

export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        theme: user.theme,
        settings: JSON.parse(user.settings)
      }
    });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

export const updateSettings = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const { theme, settings } = req.body;

    const data: any = {};
    if (theme) data.theme = theme;
    if (settings) data.settings = JSON.stringify(settings);

    const user = await prisma.user.update({
      where: { id: req.userId },
      data
    });

    return res.json({
      message: 'Settings updated successfully.',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        theme: user.theme,
        settings: JSON.parse(user.settings)
      }
    });
  } catch (err) {
    console.error('Update settings error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};
