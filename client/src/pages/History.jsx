import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Trash2, ShieldCheck } from 'lucide-react';
import { PageHead, VerdictBadge, Empty, Skel } from '../components/ui.jsx';
import { useToast } from '../context/Toast.jsx';
import { api } from '../lib/api.js';
import { useApi, useDocumentTitle } from '../lib/hooks.js';
import { fmtDate } from '../lib/format.js';

export default function HistoryPage() {
  useDocumentTitle('History');
  const [sp, setSp] = useSearchParams();
  const nav = useNavigate();
  const toast = useToast();
  const [q, setQ] = useState(sp.get('q') || '');
  const [verdict, setVerdict] = useState('');
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const [dq, setDq] = useState(q);
  useEffect(() => { const t = setTimeout(() => { setDq(q); setPage(1); }, 300); return () => clearTimeout(t); }, [q]);
  const qs = new URLSearchParams({ page, limit: 10, ...(dq && { q: dq }), ...(verdict && { verdict }), ...(type && { type }) }).toString();
  const { data, loading, error, reload } = useApi(`/scans?${qs}`);
  async function clearAll() {
    if (!window.confirm('Delete ALL scan history? This cannot be undone.')) return;
    try { await api.del('/scans'); toast.success('History cleared.'); setPage(1); reload(); } catch (e) { toast.error(e.message); }
  }
  async function del(id, e) { e.stopPropagation(); try { await api.del(`/scans/${id}`); toast.success('Scan deleted.'); reload(); } catch (x) { toast.error(x.message); } }
  return (
    <>
      <PageHead eyebrow="Scan history" title="Your Scan History" right={<button className="btn btn-danger btn-sm" onClick={clearAll}><Trash2 size={14} /> Clear all</button>}>Review every URL and email you analysed.</PageHead>
      <div className="card c-blue">
        <div className="row wrap" style={{ marginBottom: 16 }}>
          <div className="field grow" style={{ minHeight: 42, minWidth: 220 }}><Search size={16} /><input value={q} onChange={(e) => { setQ(e.target.value); if (sp.get('q')) setSp({}, { replace: true }); }} placeholder="Search by URL, sender or subject…" aria-label="Search history" /></div>
          <div className="field" style={{ minHeight: 42 }}><select value={verdict} onChange={(e) => { setVerdict(e.target.value); setPage(1); }} aria-label="Filter by status"><option value="">All statuses</option><option value="safe">Safe</option><option value="suspicious">Suspicious</option><option value="malicious">Malicious</option></select></div>
          <div className="field" style={{ minHeight: 42 }}><select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }} aria-label="Filter by type"><option value="">URL + Email</option><option value="url">URL</option><option value="email">Email</option></select></div>
        </div>
        {error && <div className="banner malicious">{error.message}</div>}
        {loading && !data ? <Skel h={240} /> : data?.items.length ? (
          <div className="table-wrap"><table className="table"><thead><tr><th>Target</th><th>Type</th><th>Status</th><th>Safety Score</th><th>When</th><th /></tr></thead><tbody>
            {data.items.map((s) => <tr key={s.id} className="click" onClick={() => nav(`/scan/${s.id}`)}><td><div className="target"><span>{s.target}</span></div></td><td>{s.type === 'url' ? 'URL' : 'Email'}</td><td><VerdictBadge verdict={s.verdict} /></td><td>{s.score}/100</td><td className="muted">{fmtDate(s.createdAt)}</td><td><button className="icon-btn" style={{ width: 34, height: 34 }} onClick={(e) => del(s.id, e)} aria-label="Delete scan"><Trash2 size={15} /></button></td></tr>)}
          </tbody></table></div>
        ) : <Empty icon={ShieldCheck} title={dq || verdict || type ? 'No matching scans' : 'No scans yet'}>{!dq && !verdict && !type && <Link to="/scan" className="btn btn-primary btn-sm" style={{ marginTop: 8 }}>Run a scan</Link>}</Empty>}
        {data && data.pages > 1 && <div className="pagination"><button className="btn btn-plain btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button><span className="muted">Page {data.page} of {data.pages} • {data.total} scans</span><button className="btn btn-plain btn-sm" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next</button></div>}
      </div>
    </>
  );
}
