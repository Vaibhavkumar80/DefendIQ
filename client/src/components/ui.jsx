import { useEffect } from 'react';
import { X } from 'lucide-react';
import { verdictLabel } from '../lib/format.js';

export const VerdictBadge = ({ verdict }) => <span className={`badge ${verdict}`}>{verdictLabel[verdict] || verdict}</span>;
export const Skel = ({ h = 20, w = '100%', style }) => <div className="skel" style={{ height: h, width: w, ...style }} />;

export function Empty({ icon: Icon, title, children }) {
  return <div className="empty">{Icon && <Icon size={42} />}<h3 className="h3" style={{ color: 'var(--text)' }}>{title}</h3><div style={{ marginTop: 6 }}>{children}</div></div>;
}

export function Modal({ open, onClose, title, children, width }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal-bg" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="card c-purple modal" role="dialog" aria-modal="true" aria-label={title} style={width ? { width } : undefined}>
        <div className="row between" style={{ marginBottom: 14 }}>
          <h3 className="h3">{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function PageHead({ eyebrow, title, children, right }) {
  return (
    <div className="row between wrap mb" style={{ alignItems: 'flex-end' }}>
      <div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h1 className="h2" style={{ marginTop: 6 }}>{title}</h1>{children && <p className="muted" style={{ marginTop: 8, maxWidth: 620 }}>{children}</p>}</div>
      {right}
    </div>
  );
}

export function FieldError({ error }) { return error ? <div className="ferr" role="alert">{error}</div> : null; }
