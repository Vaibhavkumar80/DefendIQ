import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { User } from '../models/User.js';
import { AppError } from '../lib/errors.js';

export const COOKIE = 'diq_token';

export function issueSession(res, user, remember = false) {
  const token = jwt.sign({ sub: String(user._id), sv: user.sessionVersion, remember }, config.jwtSecret, { expiresIn: remember ? '30d' : '1d' });
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProd,
    path: '/',
    ...(remember ? { maxAge: 30 * 864e5 } : {}),
  });
}
export const clearSession = (res) => res.clearCookie(COOKIE, { httpOnly: true, sameSite: 'lax', secure: config.isProd, path: '/' });

export function isCurrentSession(session, user) {
  return Number.isSafeInteger(session?.sv)
    && Number.isSafeInteger(user?.sessionVersion)
    && session.sv === user.sessionVersion;
}

async function load(req) {
  req.sessionRemember = false;
  const token = req.cookies?.[COOKIE];
  if (!token) return null;
  let session;
  try {
    session = jwt.verify(token, config.jwtSecret);
  } catch {
    return null;
  }
  if (typeof session.sub !== 'string') return null;
  const user = await User.findById(session.sub);
  if (!user || !isCurrentSession(session, user)) return null;
  req.sessionRemember = session.remember === true;
  return user;
}

export async function optionalAuth(req, res, next) {
  try { req.user = await load(req); next(); } catch (e) { next(e); }
}
export async function requireAuth(req, res, next) {
  try {
    req.user = await load(req);
    if (!req.user) return next(new AppError(401, 'Please sign in to continue.', 'unauthenticated'));
    next();
  } catch (e) { next(e); }
}
