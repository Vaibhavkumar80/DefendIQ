import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Link2, Mail, ArrowRight, Brain, Zap, FileText, ShieldCheck, Trash2, ArrowLeft } from 'lucide-react';
import { HeroShield } from '../components/Logo.jsx';
import ScanResult from '../components/ScanResult.jsx';
import { VerdictBadge, Empty } from '../components/ui.jsx';
import { Reveal } from '../components/Motion.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/Toast.jsx';
import { api } from '../lib/api.js';
import { useApi, useDocumentTitle } from '../lib/hooks.js';
import { timeAgo } from '../lib/format.js';

const EXAMPLES = ['https://bit.ly/abc123', 'http://malicious-site.com', 'https://paypal-secure.com'];
const SAMPLE_EMAIL = `From: "PayPal Support" <service@paypa1-help.top>
Subject: URGENT: Your account will be suspended
Authentication-Results: spf=fail; dkim=fail

Dear customer, we noticed unusual activity. Verify your account immediately and confirm your password within 24 hours:
http://paypa1-help.top/login`;

export default function Scan() {
  useDocumentTitle('Scan');
  const { user } = useAuth();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState(params.get('tab') === 'email' ? 'email' : 'url');
  const [url, setUrl] = useState(params.get('url') || '');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const resRef = useRef(null);
  const history = useApi(user ? '/scans?limit=4' : null);

  async function run(kind = tab, override) {
    setError(''); setResult(null); setBusy(true);
    try {
      const body = kind === 'url' ? { url: (override ?? url).trim() } : { raw: email };
      if (kind === 'url' && !body.url) throw new Error('Paste a URL to scan.');
      if (kind === 'email' && email.trim().length < 10) throw new Error('Paste the email content (headers and/or body).');
      const { scan } = await api.post(`/scan/${kind}`, body);
      setResult(scan);
      if (user) history.reload();
      setTimeout(() => resRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  useEffect(() => { if (params.get('auto') && params.get('url')) { setUrl(params.get('url')); run('url', params.get('url')); setParams({}, { replace: true }); } }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <section className="container hero" style={{ paddingBottom: 10 }}>
        <div>
          <span className="pill">URL &amp; EMAIL SCAN</span>
          <h1 className="h1" style={{ fontSize: 'clamp(2.1rem,4.8vw,3.5rem)' }}>Check Any URL.<br /><span className="gt">Block Real Threats.</span><br />Stay Safe Online.</h1>
          <p className="lead">Enter a URL or paste an email to scan for phishing, malware and other cyber threats. DefendIQ uses rules, a local ML model and threat intelligence to keep you safe.</p>
          <div className="assure" style={{ gap: 30 }}><span><Brain size={17} />AI-assisted detection</span><span><Zap size={17} />Real-time threat intel</span><span><FileText size={17} />Detailed reports</span></div>
        </div>
        <HeroShield />
      </section>

      <section className="container">
        <div className="card c-purple scan-box" style={{ borderColor: 'rgba(168,85,247,.6)' }}>
          <div className="tabs" role="tablist"><button role="tab" aria-selected={tab === 'url'} className={tab === 'url' ? 'on' : ''} onClick={() => { setTab('url'); setError(''); }}><Link2 size={14} style={{ verticalAlign: -2 }} /> Scan a URL</button><button role="tab" aria-selected={tab === 'email'} className={tab === 'email' ? 'on' : ''} onClick={() => { setTab('email'); setError(''); }}><Mail size={14} style={{ verticalAlign: -2 }} /> Analyze an Email</button></div>
          {tab === 'url' ? (
            <form onSubmit={(e) => { e.preventDefault(); run('url'); }}>
              <p className="muted" style={{ fontSize: '.88rem', marginTop: 8 }}>Paste the link you want to check and click scan.</p>
              <div className="scan-input"><div className={`field ${error ? 'err' : ''}`}><Link2 size={18} /><input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com" maxLength={2048} aria-label="URL to scan" autoComplete="off" spellCheck="false" /></div><button className="btn btn-primary btn-lg" disabled={busy}>{busy ? 'Scanning…' : <>Scan URL <ArrowRight size={16} /></>}</button></div>
              <div className="row wrap" style={{ marginTop: 14, gap: 8 }}><span className="muted" style={{ fontSize: '.85rem' }}>Quick Examples:</span>{EXAMPLES.map((x) => <button type="button" key={x} className="chip" onClick={() => { setUrl(x); run('url', x); }}>{x}</button>)}</div>
            </form>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); run('email'); }}>
              <p className="muted" style={{ fontSize: '.88rem', marginTop: 8 }}>Paste the full email (with headers if you can - "Show original" in Gmail) or just the body. Nothing from the message body is stored.</p>
              <div className={`field ${error ? 'err' : ''}`} style={{ marginTop: 14, alignItems: 'stretch' }}><textarea value={email} onChange={(e) => setEmail(e.target.value)} placeholder={'From: "Support" <help@example.com>\nSubject: …\n\nMessage body…'} maxLength={60000} aria-label="Email content" /></div>
              <div className="row wrap" style={{ marginTop: 14 }}><button className="btn btn-primary btn-lg" disabled={busy}>{busy ? 'Analyzing…' : <>Analyze Email <ArrowRight size={16} /></>}</button><button type="button" className="chip" onClick={() => setEmail(SAMPLE_EMAIL)}>Load sample phishing email</button></div>
            </form>
          )}
          {error && <div className="ferr" role="alert" style={{ marginTop: 12, fontSize: '.9rem' }}>{error}</div>}
        </div>
      </section>

      <section className="container" ref={resRef} style={{ scrollMarginTop: 90, marginTop: 30 }}>
        {busy && <div className="card c-teal scanning"><span className="spinner" />Running checks: rules, threat feeds, DNS, TLS and domain age…</div>}
        {result && !busy && <ScanResult key={result.createdAt + result.target} scan={result} />}
      </section>

      <section className="container section">
        <Reveal><div className="eyebrow">How it works</div><h2 className="h2" style={{ margin: '8px 0 24px' }}>Simple Steps. <span className="gt3">Powerful Protection.</span></h2></Reveal>
        <div className="steps">{[[Link2, '1. Enter URL', 'Paste the website link or email you want to check.'], [Brain, '2. AI Analysis', 'Rules, ML and threat intelligence check for phishing, malware and suspicious behavior.'], [ShieldCheck, '3. Get Results', 'See a detailed risk report and safety status instantly.']].map(([I, t, d], i) => <Reveal key={t} delay={i * 100}><div className="step"><span className="ico c-teal"><I size={20} /></span><div><h3 className="h3">{t}</h3><p className="muted" style={{ fontSize: '.86rem', marginTop: 4 }}>{d}</p></div></div></Reveal>)}</div>
      </section>

      {user && (
        <section className="container section" style={{ paddingTop: 0 }}>
          <div className="row between wrap mb"><div><div className="eyebrow">Recent Scans</div><h2 className="h2" style={{ marginTop: 6 }}>Your Scan History</h2></div><Link to="/history" className="btn btn-ghost btn-sm">View All Scans <ArrowRight size={14} /></Link></div>
          <div className="card c-blue">
            {history.data?.items?.length ? <div className="table-wrap"><table className="table"><thead><tr><th>Target</th><th>Status</th><th>Safety Score</th><th>Scan Time</th><th /></tr></thead><tbody>
              {history.data.items.map((s) => <tr key={s.id}><td><div className="target"><span>{s.target}</span></div></td><td><VerdictBadge verdict={s.verdict} /></td><td>{s.score}/100</td><td className="muted">{timeAgo(s.createdAt)}</td><td><Link className="btn btn-ghost btn-sm" to={`/scan/${s.id}`}>View Report</Link></td></tr>)}
            </tbody></table></div> : <Empty icon={ShieldCheck} title="No scans yet">Run your first scan above.</Empty>}
          </div>
        </section>
      )}
    </>
  );
}

export function ScanReport() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const { data, loading, error } = useApi(`/scans/${id}`);
  useDocumentTitle('Scan report');
  async function remove() {
    if (!window.confirm('Delete this scan from your history?')) return;
    try { await api.del(`/scans/${id}`); toast.success('Scan deleted.'); nav('/history'); } catch (e) { toast.error(e.message); }
  }
  return (
    <section className="container" style={{ padding: '40px 0' }}>
      <div className="row between wrap mb no-print"><Link to="/history" className="btn btn-plain btn-sm"><ArrowLeft size={15} /> History</Link>{data && <div className="row"><button className="btn btn-plain btn-sm" onClick={() => window.print()}>Print / Save PDF</button><button className="btn btn-danger btn-sm" onClick={remove}><Trash2 size={14} /> Delete</button></div>}</div>
      {loading && <div className="card scanning"><span className="spinner" />Loading report…</div>}
      {error && <Empty icon={ShieldCheck} title="Report not found">{error.message}</Empty>}
      {data && <><h1 className="h2" style={{ marginBottom: 18 }}>Full Scan Report</h1><ScanResult scan={data.scan} full /></>}
    </section>
  );
}
