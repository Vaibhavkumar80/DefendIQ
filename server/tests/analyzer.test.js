import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeUrl } from '../src/services/urlAnalyzer.js';
import { analyzeEmail } from '../src/services/emailAnalyzer.js';

const url = (u) => analyzeUrl(u, { deep: false });

test('well-known safe URLs score safe', async () => {
  for (const u of ['https://example.com', 'https://accounts.google.com/signin', 'https://github.com/user/repo', 'https://en.wikipedia.org/wiki/Phishing']) {
    const r = await url(u);
    assert.equal(r.verdict, 'safe', `${u} -> ${r.verdict} (${r.score})`);
  }
});

test('obvious phishing URLs are malicious', async () => {
  for (const u of ['http://paypa1-secure-login.xyz/verify/account', 'https://paypal.com.account-verify.xyz/login', 'http://secure-update-appleid.top/signin']) {
    const r = await url(u);
    assert.equal(r.verdict, 'malicious', `${u} -> ${r.verdict} (${r.score})`);
  }
});

test('typosquat and raw-IP links are at least suspicious', async () => {
  for (const u of ['https://microsft.com', 'http://192.168.1.1/login', 'https://bit.ly/abc123']) {
    const r = await url(u);
    assert.notEqual(r.verdict, 'safe', `${u} -> ${r.verdict} (${r.score})`);
  }
});

test('threat feed seed list forces malicious', async () => {
  const r = await url('https://testsafebrowsing.appspot.com/s/phishing.html');
  assert.equal(r.verdict, 'malicious');
  assert.equal(r.score, 0);
});

test('non-http schemes and junk are rejected', async () => {
  for (const u of ['javascript:alert(1)', 'ftp://example.com', 'not a url', '', 'localhost']) {
    await assert.rejects(() => url(u), `${u} should throw`);
  }
});

test('phishing email is flagged malicious', async () => {
  const raw = `From: "PayPal Support" <service@paypa1-help.top>
Reply-To: collect@mailbox-reply.ru
Subject: URGENT: Your account will be suspended
Authentication-Results: mx.example; spf=fail; dkim=fail; dmarc=fail

Dear customer, we noticed unusual activity. Verify your account immediately and confirm your password within 24 hours.
<a href="http://paypa1-help.top/login">https://www.paypal.com/verify</a>
See attached Invoice_2026.exe`;
  const r = await analyzeEmail(raw, { deep: false });
  assert.equal(r.verdict, 'malicious', `score ${r.score}`);
  assert.ok(r.findings.length >= 5);
});

test('benign email is safe', async () => {
  const raw = `From: Priya <priya@company-example.com>
Subject: Lunch tomorrow?

Hi Rahul, are we still on for lunch tomorrow at 1pm? Let me know. Thanks, Priya`;
  const r = await analyzeEmail(raw, { deep: false });
  assert.equal(r.verdict, 'safe');
});
