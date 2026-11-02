import dns from 'node:dns/promises';
import net from 'node:net';
import tls from 'node:tls';

export function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19)) || a >= 224;
  }
  if (net.isIPv6(ip)) {
    const l = ip.toLowerCase();
    if (l === '::1' || l === '::') return true;
    if (/^f[cd]/.test(l) || /^fe[89ab]/.test(l)) return true;
    if (l.startsWith('::ffff:')) { const rest = l.slice(7); return net.isIPv4(rest) ? isPrivateIp(rest) : true; }
    return false;
  }
  return true; // unknown format: treat as unsafe
}

const withTimeout = (p, ms, label = 'timeout') => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(Object.assign(new Error(label), { code: 'ETIMEOUT' })), ms))]);

export async function resolveHost(host) {
  try {
    if (net.isIP(host)) return { ips: [host] };
    const res = await withTimeout(dns.lookup(host, { all: true }), 4000);
    return { ips: res.map((r) => r.address) };
  } catch (e) {
    return { ips: [], error: e.code || e.message };
  }
}

// TLS handshake only (no HTTP request is made). Connects to an already-validated public IP.
export function getCertInfo(ip, host, ms = 4500) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v) => { if (!done) { done = true; resolve(v); } };
    const socket = tls.connect({ host: ip, port: 443, servername: net.isIP(host) ? undefined : host, rejectUnauthorized: false, timeout: ms }, () => {
      const cert = socket.getPeerCertificate();
      const validTo = cert?.valid_to ? new Date(cert.valid_to) : null;
      const validFrom = cert?.valid_from ? new Date(cert.valid_from) : null;
      finish({
        authorized: socket.authorized,
        authError: socket.authorizationError ? String(socket.authorizationError) : null,
        issuer: cert?.issuer?.O || cert?.issuer?.CN || null,
        subject: cert?.subject?.CN || null,
        validFrom, validTo,
        daysLeft: validTo ? Math.floor((validTo - Date.now()) / 864e5) : null,
        ageDays: validFrom ? Math.floor((Date.now() - validFrom) / 864e5) : null,
      });
      socket.end();
    });
    socket.on('timeout', () => { socket.destroy(); finish({ error: 'timeout' }); });
    socket.on('error', (e) => finish({ error: e.code || e.message }));
  });
}

const ageCache = new Map();
export async function rdapDomainAge(domain) {
  const hit = ageCache.get(domain);
  if (hit && hit.exp > Date.now()) return hit.v;
  let v = null;
  try {
    const r = await fetch(`https://rdap.org/domain/${encodeURIComponent(domain)}`, { signal: AbortSignal.timeout(5000), headers: { accept: 'application/rdap+json' } });
    if (r.ok) {
      const j = await r.json();
      const reg = (j.events || []).find((e) => e.eventAction === 'registration');
      if (reg?.eventDate) v = Math.max(0, Math.floor((Date.now() - new Date(reg.eventDate)) / 864e5));
    }
  } catch { /* RDAP unavailable - treated as unknown */ }
  ageCache.set(domain, { v, exp: Date.now() + 6 * 3600e3 });
  if (ageCache.size > 2000) ageCache.clear();
  return v;
}

export function humanAge(days) {
  if (days == null) return 'Unknown';
  if (days < 30) return `${days} day${days === 1 ? '' : 's'}`;
  if (days < 365) return `${Math.floor(days / 30)} month${Math.floor(days / 30) === 1 ? '' : 's'}`;
  const y = Math.floor(days / 365);
  return `${y} year${y === 1 ? '' : 's'}`;
}
