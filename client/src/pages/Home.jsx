import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Play, ShieldCheck, ShieldAlert, ShieldX, Link2, Zap, Lock, Check, GraduationCap, Code2, Briefcase } from 'lucide-react';
import { Reveal, CountUp } from '../components/Motion.jsx';
import { Modal, VerdictBadge } from '../components/ui.jsx';
import ScanResult from '../components/ScanResult.jsx';
import { FEATURES } from './shared.jsx';
import { api } from '../lib/api.js';
import { useDocumentTitle } from '../lib/hooks.js';

function DemoModal({ open, onClose }) {
  const full = 'paypa1-secure-login.xyz/verify/account';
  const [typed, setTyped] = useState('');
  const [phase, setPhase] = useState('typing');
  const [scan, setScan] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    if (!open) return undefined;
    setTyped(''); setPhase('typing'); setScan(null); setErr('');
    let i = 0, dead = false;
    const t = setInterval(() => {
      i++; setTyped(full.slice(0, i));
      if (i >= full.length) {
        clearInterval(t); setPhase('scanning');
        api.post('/scan/url', { url: full, deep: false }).then((r) => { if (!dead) { setScan(r.scan); setPhase('done'); } }).catch((e) => { if (!dead) { setErr(e.message); setPhase('done'); } });
      }
    }, 55);
    return () => { dead = true; clearInterval(t); };
  }, [open]);
  return (
    <Modal open={open} onClose={onClose} title="Live demo: scanning a phishing link" width="min(900px,100%)">
      <div className="field"><span className={phase === 'typing' ? 'type-caret' : ''} style={{ padding: '14px 0' }}>{typed}</span></div>
      {phase === 'scanning' && <div className="scanning"><span className="spinner" />Analyzing with the real detection engine…</div>}
      {err && <p className="ferr">{err}</p>}
      {scan && <div style={{ marginTop: 18 }}><ScanResult scan={scan} /></div>}
    </Modal>
  );
}

function HeroScanner() {
  const [url, setUrl] = useState('');
  const [scan, setScan] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    const target = url.trim();
    if (!target) {
      setError('Enter a website link to scan.');
      return;
    }

    setBusy(true);
    setError('');
    setScan(null);
    try {
      const response = await api.post('/scan/url', { url: target, deep: false });
      setScan(response.scan);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const verdict = scan?.verdict;
  const ResultIcon = verdict === 'malicious' ? ShieldX : verdict === 'suspicious' ? ShieldAlert : ShieldCheck;

  return (
    <section className="hero-scanner card c-purple" aria-labelledby="hero-scanner-title" aria-busy={busy}>
      <div className="hero-scanner-heading">
        <span className="hero-scanner-icon"><ShieldCheck size={22} /></span>
        <div>
          <div className="eyebrow">Quick URL scan</div>
          <h2 className="h3" id="hero-scanner-title">Check a suspicious link</h2>
        </div>
      </div>
      <p className="muted hero-scanner-copy">Check a link for phishing and other warning signs before you open it.</p>
      <form className="hero-scanner-form" onSubmit={submit}>
        <div className="field">
          <Link2 size={18} aria-hidden="true" />
          <input
            type="text"
            inputMode="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://example.com"
            maxLength={2048}
            autoComplete="url"
            aria-label="Website link to scan"
            spellCheck="false"
          />
        </div>
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? 'Scanning…' : <>Scan link <ArrowRight size={16} /></>}
        </button>
      </form>
      <div className="hero-scanner-note"><Lock size={14} /> No account required. Link checks use the real DefendIQ scanner.</div>
      {error && <p className="ferr" role="alert">{error}</p>}
      {busy && <div className="hero-scanner-status" role="status"><span className="spinner" />Checking for threats…</div>}
      {scan && (
        <div className={`hero-scan-result ${verdict}`} role="status" aria-live="polite">
          <ResultIcon size={22} aria-hidden="true" />
          <div className="hero-scan-result-copy">
            <div className="hero-scan-result-title">
              <VerdictBadge verdict={verdict} />
              <span>{scan.score}/100 safety score</span>
            </div>
            <p>{scan.summary}</p>
            <Link to={`/scan?url=${encodeURIComponent(scan.target)}`}>Open full scanner <ArrowRight size={14} /></Link>
          </div>
        </div>
      )}
    </section>
  );
}

export default function Home() {
  useDocumentTitle('');
  const nav = useNavigate();
  const [demo, setDemo] = useState(false);
  const [stats, setStats] = useState(null);
  const [statsError, setStatsError] = useState('');
  useEffect(() => {
    let active = true;
    api.get('/public/stats')
      .then((data) => { if (active) setStats(data); })
      .catch((error) => { if (active) setStatsError(error.message); });
    return () => { active = false; };
  }, []);
  return (
    <>
      <section className="container hero">
        <div>
          <span className="pill">AI-POWERED CYBERSECURITY</span>
          <h1 className="h1">Detect Phishing.<br /><span className="gt">Stop Attacks.</span><br /><span className="gt2">Stay Ahead.</span></h1>
          <p className="lead">DefendIQ scans URLs, analyzes emails and detects potential threats using a rule engine, a local ML model and threat intelligence. Keep your digital life safe, simple and secure.</p>
          <div className="row wrap">
            <button className="btn btn-primary btn-lg" onClick={() => nav('/scan')}><ShieldCheck size={18} /> Start Free Scan <ArrowRight size={16} /></button>
            <button className="btn btn-ghost btn-lg" onClick={() => setDemo(true)}><Play size={16} /> Watch Demo</button>
          </div>
          <div className="assure"><span><Check size={15} />No installation</span><span><Zap size={15} />Fast &amp; accurate</span><span><Lock size={15} />Privacy focused</span></div>
        </div>
        <HeroScanner />
      </section>

      <section className="container section">
        <div className="split-r" style={{ alignItems: 'center', gridTemplateColumns: '.8fr 2.2fr' }}>
          <Reveal><div className="eyebrow">Core Features</div><h2 className="h2" style={{ margin: '10px 0' }}>Powerful Features for Total Protection</h2><p className="muted" style={{ fontSize: '.9rem' }}>Everything you need to stay safe online. Detect threats, analyze risks and make informed decisions - all in one place.</p></Reveal>
          <div className="grid g5">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={i * 80}><Link to="/features" className={`card hover feat ${f.c}`} style={{ display: 'block', padding: 18 }}><span className="ico"><f.icon size={22} /></span><h3 className="h3" style={{ fontSize: '.98rem' }}>{f.title}</h3><p>{f.text}</p></Link></Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="container section">
        <div className="split" style={{ alignItems: 'center', gridTemplateColumns: '1.5fr 1fr' }}>
          <Reveal>
            <span className="pill">INSTALLATION OVERVIEW</span>
            <div className="card c-blue" style={{ marginTop: 8 }}>
              <div className="grid g2" style={{ gap: 10 }}>
                {[['Total Scans', stats?.scans], ['Threats Flagged', stats?.threats], ['Registered Users', stats?.users], ['Threat-feed Entries', stats?.feedEntries]].map(([label, value]) => (
                  <div className="tile" key={label}>
                    <small>{label}</small>
                    <div className="v">{value == null ? '—' : <CountUp value={value} />}</div>
                  </div>
                ))}
              </div>
              {statsError && <p className="ferr" role="status" style={{ marginTop: 12 }}>Installation stats are unavailable: {statsError}</p>}
              <div className="legal" style={{ marginTop: 10 }}>Live totals from this installation. Your personal dashboard shows your own scans after sign-in.</div>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <div className="eyebrow">Dashboard</div><h2 className="h2" style={{ margin: '10px 0' }}>Smarter Insights, <span className="gt3">Stronger Security</span></h2>
            <p className="muted">A complete view of your security status with an intuitive dashboard. Track scans, monitor threats and stay one step ahead.</p>
            <ul className="checks">{['Alerts for suspicious scans', 'Detailed scan reports', 'Security score & analytics', 'Recent scan activity'].map((t) => <li key={t}><Check size={18} />{t}</li>)}</ul>
            <Link to="/dashboard" className="btn btn-primary" style={{ marginTop: 14 }}>Explore Dashboard <ArrowRight size={16} /></Link>
          </Reveal>
        </div>
      </section>

      <section className="container section">
        <Reveal><div className="eyebrow">How it works</div><h2 className="h2" style={{ margin: '8px 0 26px' }}>Get Started in 3 Simple Steps</h2></Reveal>
        <div className="steps">
          {[['Scan', 'Enter a URL or paste an email to check.'], ['Analyze', 'Our rules, ML model and threat feeds check for risks.'], ['Stay Safe', 'Get an instant, explainable result and act on it.']].map(([t, d], i) => (
            <Reveal key={t} delay={i * 120}><div className="step"><span className="num">{i + 1}</span><div><h3 className="h3">{t}</h3><p className="muted" style={{ fontSize: '.88rem', marginTop: 4 }}>{d}</p></div></div></Reveal>
          ))}
        </div>
      </section>

      <section className="container section">
        <Reveal><div className="eyebrow">Built for</div><h2 className="h2" style={{ margin: '8px 0 24px' }}>Everyone who clicks links</h2></Reveal>
        <div className="grid g3">
          {[[GraduationCap, 'Students', 'Check scholarship, internship and "job offer" links before you apply.', 'c-teal'], [Code2, 'Developers', 'Vet package, repo and login links; self-host and extend the open codebase.', 'c-purple'], [Briefcase, 'Freelancers', 'Verify client invoices and payment emails before you click or pay.', 'c-orange']].map(([I, t, d, c], i) => (
            <Reveal key={t} delay={i * 90}><div className={`card hover ${c}`}><span className="ico"><I size={22} /></span><h3 className="h3" style={{ margin: '14px 0 6px' }}>{t}</h3><p className="muted" style={{ fontSize: '.9rem' }}>{d}</p></div></Reveal>
          ))}
        </div>
      </section>

      <section className="container section">
        <Reveal><div className="cta"><div><h2 className="h2">Ready to Protect Yourself?</h2><p className="muted" style={{ marginTop: 6 }}>Scan a link or email now - no registration required.</p></div><Link to="/scan" className="btn btn-primary btn-lg">Start Free Scan <ArrowRight size={16} /></Link></div></Reveal>
      </section>
      <DemoModal open={demo} onClose={() => setDemo(false)} />
    </>
  );
}
