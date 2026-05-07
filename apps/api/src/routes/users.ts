import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../services/prisma';
import { createError } from '../middleware/errorHandler';

const router = Router();

// POST /api/auth/verify — verify credentials, return user info (called by Next.js login)
router.post('/verify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return next(createError('username and password are required', 400));
    }

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      return next(createError('Tên đăng nhập hoặc mật khẩu không đúng', 401));
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return next(createError('Tên đăng nhập hoặc mật khẩu không đúng', 401));
    }

    return res.json({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
    });
  } catch (err) {
    return next(err);
  }
});

// All routes below require auth middleware (applied in index.ts)

// GET /api/users
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, username: true, displayName: true, role: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    return res.json({ data: users });
  } catch (err) {
    return next(err);
  }
});

// POST /api/users — create user
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password, displayName, role } = req.body;
    if (!username || !password || !displayName) {
      return next(createError('username, password và displayName là bắt buộc', 400));
    }

    const exists = await prisma.user.findUnique({ where: { username } });
    if (exists) return next(createError('Tên đăng nhập đã tồn tại', 409));

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { username, password: hashed, displayName, role: role || 'EDITOR' },
      select: { id: true, username: true, displayName: true, role: true, createdAt: true },
    });
    return res.status(201).json({ data: user });
  } catch (err) {
    return next(err);
  }
});

// PUT /api/users/:id — update user
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { password, displayName, role } = req.body;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return next(createError('User không tồn tại', 404));

    const data: Record<string, unknown> = {};
    if (displayName) data.displayName = displayName;
    if (role) data.role = role;
    if (password) data.password = await bcrypt.hash(password, 10);

    const user = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, username: true, displayName: true, role: true, createdAt: true },
    });
    return res.json({ data: user });
  } catch (err) {
    return next(err);
  }
});

// DELETE /api/users/:id
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return next(createError('User không tồn tại', 404));

    await prisma.user.delete({ where: { id } });
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
});

export default router;
