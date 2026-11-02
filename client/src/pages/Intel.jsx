import { Link } from 'react-router-dom';
import { Globe, RefreshCw, Database, CheckCircle2, XCircle, Brain } from 'lucide-react';
import { PageHead, Skel, VerdictBadge, Empty } from '../components/ui.jsx';
import { Donut } from '../components/Charts.jsx';
import { Reveal } from '../components/Motion.jsx';
import { useToast } from '../context/Toast.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../lib/api.js';
import { useApi, useDocumentTitle } from '../lib/hooks.js';
import { fmtDate, timeAgo } from '../lib/format.js';
import { useState } from 'react';

export default function Intel() {
  useDocumentTitle('Threat Intelligence');
  const toast = useToast();
  const { user } = useAuth();
  const { data, loading, reload } = useApi('/intel/overview');
  const [busy, setBusy] = useState(false);
  async function refresh() {
    setBusy(true);
    try { await api.post('/intel/refresh'); toast.success('Threat feeds refreshed.'); reload(); } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  }
  const col = { phishing: '#ec4899', malware: '#fb923c', suspicious: '#4f7cff', other: '#22d3ee' };
  const th = data?.community.threats.filter((t) => t.type !== 'none') || [];
  return (
    <>
      <PageHead eyebrow="Threat Intelligence" title="Know what you're up against" right={<button className="btn btn-ghost btn-sm" onClick={refresh} disabled={busy}><RefreshCw size={14} className={busy ? 'spin' : ''} /> {busy ? 'Refreshing…' : 'Refresh feeds'}</button>}>Live feed status, trends from this installation and a field guide to common attacks.</PageHead>
      <div className="grid g2">
        <div className="card c-teal">
          <div className="card-title"><span className="ico sm"><Database size={18} /></span>Threat feeds</div>
          {loading && !data ? <Skel h={120} /> : <>
            <div className="row between"><div><div className="bignum">{data.feeds.entries.toLocaleString()}</div><div className="stat-lbl">known-bad URLs loaded</div></div><div className="muted" style={{ fontSize: '.8rem', textAlign: 'right' }}>{data.feeds.updatedAt ? `Updated ${timeAgo(data.feeds.updatedAt)}` : 'Waiting for first refresh…'}</div></div>
            <div style={{ marginTop: 14 }}>{data.feeds.sources.map((s) => <div key={s.name} className="list-item">{s.ok ? <CheckCircle2 size={18} color="var(--accent)" /> : <XCircle size={18} color="var(--red)" />}<div><div className="t">{s.name}</div>{!s.ok && <small>{s.error}</small>}</div><span className="time">{s.count.toLocaleString()} entries</span></div>)}</div>
            <p className="legal" style={{ marginTop: 10 }}>Feeds are community-maintained and refreshed every 6 hours. Offline? Only the built-in test list is used. Local AI explanations: <b>{data.localAI ? 'on' : 'off'}</b>.</p>
          </>}
        </div>
        <div className="card c-purple">
          <div className="card-title"><span className="ico sm"><Globe size={18} /></span>Last 30 days on this installation</div>
          {loading && !data ? <Skel h={150} /> : th.length ? <div className="row wrap" style={{ gap: 24 }}><Donut data={th.map((t) => ({ label: t.type, value: t.count, color: col[t.type] || '#22d3ee' }))} centerLabel="Threats" /><div className="legend">{th.map((t) => <div key={t.type}><i style={{ background: col[t.type] || '#22d3ee' }} />{t.type}<span>{t.count}</span></div>)}</div></div> : <Empty icon={Globe} title="No threats recorded yet">Trends appear as people scan.</Empty>}
          {data?.community.topImpersonations.length > 0 && <><div className="card-title" style={{ marginTop: 18 }}>Most-flagged impersonations</div>{data.community.topImpersonations.slice(0, 5).map((x) => <div className="list-item" key={x.title}><span className="t">{x.title}</span><span className="time">{x.count}×</span></div>)}</>}
        </div>
      </div>
      {user && data?.mine.length > 0 && <div className="card c-orange mt"><div className="card-title">Your latest risky findings</div>{data.mine.map((s) => <Link key={s.id} to={`/scan/${s.id}`} className="list-item"><VerdictBadge verdict={s.verdict} /><span className="t">{s.label}</span><span className="time">{timeAgo(s.createdAt)}</span></Link>)}</div>}
      <h2 className="h2 mt" style={{ margin: '34px 0 16px' }}>Attack field guide</h2>
      <div className="grid g3">
        {data?.types.map((t, i) => <Reveal key={t.id} delay={i * 60}><div className="card hover c-blue" style={{ height: '100%' }}><h3 className="h3">{t.title}</h3><p className="muted" style={{ fontSize: '.88rem', margin: '8px 0' }}>{t.desc}</p><div style={{ fontSize: '.8rem' }}><b>Signs:</b> {t.indicators.join(' • ')}</div><div style={{ fontSize: '.8rem', marginTop: 6, color: 'var(--accent)' }}><b>Defence:</b> {t.defense}</div></div></Reveal>)}
      </div>
    </>
  );
}
