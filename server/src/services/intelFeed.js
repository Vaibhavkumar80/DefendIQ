import fs from 'node:fs';

const seed = JSON.parse(fs.readFileSync(new URL('../data/seedBlocklist.json', import.meta.url), 'utf8'));

let state = { urls: new Map(), hosts: new Map(), updatedAt: null, sources: [], refreshing: false };

const key = (u) => `${u.protocol}//${u.host}${u.pathname.replace(/\/$/, '')}${u.search}`.toLowerCase();

function ingest(maps, lines, source) {
  let n = 0;
  for (const line of lines) {
    const t = line.trim();
    if (!/^https?:\/\//i.test(t)) continue;
    try {
      const u = new URL(t);
      maps.urls.set(key(u), source);
      if (u.pathname === '/' && !u.search) maps.hosts.set(u.hostname.toLowerCase(), source);
      if (++n >= 300000) break;
    } catch { /* skip malformed */ }
  }
  return n;
}

function feedUrls() {
  const raw = process.env.THREAT_FEED_URLS;
  if (raw === undefined) return ['https://openphish.com/feed.txt'];
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

export async function refreshFeeds() {
  if (state.refreshing) return getFeedStatus();
  state.refreshing = true;
  const next = { urls: new Map(), hosts: new Map() };
  const sources = [{ name: 'Built-in test list', count: ingest(next, seed, 'Built-in test list'), ok: true }];
  for (const url of feedUrls()) {
    const name = new URL(url).hostname;
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(25000), headers: { 'user-agent': 'DefendIQ/1.0 (+self-hosted)' } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const text = await r.text();
      sources.push({ name, count: ingest(next, text.split('\n'), name), ok: true });
    } catch (e) {
      sources.push({ name, count: 0, ok: false, error: e.message });
    }
  }
  state = { ...next, sources, updatedAt: new Date(), refreshing: false };
  return getFeedStatus();
}

// Seed list is available immediately, before the first network refresh finishes.
ingest(state, seed, 'Built-in test list');
state.sources = [{ name: 'Built-in test list', count: seed.length, ok: true }];

export function feedLookup(url) {
  const src = state.urls.get(key(url)) || state.hosts.get(url.hostname.toLowerCase());
  return src ? { listed: true, source: src } : { listed: false };
}

export function getFeedStatus() {
  return { updatedAt: state.updatedAt, entries: state.urls.size, sources: state.sources, refreshing: state.refreshing };
}
