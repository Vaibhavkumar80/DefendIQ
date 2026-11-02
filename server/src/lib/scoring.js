export const verdictFromScore = (score) => (score >= 70 ? 'safe' : score >= 40 ? 'suspicious' : 'malicious');

export function statusFromPoints(points, bad, warn) {
  return points >= bad ? 'bad' : points >= warn ? 'warn' : 'ok';
}

export function pickPrimaryThreat(cats, risk) {
  if (risk < 30) return 'none';
  const entries = Object.entries(cats).map(([k, v]) => [k, v.points]).sort((a, b) => b[1] - a[1]);
  return entries[0][1] > 0 ? entries[0][0] : 'other';
}
