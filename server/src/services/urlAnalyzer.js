import net from 'node:net';
import { domainToUnicode } from 'node:url';
import { AppError } from '../lib/errors.js';
import { BRANDS, KNOWN_GOOD, SUSPICIOUS_TLDS, SHORTENERS, URL_KEYWORDS, FREE_HOSTS, EXEC_EXT, ARCHIVE_EXT } from '../data/brands.js';
import { splitHost, hostMatches } from '../utils/domain.js';
import { levenshtein, entropy, deLeet, clamp } from '../utils/text.js';
import { resolveHost, getCertInfo, rdapDomainAge, isPrivateIp, humanAge } from './netChecks.js';
import { feedLookup } from './intelFeed.js';
import { modelProbability } from './model.js';
import { verdictFromScore, statusFromPoints, pickPrimaryThreat } from '../lib/scoring.js';
import { explain } from './llm.js';

export function parseUrlInput(input) {
  let s = String(input ?? '').trim();
  if (!s || s.length > 2048) throw new AppError(400, 'Enter a URL (max 2048 characters).');
  if (/\s/.test(s)) throw new AppError(400, 'A URL cannot contain spaces.');
  let assumed = false;
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(s)) {
    if (/^[a-z][a-z0-9+.-]*:/i.test(s) && !/^[^/]+:\d+(\/|$)/.test(s)) throw new AppError(400, 'Only http:// and https:// links can be scanned.');
    s = 'https://' + s; assumed = true;
  }
  let url;
  try { url = new URL(s); } catch { throw new AppError(400, 'That does not look like a valid URL.'); }
  if (!['http:', 'https:'].includes(url.protocol)) throw new AppError(400, 'Only http:// and https:// links can be scanned.');
  const bare = url.hostname.replace(/^\[|\]$/g, '');
  if (!bare || (!bare.includes('.') && !net.isIP(bare))) throw new AppError(400, 'The URL needs a valid domain name.');
  return { url, assumed };
}

const safeDecode = (s) => { try { return decodeURIComponent(s); } catch { return s; } };

export function analyzeUrlStatic(input) {
  const { url, assumed } = parseUrlInput(input);
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  const isIp = net.isIP(host) > 0;
  const parts = isIp ? { host, labels: [host], tld: '', sld: host, registrable: host, subdomains: [] } : splitHost(host);
  const path = safeDecode(url.pathname + url.search).toLowerCase();
  const findings = [];
  const positives = [];
  const add = (id, cat, severity, points, title, detail) => findings.push({ id, cat, severity, points, title, detail });
  const f = {};

  const officialBrands = BRANDS.filter((b) => b.domains.some((d) => hostMatches(host, d)));
  const trusted = officialBrands.length > 0 || KNOWN_GOOD.has(parts.registrable);
  if (trusted) positives.push('Recognized, well-known domain');

  if (url.protocol === 'http:') { f.noHttps = 1; add('no_https', 'suspicious', 'medium', 12, 'Connection is not encrypted', 'The link uses http:// so anything you type could be intercepted. Legitimate login pages use https://.'); }
  else positives.push('Uses HTTPS');

  if (isIp) { f.ipHost = 1; add('ip_host', 'phishing', 'high', 28, 'Address is a raw IP number', 'Real services use domain names. Raw IP links are common in phishing and malware delivery.'); }
  if (url.username || url.password) { f.atSymbol = 1; add('userinfo', 'phishing', 'high', 25, 'Contains "@" credentials trick', 'Text before "@" is ignored by the browser, so the real destination differs from what it looks like.'); }

  if (host.includes('xn--')) {
    f.punycode = 1;
    const uni = domainToUnicode(host);
    add('punycode', 'phishing', 'high', 22, 'Internationalized (look-alike) domain', `This domain uses special characters (${uni}) that can imitate familiar letters.`);
  }

  const subLevels = parts.subdomains.length;
  f.subLevels = clamp(subLevels / 5, 0, 1);
  if (!isIp && !trusted && subLevels >= 3) add('many_subdomains', 'suspicious', 'medium', 10, 'Unusually many subdomains', `"${host}" has ${subLevels} subdomain levels, often used to bury a fake brand name.`);

  const len = url.href.length;
  f.length = clamp(len / 300, 0, 1);
  if (len > 200) add('long_url', 'suspicious', 'medium', 10, 'Very long URL', `The link is ${len} characters long, which is often used to hide the real destination.`);
  else if (len > 100) add('long_url', 'suspicious', 'low', 6, 'Long URL', `The link is ${len} characters long.`);

  const hyphens = (host.match(/-/g) || []).length;
  f.hyphens = clamp(hyphens / 6, 0, 1);
  if (hyphens >= 3) add('hyphens', 'suspicious', 'low', 8, 'Many hyphens in the domain', 'Hyphen-stuffed domains such as "secure-login-update-account" are typical of phishing kits.');

  if (!isIp && SUSPICIOUS_TLDS.has(parts.tld)) { f.suspTld = 1; add('susp_tld', 'suspicious', 'medium', 12, `Risky domain ending (.${parts.tld})`, 'This domain extension is cheap or free and heavily abused for scams.'); }
  if (SHORTENERS.has(parts.registrable) || SHORTENERS.has(host)) { f.shortener = 1; add('shortener', 'suspicious', 'medium', 15, 'Link shortener hides the destination', 'You cannot see where this link really leads until you open it.'); }

  const tokens = host.split(/[.-]/);
  let brandHit = null;
  for (const b of BRANDS) {
    if (officialBrands.includes(b) || b.domains.some((d) => hostMatches(host, d))) continue;
    if (b.keys.some((k) => tokens.includes(k) || (k.length >= 6 && host.includes(k)))) { brandHit = b; break; }
  }
  if (brandHit) { f.brandHit = 1; add('brand_impersonation', 'phishing', 'high', 30, `Possible impersonation of ${brandHit.name}`, `The domain mentions "${brandHit.name}" but is not an official ${brandHit.name} domain.`); }

  if (!brandHit && !trusted && !isIp && !KNOWN_GOOD.has(parts.registrable)) {
    const label = parts.sld;
    for (const b of BRANDS) {
      const primary = b.domains[0].split('.')[0];
      if (primary.length < 6 || label === primary || label.includes(primary)) continue;
      const leet = deLeet(label) === primary;
      const dist = levenshtein(label, primary);
      if (leet || dist === 1 || (dist === 2 && primary.length >= 9)) {
        f.typo = 1; add('typosquat', 'phishing', 'high', 30, `Looks like a misspelling of ${b.name}`, `"${label}" is very close to "${primary}" - a classic typosquatting trick.`); break;
      }
    }
  }
  if (!brandHit && !f.typo && !trusted) {
    const b = BRANDS.find((x) => x.keys.some((k) => k.length >= 5 && path.includes(k)));
    if (b) add('brand_in_path', 'phishing', 'medium', 10, `Mentions ${b.name} in the link path`, `The page claims to relate to ${b.name} but is hosted on "${parts.registrable}".`);
  }

  const hostKw = URL_KEYWORDS.filter((k) => host.includes(k));
  const pathKw = URL_KEYWORDS.filter((k) => path.includes(k));
  f.kwHost = clamp(hostKw.length / 4, 0, 1);
  f.kwPath = clamp(pathKw.length / 4, 0, 1);
  if (!trusted && hostKw.length) add('kw_host', 'phishing', 'medium', Math.min(18, hostKw.length * 6), 'Credential-style words in the domain', `The domain contains: ${hostKw.join(', ')}.`);
  if (!trusted && pathKw.length) add('kw_path', 'phishing', 'low', Math.min(9, pathKw.length * 3), 'Account-action words in the path', `The path contains: ${pathKw.join(', ')}.`);
  if (/(^|[.-])https?([.-]|$)/.test(host)) add('https_in_host', 'phishing', 'medium', 12, '"http(s)" used inside the domain name', 'Scammers add "https" to the domain to look secure.');

  if (FREE_HOSTS.some((h) => host.endsWith(h))) add('free_hosting', 'suspicious', 'low', 6, 'Hosted on a free/temporary platform', 'Free hosting is easy to abuse for short-lived scam pages.');
  if ((url.search + url.pathname).match(/%[0-9a-f]{2}/gi)?.length > 5) add('encoded', 'suspicious', 'low', 6, 'Heavily encoded URL', 'Many %-encoded characters can be used to hide the real path or parameters.');
  if (/\bhttps?%3a|[?&=]https?:\/\//i.test(url.search)) { f.redirectParam = 1; add('redirect_param', 'suspicious', 'medium', 10, 'Contains another URL as a parameter', 'Redirect-style links can bounce you from a trusted-looking site to a malicious one.'); }
  if (url.port && !['80', '443'].includes(url.port)) { f.oddPort = 1; add('odd_port', 'suspicious', 'medium', 8, `Unusual port (${url.port})`, 'Public websites normally use the default web ports.'); }

  const sldEntropy = entropy(parts.sld);
  if (!isIp && parts.sld.length >= 12 && sldEntropy > 3.5) { f.entropyHigh = 1; add('random_domain', 'suspicious', 'medium', 10, 'Random-looking domain name', 'Machine-generated names are often used for throwaway attack infrastructure.'); }
  const digitRatio = ((host.match(/\d/g) || []).length) / Math.max(1, host.length);
  f.digitRatio = !isIp && digitRatio > 0.3 ? 1 : 0;

  const file = url.pathname.split('/').pop() || '';
  const ext = file.includes('.') ? file.split('.').pop().toLowerCase() : '';
  if (EXEC_EXT.has(ext) && ext !== 'js') { f.exeDownload = 1; add('exe_download', 'malware', 'high', 25, `Links directly to a .${ext} file`, 'Executable/installer downloads from unknown links are a primary way malware spreads.'); }
  else if (ARCHIVE_EXT.has(ext)) add('archive_download', 'malware', 'medium', 8, `Links to a .${ext} archive`, 'Archives can hide malicious files from basic scanners.');

  const heuristicRisk = clamp(findings.reduce((s, x) => s + x.points, 0));
  return { url, assumedScheme: assumed, host, isIp, parts, findings, positives, features: f, heuristicRisk, trusted };
}

const sumCat = (findings, cat) => findings.filter((x) => x.cat === cat).reduce((s, x) => s + x.points, 0);

export function assemble(s, net = {}) {
  const { findings } = s;
  const modelP = modelProbability(s.features);
  let risk = clamp(Math.round(0.7 * s.heuristicRisk + 0.3 * modelP * 100));
  if (s.trusted && !findings.some((f) => f.severity === 'high')) risk = Math.min(risk, 8);
  // A shortened link hides its destination, which cannot be verified without following it - never rate it "safe".
  if (s.features.shortener) risk = Math.max(risk, 55);
  const feed = net.feed;
  if (feed?.listed) risk = 100;
  const score = 100 - risk;
  const verdict = verdictFromScore(score);

  const cats = { phishing: sumCat(findings, 'phishing'), malware: sumCat(findings, 'malware'), suspicious: sumCat(findings, 'suspicious') };
  const categories = {
    phishing: { points: cats.phishing, status: feed?.listed ? 'bad' : statusFromPoints(cats.phishing, 25, 10) },
    malware: { points: cats.malware, status: statusFromPoints(cats.malware, 20, 8) },
    suspicious: { points: cats.suspicious, status: statusFromPoints(cats.suspicious, 15, 6) },
  };
  const word = { bad: 'Detected', warn: 'Possible', ok: 'Not Detected' };

  let ssl;
  if (s.url.protocol === 'http:') ssl = { status: 'warn', value: 'Not used', detail: 'This link does not use HTTPS.' };
  else if (!net.deep) ssl = { status: 'unknown', value: 'Not checked', detail: 'Deep checks were skipped.' };
  else if (!net.cert || net.cert.error) ssl = { status: 'unknown', value: 'Unavailable', detail: 'Could not complete a TLS handshake (offline, blocked or unreachable).' };
  else if (net.cert.authorized) ssl = { status: 'ok', value: 'Valid', detail: `Issued by ${net.cert.issuer || 'unknown CA'}, ${net.cert.daysLeft} days remaining.` };
  else ssl = { status: 'bad', value: 'Invalid', detail: net.cert.authError || 'Certificate could not be verified.' };

  const checks = [
    { key: 'phishing', label: 'Phishing', status: categories.phishing.status, value: word[categories.phishing.status] },
    { key: 'malware', label: 'Malware', status: categories.malware.status, value: word[categories.malware.status] },
    { key: 'suspicious', label: 'Suspicious Links', status: categories.suspicious.status, value: word[categories.suspicious.status] },
    { key: 'ssl', label: 'SSL Certificate', ...ssl },
    { key: 'age', label: 'Domain Age', status: net.ageDays == null ? 'unknown' : net.ageDays < 90 ? 'warn' : 'ok', value: humanAge(net.ageDays), detail: net.ageDays == null ? 'Registration date unavailable.' : `Registered about ${humanAge(net.ageDays)} ago.` },
    { key: 'feed', label: 'Threat Feeds', status: feed?.listed ? 'bad' : 'ok', value: feed?.listed ? 'Listed' : 'Not listed', detail: feed?.listed ? `Listed by ${feed.source}.` : 'Not found in loaded threat feeds.' },
  ];

  const sorted = [...findings].sort((a, b) => b.points - a.points);
  const reasons = sorted.slice(0, 2).map((x) => x.title.toLowerCase()).join(' and ');
  const summary = verdict === 'safe'
    ? (s.trusted ? 'This website uses a recognized domain, has no known malicious activity and looks safe to visit.' : 'No strong threat signals were found. Still, stay alert before entering personal details.')
    : verdict === 'suspicious'
      ? `This link shows warning signs (${reasons || 'several weak signals'}). Avoid entering passwords or payment details unless you are certain it is legitimate.`
      : `This link is very likely malicious (${reasons || 'multiple strong signals'}). Do not open it or enter any information.`;

  return {
    type: 'url', target: s.url.href.slice(0, 2048), label: s.host, verdict, score, risk,
    primaryThreat: pickPrimaryThreat(cats, risk), categories, checks, findings: sorted, positives: s.positives,
    flags: (s.features.brandHit || s.features.typo || findings.some((x) => x.id === 'kw_host')) ? ['credential-lure'] : [],
    summary,
    meta: {
      host: s.host, registrable: s.parts.registrable, assumedScheme: s.assumedScheme, heuristicRisk: s.heuristicRisk,
      modelProbability: Number(modelP.toFixed(3)), deep: !!net.deep, ips: net.ips || [], ageDays: net.ageDays ?? null,
      cert: net.cert && !net.cert.error ? { issuer: net.cert.issuer, subject: net.cert.subject, daysLeft: net.cert.daysLeft, authorized: net.cert.authorized } : null,
      feed: feed?.listed ? feed.source : null,
    },
  };
}

export async function analyzeUrl(input, { deep = true, aiExplain = false } = {}) {
  const t0 = Date.now();
  const s = analyzeUrlStatic(input);
  const net = { deep, feed: feedLookup(s.url), ips: [], cert: null, ageDays: null };
  if (deep) {
    const dnsRes = await resolveHost(s.host);
    net.ips = dnsRes.ips;
    if (dnsRes.ips.length && dnsRes.ips.every(isPrivateIp)) {
      s.findings.push({ id: 'private_ip', cat: 'suspicious', severity: 'high', points: 40, title: 'Points to a private/internal address', detail: 'The domain resolves to a non-public network address. It was not contacted.' });
    } else if (!dnsRes.ips.length && ['ENOTFOUND', 'ENODATA'].includes(dnsRes.error)) {
      s.findings.push({ id: 'dns_fail', cat: 'suspicious', severity: 'medium', points: 15, title: 'Domain does not resolve', detail: 'No DNS record exists. The site may be taken down, mistyped or newly burned by attackers.' });
    } else if (dnsRes.ips.length) {
      const pub = dnsRes.ips.find((ip) => !isPrivateIp(ip));
      const wantTls = s.url.protocol === 'https:' || s.url.port === '443';
      const [cert, age] = await Promise.all([
        wantTls && pub ? getCertInfo(pub, s.host) : Promise.resolve(null),
        s.isIp ? Promise.resolve(null) : rdapDomainAge(s.parts.registrable),
      ]);
      net.cert = cert; net.ageDays = age;
      if (cert && !cert.error) {
        if (!cert.authorized) {
          const e = (cert.authError || '').toLowerCase();
          const t = e.includes('expired') ? 'Certificate has expired' : e.includes('altname') || e.includes('hostname') ? 'Certificate does not match this domain' : e.includes('self') ? 'Self-signed certificate' : 'Certificate cannot be verified';
          s.findings.push({ id: 'bad_cert', cat: 'suspicious', severity: 'high', points: 25, title: t, detail: cert.authError || 'The browser would show a security warning.' });
        } else {
          s.positives.push('Valid SSL certificate');
          if (cert.ageDays != null && cert.ageDays < 7) s.findings.push({ id: 'new_cert', cat: 'suspicious', severity: 'low', points: 6, title: 'Certificate was issued very recently', detail: `Issued ${cert.ageDays} day(s) ago. Common for new phishing sites (but also for any new site).` });
        }
      } else if (cert?.error === 'ECONNREFUSED' && s.url.protocol === 'https:') {
        s.findings.push({ id: 'https_refused', cat: 'suspicious', severity: 'low', points: 8, title: 'HTTPS is not available on this host', detail: 'The link says https:// but the server does not accept secure connections.' });
      }
      if (age != null) {
        if (age < 30) s.findings.push({ id: 'new_domain', cat: 'phishing', severity: 'high', points: 25, title: 'Domain registered less than 30 days ago', detail: 'Most phishing domains are less than a month old.' });
        else if (age < 90) s.findings.push({ id: 'new_domain', cat: 'phishing', severity: 'medium', points: 15, title: 'Domain registered less than 90 days ago', detail: 'Young domains deserve extra caution.' });
        else if (age < 365) s.findings.push({ id: 'young_domain', cat: 'phishing', severity: 'low', points: 6, title: 'Domain is under a year old', detail: 'Not a problem by itself, but adds a little risk.' });
        else s.positives.push(`Domain is ${humanAge(age)} old`);
      }
    }
  }
  if (net.feed.listed) s.findings.push({ id: 'feed_hit', cat: 'phishing', severity: 'high', points: 60, title: 'Listed in a threat-intelligence feed', detail: `Reported as malicious by ${net.feed.source}.` });
  s.heuristicRisk = clamp(s.findings.reduce((a, x) => a + x.points, 0));
  const result = assemble(s, net);
  result.meta.durationMs = Date.now() - t0;
  if (deep && aiExplain) result.meta.aiOpinion = await explain('link', result);
  return result;
}
