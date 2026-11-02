import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, BarChart3, Link2, Mail, Globe, ChevronRight, Calendar, Activity, ArrowRight, ShieldAlert, ShieldX, ScanLine, Bug, Brain } from 'lucide-react';
import ScoreRing from '../components/ScoreRing.jsx';
import { LineChart, Donut } from '../components/Charts.jsx';
import { CountUp } from '../components/Motion.jsx';
import Logo from '../components/Logo.jsx';
import { VerdictBadge, Skel, Empty } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useApi, useDocumentTitle } from '../lib/hooks.js';
import { timeAgo, shortDay } from '../lib/format.js';

const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good Morning' : h < 18 ? 'Good Afternoon' : 'Good Evening'; };
const Delta = ({ v }) => <span className={`delta ${v >= 0 ? 'up' : 'down'}`}>{v >= 0 ? '↑' : '↓'} {Math.abs(v)}%</span>;

export default function Dashboard() {
  useDocumentTitle('Dashboard');
  const { user } = useAuth();
  const nav = useNavigate();
  const [range, setRange] = useState(7);
  const [now, setNow] = useState(new Date());
  const { data: d, loading, error, reload } = useApi(`/dashboard?range=${range}`);
  const health = useApi('/health');
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(t); }, []);
  const up = health.data?.status === 'ok';
  const P = d?.protection;
  const label = P ? (P.overall >= 85 ? 'Excellent' : P.overall >= 70 ? 'Good' : P.overall >= 40 ? 'Fair' : 'At risk') : 'No data yet';
  const T = d?.threatOverview;
  const threatRows = T ? [['Phishing', T.phishing, '#ec4899'], ['Malware', T.malware, '#fb923c'], ['Suspicious Links', T.suspicious, '#4f7cff'], ['Others', T.other, '#22d3ee']] : [];
  const stat = (k) => d?.stats[k];
  const tiles = [['Total Scans', 'totalScans', ScanLine], ['Threats Blocked', 'threatsBlocked', ShieldAlert], ['Safe Links', 'safeLinks', ShieldCheck], ['Malicious URLs', 'maliciousUrls', Bug]];
  const icon = (v) => (v === 'malicious' ? [ShieldX, 'var(--red)'] : v === 'suspicious' ? [ShieldAlert, 'var(--amber)'] : [ShieldCheck, 'var(--accent)']);

  return (
    <div className="stack" style={{ display: 'grid', gap: 20 }}>
      <div className="row between wrap">
        <div className="greet"><h1>{greeting()}, {user.name.split(' ')[0]} 👋</h1><p className="muted">Here's what's happening with your security today.</p></div>
        <div className="row wrap">
          <div className="card c-teal status-card"><span className={`pulse ${up ? '' : 'off'}`} /><div><b>{health.loading ? 'Checking…' : up ? 'System Active' : 'Degraded'}</b><small>{up ? `All systems operational${health.data.localAI ? ' • local AI on' : ''}` : 'Database unreachable'}</small></div></div>
          <div className="card c-blue status-card"><Calendar size={20} color="var(--accent)" /><div><b>{now.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</b><small>{now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small></div></div>
        </div>
      </div>
      {error && <div className="banner malicious" role="alert">Could not load dashboard: {error.message} <button className="btn btn-plain btn-sm" onClick={reload}>Retry</button></div>}

      <div className="grid g2" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="card c-orange" style={{ borderColor: 'rgba(251,146,60,.5)' }}>
          <div className="card-title"><span className="ico sm c-teal"><ShieldCheck size={18} /></span>Protection Score</div>
          {loading && !d ? <Skel h={170} /> : (
            <div className="score-wrap">
              <ScoreRing value={P ? P.overall : null} size={170} label={label} sub={P ? 'Based on your last 30 days of scans' : 'Run a scan to get your score'} />
              <div className="bars">
                {P ? [['Phishing Protection', P.phishing], ['Malware Detection', P.malware], ['Suspicious Links', P.suspicious], ['Data Safety', P.dataSafety]].map(([l, v]) => <div className="bar-row" key={l}><small><span>{l}</span><span>{v}/100</span></small><div className="bar"><i style={{ width: `${v}%` }} /></div></div>) : <p className="muted" style={{ fontSize: '.88rem' }}>Your score is built from your scans: how often phishing, malware and suspicious-link signals show up, and how many scans involved credential lures.</p>}
                {P?.delta != null && <span className={`delta ${P.delta >= 0 ? 'up' : 'down'}`}>{P.delta >= 0 ? '↑' : '↓'} {Math.abs(P.delta)} pts <span className="muted">vs last week</span></span>}
              </div>
            </div>
          )}
        </div>
        <div className="card c-purple">
          <div className="row between card-title"><span className="row"><span className="ico sm c-blue"><BarChart3 size={18} /></span>Scan Statistics</span>
            <div className="field" style={{ minHeight: 34, padding: '0 10px' }}><select value={range} onChange={(e) => setRange(Number(e.target.value))} aria-label="Date range" style={{ padding: '4px 0' }}><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option></select></div></div>
          <div className="grid g2" style={{ gap: 12 }}>
            {tiles.map(([l, k, I]) => <div className="tile" key={k}><small><I size={15} />{l}</small><div className="v">{loading && !d ? '–' : <CountUp value={stat(k)?.value || 0} />}</div>{d && <Delta v={stat(k).change} />}</div>)}
          </div>
        </div>
      </div>

      <div className="grid g2" style={{ gridTemplateColumns: '1fr 1.2fr' }}>
        <div className="card c-purple">
          <div className="card-title"><span className="ico sm c-purple"><Bug size={18} /></span>Threat Overview</div>
          {T && T.total > 0 ? <div className="row wrap" style={{ gap: 24 }}><Donut size={150} centerLabel="Total Threats" data={threatRows.map(([label, value, color]) => ({ label, value, color }))} />
            <div className="legend">{threatRows.map(([l, v, c]) => <div key={l}><i style={{ background: c }} />{l}<span>{v} ({Math.round((v / T.total) * 100)}%)</span></div>)}</div></div>
            : <Empty icon={ShieldCheck} title="No threats in this period">Nothing risky was found - nice.</Empty>}
        </div>
        <div className="card c-teal">
          <div className="row between card-title"><span className="row"><span className="ico sm c-teal"><Activity size={18} /></span>Scan Activity</span><span className="row" style={{ fontSize: '.78rem', gap: 14 }}><span><span className="t-ok">●</span> Safe</span><span><span style={{ color: '#a855f7' }}>●</span> Threats</span></span></div>
          {d ? <LineChart labels={d.activityChart.map((b) => shortDay(b.date))} series={[{ name: 'Safe', color: '#19f0c3', values: d.activityChart.map((b) => b.safe) }, { name: 'Threats', color: '#a855f7', values: d.activityChart.map((b) => b.threats) }]} /> : <Skel h={230} />}
        </div>
      </div>

      <div className="grid g2" style={{ gridTemplateColumns: '1.2fr 1fr' }}>
        <div className="card c-blue">
          <div className="row between card-title"><span className="row"><span className="ico sm c-blue"><ScanLine size={18} /></span>Recent Scans</span><Link to="/history" style={{ color: 'var(--cyan)', fontSize: '.85rem' }}>View All →</Link></div>
          {d?.recentScans.length ? <div className="table-wrap"><table className="table"><thead><tr><th>Target</th><th>Type</th><th>Status</th><th>Time</th></tr></thead><tbody>
            {d.recentScans.map((s) => { const [I, c] = icon(s.verdict); return <tr key={s.id} className="click" onClick={() => nav(`/scan/${s.id}`)}><td><div className="target"><I size={18} color={c} /><span>{s.target}</span></div></td><td>{s.type === 'url' ? 'URL' : 'Email'}</td><td><VerdictBadge verdict={s.verdict} /></td><td className="muted">{timeAgo(s.createdAt)}</td></tr>; })}
          </tbody></table></div> : <Empty icon={ScanLine} title="No scans yet"><Link to="/scan" className="btn btn-primary btn-sm" style={{ marginTop: 8 }}>Run your first scan</Link></Empty>}
        </div>
        <div className="card c-teal">
          <div className="row between card-title"><span className="row"><span className="ico sm c-teal"><Activity size={18} /></span>Recent Activity</span><Link to="/alerts" style={{ color: 'var(--cyan)', fontSize: '.85rem' }}>View All →</Link></div>
          {d?.recentActivity.length ? d.recentActivity.map((a) => { const [I, c] = icon(a.verdict); return <div className="list-item" key={a.id}><span className="ico sm" style={{ '--c': a.verdict === 'safe' ? '25,240,195' : a.verdict === 'suspicious' ? '251,191,36' : '255,84,112' }}><I size={17} color={c} /></span><div style={{ minWidth: 0 }}><div className="t">{a.title}</div><small>{a.sub}</small></div><span className="time">{timeAgo(a.at)}</span></div>; }) : <Empty icon={Activity} title="Nothing yet">Activity appears here after your first scan.</Empty>}
        </div>
      </div>

      <div className="grid g2" style={{ gridTemplateColumns: '1fr 1.2fr' }}>
        <div className="card c-purple">
          <div className="card-title"><span className="ico sm c-purple"><Link2 size={18} /></span>Quick Actions</div>
          <div className="grid g2" style={{ gap: 12 }}>
            {[[ShieldCheck, 'Scan URL', 'Check for phishing & malware', '/scan', 'c-teal'], [Mail, 'Analyze Email', 'Detect malicious content', '/scan?tab=email', 'c-purple'], [Link2, 'Check Link', 'Verify suspicious links', '/scan', 'c-teal'], [Globe, 'Threat Intelligence', 'Explore latest threats', '/intel', 'c-purple']].map(([I, t, s, to, c]) => <Link key={t} to={to} className={`qa ${c}`}><span className="ico sm" style={{ '--c': c === 'c-teal' ? '25,240,195' : '168,85,247' }}><I size={17} /></span><span><b>{t}</b><small>{s}</small></span><ChevronRight className="chev" size={16} /></Link>)}
          </div>
          {d?.awareness && <div className="row between wrap muted" style={{ marginTop: 16, fontSize: '.82rem' }}><span><Brain size={14} style={{ verticalAlign: -2 }} /> Awareness: {d.awareness.modulesDone} modules • quiz best {d.awareness.quizBestPercent ?? '—'}{d.awareness.quizBestPercent != null && '%'}</span><Link to="/awareness" style={{ color: 'var(--accent)' }}>Train →</Link></div>}
        </div>
        <div className="card c-blue promo">
          <Logo size={110} text={false} />
          <div><h3 className="h2" style={{ fontSize: '1.5rem' }}>Stronger Security<br />Smarter Decisions</h3><p className="muted" style={{ margin: '10px 0 16px', fontSize: '.88rem' }}>On-demand threat analysis with explainable results to help you make safer decisions.</p><Link to="/scan" className="btn btn-primary">Start Free Scan <ArrowRight size={16} /></Link></div>
        </div>
      </div>
    </div>
  );
}
