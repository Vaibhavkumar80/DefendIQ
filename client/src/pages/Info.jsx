import { Link } from 'react-router-dom';
import { Check, ArrowRight, Server, Cpu, Database, Layout } from 'lucide-react';
import { Reveal } from '../components/Motion.jsx';
import Logo from '../components/Logo.jsx';
import { useDocumentTitle } from '../lib/hooks.js';

export function Pricing() {
  useDocumentTitle('Pricing');
  const items = ['Unlimited URL & email scans (fair-use rate limits)', 'Full scan history, reports and CSV export', 'Dashboard analytics and protection score', 'Alerts, awareness modules, quizzes and simulations', 'Threat-feed matching and optional local AI explanations', 'Your data stays in your own MongoDB'];
  return (
    <section className="container center" style={{ padding: '60px 0' }}>
      <div className="eyebrow">Pricing</div><h1 className="h1" style={{ fontSize: 'clamp(2rem,4.4vw,3rem)', margin: '12px 0' }}>Free and <span className="gt">open</span>. No paid APIs.</h1>
      <p className="muted" style={{ maxWidth: 560, margin: '0 auto 30px' }}>DefendIQ runs on free, open-source tooling. You host it, you own the data - there is nothing to subscribe to.</p>
      <Reveal><div className="card c-teal" style={{ maxWidth: 520, margin: '0 auto', textAlign: 'left', padding: 32 }}>
        <div className="row between"><h3 className="h3">Self-hosted</h3><span className="badge safe">Free forever</span></div>
        <div className="bignum" style={{ margin: '16px 0 4px' }}>$0</div>
        <ul className="checks">{items.map((t) => <li key={t}><Check size={18} />{t}</li>)}</ul>
        <Link to="/signup" className="btn btn-primary btn-block" style={{ marginTop: 22 }}>Create free account <ArrowRight size={16} /></Link>
      </div></Reveal>
    </section>
  );
}

export function About() {
  useDocumentTitle('About');
  return (
    <section className="container" style={{ padding: '60px 0' }}>
      <div className="split" style={{ alignItems: 'center' }}>
        <div><div className="eyebrow">About</div><h1 className="h1" style={{ fontSize: 'clamp(2rem,4.4vw,3rem)', margin: '12px 0' }}>Security that <span className="gt3">explains itself</span></h1>
          <p className="muted">DefendIQ helps people spot phishing before it works. Every verdict comes with the exact reasons behind it, so you learn to recognise the tricks yourself - the app doubles as an awareness trainer with modules, quizzes and simulations.</p></div>
        <div style={{ display: 'grid', placeItems: 'center' }}><Logo size={150} text={false} /><div style={{ marginTop: 12 }}><img src="/logo-original.jpg" alt="DefendIQ original logo" width="120" style={{ borderRadius: 14, opacity: .9 }} /></div></div>
      </div>
      <h2 className="h2" style={{ margin: '50px 0 20px' }}>How detection works</h2>
      <div className="grid g2">
        {[['Rule engine', 'Dozens of explainable checks: brand impersonation, typosquatting, raw IPs, punycode, risky TLDs, redirects, credential words, executable links, SPF/DKIM/DMARC results, Reply-To and display-name mismatches and more.'], ['Local ML model', 'A small logistic-regression scorer over URL features, blended with the rules. Its weights are hand-tuned rather than trained on a dataset, so treat it as a secondary signal.'], ['Network checks', 'DNS, a TLS handshake (no page content is fetched) and RDAP domain age. Private and internal addresses are never contacted.'], ['Threat intelligence', 'Public phishing/malware feeds (OpenPhish, URLhaus) refresh every 6 hours. Optional local LLM via Ollama writes plain-English explanations and never changes the score.']].map(([t, d], i) => <Reveal key={t} delay={i * 80}><div className="card c-blue"><h3 className="h3">{t}</h3><p className="muted" style={{ marginTop: 8, fontSize: '.9rem' }}>{d}</p></div></Reveal>)}
      </div>
      <h2 className="h2" style={{ margin: '50px 0 20px' }}>Stack</h2>
      <div className="grid g4">{[[Layout, 'React + Vite'], [Server, 'Express'], [Database, 'MongoDB'], [Cpu, 'Local AI (optional)']].map(([I, t]) => <div key={t} className="card hover c-purple row"><span className="ico sm"><I size={18} /></span><b>{t}</b></div>)}</div>
      <p className="legal" style={{ marginTop: 30 }}>No detection system is perfect. Treat DefendIQ as one layer of defence and verify high-stakes requests through official channels.</p>
    </section>
  );
}

export function NotFound() {
  useDocumentTitle('Not found');
  return <div className="container center" style={{ padding: '100px 0' }}><Logo size={80} text={false} /><h1 className="h1" style={{ margin: '20px 0 8px' }}>404</h1><p className="muted">That page does not exist.</p><Link to="/" className="btn btn-primary" style={{ marginTop: 20 }}>Back home</Link></div>;
}
