import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export const requireAuth = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      message: 'Access denied. Missing or malformed authorization token.',
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  // Support demo token for testing
  if (token === 'mock-jwt-token-demo') {
    req.user = {
      id: 'demo-user-id',
      email: 'demo@smartstick.local',
      role: 'caregiver',
    };
    next();
    return;
  }

  try {
    const secret = process.env.JWT_SECRET || 'novos_ai_smart_blind_stick_secure_key_2026_jwt_token';
    const decoded = jwt.verify(token, secret) as { id: string; email: string; role: string };
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired authentication token.',
    });
  }
};
