import test from 'node:test';
import assert from 'node:assert/strict';
import { parseGoogleIdentity } from '../src/services/googleIdentity.js';

const now = Date.UTC(2026, 10, 4);
const validIdentity = {
  aud: 'web-client-id',
  iss: 'https://accounts.google.com',
  exp: String(Math.floor(now / 1000) + 60),
  email_verified: 'true',
  sub: 'google-subject',
  email: '  USER@example.com ',
  name: 'User Example',
};

test('Google identity accepts a verified, current token for this client', () => {
  assert.deepEqual(parseGoogleIdentity(validIdentity, 'web-client-id', now), {
    sub: 'google-subject',
    email: 'user@example.com',
    name: 'User Example',
  });
});

test('Google identity rejects invalid audience, issuer, expiration, email, and subject', () => {
  for (const [field, value] of [
    ['aud', 'other-client'],
    ['iss', 'https://attacker.example'],
    ['exp', String(Math.floor(now / 1000) - 1)],
    ['email_verified', 'false'],
    ['email', 'not-an-email'],
    ['sub', ''],
  ]) {
    assert.equal(parseGoogleIdentity({ ...validIdentity, [field]: value }, 'web-client-id', now), null, field);
  }
});

test('Google identity rejects missing client configuration and expired tokens', () => {
  assert.equal(parseGoogleIdentity(validIdentity, '', now), null);
  assert.equal(parseGoogleIdentity(validIdentity, 'web-client-id', Date.UTC(2026, 10, 5)), null);
});