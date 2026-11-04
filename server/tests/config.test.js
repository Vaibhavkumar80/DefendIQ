import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

test('production configuration uses the deployed Vercel origin when unset', () => {
  const moduleUrl = new URL('../src/config.js', import.meta.url).href;
  const script = `import { config } from ${JSON.stringify(moduleUrl)}; console.log(config.clientOrigin);`;
  const env = { ...process.env, NODE_ENV: 'production', JWT_SECRET: 'test-secret-value-not-used-outside-tests-123456' };
  delete env.CLIENT_ORIGIN;
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8', env });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), 'https://defend-iq-sable.vercel.app');
});

test('production configuration ignores a stale localhost origin and allows Vercel', () => {
  const moduleUrl = new URL('../src/config.js', import.meta.url).href;
  const script = `import { config } from ${JSON.stringify(moduleUrl)}; console.log(JSON.stringify({ clientOrigin: config.clientOrigin, allowedClientOrigins: config.allowedClientOrigins }));`;
  const env = {
    ...process.env,
    NODE_ENV: 'production',
    JWT_SECRET: 'test-secret-value-not-used-outside-tests-123456',
    CLIENT_ORIGIN: 'http://localhost:5173',
  };
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8', env });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), {
    clientOrigin: 'https://defend-iq-sable.vercel.app',
    allowedClientOrigins: ['https://defend-iq-sable.vercel.app'],
  });
});

test('production configuration honors an explicit HTTPS frontend origin', () => {
  const moduleUrl = new URL('../src/config.js', import.meta.url).href;
  const script = `import { config } from ${JSON.stringify(moduleUrl)}; console.log(JSON.stringify({ clientOrigin: config.clientOrigin, allowedClientOrigins: config.allowedClientOrigins }));`;
  const env = {
    ...process.env,
    NODE_ENV: 'production',
    JWT_SECRET: 'test-secret-value-not-used-outside-tests-123456',
    CLIENT_ORIGIN: 'https://custom.example',
  };
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8', env });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), {
    clientOrigin: 'https://custom.example',
    allowedClientOrigins: ['https://defend-iq-sable.vercel.app', 'https://custom.example'],
  });
});