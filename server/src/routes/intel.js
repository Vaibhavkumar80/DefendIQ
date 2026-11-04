import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import { Scan } from '../models/Scan.js';
import { User } from '../models/User.js';
import { asyncHandler } from '../lib/errors.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { getFeedStatus, refreshFeeds } from '../services/intelFeed.js';
import { THREAT_TYPES } from '../data/awareness.js';
import { llmEnabled } from '../services/llm.js';
import { config } from '../config.js';

const router = Router();
let cache = { at: 0, v: null };
let pendingStats;

async function publicStats() {
  if (cache.v && Date.now() - cache.at < 5 * 60 * 1000) return cache.v;
  if (pendingStats) return pendingStats;
  pendingStats = Promise.all([
    Scan.countDocuments({}),
    Scan.countDocuments({ verdict: mongoose.trusted({ $ne: 'safe' }) }),
    User.countDocuments({}),
  ]).then(([scans, threats, users]) => {
    cache = { at: Date.now(), v: { scans, threats, users, feedEntries: getFeedStatus().entries } };
    return cache.v;
  }).catch((error) => {
    if (cache.v) return { ...cache.v, stale: true };
    throw error;
  }).finally(() => { pendingStats = null; });
  return pendingStats;
}

router.get('/public/stats', asyncHandler(async (req, res) => res.json(await publicStats())));

router.get('/health', (req, res) => {
  const db = mongoose.connection.readyState === 1;
  res.status(db ? 200 : 503).json({ status: db ? 'ok' : 'degraded', db: db ? 'connected' : 'disconnected', uptime: Math.round(process.uptime()), feeds: getFeedStatus().entries, localAI: llmEnabled(), googleSignIn: !!config.googleClientId });
});

router.get('/intel/overview', optionalAuth, asyncHandler(async (req, res) => {
  const since = new Date(Date.now() - 30 * 864e5);
  const agg = await Scan.aggregate([
    { $match: { createdAt: { $gte: since } } },
    { $facet: {
      threat: [{ $match: { verdict: { $ne: 'safe' } } }, { $group: { _id: '$primaryThreat', n: { $sum: 1 } } }],
      verdict: [{ $group: { _id: '$verdict', n: { $sum: 1 } } }],
      brands: [{ $unwind: '$findings' }, { $match: { 'findings.id': { $in: ['brand_impersonation', 'typosquat', 'display_spoof', 'lookalike_sender'] } } }, { $group: { _id: '$findings.title', n: { $sum: 1 } } }, { $sort: { n: -1 } }, { $limit: 8 }],
    } },
  ]);
  const f = agg[0] || { threat: [], verdict: [], brands: [] };
  let mine = [];
  if (req.user) mine = await Scan.find({ user: req.user._id, verdict: mongoose.trusted({ $ne: 'safe' }) }).sort({ createdAt: -1 }).limit(6).select('type label verdict score primaryThreat createdAt').lean();
  res.json({
    feeds: getFeedStatus(), localAI: llmEnabled(),
    community: { period: '30 days', verdicts: f.verdict.map((x) => ({ verdict: x._id, count: x.n })), threats: f.threat.map((x) => ({ type: x._id, count: x.n })), topImpersonations: f.brands.map((x) => ({ title: x._id, count: x.n })) },
    mine: mine.map((s) => ({ ...s, id: String(s._id), _id: undefined })),
    types: THREAT_TYPES,
  });
}));

const refreshLimiter = rateLimit({ windowMs: 10 * 60 * 1000, limit: 2, standardHeaders: true, legacyHeaders: false, message: { error: 'Feeds were refreshed recently. Try again in a few minutes.' } });
router.post('/intel/refresh', requireAuth, refreshLimiter, asyncHandler(async (req, res) => res.json({ feeds: await refreshFeeds() })));

export default router;
