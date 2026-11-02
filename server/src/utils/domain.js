const MULTI = new Set(['co.uk', 'org.uk', 'ac.uk', 'gov.uk', 'com.au', 'net.au', 'org.au', 'co.in', 'net.in', 'org.in', 'gov.in', 'ac.in', 'co.jp', 'co.nz', 'co.za', 'com.br', 'com.cn', 'com.mx', 'com.sg', 'com.tr', 'com.pk', 'com.bd', 'com.ng', 'co.id', 'co.kr', 'com.hk', 'com.tw', 'com.ar', 'com.ua']);

export function splitHost(host) {
  const h = String(host).toLowerCase().replace(/\.$/, '');
  const labels = h.split('.');
  if (labels.length < 2) return { host: h, labels, tld: h, sld: h, registrable: h, subdomains: [] };
  const take = MULTI.has(labels.slice(-2).join('.')) && labels.length >= 3 ? 3 : 2;
  const reg = labels.slice(-take);
  return { host: h, labels, tld: labels[labels.length - 1], sld: reg[0], registrable: reg.join('.'), subdomains: labels.slice(0, labels.length - take) };
}

export const hostMatches = (host, domain) => host === domain || host.endsWith('.' + domain);
