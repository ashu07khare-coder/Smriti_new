import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db/index.js';
import type { User } from '../db/schema.js';

export const JWT_SECRET = process.env.JWT_SECRET || 'smriti-ner-hackathon-secret-key-2026';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export function generateToken(user: User): string {
  return jwt.sign(
    {
      id: user.id,
      phone: user.phone,
      name: user.name,
      role: user.role,
      preferred_language: user.preferred_language,
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. Please provide a Bearer token.' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { id: string };
    const user = db.prepare('SELECT * FROM users WHERE id = ? AND is_deleted = 0').get(payload.id) as User | undefined;
    if (!user) {
      res.status(401).json({ error: 'User not found or deactivated.' });
      return;
    }
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

export function requireRole(...allowedRoles: Array<'patient' | 'caregiver' | 'asha_worker'>) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: `Access denied. Role '${req.user.role}' does not have permission. Required: [${allowedRoles.join(', ')}]`,
      });
      return;
    }
    next();
  };
}
