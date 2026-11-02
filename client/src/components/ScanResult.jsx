import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, ShieldAlert, ShieldX, Link2, Mail, ChevronRight, ArrowRight, Brain } from 'lucide-react';
import ScoreRing from './ScoreRing.jsx';
import { VerdictBadge } from './ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { verdictLabel } from '../lib/format.js';

const SHIELD = { safe: [ShieldCheck, 'var(--accent)'], suspicious: [ShieldAlert, 'var(--amber)'], malicious: [ShieldX, 'var(--red)'] };

export default function ScanResult({ scan, full = false }) {
  const nav = useNavigate();
  const { user } = useAuth();
  const [open, setOpen] = useState(full);
  const [Icon, color] = SHIELD[scan.verdict];
  const isUrl = scan.type === 'url';
  const noun = isUrl ? 'Website' : 'Email';
  const m = scan.meta || {};
  const banner = { safe: ['No threats found!', `This ${isUrl ? 'URL' : 'email'} looks safe.`], suspicious: ['Be careful!', 'Warning signs were found.'], malicious: ['Threats found!', 'Do not open or respond.'] }[scan.verdict];
  const dur = m.durationMs ? `${(m.durationMs / 1000).toFixed(1)} seconds` : '';
  return (
    <div className="stack">
      <div className="result">
        <div className={`card ${scan.verdict === 'safe' ? 'c-teal' : scan.verdict === 'suspicious' ? 'c-orange' : 'c-red'}`}>
          <div className="row" style={{ padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 12, marginBottom: 18 }}>
            {isUrl ? <Link2 size={18} color="var(--accent)" /> : <Mail size={18} color="var(--accent)" />}
            <div style={{ minWidth: 0 }}><div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{scan.target}</div><small className="muted">Scan completed{dur && ` • ${dur}`}</small></div>
            <span style={{ marginLeft: 'auto' }}><VerdictBadge verdict={scan.verdict} /></span>
          </div>
          <div className="result-main">
            <div><ScoreRing value={scan.score} size={190} label={verdictLabel[scan.verdict]} sub={`This ${isUrl ? 'website' : 'email'} ${scan.verdict === 'safe' ? 'looks safe and legit' : scan.verdict === 'suspicious' ? 'needs caution' : 'looks dangerous'}`} />
              <div className={`banner ${scan.verdict}`}><Icon color={color} /><div><b>{banner[0]}</b><small>{banner[1]}</small></div></div></div>
            <div className="stack" style={{ display: 'grid', gap: 8 }}>
              {scan.checks.map((c, i) => (
                <div key={c.key} className="check-row" style={{ animationDelay: `${i * 70}ms` }} title={c.detail}>
                  <span className={`t-${c.status}`}>●</span><span>{c.label}</span><b className={`t-${c.status}`}>{c.value}</b><ChevronRight size={14} className="muted" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="card c-blue" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="browser"><div className="bar-top"><i /><i style={{ background: 'var(--pink)' }} /><i style={{ background: 'var(--accent)' }} /><span style={{ marginLeft: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{scan.label}</span></div><div className="body"><Icon size={64} color={color} style={{ filter: `drop-shadow(0 0 14px ${color})` }} /></div></div>
          <h3 className="h3" style={{ color }}>{verdictLabel[scan.verdict]} {noun}</h3>
          <p className="muted" style={{ fontSize: '.88rem', margin: '8px 0 18px' }}>{scan.summary}</p>
          <div style={{ marginTop: 'auto' }}>
            {!full && <button className="btn btn-ghost" onClick={() => (scan.id ? nav(`/scan/${scan.id}`) : setOpen((o) => !o))}>{open && !scan.id ? 'Hide Full Report' : 'View Full Report'} <ArrowRight size={16} /></button>}
            {!scan.saved && <p className="muted" style={{ fontSize: '.76rem', marginTop: 12 }}>{user ? 'History saving is turned off in Settings.' : <><Link to="/login" style={{ color: 'var(--accent)' }}>Sign in</Link> to save scans to your history.</>}</p>}
          </div>
        </div>
      </div>

      {open && (
        <div className="grid g2">
          <div className="card c-purple">
            <div className="card-title">Why this score</div>
            {scan.findings.length === 0 && <p className="muted">No warning signs were found.</p>}
            {scan.findings.map((f) => <div key={f.id} className={`finding ${f.severity}`}><div className="row between"><b>{f.title}</b><span className="muted" style={{ fontSize: '.75rem' }}>+{f.points} risk</span></div><p>{f.detail}</p></div>)}
            {scan.positives?.length > 0 && <><div className="card-title" style={{ marginTop: 22 }}>What looks good</div>{scan.positives.map((p) => <div key={p} className="row" style={{ padding: '4px 0', fontSize: '.88rem' }}><span className="t-ok">✓</span>{p}</div>)}</>}
          </div>
          <div className="card c-cyan">
            <div className="card-title">Technical details</div>
            <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 18px', fontSize: '.86rem', wordBreak: 'break-all' }}>
              {isUrl ? <>
                <dt className="muted">Host</dt><dd style={{ margin: 0 }}>{m.host}</dd>
                <dt className="muted">Registrable domain</dt><dd style={{ margin: 0 }}>{m.registrable}</dd>
                {m.ips?.length > 0 && <><dt className="muted">Resolved IPs</dt><dd style={{ margin: 0 }}>{m.ips.slice(0, 4).join(', ')}</dd></>}
                {m.cert && <><dt className="muted">Certificate</dt><dd style={{ margin: 0 }}>{m.cert.issuer || 'Unknown issuer'} • {m.cert.daysLeft} days left</dd></>}
                {m.ageDays != null && <><dt className="muted">Domain age</dt><dd style={{ margin: 0 }}>{m.ageDays} days</dd></>}
                {m.feed && <><dt className="muted">Threat feed</dt><dd style={{ margin: 0 }}>{m.feed}</dd></>}
                <dt className="muted">Network checks</dt><dd style={{ margin: 0 }}>{m.deep ? 'Enabled' : 'Skipped'}</dd>
              </> : <>
                <dt className="muted">From</dt><dd style={{ margin: 0 }}>{m.fromName ? `${m.fromName} ` : ''}{m.from || 'unknown'}</dd>
                {m.replyTo && <><dt className="muted">Reply-To</dt><dd style={{ margin: 0 }}>{m.replyTo}</dd></>}
                {m.subject && <><dt className="muted">Subject</dt><dd style={{ margin: 0 }}>{m.subject}</dd></>}
                <dt className="muted">Headers found</dt><dd style={{ margin: 0 }}>{m.hasHeaders ? 'Yes' : 'No (body only)'}</dd>
                {m.authResults && <><dt className="muted">Auth results</dt><dd style={{ margin: 0 }}>{m.authResults}</dd></>}
              </>}
              <dt className="muted">Rule risk</dt><dd style={{ margin: 0 }}>{scan.risk}/100</dd>
              {m.modelProbability != null && <><dt className="muted">ML probability</dt><dd style={{ margin: 0 }}>{Math.round(m.modelProbability * 100)}%</dd></>}
            </dl>
            {m.aiOpinion && <div className="finding low" style={{ marginTop: 18 }}><b className="row"><Brain size={16} /> Local AI explanation</b><p>{m.aiOpinion}</p></div>}
          </div>
          {!isUrl && m.links?.length > 0 && (
            <div className="card c-orange" style={{ gridColumn: '1/-1' }}>
              <div className="card-title">Links found ({m.links.length})</div>
              <div className="table-wrap"><table className="table"><thead><tr><th>Link</th><th>Verdict</th><th>Safety</th><th>Top reason</th></tr></thead><tbody>
                {m.links.map((l) => <tr key={l.url}><td style={{ wordBreak: 'break-all', maxWidth: 360 }}>{l.url}</td><td><VerdictBadge verdict={l.verdict} /></td><td>{l.score}/100</td><td className="muted">{l.reason || '-'}</td></tr>)}
              </tbody></table></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
