import test from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'production';
process.env.JWT_SECRET = 'test-only-secret-that-is-long-enough';
process.env.SMTP_HOST = '';

const { sendMail } = await import('../src/services/mailer.js');

test('password reset mail fails explicitly when SMTP is not configured and does not log the token', async () => {
  const token = 'test-reset-token-must-not-appear-in-logs';
  const logged = [];
  const originalLog = console.log;
  console.log = (...args) => logged.push(args.join(' '));
  try {
    await assert.rejects(
      sendMail({ to: 'user@example.test', subject: 'Reset password', text: token }),
      (error) => error.status === 503 && !error.message.includes(token),
    );
    assert.deepEqual(logged, []);
  } finally {
    console.log = originalLog;
  }
});
