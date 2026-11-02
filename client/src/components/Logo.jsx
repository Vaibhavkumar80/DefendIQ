import { useId } from 'react';

const SHIELD = 'M50 4 L92 20 V62 C92 90 70 108 50 116 C30 108 8 90 8 62 V20 Z';

// Vector re-creation of the DefendIQ shield + eagle mark so it can be animated.
// The original raster logo is kept in /public/logo-original.jpg.
export default function Logo({ size = 40, text = true, animated = true, className = '' }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <span className={`logo ${animated ? 'logo-anim' : ''} ${className}`} aria-label="DefendIQ">
      <svg width={size} height={size * 1.16} viewBox="0 0 100 116" role="img" aria-hidden="true">
        <defs>
          <linearGradient id={`g${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#4dffd9" /><stop offset="1" stopColor="#10c79f" /></linearGradient>
          <linearGradient id={`s${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset=".5" stopColor="#fff" stopOpacity=".75" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
          <mask id={`m${id}`}>
            <rect width="100" height="116" fill="#fff" />
            <path className="logo-draw" d="M6 26 L50 56 L94 26" stroke="#000" strokeWidth="4.6" fill="none" strokeLinejoin="round" />
            <path className="logo-draw" d="M50 56 V116" stroke="#000" strokeWidth="4.6" fill="none" />
            <path d="M39 49 C40 42 47 39 53 40 L63 39 L58 45 C58 50 55 54 51 57 C45 55 40 53 39 49Z" fill="#000" />
          </mask>
          <clipPath id={`c${id}`}><path d={SHIELD} /></clipPath>
        </defs>
        <g className="logo-shield">
          <path d={SHIELD} fill={`url(#g${id})`} mask={`url(#m${id})`} />
          <g clipPath={`url(#c${id})`} mask={`url(#m${id})`}>
            <rect className="logo-scan" x="0" y="0" width="100" height="18" fill={`url(#s${id})`} />
          </g>
        </g>
      </svg>
      {text && <span className="logo-text">Defend<b>IQ</b></span>}
    </span>
  );
}

export function HeroShield() {
  return (
    <div className="hero-shield" aria-hidden="true">
      <div className="plat" />
      <div className="orbit" /><div className="orbit o2" />
      <Logo size={190} text={false} />
      <div className="float-chip fc1"><span className="ico sm c-teal" style={{ '--c': '25,240,195' }}>✓</span><div>Threat Blocked<small>Malicious link detected</small></div></div>
      <div className="float-chip fc2"><span className="ico sm" style={{ '--c': '25,240,195' }}>✉</span><div>Safe<small>Email is clean</small></div></div>
    </div>
  );
}
