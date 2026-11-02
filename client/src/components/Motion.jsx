import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '../lib/hooks.js';

function useInView(once = true) {
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (!('IntersectionObserver' in window) || prefersReducedMotion()) { setSeen(true); return undefined; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); if (once) io.disconnect(); } }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [once]);
  return [ref, seen];
}

export function Reveal({ as: Tag = 'div', delay = 0, className = '', children, ...rest }) {
  const [ref, seen] = useInView();
  return <Tag ref={ref} className={`reveal ${seen ? 'in' : ''} ${className}`} style={{ transitionDelay: `${delay}ms`, ...rest.style }} {...rest}>{children}</Tag>;
}

export function CountUp({ value = 0, duration = 1300, decimals = 0, prefix = '', suffix = '' }) {
  const [ref, seen] = useInView();
  const [n, setN] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    if (!seen) return undefined;
    if (prefersReducedMotion()) { setN(value); return undefined; }
    let raf; const start = performance.now(); const a = from.current;
    const tick = (t) => {
      const p = Math.min(1, (t - start) / duration);
      const v = a + (value - a) * (1 - Math.pow(1 - p, 3));
      setN(v); from.current = v;
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [seen, value, duration]);
  const shown = decimals ? n.toFixed(decimals) : Math.round(n).toLocaleString();
  return <span ref={ref}>{prefix}{shown}{suffix}</span>;
}
