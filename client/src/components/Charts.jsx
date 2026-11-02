import { useId, useState } from 'react';

function smooth(pts, lo, hi) {
  if (pts.length === 1) return `M${pts[0][0]},${pts[0][1]}`;
  const cl = (v) => Math.min(hi, Math.max(lo, v));
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    d += ` C${p1[0] + (p2[0] - p0[0]) / 6},${cl(p1[1] + (p2[1] - p0[1]) / 6)} ${p2[0] - (p3[0] - p1[0]) / 6},${cl(p2[1] - (p3[1] - p1[1]) / 6)} ${p2[0]},${p2[1]}`;
  }
  return d;
}

export function LineChart({ labels, series, height = 230 }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const [hover, setHover] = useState(null);
  const W = 560, H = height, P = { l: 34, r: 14, t: 14, b: 28 };
  const rawMax = Math.max(4, ...series.flatMap((s) => s.values));
  const step = rawMax <= 10 ? 2 : rawMax <= 40 ? 10 : rawMax <= 100 ? 20 : Math.ceil(rawMax / 4 / 50) * 50;
  const max = Math.ceil(rawMax / step) * step;
  const n = labels.length;
  const x = (i) => P.l + (n < 2 ? (W - P.l - P.r) / 2 : (i * (W - P.l - P.r)) / (n - 1));
  const y = (v) => H - P.b - (v / max) * (H - P.t - P.b);
  const ticks = Array.from({ length: max / step + 1 }, (_, i) => i * step);
  const every = Math.ceil(n / 7);
  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    setHover(Math.max(0, Math.min(n - 1, Math.round(((px - P.l) / (W - P.l - P.r)) * (n - 1)))));
  };
  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" onMouseMove={onMove} onMouseLeave={() => setHover(null)} style={{ display: 'block', overflow: 'visible' }} role="img" aria-label="Activity chart">
        <defs>{series.map((s, i) => <linearGradient key={i} id={`a${id}${i}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={s.color} stopOpacity=".35" /><stop offset="1" stopColor={s.color} stopOpacity="0" /></linearGradient>)}</defs>
        {ticks.map((t) => (<g key={t}><line x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} stroke="rgba(147,161,196,.18)" strokeDasharray="3 5" /><text x={P.l - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--muted)">{t}</text></g>))}
        {labels.map((l, i) => (i % every === 0 ? <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--muted)">{l}</text> : null))}
        {series.map((s, si) => {
          const pts = s.values.map((v, i) => [x(i), y(v)]);
          const d = smooth(pts, P.t, H - P.b);
          return (
            <g key={si}>
              <path className="area-in" d={`${d} L${pts[pts.length - 1][0]},${H - P.b} L${pts[0][0]},${H - P.b} Z`} fill={`url(#a${id}${si})`} />
              <path className="line-draw" pathLength="1" d={d} fill="none" stroke={s.color} strokeWidth="2.4" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 5px ${s.color})`, animationDelay: `${si * 0.25}s` }} />
              {hover != null && <circle cx={pts[hover][0]} cy={pts[hover][1]} r="5" fill={s.color} stroke="var(--bg)" strokeWidth="2" />}
            </g>
          );
        })}
        {hover != null && <line x1={x(hover)} x2={x(hover)} y1={P.t} y2={H - P.b} stroke="rgba(147,161,196,.4)" />}
      </svg>
      {hover != null && (
        <div className="chart-tip" style={{ left: `${(x(hover) / W) * 100}%`, top: 24 }}>
          <b>{labels[hover]}</b>
          {series.map((s) => <div key={s.name} style={{ color: s.color }}>{s.name}: {s.values[hover]}</div>)}
        </div>
      )}
    </div>
  );
}

export function Donut({ data, size = 150, centerLabel = 'Total' }) {
  const total = data.reduce((a, d) => a + d.value, 0);
  const r = 48, C = 2 * Math.PI * r;
  let off = 0;
  return (
    <div style={{ position: 'relative', width: size, height: size, flex: 'none' }}>
      <svg viewBox="0 0 120 120" width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(147,161,196,.16)" strokeWidth="14" />
        {total > 0 && data.map((d, i) => {
          const len = (d.value / total) * C;
          const el = <circle key={i} className="donut-seg" cx="60" cy="60" r={r} fill="none" stroke={d.color} strokeWidth="14" strokeDasharray={`${Math.max(0, len - 2)} ${C - Math.max(0, len - 2)}`} strokeDashoffset={-off} style={{ '--c': C, animationDelay: `${i * 0.12}s` }} />;
          off += len; return el;
        })}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeContent: 'center', textAlign: 'center' }}>
        <div style={{ fontSize: size * 0.2, fontWeight: 800, lineHeight: 1 }}>{total}</div>
        <div className="muted" style={{ fontSize: '.72rem' }}>{centerLabel}</div>
      </div>
    </div>
  );
}
