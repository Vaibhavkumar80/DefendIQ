import { Router } from 'express';
import { z } from 'zod';
import { Alert } from '../models/Alert.js';
import { asyncHandler, AppError } from '../lib/errors.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', asyncHandler(async (req, res) => {
  const q = z.object({ limit: z.coerce.number().int().min(1).max(100).default(30), unread: z.enum(['1', '0']).optional(), type: z.enum(['threat', 'suspicious', 'info', 'system']).optional() }).parse(req.query);
  const filter = { user: req.user._id };
  if (q.unread === '1') filter.read = false;
  if (q.type) filter.type = q.type;
  const [items, unread] = await Promise.all([Alert.find(filter).sort({ createdAt: -1 }).limit(q.limit).lean(), Alert.countDocuments({ user: req.user._id, read: false })]);
  res.json({ items: items.map((a) => ({ ...a, id: String(a._id), scan: a.scan ? String(a.scan) : null, _id: undefined, user: undefined, __v: undefined })), unread });
}));

router.post('/read-all', asyncHandler(async (req, res) => { await Alert.updateMany({ user: req.user._id, read: false }, { read: true }); res.json({ ok: true }); }));

router.patch('/:id/read', asyncHandler(async (req, res) => {
  const a = await Alert.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { read: true });
  if (!a) throw new AppError(404, 'Alert not found.');
  res.json({ ok: true });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const r = await Alert.deleteOne({ _id: req.params.id, user: req.user._id });
  if (!r.deletedCount) throw new AppError(404, 'Alert not found.');
  res.json({ ok: true });
}));

router.delete('/', asyncHandler(async (req, res) => { await Alert.deleteMany({ user: req.user._id }); res.json({ ok: true }); }));

export default router;
