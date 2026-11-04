import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { isCurrentSession, requireAuth } from '../src/middleware/auth.js';

test('session tokens are accepted only for the current user session version', () => {
  const user = { sessionVersion: 3 };
  assert.equal(isCurrentSession({ sv: 3 }, user), true);
  assert.equal(isCurrentSession({ sv: 2 }, user), false);
  assert.equal(isCurrentSession({}, user), false);
  assert.equal(isCurrentSession({ sv: '3' }, user), false);
});

test('protected routes reject requests without a session cookie', async () => {
  let error;
  await new Promise((resolve) => requireAuth({ cookies: {} }, {}, (nextError) => { error = nextError; resolve(); }));
  assert.equal(error?.status, 401);
  assert.equal(error?.code, 'unauthenticated');
});

test('production session cookies keep secure HttpOnly same-site settings', () => {
  const moduleUrl = new URL('../src/middleware/auth.js', import.meta.url).href;
  const script = `
    import { issueSession, COOKIE } from ${JSON.stringify(moduleUrl)};
    const cookie = {};
    issueSession({ cookie: (name, value, options) => Object.assign(cookie, { name, options }) }, { _id: 'test-user', sessionVersion: 0 }, true);
    console.log(JSON.stringify(cookie));
  `;
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
    encoding: 'utf8',
    env: { ...process.env, NODE_ENV: 'production', JWT_SECRET: 'test-only-secret-that-is-never-logged-1234567890' },
  });
  assert.equal(result.status, 0, result.stderr);
  const { name, options } = JSON.parse(result.stdout);
  assert.equal(name, 'diq_token');
  assert.equal(options.httpOnly, true);
  assert.equal(options.secure, true);
  assert.equal(options.sameSite, 'lax');
  assert.equal(options.path, '/');
});
