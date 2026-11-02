import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { User } from '../models/User.js';
import { Alert } from '../models/Alert.js';
import { asyncHandler, AppError } from '../lib/errors.js';
import { issueSession, clearSession, optionalAuth, requireAuth } from '../middleware/auth.js';
import { sendMail } from '../services/mailer.js';
import { config } from '../config.js';

const router = Router();
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 25, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many attempts. Please try again in a few minutes.' } });
const failLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, skipSuccessfulRequests: true, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many failed sign-in attempts. Try again later.' } });

const email = z.string().trim().toLowerCase().email('Enter a valid email address.').max(254);
const password = z.string().min(8, 'Password must be at least 8 characters.').max(72, 'Password is too long (max 72).')
  .refine((p) => /[A-Za-z]/.test(p) && /\d/.test(p), 'Password needs at least one letter and one number.');

const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', 12);
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

router.post('/register', limiter, asyncHandler(async (req, res) => {
  const body = z.object({ name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(60), email, password, confirmPassword: z.string().optional(), remember: z.boolean().optional() }).parse(req.body);
  if (body.confirmPassword !== undefined && body.confirmPassword !== body.password) throw new AppError(400, 'Passwords do not match.');
  if (await User.exists({ email: body.email })) throw new AppError(409, 'An account with this email already exists.');
  const user = await User.create({ name: body.name, email: body.email, passwordHash: await bcrypt.hash(body.password, 12), lastLoginAt: new Date() });
  await Alert.create({ user: user._id, type: 'system', title: 'Welcome to DefendIQ', message: 'Run your first scan to start building your protection score.' });
  issueSession(res, user, body.remember);
  res.status(201).json({ user: user.toPublic() });
}));

router.post('/login', failLimiter, asyncHandler(async (req, res) => {
  const body = z.object({ email, password: z.string().min(1).max(72), remember: z.boolean().optional() }).parse(req.body);
  const user = await User.findOne({ email: body.email }).select('+passwordHash');
  const ok = await bcrypt.compare(body.password, user?.passwordHash || DUMMY_HASH);
  if (!user || !user.passwordHash || !ok) throw new AppError(401, 'Invalid email or password.', 'bad_credentials');
  user.lastLoginAt = new Date();
  await user.save();
  issueSession(res, user, body.remember);
  res.json({ user: user.toPublic() });
}));

router.post('/google', limiter, asyncHandler(async (req, res) => {
  if (!config.googleClientId) throw new AppError(501, 'Google sign-in is not configured on this server.', 'google_disabled');
  const { credential } = z.object({ credential: z.string().min(20).max(4096) }).parse(req.body);
  const r = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`, { signal: AbortSignal.timeout(8000) }).catch(() => null);
  if (!r?.ok) throw new AppError(401, 'Google sign-in failed.');
  const info = await r.json();
  if (info.aud !== config.googleClientId || String(info.email_verified) !== 'true' || !info.email) throw new AppError(401, 'Google sign-in failed.');
  const mail = String(info.email).toLowerCase();
  let user = await User.findOne({ $or: [{ googleId: info.sub }, { email: mail }] });
  if (!user) user = await User.create({ name: (info.name || mail.split('@')[0]).slice(0, 60), email: mail, googleId: info.sub });
  else if (!user.googleId) user.googleId = info.sub;
  user.lastLoginAt = new Date();
  await user.save();
  issueSession(res, user, true);
  res.json({ user: user.toPublic() });
}));

router.post('/logout', (req, res) => { clearSession(res); res.json({ ok: true }); });

router.get('/me', optionalAuth, (req, res) => res.json({ user: req.user ? req.user.toPublic() : null, googleEnabled: !!config.googleClientId }));

router.post('/forgot', limiter, asyncHandler(async (req, res) => {
  const body = z.object({ email }).parse(req.body);
  res.status(202).json({ ok: true, message: 'If that email is registered, a reset link will be sent if email delivery is available.' });
  setImmediate(async () => {
    try {
      const user = await User.findOne({ email: body.email });
      if (!user) return;
      const token = crypto.randomBytes(32).toString('hex');
      user.resetTokenHash = sha(token);
      user.resetExpires = new Date(Date.now() + 30 * 60 * 1000);
      await user.save();
      const link = `${config.clientOrigin}/reset-password?token=${token}&email=${encodeURIComponent(user.email)}`;
      await sendMail({ to: user.email, subject: 'Reset your DefendIQ password', text: `Use this link within 30 minutes to reset your password:\n${link}\n\nIf you did not request this, ignore this email.` });
    } catch (error) {
      const reason = error instanceof AppError ? error.code : error?.name || 'unknown_error';
      console.error('[auth] password-reset request failed:', reason);
    }
  });
}));

router.post('/reset', limiter, asyncHandler(async (req, res) => {
  const body = z.object({ email, token: z.string().length(64), password }).parse(req.body);
  const user = await User.findOne({ email: body.email, resetTokenHash: sha(body.token), resetExpires: mongoose.trusted({ $gt: new Date() }) }).select('+resetTokenHash +resetExpires');
  if (!user) throw new AppError(400, 'This reset link is invalid or has expired.');
  user.passwordHash = await bcrypt.hash(body.password, 12);
  user.sessionVersion += 1;
  user.resetTokenHash = undefined; user.resetExpires = undefined;
  await user.save();
  res.json({ ok: true });
}));

export default router;
export { requireAuth };
