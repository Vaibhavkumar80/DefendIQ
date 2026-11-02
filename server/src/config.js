import crypto from 'node:crypto';

const env = process.env;
const isProd = env.NODE_ENV === 'production';

let jwtSecret = env.JWT_SECRET;
if (!jwtSecret || jwtSecret.length < 32) {
  if (isProd) throw new Error('JWT_SECRET must be set to a random string of at least 32 characters in production.');
  jwtSecret = crypto.randomBytes(48).toString('hex');
  console.warn('[config] JWT_SECRET missing/short - using a temporary secret (sessions reset on every restart). Set it in server/.env');
}

export const config = {
  env: env.NODE_ENV || 'development',
  isProd,
  port: Number(env.PORT) || 5000,
  mongoUri: env.MONGODB_URI || 'mongodb://127.0.0.1:27017/defendiq',
  jwtSecret,
  clientOrigin: env.CLIENT_ORIGIN || 'http://localhost:5173',
  trustProxy: env.TRUST_PROXY === '1' || env.TRUST_PROXY === 'true',
  googleClientId: env.GOOGLE_CLIENT_ID || '',
  ollama: { url: env.OLLAMA_URL || 'http://127.0.0.1:11434', model: env.OLLAMA_MODEL || '' },
  smtp: { host: env.SMTP_HOST || '', port: Number(env.SMTP_PORT) || 587, user: env.SMTP_USER || '', pass: env.SMTP_PASS || '', from: env.SMTP_FROM || 'DefendIQ <no-reply@localhost>' },
};
