import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Search, History, Bell, Globe, FileText, GraduationCap, User, Settings, Sun, Moon, Menu, X, LogOut, ChevronDown, ShieldCheck } from 'lucide-react';
import Logo from './Logo.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../lib/api.js';
import { isLikelyUrl, timeAgo } from '../lib/format.js';

const Social = ({ href, label, d }) => (href ? <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label}><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d={d} /></svg></a> : null);
const E = import.meta.env;

export function Footer() {
  return (
    <footer className="footer no-print">
      <div className="container footer-in">
        <div><Logo size={30} /><div className="muted" style={{ fontSize: '.78rem', marginTop: 6 }}>Detect. Prevent. Stay Ahead.</div></div>
        <nav><Link to="/">Home</Link><Link to="/features">Features</Link><Link to="/dashboard">Dashboard</Link><Link to="/pricing">Pricing</Link><Link to="/about">About</Link></nav>
        <div style={{ textAlign: 'right' }}>
          <div className="socials" style={{ justifyContent: 'flex-end' }}>
            <Social href={E.VITE_SOCIAL_GITHUB} label="GitHub" d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
            <Social href={E.VITE_SOCIAL_LINKEDIN} label="LinkedIn" d="M20.4 20.5h-3.600v-5.600c0-1.300 0-3-1.800-3s-2.100 1.400-2.100 2.900v5.700H9.300V9h3.400v1.600c.5-.9 1.600-1.800 3.400-1.800 3.600 0 4.300 2.400 4.300 5.500v6.200zM5.300 7.400a2.100 2.100 0 1 1 0-4.100 2.100 2.100 0 0 1 0 4.100zM7.100 20.500H3.600V9h3.500v11.500zM22.200 0H1.800C.8 0 0 .8 0 1.700v20.600c0 .9.8 1.700 1.800 1.700h20.400c1 0 1.800-.8 1.800-1.700V1.700C24 .8 23.200 0 22.200 0z" />
            <Social href={E.VITE_SOCIAL_TWITTER} label="X / Twitter" d="M18.200 2.300h3.400l-7.400 8.500L23 21.700h-6.800l-5.300-7-6.100 7H1.400l7.900-9.100L1 2.300h7l4.800 6.400 5.400-6.400zm-1.200 17.400h1.900L7 4.200H5l12 15.500z" />
            <Social href={E.VITE_SOCIAL_YOUTUBE} label="YouTube" d="M23.500 6.200a3 3 0 0 0-2.100-2.100C19.500 3.600 12 3.600 12 3.600s-7.500 0-9.400.5A3 3 0 0 0 .5 6.200C0 8.100 0 12 0 12s0 3.900.5 5.800a3 3 0 0 0 2.100 2.100c1.900.5 9.400.5 9.400.5s7.500 0 9.400-.5a3 3 0 0 0 2.100-2.100c.5-1.900.5-5.800.5-5.800s0-3.900-.5-5.800zM9.600 15.600V8.400l6.200 3.600-6.200 3.600z" />
          </div>
          <div className="legal" style={{ marginTop: 8 }}>© {new Date().getFullYear()} DefendIQ. All rights reserved.</div>
        </div>
      </div>
    </footer>
  );
}

function ThemeBtn() {
  const { theme, toggleTheme } = useAuth();
  return <button className="icon-btn" onClick={toggleTheme} aria-label="Toggle light/dark theme">{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</button>;
}

function UserMenu() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, []);
  return (
    <div className="menu" ref={ref}>
      <button className="userchip" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open}>
        <span className="avatar">{user.name[0].toUpperCase()}</span>
        <span className="usertext" style={{ textAlign: 'left', lineHeight: 1.2 }}><b style={{ fontSize: '.82rem', display: 'block' }}>{user.name}</b><small className="muted" style={{ fontSize: '.68rem' }}>Free Plan</small></span>
        <ChevronDown size={15} />
      </button>
      {open && (
        <div className="menu-pop" role="menu" onClick={() => setOpen(false)}>
          <Link to="/dashboard"><LayoutDashboard size={16} />Dashboard</Link>
          <Link to="/profile"><User size={16} />Profile</Link>
          <Link to="/settings"><Settings size={16} />Settings</Link>
          <button onClick={async () => { await logout(); nav('/'); }}><LogOut size={16} />Log out</button>
        </div>
      )}
    </div>
  );
}

export function Navbar() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => setOpen(false), [pathname]);
  const links = [['/', 'Home'], ['/features', 'Features'], ['/scan', 'Scan'], ['/dashboard', 'Dashboard'], ['/pricing', 'Pricing'], ['/about', 'About']];
  return (
    <header className="nav no-print">
      <div className="container nav-in">
        <Link to="/" aria-label="DefendIQ home"><Logo size={32} /></Link>
        <nav className={`nav-links ${open ? 'open' : ''}`}>{links.map(([to, l]) => <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>{l}</NavLink>)}</nav>
        <div className="nav-actions" style={{ marginLeft: 'auto' }}>
          <ThemeBtn />
          {user ? <UserMenu /> : (<><Link to="/login" className="btn btn-ghost btn-sm hide-sm">Login</Link><Link to="/signup" className="btn btn-primary btn-sm">Get Started</Link></>)}
          <button className="icon-btn burger" onClick={() => setOpen((o) => !o)} aria-label="Menu">{open ? <X size={18} /> : <Menu size={18} />}</button>
        </div>
      </div>
    </header>
  );
}

export function PublicLayout() {
  const { pathname } = useLocation();
  return (<><Navbar /><main key={pathname} className="page"><Outlet /></main><Footer /></>);
}

function Bell_() {
  const [data, setData] = useState({ items: [], unread: 0 });
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const load = () => api.get('/alerts?limit=5').then(setData).catch(() => {});
  useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t); }, []);
  useEffect(() => { const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }; document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h); }, []);
  return (
    <div className="menu" ref={ref}>
      <button className="icon-btn" onClick={() => { setOpen((o) => !o); load(); }} aria-label={`Notifications (${data.unread} unread)`}><Bell size={18} />{data.unread > 0 && <span className="dot" />}</button>
      {open && (
        <div className="menu-pop" style={{ width: 320 }}>
          <div className="row between" style={{ padding: '6px 12px' }}><b>Alerts</b>{data.unread > 0 && <button style={{ width: 'auto', padding: '2px 8px', color: 'var(--accent)', fontSize: '.78rem' }} onClick={async () => { await api.post('/alerts/read-all'); load(); }}>Mark all read</button>}</div>
          {data.items.length === 0 && <div className="muted" style={{ padding: 14, fontSize: '.85rem' }}>No alerts yet.</div>}
          {data.items.map((a) => <Link key={a.id} to="/alerts" onClick={() => setOpen(false)} style={{ opacity: a.read ? .6 : 1, alignItems: 'flex-start' }}><span style={{ color: a.type === 'threat' ? 'var(--red)' : a.type === 'suspicious' ? 'var(--amber)' : 'var(--accent)' }}>●</span><span><b style={{ fontSize: '.82rem', display: 'block' }}>{a.title}</b><small className="muted">{timeAgo(a.createdAt)}</small></span></Link>)}
          <Link to="/alerts" onClick={() => setOpen(false)} style={{ justifyContent: 'center', color: 'var(--accent)' }}>View all alerts</Link>
        </div>
      )}
    </div>
  );
}

const SIDE = [['/dashboard', LayoutDashboard, 'Dashboard'], ['/scan', Search, 'Scan'], ['/history', History, 'History'], ['/alerts', Bell, 'Alerts'], ['/intel', Globe, 'Threat Intelligence'], ['/reports', FileText, 'Reports'], ['/awareness', GraduationCap, 'Awareness'], ['/profile', User, 'Profile'], ['/settings', Settings, 'Settings']];

export function AppLayout() {
  const { user } = useAuth();
  const nav = useNavigate();
  const { pathname } = useLocation();
  const [side, setSide] = useState(false);
  const [q, setQ] = useState('');
  const inp = useRef(null);
  useEffect(() => setSide(false), [pathname]);
  useEffect(() => { const k = (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); inp.current?.focus(); } }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, []);
  const submit = (e) => {
    e.preventDefault();
    const v = q.trim(); if (!v) return;
    nav(isLikelyUrl(v) ? `/scan?url=${encodeURIComponent(v)}&auto=1` : `/history?q=${encodeURIComponent(v)}`);
    setQ(''); inp.current?.blur();
  };
  return (
    <>
      <header className="nav no-print">
        <div className="container nav-in" style={{ width: 'min(1500px,100% - 32px)' }}>
          <button className="icon-btn burger" onClick={() => setSide((s) => !s)} aria-label="Open menu"><Menu size={18} /></button>
          <Link to="/" aria-label="DefendIQ home"><Logo size={30} /></Link>
          <form className="field search" style={{ margin: '0 auto', minHeight: 42 }} onSubmit={submit} role="search">
            <Search size={16} /><input ref={inp} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search history or paste a URL…" aria-label="Search or paste a URL" /><span className="kbd hide-sm">Ctrl + K</span>
          </form>
          <div className="nav-actions"><Bell_ /><ThemeBtn /><UserMenu /></div>
        </div>
      </header>
      <div className="shell">
        <div className={`scrim ${side ? 'on' : ''}`} onClick={() => setSide(false)} />
        <aside className={`side no-print ${side ? 'open' : ''}`}>
          {SIDE.map(([to, Icon, label]) => <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'active' : '')}><Icon size={19} />{label}</NavLink>)}
          <div className="pin"><ShieldCheck color="var(--accent)" /><div><b>Stay Protected</b><small>Your security is our priority</small></div></div>
        </aside>
        <main key={pathname} className="main page"><Outlet /></main>
      </div>
      <Footer />
    </>
  );
}

export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <div className="splash"><Logo size={70} text={false} /></div>;
  if (!user) return <Navigate to="/login" state={{ from: loc.pathname + loc.search }} replace />;
  return children;
}
