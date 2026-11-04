const GOOGLE_ISSUERS = new Set(['accounts.google.com', 'https://accounts.google.com']);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseGoogleIdentity(info, clientId, now = Date.now()) {
  if (!info || !clientId) return null;

  const email = typeof info.email === 'string' ? info.email.trim().toLowerCase() : '';
  const expiresAt = Number(info.exp) * 1000;
  if (
    info.aud !== clientId
    || !GOOGLE_ISSUERS.has(info.iss)
    || !Number.isFinite(expiresAt)
    || expiresAt <= now
    || (info.email_verified !== true && info.email_verified !== 'true')
    || typeof info.sub !== 'string'
    || !info.sub.trim()
    || email.length > 254
    || !EMAIL_PATTERN.test(email)
  ) return null;

  return {
    sub: info.sub,
    email,
    name: typeof info.name === 'string' ? info.name.trim().slice(0, 60) : '',
  };
}