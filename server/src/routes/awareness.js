import { Router } from 'express';
import { z } from 'zod';
import { QuizResult, SimResult } from '../models/Activity.js';
import { User } from '../models/User.js';
import { asyncHandler, AppError } from '../lib/errors.js';
import { requireAuth } from '../middleware/auth.js';
import { MODULES, TIPS, QUIZ, SIMS } from '../data/awareness.js';

const router = Router();
router.use(requireAuth);
const shuffle = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

router.get('/overview', asyncHandler(async (req, res) => {
  const [quizzes, sims] = await Promise.all([QuizResult.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(20).lean(), SimResult.find({ user: req.user._id }).lean()]);
  const done = new Set(req.user.completedModules);
  res.json({
    tips: TIPS,
    modules: MODULES.map((m) => ({ ...m, completed: done.has(m.id) })),
    quiz: { attempts: quizzes.length, best: quizzes.length ? Math.max(...quizzes.map((q) => Math.round((q.score / q.total) * 100))) : null, recent: quizzes.slice(0, 5).map((q) => ({ score: q.score, total: q.total, at: q.createdAt })) },
    simulations: { total: SIMS.length, answered: new Set(sims.map((s) => s.scenarioId)).size, correct: new Set(sims.filter((s) => s.correct).map((s) => s.scenarioId)).size },
  });
}));

router.post('/modules/:id/complete', asyncHandler(async (req, res) => {
  if (!MODULES.some((m) => m.id === req.params.id)) throw new AppError(404, 'Module not found.');
  await User.updateOne({ _id: req.user._id }, { $addToSet: { completedModules: req.params.id } });
  res.json({ ok: true });
}));
router.delete('/modules/:id/complete', asyncHandler(async (req, res) => {
  await User.updateOne({ _id: req.user._id }, { $pull: { completedModules: req.params.id } });
  res.json({ ok: true });
}));

router.get('/quiz', (req, res) => {
  const questions = shuffle(QUIZ).slice(0, 10).map(({ id, q, options }) => ({ id, q, options }));
  res.json({ questions });
});

router.post('/quiz/submit', asyncHandler(async (req, res) => {
  const body = z.object({ answers: z.array(z.object({ id: z.string().max(10), choice: z.number().int().min(0).max(3).nullable() })).min(1).max(15) }).parse(req.body);
  const seen = new Set();
  const results = [];
  for (const a of body.answers) {
    const item = QUIZ.find((x) => x.id === a.id);
    if (!item || seen.has(a.id)) continue;
    seen.add(a.id);
    results.push({ id: item.id, q: item.q, options: item.options, chosen: a.choice, answer: item.answer, correct: a.choice === item.answer, why: item.why });
  }
  if (!results.length) throw new AppError(400, 'No valid answers submitted.');
  const score = results.filter((r) => r.correct).length;
  await QuizResult.create({ user: req.user._id, score, total: results.length });
  res.json({ score, total: results.length, percent: Math.round((score / results.length) * 100), results });
}));

router.get('/simulations', asyncHandler(async (req, res) => {
  const done = await SimResult.find({ user: req.user._id }).lean();
  const correct = new Set(done.filter((d) => d.correct).map((d) => d.scenarioId));
  res.json({ scenarios: SIMS.map(({ id, channel, from, subject, body }) => ({ id, channel, from, subject, body, solved: correct.has(id) })) });
}));

router.post('/simulations/:id/answer', asyncHandler(async (req, res) => {
  const { verdict } = z.object({ verdict: z.enum(['phishing', 'legit']) }).parse(req.body);
  const sc = SIMS.find((s) => s.id === req.params.id);
  if (!sc) throw new AppError(404, 'Scenario not found.');
  const correct = (verdict === 'phishing') === sc.phishing;
  await SimResult.create({ user: req.user._id, scenarioId: sc.id, correct });
  res.json({ correct, isPhishing: sc.phishing, flags: sc.flags, lesson: sc.lesson });
}));

export default router;
