import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, ShieldX, ShieldAlert, Info, Check, Trash2 } from 'lucide-react';
import { PageHead, Empty, Skel } from '../components/ui.jsx';
import { useToast } from '../context/Toast.jsx';
import { api } from '../lib/api.js';
import { useApi, useDocumentTitle } from '../lib/hooks.js';
import { timeAgo } from '../lib/format.js';

const META = { threat: [ShieldX, 'var(--red)', '255,84,112'], suspicious: [ShieldAlert, 'var(--amber)', '251,191,36'], info: [Info, 'var(--cyan)', '34,211,238'], system: [Info, 'var(--accent)', '25,240,195'] };

export default function Alerts() {
  useDocumentTitle('Alerts');
  const toast = useToast();
  const [unread, setUnread] = useState(false);
  const { data, loading, reload } = useApi(`/alerts?limit=100${unread ? '&unread=1' : ''}`);
  const act = async (fn, msg) => { try { await fn(); if (msg) toast.success(msg); reload(); } catch (e) { toast.error(e.message); } };
  return (
    <>
      <PageHead eyebrow="Alerts" title="Security Alerts" right={<div className="row wrap"><label className="check"><input type="checkbox" checked={unread} onChange={(e) => setUnread(e.target.checked)} />Unread only</label><button className="btn btn-plain btn-sm" onClick={() => act(() => api.post('/alerts/read-all'), 'All alerts marked as read.')}><Check size={14} /> Mark all read</button><button className="btn btn-danger btn-sm" onClick={() => window.confirm('Delete all alerts?') && act(() => api.del('/alerts'), 'Alerts cleared.')}><Trash2 size={14} /> Clear</button></div>}>Alerts are created automatically when a scan finds something risky. Adjust the threshold in Settings.</PageHead>
      <div className="card c-orange">
        {loading && !data ? <Skel h={200} /> : data?.items.length ? data.items.map((a) => {
          const [I, c, rgb] = META[a.type] || META.info;
          return (
            <div key={a.id} className="list-item" style={{ opacity: a.read ? 0.65 : 1 }}>
              <span className="ico sm" style={{ '--c': rgb }}><I size={17} color={c} /></span>
              <div style={{ minWidth: 0, flex: 1 }}><div className="t">{a.title}{!a.read && <span className="badge bad" style={{ marginLeft: 8, padding: '0 8px' }}>new</span>}</div><small style={{ wordBreak: 'normal' }}>{a.message}</small>{a.scan && <Link to={`/scan/${a.scan}`} style={{ color: 'var(--accent)', fontSize: '.78rem' }}>View scan report →</Link>}</div>
              <span className="time">{timeAgo(a.createdAt)}</span>
              {!a.read && <button className="icon-btn" style={{ width: 34, height: 34 }} aria-label="Mark as read" onClick={() => act(() => api.patch(`/alerts/${a.id}/read`))}><Check size={15} /></button>}
              <button className="icon-btn" style={{ width: 34, height: 34 }} aria-label="Delete alert" onClick={() => act(() => api.del(`/alerts/${a.id}`))}><Trash2 size={15} /></button>
            </div>
          );
        }) : <Empty icon={Bell} title="You're all clear">No alerts to show.</Empty>}
      </div>
    </>
  );
}
