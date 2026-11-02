import { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, Check, ShieldCheck } from 'lucide-react';
import { HeroShield } from '../components/Logo.jsx';
import GoogleButton from '../components/GoogleButton.jsx';
import { FieldError } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/Toast.jsx';
import { api } from '../lib/api.js';
import { useApi, useDocumentTitle } from '../lib/hooks.js';
import { CountUp } from '../components/Motion.jsx';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function strength(p) { let s = 0; if (p.length >= 8) s++; if (p.length >= 12) s++; if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++; if (/\d/.test(p) && /[^A-Za-z0-9]/.test(p)) s++; return s; }

function PwField({ value, onChange, placeholder = 'Password', error, autoComplete }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <div className={`field ${error ? 'err' : ''}`}><Lock size={18} /><input type={show ? 'text' : 'password'} value={value} onChange={onChange} placeholder={placeholder} autoComplete={autoComplete} maxLength={72} aria-label={placeholder} /><button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'} style={{ background: 'none', border: 0, color: 'var(--muted)', display: 'grid' }}>{show ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
      <FieldError error={error} />
    </div>
  );
}

function AuthShell({ eyebrow, title, accent, text, points, children }) {
  const { data } = useApi('/public/stats');
  return (
    <section className="container auth-wrap">
      <div className="auth-art">
        <div className="eyebrow">{eyebrow}</div>
        <h1 className="h1" style={{ fontSize: 'clamp(2.2rem,4.5vw,3.4rem)', margin: '12px 0' }}>{title}<br /><span className="gt">{accent}</span></h1>
        <p className="muted" style={{ maxWidth: 440 }}>{text}</p>
        <ul className="checks">{points.map((p) => <li key={p}><Check size={18} />{p}</li>)}</ul>
        <HeroShield />
        {data && <div className="card c-blue row" style={{ justifyContent: 'space-around', padding: 14 }}>{[['Scans', data.scans], ['Threats flagged', data.threats], ['Users', data.users]].map(([l, v]) => <div key={l} style={{ textAlign: 'center' }}><b style={{ fontSize: '1.2rem' }}><CountUp value={v} /></b><div className="muted" style={{ fontSize: '.74rem' }}>{l}</div></div>)}</div>}
      </div>
      <div className="card auth-card">{children}</div>
    </section>
  );
}

export function Login() {
  useDocumentTitle('Login');
  const { login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const toast = useToast();
  const [f, setF] = useState({ email: '', password: '', remember: true });
  const [err, setErr] = useState({});
  const [busy, setBusy] = useState(false);
  const dest = loc.state?.from || '/dashboard';
  async function submit(e) {
    e.preventDefault();
    const er = {};
    if (!EMAIL_RE.test(f.email)) er.email = 'Enter a valid email address.';
    if (!f.password) er.password = 'Enter your password.';
    setErr(er); if (Object.keys(er).length) return;
    setBusy(true);
    try { await login({ email: f.email, password: f.password, remember: f.remember }); nav(dest, { replace: true }); } catch (x) { setErr({ form: x.message }); } finally { setBusy(false); }
  }
  return (
    <AuthShell eyebrow="Welcome back" title="Secure Your" accent="Digital World" text="Log in to DefendIQ to scan for phishing, malware and other online threats." points={['AI-assisted threat detection', 'On-demand URL and email scanning', 'Secure & private']}>
      <div className="center" style={{ marginBottom: 20 }}><h2 className="h3" style={{ fontSize: '1.3rem' }}>Login to your account</h2></div>
      <form onSubmit={submit} noValidate className="stack">
        {err.form && <div className="banner malicious" role="alert" style={{ marginTop: 0 }}>{err.form}</div>}
        <div><div className={`field ${err.email ? 'err' : ''}`}><Mail size={18} /><input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="Email address" autoComplete="email" aria-label="Email address" /></div><FieldError error={err.email} /></div>
        <PwField value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} error={err.password} autoComplete="current-password" />
        <div className="row between"><label className="check"><input type="checkbox" checked={f.remember} onChange={(e) => setF({ ...f, remember: e.target.checked })} />Remember me</label><Link to="/forgot-password" style={{ color: 'var(--cyan)', fontSize: '.85rem' }}>Forgot password?</Link></div>
        <button className="btn btn-primary btn-block btn-lg" disabled={busy}>{busy ? 'Signing in…' : <>Login <ArrowRight size={16} /></>}</button>
      </form>
      <div className="or">OR</div>
      <GoogleButton onSuccess={() => { toast.success('Signed in with Google.'); nav(dest, { replace: true }); }} />
      <p className="center muted" style={{ marginTop: 20, fontSize: '.88rem' }}>Don't have an account? <Link to="/signup" style={{ color: 'var(--accent)' }}>Sign Up</Link></p>
    </AuthShell>
  );
}

export function Signup() {
  useDocumentTitle('Sign up');
  const { register } = useAuth();
  const nav = useNavigate();
  const toast = useToast();
  const [f, setF] = useState({ name: '', email: '', password: '', confirm: '' });
  const [err, setErr] = useState({});
  const [busy, setBusy] = useState(false);
  const st = strength(f.password);
  async function submit(e) {
    e.preventDefault();
    const er = {};
    if (f.name.trim().length < 2) er.name = 'Enter your full name.';
    if (!EMAIL_RE.test(f.email)) er.email = 'Enter a valid email address.';
    if (f.password.length < 8 || !/[A-Za-z]/.test(f.password) || !/\d/.test(f.password)) er.password = 'Use 8+ characters with a letter and a number.';
    if (f.confirm !== f.password) er.confirm = 'Passwords do not match.';
    setErr(er); if (Object.keys(er).length) return;
    setBusy(true);
    try { await register({ name: f.name, email: f.email, password: f.password, confirmPassword: f.confirm, remember: true }); toast.success('Account created. Welcome to DefendIQ!'); nav('/dashboard', { replace: true }); } catch (x) { setErr(x.fields || { form: x.message }); } finally { setBusy(false); }
  }
  return (
    <AuthShell eyebrow="Create your account" title="Join DefendIQ" accent="Be One Step Ahead" text="Get started for free and access tools that help you assess suspicious links and emails." points={['AI-assisted protection', 'On-demand threat analysis', 'Detailed security reports', 'Your privacy matters']}>
      <div className="center" style={{ marginBottom: 20 }}><h2 className="h3" style={{ fontSize: '1.3rem' }}>Create your account</h2></div>
      <form onSubmit={submit} noValidate className="stack">
        {err.form && <div className="banner malicious" role="alert" style={{ marginTop: 0 }}>{err.form}</div>}
        <div><div className={`field ${err.name ? 'err' : ''}`}><User size={18} /><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Full Name" autoComplete="name" maxLength={60} aria-label="Full name" /></div><FieldError error={err.name} /></div>
        <div><div className={`field ${err.email ? 'err' : ''}`}><Mail size={18} /><input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="Email address" autoComplete="email" aria-label="Email address" /></div><FieldError error={err.email} /></div>
        <div><PwField value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} error={err.password} autoComplete="new-password" /><div className="strength" aria-hidden="true">{[0, 1, 2, 3].map((i) => <i key={i} className={i < st ? `on ${st <= 1 ? 'b' : st === 2 ? 'w' : ''}` : ''} />)}</div></div>
        <PwField value={f.confirm} onChange={(e) => setF({ ...f, confirm: e.target.value })} placeholder="Confirm password" error={err.confirm} autoComplete="new-password" />
        <button className="btn btn-primary btn-block btn-lg" disabled={busy}>{busy ? 'Creating…' : <>Create Account <ArrowRight size={16} /></>}</button>
      </form>
      <div className="or">OR</div>
      <GoogleButton text="Sign up with Google" onSuccess={() => { toast.success('Signed in with Google.'); nav('/dashboard', { replace: true }); }} />
      <p className="center muted" style={{ marginTop: 20, fontSize: '.88rem' }}>Already have an account? <Link to="/login" style={{ color: 'var(--accent)' }}>Login</Link></p>
    </AuthShell>
  );
}

export function Forgot() {
  useDocumentTitle('Forgot password');
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    if (!EMAIL_RE.test(email)) return setErr('Enter a valid email address.');
    setBusy(true); setErr('');
    try { await api.post('/auth/forgot', { email }); setDone(true); } catch (x) { setErr(x.message); } finally { setBusy(false); }
  }
  return (
    <AuthShell eyebrow="Account recovery" title="Reset your" accent="password" text="Enter your email and we'll send a reset link that works for 30 minutes." points={['Links expire quickly', 'Single use', 'We never reveal whether an email exists']}>
      <h2 className="h3 center" style={{ fontSize: '1.3rem', marginBottom: 20 }}>Forgot password</h2>
      {done ? <div className="banner safe" style={{ marginTop: 0 }}><ShieldCheck color="var(--accent)" /><div><b>Check your inbox</b><small>If that email is registered, a reset link is on its way. (No SMTP configured? The link prints in the server console.)</small></div></div> : (
        <form onSubmit={submit} noValidate className="stack"><div><div className={`field ${err ? 'err' : ''}`}><Mail size={18} /><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" aria-label="Email address" /></div><FieldError error={err} /></div><button className="btn btn-primary btn-block btn-lg" disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</button></form>
      )}
      <p className="center muted" style={{ marginTop: 20, fontSize: '.88rem' }}><Link to="/login" style={{ color: 'var(--accent)' }}>Back to login</Link></p>
    </AuthShell>
  );
}

export function Reset() {
  useDocumentTitle('Reset password');
  const [p] = useSearchParams();
  const nav = useNavigate();
  const toast = useToast();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    if (pw.length < 8 || !/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return setErr('Use 8+ characters with a letter and a number.');
    if (pw !== pw2) return setErr('Passwords do not match.');
    setBusy(true); setErr('');
    try { await api.post('/auth/reset', { email: p.get('email') || '', token: p.get('token') || '', password: pw }); toast.success('Password updated. Please log in.'); nav('/login'); } catch (x) { setErr(x.message); } finally { setBusy(false); }
  }
  return (
    <AuthShell eyebrow="Account recovery" title="Choose a new" accent="password" text="Pick something unique that you do not use anywhere else." points={['At least 8 characters', 'Include a letter and a number']}>
      <h2 className="h3 center" style={{ fontSize: '1.3rem', marginBottom: 20 }}>New password</h2>
      <form onSubmit={submit} noValidate className="stack"><PwField value={pw} onChange={(e) => setPw(e.target.value)} placeholder="New password" autoComplete="new-password" /><PwField value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="Confirm new password" autoComplete="new-password" /><FieldError error={err} /><button className="btn btn-primary btn-block btn-lg" disabled={busy}>{busy ? 'Saving…' : 'Update password'}</button></form>
    </AuthShell>
  );
}

export { PwField };
