import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { JWTPayload } from '@health-copilot/shared';

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
      scopedPatientId?: string;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  // Extract token from httpOnly cookie or Authorization Bearer header
  const token =
    req.cookies?.token ||
    (req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.split(' ')[1]
      : null);

  if (!token) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication session required. Please log in.',
      },
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JWTPayload;
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Session has expired or is invalid. Please log in again.',
      },
    });
  }
}
