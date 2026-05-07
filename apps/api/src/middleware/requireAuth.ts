import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createError } from './errorHandler';

const JWT_SECRET = process.env.JWT_SECRET || 'masterlms-super-secret-key-change-in-production-2024';

export interface AuthRequest extends Request {
  user?: { id: number; username: string; role: string };
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : req.cookies?.admin_token;

  if (!token) return next(createError('Unauthorized', 401));

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId?: number; username?: string; role?: string };
    req.user = { id: payload.userId || 0, username: payload.username || '', role: payload.role || '' };
    return next();
  } catch {
    return next(createError('Unauthorized', 401));
  }
}

export function requireSuperadmin(req: AuthRequest, res: Response, next: NextFunction) {
  requireAuth(req, res, (err) => {
    if (err) return next(err);
    if (req.user?.role !== 'SUPERADMIN') return next(createError('Forbidden', 403));
    return next();
  });
}
