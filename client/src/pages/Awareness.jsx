import { useState } from 'react';
import { NavLink, Route, Routes, Link } from 'react-router-dom';
import { GraduationCap, Lightbulb, CheckCircle2, Circle, Clock, Trophy, Mail, MessageSquare, Globe, Users, RefreshCw } from 'lucide-react';
import { PageHead, Skel, Empty } from '../components/ui.jsx';
import ScoreRing from '../components/ScoreRing.jsx';
import { useToast } from '../context/Toast.jsx';
import { api } from '../lib/api.js';
import { useApi, useDocumentTitle } from '../lib/hooks.js';

function Subnav() {
  return <div className="tabs" style={{ marginBottom: 22 }}>{[['/awareness', 'Learn', true], ['/awareness/quiz', 'Quiz'], ['/awareness/simulations', 'Simulations']].map(([to, l, end]) => <NavLink key={to} to={to} end={end} style={{ textDecoration: 'none' }}>{({ isActive }) => <button className={isActive ? 'on' : ''} tabIndex={-1}>{l}</button>}</NavLink>)}</div>;
}

function Learn() {
  const toast = useToast();
  const { data, loading, reload } = useApi('/awareness/overview');
  const [open, setOpen] = useState(null);
  const toggle = async (m) => { try { m.completed ? await api.del(`/awareness/modules/${m.id}/complete`) : await api.post(`/awareness/modules/${m.id}/complete`); if (!m.completed) toast.success('Module completed!'); reload(); } catch (e) { toast.error(e.message); } };
  if (loading && !data) return <Skel h={300} />;
  if (!data) return null;
  const done = data.modules.filter((m) => m.completed).length;
  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div className="grid g3">
        <div className="card c-teal"><div className="stat-lbl">Modules completed</div><div className="bignum">{done}/{data.modules.length}</div><div className="pbar" style={{ marginTop: 12 }}><i style={{ width: `${(done / data.modules.length) * 100}%` }} /></div></div>
        <div className="card c-purple"><div className="stat-lbl">Best quiz score</div><div className="bignum">{data.quiz.best == null ? '—' : `${data.quiz.best}%`}</div><div className="stat-lbl">{data.quiz.attempts} attempt(s)</div></div>
        <div className="card c-orange"><div className="stat-lbl">Simulations solved</div><div className="bignum">{data.simulations.correct}/{data.simulations.total}</div><div className="stat-lbl">{data.simulations.answered} answered</div></div>
      </div>
      <div className="grid g2">
        {data.modules.map((m) => (
          <div key={m.id} className={`card hover ${m.completed ? 'c-teal' : 'c-blue'}`}>
            <div className="row between"><h3 className="h3" style={{ fontSize: '1rem' }}>{m.title}</h3><span className="muted row" style={{ fontSize: '.78rem', gap: 4 }}><Clock size={13} />{m.minutes} min</span></div>
            {open === m.id && <ul style={{ margin: '12px 0 0', paddingLeft: 18, color: 'var(--muted)', fontSize: '.9rem' }}>{m.points.map((p) => <li key={p} style={{ padding: '3px 0' }}>{p}</li>)}</ul>}
            <div className="row wrap" style={{ marginTop: 14 }}><button className="btn btn-plain btn-sm" onClick={() => setOpen(open === m.id ? null : m.id)}>{open === m.id ? 'Hide' : 'Read'}</button><button className={`btn btn-sm ${m.completed ? 'btn-ghost' : 'btn-primary'}`} onClick={() => toggle(m)}>{m.completed ? <><CheckCircle2 size={14} /> Completed</> : <><Circle size={14} /> Mark complete</>}</button></div>
          </div>
        ))}
      </div>
      <div className="card c-orange"><div className="card-title"><span className="ico sm"><Lightbulb size={18} /></span>Security tips</div><div className="grid g2" style={{ gap: 4 }}>{data.tips.map((t) => <div key={t} className="list-item" style={{ fontSize: '.88rem' }}><span className="t-ok">✓</span>{t}</div>)}</div></div>
    </div>
  );
}

function Quiz() {
  const toast = useToast();
  const [qs, setQs] = useState(null);
  const [idx, setIdx] = useState(0);
  const [ans, setAns] = useState({});
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  async function start() { try { const r = await api.get('/awareness/quiz'); setQs(r.questions); setIdx(0); setAns({}); setRes(null); } catch (e) { toast.error(e.message); } }
  async function finish() {
    setBusy(true);
    try { setRes(await api.post('/awareness/quiz/submit', { answers: qs.map((q) => ({ id: q.id, choice: ans[q.id] ?? null })) })); } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  }
  if (!qs) return <div className="card c-purple center" style={{ padding: 40 }}><GraduationCap size={48} color="var(--accent)" /><h2 className="h2" style={{ margin: '12px 0' }}>Phishing awareness quiz</h2><p className="muted" style={{ maxWidth: 480, margin: '0 auto 20px' }}>10 random questions from a bank of 15. Instant explanations after you finish. Results are saved to your profile.</p><button className="btn btn-primary btn-lg" onClick={start}>Start quiz</button></div>;
  if (res) return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div className="card c-teal row wrap" style={{ gap: 30, justifyContent: 'center' }}><ScoreRing value={res.percent} size={170} label={res.percent >= 80 ? 'Great job!' : res.percent >= 50 ? 'Getting there' : 'Keep practising'} sub={`${res.score} of ${res.total} correct`} /><div className="row wrap"><button className="btn btn-primary" onClick={start}><RefreshCw size={15} /> Try again</button><Link to="/awareness" className="btn btn-plain">Back to learning</Link></div></div>
      {res.results.map((r, i) => <div key={r.id} className={`card ${r.correct ? 'c-teal' : 'c-red'}`}><b>{i + 1}. {r.q}</b><p style={{ margin: '8px 0', fontSize: '.88rem' }}>Your answer: <span className={r.correct ? 't-ok' : 't-bad'}>{r.chosen == null ? 'No answer' : r.options[r.chosen]}</span>{!r.correct && <> • Correct: <span className="t-ok">{r.options[r.answer]}</span></>}</p><p className="muted" style={{ fontSize: '.85rem' }}>{r.why}</p></div>)}
    </div>
  );
  const q = qs[idx];
  return (
    <div className="card c-purple">
      <div className="row between"><span className="muted">Question {idx + 1} of {qs.length}</span><span className="pbar" style={{ width: 160 }}><i style={{ width: `${((idx + 1) / qs.length) * 100}%` }} /></span></div>
      <h2 className="h3" style={{ fontSize: '1.2rem', margin: '18px 0 6px' }}>{q.q}</h2>
      {q.options.map((o, i) => <button key={o} className={`opt ${ans[q.id] === i ? 'sel' : ''}`} onClick={() => setAns({ ...ans, [q.id]: i })}><span className="ico sm" style={{ width: 30, height: 30 }}>{'ABCD'[i]}</span>{o}</button>)}
      <div className="row between" style={{ marginTop: 22 }}><button className="btn btn-plain" disabled={idx === 0} onClick={() => setIdx(idx - 1)}>Back</button>{idx < qs.length - 1 ? <button className="btn btn-primary" onClick={() => setIdx(idx + 1)}>Next</button> : <button className="btn btn-primary" disabled={busy} onClick={finish}>{busy ? 'Scoring…' : 'Finish'}</button>}</div>
    </div>
  );
}

const CH = { email: [Mail, 'Email'], sms: [MessageSquare, 'SMS'], website: [Globe, 'Website'], social: [Users, 'Social DM'] };
function Sims() {
  const toast = useToast();
  const { data, loading, reload } = useApi('/awareness/simulations');
  const [i, setI] = useState(0);
  const [fb, setFb] = useState(null);
  if (loading && !data) return <Skel h={300} />;
  if (!data) return null;
  const s = data.scenarios[i];
  const [I, ch] = CH[s.channel];
  async function judge(verdict) { try { setFb(await api.post(`/awareness/simulations/${s.id}/answer`, { verdict })); } catch (e) { toast.error(e.message); } }
  const next = () => { setFb(null); setI((i + 1) % data.scenarios.length); if (i + 1 >= data.scenarios.length) reload(); };
  return (
    <div className="grid g2" style={{ gridTemplateColumns: '1.2fr .8fr', alignItems: 'start' }}>
      <div>
        <div className="row between" style={{ marginBottom: 10 }}><span className="badge info"><I size={13} /> {ch} • scenario {i + 1}/{data.scenarios.length}</span>{s.solved && <span className="badge safe">solved</span>}</div>
        <div className="mail"><div className="hd"><div><span className="muted">From:</span> {s.from}</div>{s.subject && <b>{s.subject}</b>}</div><pre>{s.body}</pre></div>
        <p className="muted" style={{ fontSize: '.78rem', marginTop: 8 }}>This is a safe, fictional exercise. Do not interact with real messages like this.</p>
      </div>
      <div className="card c-orange">
        {!fb ? <><h3 className="h3">Is this message legitimate?</h3><p className="muted" style={{ fontSize: '.88rem', margin: '8px 0 16px' }}>Look at the sender, links, tone and what it asks you to do.</p><div className="row wrap"><button className="btn btn-danger" onClick={() => judge('phishing')}>It's phishing</button><button className="btn btn-ghost" onClick={() => judge('legit')}>It's legitimate</button></div></> : (
          <div><div className={`banner ${fb.correct ? 'safe' : 'malicious'}`} style={{ marginTop: 0 }}><Trophy color={fb.correct ? 'var(--accent)' : 'var(--red)'} /><div><b>{fb.correct ? 'Correct!' : 'Not quite.'}</b><small>This was {fb.isPhishing ? 'a phishing attempt' : 'a legitimate message'}.</small></div></div>
            <div className="card-title" style={{ marginTop: 16 }}>{fb.isPhishing ? 'Red flags' : 'Why it looks genuine'}</div>{fb.flags.map((f) => <div key={f} className="row" style={{ padding: '4px 0', fontSize: '.86rem', alignItems: 'flex-start' }}><span className={fb.isPhishing ? 't-bad' : 't-ok'}>●</span>{f}</div>)}
            <p className="muted" style={{ fontSize: '.85rem', margin: '14px 0' }}>{fb.lesson}</p><button className="btn btn-primary" onClick={next}>Next scenario</button></div>
        )}
      </div>
    </div>
  );
}

export default function Awareness() {
  useDocumentTitle('Awareness');
  return (
    <>
      <PageHead eyebrow="Awareness" title="Train your instincts">Short lessons, quizzes and realistic simulations - the best protection is a sharp eye.</PageHead>
      <Subnav />
      <Routes><Route index element={<Learn />} /><Route path="quiz" element={<Quiz />} /><Route path="simulations" element={<Sims />} /></Routes>
    </>
  );
}
