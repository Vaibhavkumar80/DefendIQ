import test from 'node:test';
import assert from 'node:assert/strict';

const statsKey = 'diq-public-stats';

function makeStorage(initial = {}) {
  const entries = new Map(Object.entries(initial));
  return {
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => entries.set(key, value),
  };
}

function response(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers });
}

test('public stats share requests, retry rate limits, and cache successful data', async () => {
  globalThis.sessionStorage = makeStorage();
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    if (calls === 1) return response({ error: 'rate limited' }, 429, { 'Retry-After': '0' });
    return response({ scans: 12, threats: 3, users: 4, feedEntries: 30 });
  };
  const { api } = await import(`../src/lib/api.js?retry=${Date.now()}`);

  const [first, second] = await Promise.all([api.get('/public/stats'), api.get('/public/stats')]);
  assert.deepEqual(first, { scans: 12, threats: 3, users: 4, feedEntries: 30 });
  assert.deepEqual(second, first);
  assert.equal(calls, 2);
  assert.deepEqual(await api.get('/public/stats'), first);
  assert.equal(calls, 2);
});

test('public stats return the last successful values when the service is unavailable', async () => {
  const previous = { scans: 9, threats: 2, users: 3, feedEntries: 25 };
  globalThis.sessionStorage = makeStorage({
    [statsKey]: JSON.stringify({ data: previous, at: Date.now() - 10 * 60 * 1000 }),
  });
  let calls = 0;
  globalThis.fetch = async () => { calls++; return response({ error: 'unavailable' }, 503); };
  const { api } = await import(`../src/lib/api.js?stale=${Date.now()}`);

  const result = await api.get('/public/stats');
  assert.deepEqual(result, { ...previous, stale: true });
  assert.equal(calls, 3);
});