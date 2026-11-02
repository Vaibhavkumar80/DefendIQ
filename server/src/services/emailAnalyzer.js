import { AppError } from '../lib/errors.js';
import { BRANDS } from '../data/brands.js';
import { splitHost, hostMatches } from '../utils/domain.js';
import { clamp, levenshtein } from '../utils/text.js';
import { analyzeUrlStatic, analyzeUrl, assemble } from './urlAnalyzer.js';
import { verdictFromScore, statusFromPoints, pickPrimaryThreat } from '../lib/scoring.js';
import { explain } from './llm.js';

const FREEMAIL = new Set(['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'aol.com', 'proton.me', 'protonmail.com', 'icloud.com', 'mail.com', 'gmx.com', 'yandex.com', 'rediffmail.com']);
const URGENCY = [/\burgent(ly)?\b/i, /\bimmediate(ly)?\b/i, /within (the next )?\d+ (hours?|days?)/i, /\bact now\b/i, /\bfinal (notice|warning)\b/i, /\b(account|access) (will be |has been )?(suspended|locked|closed|disabled|limited)\b/i, /\bunusual (sign-?in|activity)\b/i, /\bverify your (account|identity|email)\b/i, /\bexpires? (today|soon|in)\b/i, /\blast chance\b/i, /\bfailure to (comply|respond)\b/i];
const CREDENTIAL = [/\bpassword\b/i, /\b(one[- ]time|otp)\b/i, /\bcvv\b/i, /\bcard number\b/i, /\bsocial security|\bssn\b/i, /\bbank account\b/i, /\blog ?in (details|credentials)\b/i, /\bconfirm your (identity|details|information)\b/i, /\b(pin|security code)\b/i, /\bupdate your (payment|billing)\b/i];
const MONEY = [/\bgift ?cards?\b/i, /\bwire transfer\b/i, /\bbitcoin|\bcrypto(currency)? wallet\b/i, /\blotter(y|ies)\b/i, /\byou (have )?won\b/i, /\binheritance\b/i, /\bclaim your (prize|reward|refund)\b/i, /\bprocessing fee\b/i];
const GREETING = /\bdear (customer|user|member|client|account holder|valued|sir|madam|friend)\b/i;
const EXEC_ATT = /[\w\-. ]+\.(exe|scr|js|vbs|bat|cmd|jar|msi|iso|img|hta|lnk|docm|xlsm|pptm)\b/gi;
const OTHER_ATT = /[\w\-. ]+\.(zip|rar|7z|html?|pdf\.exe)\b/gi;

function parseAddress(s = '') {
  const m = s.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  const email = (m ? m[2] : s).trim().toLowerCase();
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  return { name: m ? m[1].trim() : '', email: ok ? email : '', domain: ok ? email.split('@')[1] : '' };
}

export function parseEmail(raw, overrides = {}) {
  const text = String(raw).replace(/\r\n/g, '\n');
  let headerBlock = '', body = text;
  const m = text.match(/^((?:[A-Za-z][A-Za-z0-9-]*:[^\n]*\n(?:[ \t][^\n]*\n)*)+)\n/);
  if (m) { headerBlock = m[1]; body = text.slice(m[0].length); }
  const headers = {};
  headerBlock.replace(/\n[ \t]+/g, ' ').split('\n').forEach((line) => {
    const i = line.indexOf(':');
    if (i > 0) (headers[line.slice(0, i).toLowerCase()] ||= []).push(line.slice(i + 1).trim());
  });
  const from = parseAddress(overrides.from || headers.from?.[0] || '');
  const replyTo = parseAddress(headers['reply-to']?.[0] || '');
  const subject = (overrides.subject || headers.subject?.[0] || '').slice(0, 300);
  const auth = [...(headers['authentication-results'] || []), ...(headers['received-spf'] || [])].join(' ').toLowerCase();
  return { from, replyTo, subject, headers, auth, body };
}

function extractLinks(body) {
  const anchors = [];
  const re = /<a\s[^>]*href\s*=\s*["']?([^"'\s>]+)["']?[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(body))) anchors.push({ href: m[1], text: m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() });
  const urls = new Set(anchors.map((a) => a.href).filter((u) => /^https?:\/\//i.test(u)));
  for (const u of body.match(/https?:\/\/[^\s<>"')\]]+/gi) || []) urls.add(u.replace(/[.,;]+$/, ''));
  return { anchors, urls: [...urls].slice(0, 15) };
}

export async function analyzeEmail(raw, { from, subject, deep = true, aiExplain = false } = {}) {
  const t0 = Date.now();
  if (!raw || raw.trim().length < 10) throw new AppError(400, 'Paste the email content (headers and/or body).');
  const e = parseEmail(raw, { from, subject });
  const isHtml = /<\/?[a-z][\s\S]*>/i.test(e.body);
  const text = (isHtml ? e.body.replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ') : e.body).replace(/\s+/g, ' ');
  const hay = `${e.subject} ${text}`;
  const findings = [];
  const positives = [];
  const add = (id, cat, severity, points, title, detail) => findings.push({ id, cat, severity, points, title, detail });

  // ---- sender ----
  const fromDomain = e.from.domain;
  const fromParts = fromDomain ? splitHost(fromDomain) : null;
  if (!e.from.email) add('no_sender', 'phishing', 'low', 5, 'Sender address missing or unreadable', 'Add the From header for a more accurate result.');
  if (/spf=(fail|softfail)/.test(e.auth)) add('spf_fail', 'phishing', 'high', 15, 'SPF check failed', 'The sending server is not authorised to send for this domain.');
  if (/dkim=fail/.test(e.auth)) add('dkim_fail', 'phishing', 'high', 10, 'DKIM signature failed', 'The message may have been altered or forged.');
  if (/dmarc=fail/.test(e.auth)) add('dmarc_fail', 'phishing', 'high', 15, 'DMARC check failed', 'The domain owner\'s policy rejects this sender.');
  if (/spf=pass/.test(e.auth) && /dkim=pass/.test(e.auth)) positives.push('SPF and DKIM passed');

  if (fromDomain) {
    const display = (e.from.name || '').toLowerCase();
    const brandInName = BRANDS.find((b) => b.keys.some((k) => k.length >= 5 && display.includes(k)));
    if (brandInName && !brandInName.domains.some((d) => hostMatches(fromDomain, d))) {
      add('display_spoof', 'phishing', 'high', 30, `Sender name claims to be ${brandInName.name}`, `The display name says "${e.from.name}" but the address is @${fromDomain}.`);
    } else if (brandInName) positives.push(`Sender domain matches ${brandInName.name}`);
    const lookalike = BRANDS.find((b) => { const p = b.domains[0].split('.')[0]; return p.length >= 6 && fromParts.sld !== p && !fromParts.sld.includes(p) && levenshtein(fromParts.sld, p) === 1; });
    const embedded = BRANDS.find((b) => !b.domains.some((d) => hostMatches(fromDomain, d)) && b.keys.some((k) => k.length >= 5 && fromDomain.includes(k)));
    if (embedded && !brandInName) add('lookalike_sender', 'phishing', 'high', 30, `Sender domain imitates ${embedded.name}`, `@${fromDomain} contains the brand name but is not official.`);
    else if (lookalike) add('lookalike_sender', 'phishing', 'high', 30, `Sender domain is a misspelling of ${lookalike.name}`, `@${fromDomain} is one character away from the real domain.`);
    if (e.replyTo.domain && splitHost(e.replyTo.domain).registrable !== fromParts.registrable) add('reply_mismatch', 'phishing', 'medium', 15, 'Reply-To goes to a different domain', `Replies go to @${e.replyTo.domain}, not @${fromDomain}.`);
    if (FREEMAIL.has(fromParts.registrable) && /\b(bank|support team|security team|payroll|hr department|billing|helpdesk|customer care)\b/i.test(`${e.from.name} ${hay}`)) add('freemail_business', 'phishing', 'medium', 12, 'Business claims sent from a free mailbox', 'Organisations rarely contact you from a Gmail/Yahoo/Outlook address.');
  }

  // ---- content ----
  const count = (list) => list.filter((r) => r.test(hay)).length;
  const urg = count(URGENCY), cred = count(CREDENTIAL), money = count(MONEY);
  if (urg) add('urgency', 'phishing', urg > 1 ? 'medium' : 'low', Math.min(20, urg * 6), 'Pressure / urgency language', `Found ${urg} urgency phrase(s). Scammers rush you so you do not think.`);
  if (cred) add('credential_request', 'phishing', 'high', Math.min(24, cred * 8), 'Asks for sensitive information', 'Legitimate companies do not ask for passwords, OTPs or card details by email.');
  if (money) add('money_lure', 'phishing', 'medium', Math.min(20, money * 8), 'Money / prize / gift-card lure', 'Requests for gift cards, crypto or "prize" claims are classic scams.');
  if (GREETING.test(text)) add('generic_greeting', 'phishing', 'low', 6, 'Generic greeting', 'Real providers usually address you by name.');
  const letters = e.subject.replace(/[^A-Za-z]/g, '');
  if (letters.length > 8 && letters === letters.toUpperCase()) add('caps_subject', 'phishing', 'low', 4, 'Subject is ALL CAPS', 'Shouting subjects are a common spam/phishing style.');
  if (isHtml && /<form[\s\S]*type\s*=\s*["']?password/i.test(e.body)) add('embedded_form', 'phishing', 'high', 25, 'Contains an embedded password form', 'Real emails never collect passwords inside the message.');
  if (isHtml && /<script/i.test(e.body)) add('script_tag', 'malware', 'medium', 10, 'Contains scripts', 'Scripts inside email are blocked by clients and are a red flag.');

  // ---- attachments ----
  const exec = [...new Set(hay.match(EXEC_ATT) || [])].slice(0, 5);
  const other = [...new Set(hay.match(OTHER_ATT) || [])].filter((x) => !exec.includes(x)).slice(0, 5);
  if (exec.length) add('exec_attachment', 'malware', 'high', 25, 'Mentions executable/macro attachment', `Files: ${exec.join(', ')}. These can install malware.`);
  else if (other.length) add('risky_attachment', 'malware', 'medium', 10, 'Mentions an archive or HTML attachment', `Files: ${other.join(', ')}. Phishing kits often arrive as .html or .zip.`);

  // ---- links ----
  const { anchors, urls } = extractLinks(e.body);
  const mismatch = anchors.filter((a) => {
    const t = a.text.match(/(?:https?:\/\/)?((?:[a-z0-9-]+\.)+[a-z]{2,})/i);
    if (!t) return false;
    try { return splitHost(t[1].toLowerCase()).registrable !== splitHost(new URL(a.href).hostname).registrable; } catch { return false; }
  });
  if (mismatch.length) add('link_mismatch', 'phishing', 'high', 25, 'Link text does not match its destination', `"${mismatch[0].text.slice(0, 60)}" actually goes to ${(() => { try { return new URL(mismatch[0].href).hostname; } catch { return 'another site'; } })()}.`);

  const staticLinks = [];
  for (const u of urls.slice(0, 10)) {
    try { const r = assemble(analyzeUrlStaticAsResult(u)); staticLinks.push({ url: u, host: r.label, score: r.score, verdict: r.verdict, reason: r.findings[0]?.title || null }); } catch { /* skip invalid */ }
  }
  let links = staticLinks;
  if (deep && staticLinks.length) {
    const worst = [...staticLinks].sort((a, b) => a.score - b.score).slice(0, 3);
    const deeper = await Promise.all(worst.map((l) => analyzeUrl(l.url, { deep: true }).then((r) => ({ url: l.url, host: r.label, score: r.score, verdict: r.verdict, reason: r.findings[0]?.title || null })).catch(() => l)));
    links = staticLinks.map((l) => deeper.find((d) => d.url === l.url) || l);
  }
  const worstRisk = links.length ? 100 - Math.min(...links.map((l) => l.score)) : 0;
  if (links.length && worstRisk >= 30) {
    const bad = links.filter((l) => l.verdict !== 'safe').length;
    add('risky_links', 'phishing', worstRisk >= 60 ? 'high' : 'medium', clamp(Math.round(worstRisk * 0.5), 0, 40), `${bad} of ${links.length} link(s) look risky`, `Riskiest link: ${links.sort((a, b) => a.score - b.score)[0].host}.`);
  } else if (links.length) positives.push(`${links.length} link(s) checked, none risky`);

  const risk = clamp(findings.reduce((s, x) => s + x.points, 0));
  const score = 100 - risk;
  const verdict = verdictFromScore(score);
  const pts = (ids) => findings.filter((f) => ids.includes(f.id)).reduce((s, f) => s + f.points, 0);
  const senderPts = pts(['no_sender', 'spf_fail', 'dkim_fail', 'dmarc_fail', 'display_spoof', 'lookalike_sender', 'reply_mismatch', 'freemail_business']);
  const contentPts = pts(['urgency', 'credential_request', 'money_lure', 'generic_greeting', 'caps_subject', 'embedded_form']);
  const linkPts = pts(['link_mismatch', 'risky_links']);
  const attPts = pts(['exec_attachment', 'risky_attachment', 'script_tag']);
  const cats = { phishing: senderPts + contentPts + linkPts, malware: attPts, suspicious: 0 };
  const w = { bad: 'Detected', warn: 'Possible', ok: 'Clear' };
  const st = (p, b, wn) => statusFromPoints(p, b, wn);
  const mk = (key, label, p, b, wn, detail) => ({ key, label, status: st(p, b, wn), value: w[st(p, b, wn)], detail });
  const checks = [
    mk('sender', 'Sender Authenticity', senderPts, 25, 10, 'Display name, domain, Reply-To and SPF/DKIM/DMARC.'),
    mk('content', 'Message Content', contentPts, 20, 8, 'Urgency, credential requests and lures.'),
    mk('links', 'Links', linkPts, 20, 10, links.length ? `${links.length} link(s) analysed.` : 'No links found.'),
    mk('attachments', 'Attachments', attPts, 20, 8, 'Mentions of risky file types.'),
  ];
  const sorted = findings.sort((a, b) => b.points - a.points);
  const reasons = sorted.slice(0, 2).map((x) => x.title.toLowerCase()).join(' and ');
  const summary = verdict === 'safe' ? 'No strong phishing indicators were found in this message. Still verify unexpected requests through an official channel.'
    : verdict === 'suspicious' ? `This email has warning signs (${reasons}). Do not click links or open attachments until you verify the sender another way.`
      : `This email is very likely phishing (${reasons}). Do not click anything, do not reply, and report/delete it.`;

  const result = {
    type: 'email', target: `${e.from.email || 'unknown sender'}${e.subject ? ' - ' + e.subject : ''}`.slice(0, 300), label: e.subject || e.from.email || 'Email',
    verdict, score, risk, primaryThreat: pickPrimaryThreat(cats, risk),
    categories: { phishing: { points: cats.phishing, status: st(cats.phishing, 25, 10) }, malware: { points: cats.malware, status: st(cats.malware, 20, 8) }, suspicious: { points: 0, status: 'ok' } },
    checks, findings: sorted, positives, flags: cred ? ['credential-lure'] : [], summary,
    meta: { from: e.from.email, fromName: e.from.name, subject: e.subject, replyTo: e.replyTo.email || null, links, hasHeaders: Object.keys(e.headers).length > 0, authResults: e.auth ? e.auth.slice(0, 200) : null, deep: !!deep, durationMs: Date.now() - t0 },
  };
  if (deep && aiExplain) result.meta.aiOpinion = await explain('email', result, text);
  return result;
}

// Helper: static URL analysis packaged for assemble()
function analyzeUrlStaticAsResult(u) { return analyzeUrlStatic(u); }
