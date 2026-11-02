import { Link } from 'react-router-dom';
import { ArrowRight, Check, UserCheck, RefreshCw, ShieldCheck, Brain, Activity } from 'lucide-react';
import { Reveal } from '../components/Motion.jsx';
import { FEATURES } from './shared.jsx';
import { useDocumentTitle } from '../lib/hooks.js';

const DETAILS = {
  'URL Scanning': ['Brand impersonation & typosquatting', 'IP, punycode and "@" tricks', 'TLS certificate and domain-age checks'],
  'Email Analysis': ['Header auth (SPF / DKIM / DMARC)', 'Display-name spoofing and Reply-To mismatch', 'Link-text vs destination mismatch'],
  'Threat Intelligence': ['OpenPhish / URLhaus feed matching', 'Auto-refreshed every 6 hours', 'Community trends on the Intel page'],
  'Smart Detection': ['Explainable rule engine', 'Local logistic ML model', 'Optional local LLM (Ollama) explanations'],
  'Instant Results': ['Verdict, score and reasons', 'Saved history and reports', 'Alerts for risky scans'],
};

export default function Features() {
  useDocumentTitle('Features');
  return (
    <>
      <section className="container center" style={{ padding: '60px 0 30px' }}>
        <div className="eyebrow">Our Features</div>
        <h1 className="h1" style={{ fontSize: 'clamp(2rem,4.6vw,3.2rem)', margin: '12px 0' }}>Advanced Security Features<br />for a <span className="gt">Safer Digital World</span></h1>
        <p className="muted" style={{ maxWidth: 620, margin: '0 auto' }}>DefendIQ combines explainable rules, a local ML model and refreshed threat intelligence to assess potential risks when you scan.</p>
      </section>
      <section className="container"><div className="grid g5">
        {FEATURES.map((f, i) => (
          <Reveal key={f.title} delay={i * 80}><div className={`card hover feat ${f.c}`} style={{ height: '100%' }}><span className="ico" style={{ width: 54, height: 54 }}><f.icon size={26} /></span><h3 className="h3">{f.title}</h3><p>{f.text}</p><ul style={{ padding: 0, margin: '12px 0 0', listStyle: 'none', fontSize: '.8rem', color: 'var(--muted)' }}>{DETAILS[f.title].map((d) => <li key={d} style={{ padding: '3px 0' }}>• {d}</li>)}</ul><Link to="/scan" className="more">Try it <ArrowRight size={14} /></Link></div></Reveal>
        ))}
      </div></section>
      <section className="container section"><div className="split" style={{ gridTemplateColumns: '.8fr 1.2fr', alignItems: 'center' }}>
        <Reveal><div className="eyebrow">Personal dashboard</div><h2 className="h2" style={{ margin: '10px 0' }}>Your Security <span className="gt">at a Glance</span></h2><p className="muted">Review your own scans, threat findings and activity after signing in. The dashboard uses your saved account data.</p><ul className="checks">{['Scan history from your account', 'Detailed scan reports', 'Security score based on your scans', 'Recent scan activity'].map((t) => <li key={t}><Check size={18} />{t}</li>)}</ul><Link to="/dashboard" className="btn btn-primary" style={{ marginTop: 14 }}>Explore Dashboard <ArrowRight size={16} /></Link></Reveal>
        <Reveal delay={100}><div className="card c-blue"><div className="card-title"><span className="ico sm"><Activity size={18} /></span>Activity updates</div><p className="muted">Scan history, reports and alerts are populated from your saved scans. Sign in to view your account’s current activity—no sample scores or example scan counts are shown here.</p><Link to="/signup" className="btn btn-ghost btn-sm" style={{ marginTop: 18 }}>Create an account <ArrowRight size={14} /></Link></div></Reveal>
      </div></section>
      <section className="container section">
        <Reveal><div className="eyebrow">Why choose DefendIQ?</div><h2 className="h2" style={{ margin: '8px 0 24px' }}>More Than <span className="gt2">Just a Scanner</span></h2></Reveal>
        <div className="grid g4">{[[Brain, 'AI-Assisted Detection', 'Explainable scoring with a local ML model.'], [UserCheck, 'User-Friendly', 'Simple, clean and intuitive.'], [ShieldCheck, 'On-demand Scanning', 'Check suspicious links and emails before acting.'], [RefreshCw, 'Refreshed Intelligence', 'Threat feeds refresh automatically.']].map(([I, t, d], i) => <Reveal key={t} delay={i * 80}><div className="card hover c-teal"><span className="ico"><I size={22} /></span><h3 className="h3" style={{ margin: '12px 0 4px', fontSize: '1rem' }}>{t}</h3><p className="muted" style={{ fontSize: '.85rem' }}>{d}</p></div></Reveal>)}</div>
      </section>
      <section className="container section"><Reveal><div className="cta"><div><div className="eyebrow">Get started today</div><h2 className="h2" style={{ marginTop: 6 }}>Ready to Protect Yourself?</h2></div><Link to="/scan" className="btn btn-primary btn-lg">Start Free Scan <ArrowRight size={16} /></Link></div></Reveal></section>
    </>
  );
}
