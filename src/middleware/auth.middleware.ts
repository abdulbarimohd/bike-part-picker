// src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { prisma } from '../prisma/client';

// Fail loudly at startup rather than silently signing tokens with
// `undefined` — a classic way real apps end up with forgeable auth
// tokens in production. Reading it through this helper (rather than
// a bare `process.env.X` + throw) is also what gives JWT_SECRET the
// type `string` instead of `string | undefined`, which jsonwebtoken's
// overloads require.
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} environment variable is required`);
  }
  return value;
}

const JWT_SECRET = requireEnv('JWT_SECRET');

export interface AuthPayload {
  userId: string;
  email: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

/**
 * `jwt.verify` is typed as returning `string | JwtPayload`, since a
 * token can legitimately carry a bare string payload — so the claims
 * are pulled out explicitly rather than blind-cast to AuthPayload.
 * Throws on an invalid/expired token, which both callers below catch.
 */
function verifyToken(token: string): AuthPayload {
  const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
  return { userId: decoded.userId, email: decoded.email };
}

/**
 * Rejects the request outright if no valid token is present.
 *
 * Also confirms the user still exists. A correctly-signed, unexpired
 * token can outlive its user — after a database reset, for instance —
 * and without this check the request proceeds to insert rows against a
 * missing userId, failing on a foreign key deep inside a route rather
 * than cleanly at the door.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header' });
  }

  let payload: AuthPayload;
  try {
    payload = verifyToken(header.slice('Bearer '.length));
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const exists = await prisma.user.findUnique({ where: { id: payload.userId }, select: { id: true } });
  if (!exists) {
    return res.status(401).json({ error: 'Your session is no longer valid — please log in again' });
  }

  req.user = payload;
  next();
}

/**
 * Attaches req.user if a valid token is present, but never
 * rejects the request. Used on routes like GET /builds/:id
 * where a public build should be viewable by anyone, but the
 * response should know whether the viewer owns it (to include
 * an "isOwner" flag, for example).
 */
export function attachUserIfPresent(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      const token = header.slice('Bearer '.length);
      req.user = verifyToken(token);
    } catch {
      // Invalid token on an optional-auth route — proceed as anonymous
      // rather than rejecting, since auth isn't required here.
    }
  }
  next();
}
