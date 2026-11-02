import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { Scan } from '../models/Scan.js';
import { asyncHandler } from '../lib/errors.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);
const DAY = 864e5;
const q = z.object({ days: z.coerce.number().refine((v) => [7, 30, 90, 365].includes(v)).default(30) });

const csvCell = (v) => {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // neutralise spreadsheet formula injection
  return `"${s.replace(/"/g, '""')}"`;
};

router.get('/summary', asyncHandler(async (req, res) => {
  const { days } = q.parse(req.query);
  const since = new Date(Date.now() - days * DAY);
  const scans = await Scan.find({ user: req.user._id, createdAt: mongoose.trusted({ $gte: since }) }).select('type target label verdict score primaryThreat findings.title findings.id createdAt').sort({ createdAt: -1 }).limit(10000).lean();
  const count = (fn) => scans.filter(fn).length;
  const findingCounts = new Map();
  scans.forEach((s) => (s.findings || []).forEach((f) => findingCounts.set(f.title, (findingCounts.get(f.title) || 0) + 1)));
  const byDay = new Map();
  scans.forEach((s) => { const d = s.createdAt.toISOString().slice(0, 10); const o = byDay.get(d) || { date: d, scans: 0, threats: 0 }; o.scans++; if (s.verdict !== 'safe') o.threats++; byDay.set(d, o); });
  res.json({
    days, generatedAt: new Date(), user: { name: req.user.name, email: req.user.email },
    totals: { scans: scans.length, safe: count((s) => s.verdict === 'safe'), suspicious: count((s) => s.verdict === 'suspicious'), malicious: count((s) => s.verdict === 'malicious'), urls: count((s) => s.type === 'url'), emails: count((s) => s.type === 'email') },
    averageScore: scans.length ? Math.round(scans.reduce((a, s) => a + s.score, 0) / scans.length) : null,
    byThreat: ['phishing', 'malware', 'suspicious', 'other'].map((k) => ({ type: k, count: count((s) => s.primaryThreat === k) })),
    topRisky: scans.filter((s) => s.verdict !== 'safe').sort((a, b) => a.score - b.score).slice(0, 10).map((s) => ({ id: String(s._id), type: s.type, label: s.label, target: s.target, verdict: s.verdict, score: s.score, createdAt: s.createdAt })),
    topFindings: [...findingCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([title, count]) => ({ title, count })),
    timeline: [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date)),
  });
}));

router.get('/export.csv', asyncHandler(async (req, res) => {
  const { days } = q.parse(req.query);
  const scans = await Scan.find({ user: req.user._id, createdAt: mongoose.trusted({ $gte: new Date(Date.now() - days * DAY) }) }).sort({ createdAt: -1 }).limit(10000).lean();
  const rows = [['Date', 'Type', 'Target', 'Verdict', 'Safety score', 'Primary threat', 'Top finding'].map(csvCell).join(',')];
  scans.forEach((s) => rows.push([s.createdAt.toISOString(), s.type, s.target, s.verdict, s.score, s.primaryThreat, s.findings?.[0]?.title || ''].map(csvCell).join(',')));
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="defendiq-report-${days}d.csv"`);
  res.send('\uFEFF' + rows.join('\r\n'));
}));

export default router;
