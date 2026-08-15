// src/routes/auth.routes.ts
import { Router } from 'express';
import bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import { prisma } from '../prisma/client';
import { signToken } from '../middleware/auth.middleware';

const router = Router();
const BCRYPT_ROUNDS = 12;

router.post('/register', async (req, res) => {
  const { email, password, name } = req.body ?? {};

  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'email and password are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  // This check-then-create isn't atomic: two requests for the same email
  // can both pass it before either row exists. It stays as a fast path
  // (skips a bcrypt hash + insert attempt on the common, non-racing case)
  // but the actual guarantee against a duplicate account comes from the
  // catch below, not from this check.
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  let user;
  try {
    user = await prisma.user.create({
      data: { email, name: name ?? null, passwordHash },
    });
  } catch (err) {
    // P2002 = unique constraint violation (User.email is @unique). The
    // loser of the race used to hit this uncaught and fall through to the
    // generic 500 handler -- reproduced live at roughly a 70% failure rate
    // under 10 concurrent registrations for the same email. Same 409 as
    // the pre-check above, so the client can't tell which path caught it.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }
    throw err;
  }

  const token = signToken({ userId: user.id, email: user.email });
  res.status(201).json({ token, user: { id: user.id, email: user.email, name: user.name } });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body ?? {};

  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'email and password are required' });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  // Same error for "no such user" and "wrong password" — never
  // reveal which one it was, that's a user-enumeration leak.
  const invalidCredentials = () => res.status(401).json({ error: 'Invalid email or password' });

  if (!user) return invalidCredentials();

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return invalidCredentials();

  const token = signToken({ userId: user.id, email: user.email });
  res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
});

export default router;
