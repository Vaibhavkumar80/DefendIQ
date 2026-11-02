import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, Download, Trash2, KeyRound, Pencil } from 'lucide-react';
import { PageHead, Skel, FieldError } from '../components/ui.jsx';
import { PwField } from './Auth.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/Toast.jsx';
import { api } from '../lib/api.js';
import { useApi, useDocumentTitle } from '../lib/hooks.js';
import { fmtDate } from '../lib/format.js';

export function Profile() {
  useDocumentTitle('Profile');
  const { user, setUser } = useAuth();
  const toast = useToast();
  const { data, loading } = useApi('/account/profile');
  const [name, setName] = useState(user.name);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  async function save(e) {
    e.preventDefault(); setErr('');
    if (name.trim().length < 2) return setErr('Name must be at least 2 characters.');
    setBusy(true);
    try { const r = await api.patch('/account/profile', { name }); setUser(r.user); toast.success('Profile updated.'); } catch (x) { setErr(x.message); } finally { setBusy(false); }
  }
  return (
    <>
      <PageHead eyebrow="Profile" title="Your profile" />
      <div className="grid g2" style={{ gridTemplateColumns: '.9fr 1.1fr' }}>
        <div className="card c-purple center"><div className="avatar lg" style={{ margin: '0 auto 14px' }}>{user.name[0].toUpperCase()}</div><h2 className="h3">{user.name}</h2><p className="muted">{user.email}</p><p className="legal" style={{ marginTop: 10 }}>Member since {fmtDate(user.createdAt, { dateStyle: 'medium' })}</p>
          {data && <div className="grid g2" style={{ marginTop: 20, gap: 10, textAlign: 'left' }}>{[['Scans', data.stats.scans], ['Threats found', data.stats.threats], ['Best quiz', `${data.stats.quizBest}%`], ['Modules', data.stats.modules]].map(([l, v]) => <div className="tile" key={l}><small>{l}</small><div className="v" style={{ fontSize: '1.4rem' }}>{v}</div></div>)}</div>}
        </div>
        <div style={{ display: 'grid', gap: 20 }}>
          <form className="card c-teal" onSubmit={save} noValidate><div className="card-title"><Pencil size={17} />Edit details</div><label className="label" htmlFor="nm">Full name</label><div className={`field ${err ? 'err' : ''}`}><input id="nm" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} /></div><FieldError error={err} /><label className="label" style={{ marginTop: 14 }}>Email (cannot be changed)</label><div className="field" style={{ opacity: .6 }}><input value={user.email} disabled /></div><button className="btn btn-primary" style={{ marginTop: 16 }} disabled={busy || name.trim() === user.name}>{busy ? 'Saving…' : 'Save changes'}</button></form>
          <div className="card c-orange"><div className="card-title"><Award size={17} />Achievements</div>{loading && !data ? <Skel h={100} /> : <div className="grid g2" style={{ gap: 10 }}>{data.badges.map((b) => <div key={b.id} className="tile" style={{ opacity: b.earned ? 1 : .45, borderColor: b.earned ? 'var(--accent)' : undefined }}><b style={{ fontSize: '.9rem' }}>{b.earned ? '🏆' : '🔒'} {b.title}</b><small style={{ display: 'block' }}>{b.desc}</small></div>)}</div>}</div>
        </div>
      </div>
    </>
  );
}

function Toggle({ label, desc, checked, onChange }) {
  return <label className="list-item" style={{ cursor: 'pointer' }}><div style={{ flex: 1 }}><div className="t">{label}</div><small style={{ wordBreak: 'normal' }}>{desc}</small></div><span className="switch"><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} /><span /></span></label>;
}

export function SettingsPage() {
  useDocumentTitle('Settings');
  const { user, setUser, setTheme, logout } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const s = user.settings;
  const { data: prof } = useApi('/account/profile');
  const [pw, setPw] = useState({ cur: '', next: '', next2: '' });
  const [pwErr, setPwErr] = useState('');
  const [del, setDel] = useState({ password: '', confirm: '' });
  const [delErr, setDelErr] = useState('');
  async function patch(p) { if (p.theme) { setTheme(p.theme); return; } try { const r = await api.patch('/account/settings', p); setUser(r.user); toast.success('Settings saved.'); } catch (e) { toast.error(e.message); } }
  async function changePw(e) {
    e.preventDefault(); setPwErr('');
    if (pw.next.length < 8 || !/[A-Za-z]/.test(pw.next) || !/\d/.test(pw.next)) return setPwErr('Use 8+ characters with a letter and a number.');
    if (pw.next !== pw.next2) return setPwErr('New passwords do not match.');
    try { await api.patch('/account/password', { currentPassword: pw.cur, newPassword: pw.next }); toast.success('Password changed.'); setPw({ cur: '', next: '', next2: '' }); } catch (x) { setPwErr(x.message); }
  }
  async function remove(e) {
    e.preventDefault(); setDelErr('');
    try { await api.del('/account', { password: del.password || undefined, confirm: del.confirm }); toast.success('Account deleted.'); await logout().catch(() => {}); nav('/'); } catch (x) { setDelErr(x.message); }
  }
  async function exportData() {
    try { const r = await fetch(`${api.base}/account/export`, { credentials: 'include' }); if (!r.ok) throw new Error('Export failed.'); const blob = await r.blob(); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'defendiq-export.json'; a.click(); URL.revokeObjectURL(a.href); } catch (e) { toast.error(e.message); }
  }
  return (
    <>
      <PageHead eyebrow="Settings" title="Preferences & security" />
      <div className="grid g2" style={{ alignItems: 'start' }}>
        <div className="card c-blue">
          <div className="card-title">Preferences</div>
          <Toggle label="Dark theme" desc="Switch between dark and light appearance." checked={s.theme === 'dark'} onChange={(v) => patch({ theme: v ? 'dark' : 'light' })} />
          <Toggle label="Save scan history" desc="Keep a record of your scans. Turn off to scan without saving." checked={s.saveHistory} onChange={(v) => patch({ saveHistory: v })} />
          <Toggle label="Deep network checks" desc="DNS, TLS certificate and domain-age lookups for URLs. Turn off for faster, offline-only analysis." checked={s.deepChecks} onChange={(v) => patch({ deepChecks: v })} />
          <Toggle label="Security alerts" desc="Create an in-app alert when a scan finds something risky." checked={s.alertsEnabled} onChange={(v) => patch({ alertsEnabled: v })} />
          <div className="list-item"><div style={{ flex: 1 }}><div className="t">Alert threshold</div><small style={{ wordBreak: 'normal' }}>Which verdicts create an alert.</small></div><div className="field" style={{ minHeight: 38 }}><select value={s.alertThreshold} onChange={(e) => patch({ alertThreshold: e.target.value })} aria-label="Alert threshold"><option value="suspicious">Suspicious + malicious</option><option value="malicious">Malicious only</option></select></div></div>
        </div>
        <div style={{ display: 'grid', gap: 20 }}>
          <form className="card c-teal" onSubmit={changePw} noValidate>
            <div className="card-title"><KeyRound size={17} />{prof && !prof.hasPassword ? 'Set a password' : 'Change password'}</div>
            <div className="stack">{(!prof || prof.hasPassword) && <PwField value={pw.cur} onChange={(e) => setPw({ ...pw, cur: e.target.value })} placeholder="Current password" autoComplete="current-password" />}<PwField value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} placeholder="New password" autoComplete="new-password" /><PwField value={pw.next2} onChange={(e) => setPw({ ...pw, next2: e.target.value })} placeholder="Confirm new password" autoComplete="new-password" /><FieldError error={pwErr} /><button className="btn btn-primary">Update password</button></div>
          </form>
          <div className="card c-purple"><div className="card-title"><Download size={17} />Your data</div><p className="muted" style={{ fontSize: '.88rem', marginBottom: 12 }}>Download everything DefendIQ stores about you (profile, scans, alerts, quiz and simulation results) as JSON.</p><button className="btn btn-ghost" onClick={exportData}>Export my data</button></div>
          <form className="card c-red" onSubmit={remove}><div className="card-title"><Trash2 size={17} />Delete account</div><p className="muted" style={{ fontSize: '.88rem', marginBottom: 12 }}>Permanently deletes your account, scans, alerts and training progress.</p><div className="stack">{prof?.hasPassword && <PwField value={del.password} onChange={(e) => setDel({ ...del, password: e.target.value })} placeholder="Your password" />}<div className="field"><input value={del.confirm} onChange={(e) => setDel({ ...del, confirm: e.target.value })} placeholder='Type DELETE to confirm' aria-label="Type DELETE to confirm" /></div><FieldError error={delErr} /><button className="btn btn-danger" disabled={del.confirm !== 'DELETE'}>Delete my account</button></div></form>
        </div>
      </div>
    </>
  );
}
