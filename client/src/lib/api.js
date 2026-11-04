const BASE = import.meta.env?.VITE_API_URL || '/api';
const STATS_CACHE_KEY = 'diq-public-stats';
const STATS_CACHE_TTL = 5 * 60 * 1000;
let statsCache;
let statsRequest;
let statsRetryAt = 0;

async function request(method, path, body, timeoutMs = 60000) {
  let res;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    res = await fetch(BASE + path, {
      method,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'DefendIQ' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (cause) {
    const err = new Error(cause?.name === 'AbortError' ? 'The server is taking too long to respond. Please try again.' : 'Cannot reach the server. Please try again in a moment.');
    err.status = 0;
    throw err;
  } finally {
    clearTimeout(timeout);
  }
  let data = null;
  try { data = await res.json(); } catch { /* empty body */ }
  if (!res.ok) {
    const err = new Error(data?.error || `Request failed (${res.status})`);
    err.status = res.status;
    err.fields = data?.fields;
    const retryAfter = res.headers.get('Retry-After');
    err.retryAfterMs = retryAfter && Number.isFinite(Number(retryAfter))
      ? Number(retryAfter) * 1000
      : retryAfter ? Math.max(0, Date.parse(retryAfter) - Date.now()) : 0;
    throw err;
  }
  return data;
}

function readStatsCache() {
  if (statsCache) return statsCache;
  try {
    const saved = JSON.parse(sessionStorage.getItem(STATS_CACHE_KEY));
    if (saved?.data && Number.isFinite(saved.at)) statsCache = saved;
  } catch { /* storage may be unavailable */ }
  return statsCache;
}

function saveStatsCache(data) {
  if (data?.stale) return;
  statsCache = { data, at: Date.now() };
  try { sessionStorage.setItem(STATS_CACHE_KEY, JSON.stringify(statsCache)); } catch { /* storage may be unavailable */ }
}

async function loadPublicStats() {
  const cached = readStatsCache();
  if (cached && Date.now() - cached.at < STATS_CACHE_TTL) return cached.data;
  if (Date.now() < statsRetryAt) {
    if (cached) return { ...cached.data, stale: true };
    throw new Error('Live statistics are temporarily unavailable. Please try again later.');
  }
  if (statsRequest) return statsRequest;

  statsRequest = (async () => {
    let lastError;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const data = await request('GET', '/public/stats', undefined, 10000);
        saveStatsCache(data);
        statsRetryAt = data?.stale ? Date.now() + 30000 : 0;
        return data;
      } catch (error) {
        lastError = error;
        if (attempt === 2 || !(error.status === 0 || error.status === 429 || error.status >= 500)) break;
        const wait = error.retryAfterMs || Math.min(500 * (2 ** attempt), 2000);
        await new Promise((resolve) => setTimeout(resolve, Math.min(wait, 5000)));
      }
    }
    statsRetryAt = Date.now() + 30000;
    if (cached) return { ...cached.data, stale: true };
    throw new Error('Live statistics are temporarily unavailable. Please try again later.', { cause: lastError });
  })().finally(() => { statsRequest = null; });
  return statsRequest;
}

export const api = {
  get: (p) => p === '/public/stats' ? loadPublicStats() : request('GET', p),
  post: (p, b = {}) => request('POST', p, b),
  patch: (p, b = {}) => request('PATCH', p, b),
  del: (p, b) => request('DELETE', p, b),
  base: BASE,
};
