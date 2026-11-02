import test from 'node:test';
import assert from 'node:assert/strict';
import { isCurrentSession } from '../src/middleware/auth.js';

test('session tokens are accepted only for the current user session version', () => {
  const user = { sessionVersion: 3 };
  assert.equal(isCurrentSession({ sv: 3 }, user), true);
  assert.equal(isCurrentSession({ sv: 2 }, user), false);
  assert.equal(isCurrentSession({}, user), false);
  assert.equal(isCurrentSession({ sv: '3' }, user), false);
});
