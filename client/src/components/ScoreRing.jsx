import { useEffect, useId, useState } from 'react';
import { CountUp } from './Motion.jsx';

export const scoreColor = (v) => (v == null ? ['#5b6a91', '#5b6a91'] : v >= 70 ? ['#19f0c3', '#22d3ee'] : v >= 40 ? ['#fbbf24', '#fb923c'] : ['#ff5470', '#ec4899']);

export default function ScoreRing({ value, size = 170, label, sub, max = 100 }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const [drawn, setDrawn] = useState(0);
  const stroke = Math.max(9, size * 0.07);
  const r = (size - stroke) / 2 - 2;
  const C = 2 * Math.PI * r;
  const [c1, c2] = scoreColor(value);
  useEffect(() => { const t = requestAnimationFrame(() => setDrawn(value == null ? 0 : value / max)); return () => cancelAnimationFrame(t); }, [value, max]);
  return (
    <div style={{ width: size, textAlign: 'center', flex: 'none' }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg className="ring-svg" width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)', filter: `drop-shadow(0 0 10px ${c1}66)` }}>
          <defs><linearGradient id={`rg${id}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={c1} /><stop offset="1" stopColor={c2} /></linearGradient></defs>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(147,161,196,.18)" strokeWidth={stroke} />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`url(#rg${id})`} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - drawn)} style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(.2,.8,.2,1)' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeContent: 'center' }}>
          <div style={{ fontSize: size * 0.27, fontWeight: 800, lineHeight: 1 }}>{value == null ? '--' : <CountUp value={value} />}</div>
          <div className="muted" style={{ fontSize: size * 0.085 }}>/{max}</div>
        </div>
      </div>
      {label && <div style={{ marginTop: 8, fontWeight: 700, color: c1 }}>{label}</div>}
      {sub && <div className="muted" style={{ fontSize: '.76rem', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}
