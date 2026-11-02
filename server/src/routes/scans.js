import { Router } from 'express';
import { z } from 'zod';
import { Scan } from '../models/Scan.js';
import { Alert } from '../models/Alert.js';
import { asyncHandler, AppError } from '../lib/errors.js';
import { requireAuth } from '../middleware/auth.js';
import { escapeRegex } from '../utils/text.js';

const router = Router();
router.use(requireAuth);

router.get('/', asyncHandler(async (req, res) => {
  const q = z.object({
    page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(50).default(10),
    verdict: z.enum(['safe', 'suspicious', 'malicious']).optional(), type: z.enum(['url', 'email']).optional(), q: z.string().max(100).optional(),
  }).parse(req.query);
  const filter = { user: req.user._id };
  if (q.verdict) filter.verdict = q.verdict;
  if (q.type) filter.type = q.type;
  if (q.q) filter.target = new RegExp(escapeRegex(q.q.trim()), 'i');
  const [items, total] = await Promise.all([
    Scan.find(filter).sort({ createdAt: -1 }).skip((q.page - 1) * q.limit).limit(q.limit).select('type target label verdict score primaryThreat createdAt').lean(),
    Scan.countDocuments(filter),
  ]);
  res.json({ items: items.map((s) => ({ ...s, id: String(s._id), _id: undefined })), total, page: q.page, pages: Math.max(1, Math.ceil(total / q.limit)) });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const s = await Scan.findOne({ _id: req.params.id, user: req.user._id }).lean();
  if (!s) throw new AppError(404, 'Scan not found.');
  res.json({ scan: { ...s, id: String(s._id), saved: true, _id: undefined, user: undefined, __v: undefined } });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const r = await Scan.deleteOne({ _id: req.params.id, user: req.user._id });
  if (!r.deletedCount) throw new AppError(404, 'Scan not found.');
  await Alert.deleteMany({ user: req.user._id, scan: req.params.id });
  res.json({ ok: true });
}));

router.delete('/', asyncHandler(async (req, res) => {
  const r = await Scan.deleteMany({ user: req.user._id });
  res.json({ ok: true, deleted: r.deletedCount });
}));

export default router;
