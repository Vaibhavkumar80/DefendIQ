import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

test('production configuration defaults CORS to the deployed Vercel origin', () => {
  const moduleUrl = new URL('../src/config.js', import.meta.url).href;
  const script = `import { config } from ${JSON.stringify(moduleUrl)}; console.log(config.clientOrigin);`;
  const env = { ...process.env, NODE_ENV: 'production', JWT_SECRET: 'test-secret-value-not-used-outside-tests-123456' };
  delete env.CLIENT_ORIGIN;
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8', env });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), 'https://defend-iq-sable.vercel.app');
});

test('production configuration honors an explicit frontend origin', () => {
  const moduleUrl = new URL('../src/config.js', import.meta.url).href;
  const script = `import { config } from ${JSON.stringify(moduleUrl)}; console.log(config.clientOrigin);`;
  const env = {
    ...process.env,
    NODE_ENV: 'production',
    JWT_SECRET: 'test-secret-value-not-used-outside-tests-123456',
    CLIENT_ORIGIN: 'https://custom.example',
  };
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8', env });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), 'https://custom.example');
});