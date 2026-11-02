import { Router } from 'express';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { z } from 'zod';
import { User } from '../models/User.js';
import { Scan } from '../models/Scan.js';
import { Alert } from '../models/Alert.js';
import { QuizResult, SimResult } from '../models/Activity.js';
import { asyncHandler, AppError } from '../lib/errors.js';
import { requireAuth, clearSession, issueSession } from '../middleware/auth.js';
import { MODULES } from '../data/awareness.js';

const router = Router();
router.use(requireAuth);

router.get('/profile', asyncHandler(async (req, res) => {
  const uid = req.user._id;
  const [scans, threats, quizzes, simsCorrect, hasPw] = await Promise.all([
    Scan.countDocuments({ user: uid }), Scan.countDocuments({ user: uid, verdict: mongoose.trusted({ $ne: 'safe' }) }),
    QuizResult.find({ user: uid }).lean(), SimResult.distinct('scenarioId', { user: uid, correct: true }),
    User.findById(uid).select('+passwordHash').then((u) => !!u.passwordHash),
  ]);
  const best = quizzes.length ? Math.max(...quizzes.map((q) => Math.round((q.score / q.total) * 100))) : 0;
  const modules = req.user.completedModules.length;
  const badges = [
    { id: 'first', title: 'First Scan', desc: 'Run your first scan', earned: scans >= 1 },
    { id: 'hunter', title: 'Threat Hunter', desc: 'Find 10 risky items', earned: threats >= 10 },
    { id: 'veteran', title: 'Veteran', desc: 'Run 100 scans', earned: scans >= 100 },
    { id: 'quiz', title: 'Quiz Master', desc: 'Score 80%+ on a quiz', earned: best >= 80 },
    { id: 'scholar', title: 'Scholar', desc: 'Complete every learning module', earned: modules >= MODULES.length },
    { id: 'eye', title: 'Sharp Eye', desc: 'Correctly judge 5 simulations', earned: simsCorrect.length >= 5 },
  ];
  res.json({ user: req.user.toPublic(), hasPassword: hasPw, stats: { scans, threats, quizBest: best, quizAttempts: quizzes.length, modules, simulations: simsCorrect.length }, badges });
}));

router.patch('/profile', asyncHandler(async (req, res) => {
  const { name } = z.object({ name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(60) }).parse(req.body);
  req.user.name = name;
  await req.user.save();
  res.json({ user: req.user.toPublic() });
}));

router.patch('/settings', asyncHandler(async (req, res) => {
  const s = z.object({ theme: z.enum(['dark', 'light']), saveHistory: z.boolean(), deepChecks: z.boolean(), alertsEnabled: z.boolean(), alertThreshold: z.enum(['suspicious', 'malicious']) }).partial().strict().parse(req.body);
  Object.entries(s).forEach(([k, v]) => { req.user.settings[k] = v; });
  await req.user.save();
  res.json({ user: req.user.toPublic() });
}));

router.patch('/password', asyncHandler(async (req, res) => {
  const b = z.object({
    currentPassword: z.string().max(72).optional(),
    newPassword: z.string().min(8, 'Password must be at least 8 characters.').max(72).refine((p) => /[A-Za-z]/.test(p) && /\d/.test(p), 'Password needs at least one letter and one number.'),
  }).parse(req.body);
  const user = await User.findById(req.user._id).select('+passwordHash');
  if (user.passwordHash) {
    if (!b.currentPassword || !(await bcrypt.compare(b.currentPassword, user.passwordHash))) throw new AppError(400, 'Current password is incorrect.');
  }
  user.passwordHash = await bcrypt.hash(b.newPassword, 12);
  user.sessionVersion += 1;
  await user.save();
  issueSession(res, user, req.sessionRemember);
  res.json({ ok: true });
}));

router.get('/export', asyncHandler(async (req, res) => {
  const uid = req.user._id;
  const [scans, alerts, quizzes, sims] = await Promise.all([Scan.find({ user: uid }).lean(), Alert.find({ user: uid }).lean(), QuizResult.find({ user: uid }).lean(), SimResult.find({ user: uid }).lean()]);
  res.setHeader('Content-Disposition', 'attachment; filename="defendiq-export.json"');
  res.json({ exportedAt: new Date(), user: req.user.toPublic(), completedModules: req.user.completedModules, scans, alerts, quizzes, simulations: sims });
}));

router.delete('/', asyncHandler(async (req, res) => {
  const b = z.object({ password: z.string().max(72).optional(), confirm: z.literal('DELETE') }).parse(req.body);
  const user = await User.findById(req.user._id).select('+passwordHash');
  if (user.passwordHash && !(b.password && (await bcrypt.compare(b.password, user.passwordHash)))) throw new AppError(400, 'Password is incorrect.');
  const uid = user._id;
  await Promise.all([Scan.deleteMany({ user: uid }), Alert.deleteMany({ user: uid }), QuizResult.deleteMany({ user: uid }), SimResult.deleteMany({ user: uid })]);
  await User.deleteOne({ _id: uid });
  clearSession(res);
  res.json({ ok: true });
}));

export default router;
