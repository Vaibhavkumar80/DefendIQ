import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api.js';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

function applyTheme(t) {
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem('diq-theme', t); } catch { /* storage blocked */ }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [theme, setThemeState] = useState(document.documentElement.dataset.theme || 'dark');

  useEffect(() => {
    api.get('/auth/me').then((r) => { setUser(r.user); setGoogleEnabled(!!r.googleEnabled); }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const t = user?.settings?.theme;
    if (t && t !== document.documentElement.dataset.theme) { applyTheme(t); setThemeState(t); }
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const setTheme = useCallback((t) => {
    applyTheme(t); setThemeState(t);
    if (user) api.patch('/account/settings', { theme: t }).then((r) => setUser(r.user)).catch(() => {});
  }, [user]);

  const value = useMemo(() => ({
    user, loading, googleEnabled, theme, setUser, setTheme,
    toggleTheme: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
    login: async (body) => { const r = await api.post('/auth/login', body); setUser(r.user); return r.user; },
    register: async (body) => { const r = await api.post('/auth/register', body); setUser(r.user); return r.user; },
    google: async (credential) => { const r = await api.post('/auth/google', { credential }); setUser(r.user); return r.user; },
    logout: async () => { try { await api.post('/auth/logout'); } finally { setUser(null); } },
  }), [user, loading, googleEnabled, theme, setTheme]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
