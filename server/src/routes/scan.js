import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { asyncHandler } from '../lib/errors.js';
import { optionalAuth } from '../middleware/auth.js';
import { analyzeUrl } from '../services/urlAnalyzer.js';
import { analyzeEmail } from '../services/emailAnalyzer.js';
import { llmEnabled } from '../services/llm.js';
import { Scan } from '../models/Scan.js';
import { Alert } from '../models/Alert.js';

const router = Router();
const mk = (limit, extra = {}) => rateLimit({ windowMs: 15 * 60 * 1000, limit, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many scans. Please wait a few minutes (or sign in for a higher limit).' }, ...extra });
const anon = mk(20);
const authed = mk(120, { keyGenerator: (req) => String(req.user._id) });
const limiter = (req, res, next) => (req.user ? authed : anon)(req, res, next);

async function persist(user, result) {
  let saved = null;
  if (user && user.settings?.saveHistory !== false) saved = await Scan.create({ ...result, user: user._id });
  if (user && result.verdict !== 'safe' && user.settings?.alertsEnabled !== false) {
    const threshold = user.settings?.alertThreshold || 'suspicious';
    if (threshold === 'suspicious' || result.verdict === 'malicious') {
      await Alert.create({
        user: user._id, scan: saved?._id,
        type: result.verdict === 'malicious' ? 'threat' : 'suspicious',
        title: result.verdict === 'malicious' ? `Threat blocked: ${result.label}` : `Suspicious ${result.type}: ${result.label}`,
        message: result.summary.slice(0, 500),
      });
    }
  }
  return saved;
}

const respond = (res, result, saved) => res.json({ scan: { ...result, id: saved ? String(saved._id) : null, saved: !!saved, createdAt: saved?.createdAt || new Date() } });

router.post('/url', optionalAuth, limiter, asyncHandler(async (req, res) => {
  const body = z.object({ url: z.string().min(3).max(2048), deep: z.boolean().optional() }).parse(req.body);
  const deep = body.deep ?? req.user?.settings?.deepChecks ?? true;
  const result = await analyzeUrl(body.url, { deep, aiExplain: llmEnabled() });
  respond(res, result, await persist(req.user, result));
}));

router.post('/email', optionalAuth, limiter, asyncHandler(async (req, res) => {
  const body = z.object({ raw: z.string().min(10, 'Paste the email content.').max(60000, 'Email is too long (max 60,000 characters).'), from: z.string().max(320).optional(), subject: z.string().max(300).optional(), deep: z.boolean().optional() }).parse(req.body);
  const deep = body.deep ?? req.user?.settings?.deepChecks ?? true;
  const result = await analyzeEmail(body.raw, { from: body.from, subject: body.subject, deep, aiExplain: llmEnabled() });
  respond(res, result, await persist(req.user, result));
}));

export default router;
