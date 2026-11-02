import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { Scan } from '../models/Scan.js';
import { Alert } from '../models/Alert.js';
import { QuizResult, SimResult } from '../models/Activity.js';
import { asyncHandler } from '../lib/errors.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);
const DAY = 864e5;

const pct = (cur, prev) => (prev ? Math.round(((cur - prev) / prev) * 100) : cur > 0 ? 100 : 0);
const stats = (arr) => ({
  total: arr.length,
  safe: arr.filter((s) => s.verdict === 'safe').length,
  threats: arr.filter((s) => s.verdict !== 'safe').length,
  malicious: arr.filter((s) => s.verdict === 'malicious').length,
});

function protection(arr) {
  if (!arr.length) return null;
  const n = arr.length;
  const clean = (key) => Math.round(100 * (1 - arr.reduce((p, s) => p + ((s.categories?.[key]?.status === 'bad') ? 1 : s.categories?.[key]?.status === 'warn' ? 0.5 : 0), 0) / n));
  const comps = {
    phishing: clean('phishing'), malware: clean('malware'), suspicious: clean('suspicious'),
    dataSafety: Math.round(100 * (1 - arr.filter((s) => s.flags?.includes('credential-lure')).length / n)),
  };
  return { ...comps, overall: Math.round((comps.phishing + comps.malware + comps.suspicious + comps.dataSafety) / 4) };
}

router.get('/', asyncHandler(async (req, res) => {
  const { range } = z.object({ range: z.coerce.number().refine((v) => [7, 30, 90].includes(v)).default(7) }).parse(req.query);
  const now = Date.now();
  const start = new Date(now - range * DAY);
  const prevStart = new Date(now - 2 * range * DAY);
  const fetchFrom = new Date(Math.min(prevStart.getTime(), now - 60 * DAY));

  const scans = await Scan.find({ user: req.user._id, createdAt: mongoose.trusted({ $gte: fetchFrom }) }).select('type target label verdict score primaryThreat categories flags createdAt').sort({ createdAt: -1 }).limit(5000).lean();
  const inRange = scans.filter((s) => s.createdAt >= start);
  const prev = scans.filter((s) => s.createdAt >= prevStart && s.createdAt < start);
  const cur = stats(inRange), old = stats(prev);

  const last30 = scans.filter((s) => s.createdAt >= new Date(now - 30 * DAY));
  const week = scans.filter((s) => s.createdAt >= new Date(now - 7 * DAY));
  const prevWeek = scans.filter((s) => s.createdAt >= new Date(now - 14 * DAY) && s.createdAt < new Date(now - 7 * DAY));
  const prot = protection(last30);
  const pw = protection(week), pp = protection(prevWeek);

  const overview = { phishing: 0, malware: 0, suspicious: 0, other: 0 };
  inRange.filter((s) => s.verdict !== 'safe').forEach((s) => { overview[s.primaryThreat in overview ? s.primaryThreat : 'other']++; });

  const size = range === 90 ? 7 : 1;
  const n = Math.ceil(range / size);
  const buckets = Array.from({ length: n }, (_, i) => ({ date: new Date(start.getTime() + i * size * DAY).toISOString().slice(0, 10), safe: 0, threats: 0 }));
  inRange.forEach((s) => { const i = Math.min(n - 1, Math.floor((s.createdAt - start) / (size * DAY))); (s.verdict === 'safe' ? (buckets[i].safe++) : (buckets[i].threats++)); });

  const recent = scans.slice(0, 5).map((s) => ({ id: String(s._id), type: s.type, target: s.target, label: s.label, verdict: s.verdict, score: s.score, createdAt: s.createdAt }));
  const activity = scans.slice(0, 5).map((s) => ({
    id: String(s._id), verdict: s.verdict, sub: s.label, at: s.createdAt,
    title: s.verdict === 'malicious' ? 'Threat blocked' : s.verdict === 'suspicious' ? 'Suspicious item flagged' : s.type === 'email' ? 'Email analysis completed' : 'URL scanned successfully',
  }));

  const [unreadAlerts, quizBest, simTotal, simCorrect] = await Promise.all([
    Alert.countDocuments({ user: req.user._id, read: false }),
    QuizResult.find({ user: req.user._id }).sort({ score: -1 }).limit(1).lean(),
    SimResult.countDocuments({ user: req.user._id }),
    SimResult.countDocuments({ user: req.user._id, correct: true }),
  ]);

  res.json({
    range,
    stats: {
      totalScans: { value: cur.total, change: pct(cur.total, old.total) },
      threatsBlocked: { value: cur.threats, change: pct(cur.threats, old.threats) },
      safeLinks: { value: cur.safe, change: pct(cur.safe, old.safe) },
      maliciousUrls: { value: cur.malicious, change: pct(cur.malicious, old.malicious) },
    },
    protection: prot ? { ...prot, delta: pw && pp ? pw.overall - pp.overall : null, sample: last30.length } : null,
    threatOverview: { total: Object.values(overview).reduce((a, b) => a + b, 0), ...overview },
    activityChart: buckets,
    recentScans: recent,
    recentActivity: activity,
    unreadAlerts,
    awareness: { quizBestPercent: quizBest[0] ? Math.round((quizBest[0].score / quizBest[0].total) * 100) : null, modulesDone: req.user.completedModules.length, simulations: simTotal, simulationsCorrect: simCorrect },
    totalScansAllTime: await Scan.countDocuments({ user: req.user._id }),
  });
}));

export default router;
