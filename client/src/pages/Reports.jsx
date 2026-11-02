import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Printer, FileJson, FileText } from 'lucide-react';
import { PageHead, Skel, VerdictBadge, Empty } from '../components/ui.jsx';
import { Donut, LineChart } from '../components/Charts.jsx';
import { api } from '../lib/api.js';
import { useApi, useDocumentTitle } from '../lib/hooks.js';
import { fmtDate, shortDay } from '../lib/format.js';

export default function Reports() {
  useDocumentTitle('Reports');
  const [days, setDays] = useState(30);
  const { data: r, loading, error } = useApi(`/reports/summary?days=${days}`);
  const json = () => { const blob = new Blob([JSON.stringify(r, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `defendiq-report-${days}d.json`; a.click(); URL.revokeObjectURL(a.href); };
  const col = { phishing: '#ec4899', malware: '#fb923c', suspicious: '#4f7cff', other: '#22d3ee' };
  return (
    <>
      <PageHead eyebrow="Reports" title="Security Report" right={<div className="row wrap no-print">
        <div className="field" style={{ minHeight: 40 }}><select value={days} onChange={(e) => setDays(Number(e.target.value))} aria-label="Report period"><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option><option value={365}>Last 12 months</option></select></div>
        <a className="btn btn-ghost btn-sm" href={`${api.base}/reports/export.csv?days=${days}`}><Download size={14} /> CSV</a>
        <button className="btn btn-plain btn-sm" onClick={json} disabled={!r}><FileJson size={14} /> JSON</button>
        <button className="btn btn-primary btn-sm" onClick={() => window.print()}><Printer size={14} /> Print / PDF</button></div>}>
        {r ? `Generated ${fmtDate(r.generatedAt)} for ${r.user.name}` : 'Summary of your scanning activity.'}
      </PageHead>
      {error && <div className="banner malicious">{error.message}</div>}
      {loading && !r ? <Skel h={300} /> : r && (r.totals.scans === 0 ? <div className="card"><Empty icon={FileText} title="No scans in this period"><Link className="btn btn-primary btn-sm" to="/scan" style={{ marginTop: 8 }}>Run a scan</Link></Empty></div> : (
        <div style={{ display: 'grid', gap: 20 }}>
          <div className="grid g4">{[['Total scans', r.totals.scans, 'c-blue'], ['Safe', r.totals.safe, 'c-teal'], ['Suspicious', r.totals.suspicious, 'c-orange'], ['Malicious', r.totals.malicious, 'c-red']].map(([l, v, c]) => <div key={l} className={`card ${c}`}><div className="bignum">{v}</div><div className="stat-lbl">{l}</div></div>)}</div>
          <div className="grid g2">
            <div className="card c-purple"><div className="card-title">Scans &amp; threats over time</div><LineChart labels={r.timeline.map((t) => shortDay(t.date))} series={[{ name: 'Scans', color: '#4f7cff', values: r.timeline.map((t) => t.scans) }, { name: 'Threats', color: '#ec4899', values: r.timeline.map((t) => t.threats) }]} /></div>
            <div className="card c-teal"><div className="card-title">Threat types</div><div className="row wrap" style={{ gap: 24 }}><Donut data={r.byThreat.map((t) => ({ label: t.type, value: t.count, color: col[t.type] }))} centerLabel="Flagged" /><div className="legend">{r.byThreat.map((t) => <div key={t.type}><i style={{ background: col[t.type] }} />{t.type}<span>{t.count}</span></div>)}<div><i style={{ background: 'var(--muted)' }} />Average safety<span>{r.averageScore ?? '-'}/100</span></div><div><i style={{ background: 'var(--muted)' }} />URLs / emails<span>{r.totals.urls} / {r.totals.emails}</span></div></div></div></div>
          </div>
          <div className="grid g2">
            <div className="card c-orange"><div className="card-title">Riskiest items</div>{r.topRisky.length ? r.topRisky.map((s) => <Link key={s.id} to={`/scan/${s.id}`} className="list-item"><VerdictBadge verdict={s.verdict} /><div style={{ minWidth: 0 }}><div className="t">{s.label}</div><small>{fmtDate(s.createdAt)}</small></div><span className="time">{s.score}/100</span></Link>) : <p className="muted">Nothing risky - great job.</p>}</div>
            <div className="card c-blue"><div className="card-title">Most common warning signs</div>{r.topFindings.length ? r.topFindings.map((f) => <div className="list-item" key={f.title}><span className="t">{f.title}</span><span className="time">{f.count}×</span></div>) : <p className="muted">No warning signs recorded.</p>}</div>
          </div>
        </div>
      ))}
    </>
  );
}
