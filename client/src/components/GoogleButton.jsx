import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/Toast.jsx';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function GoogleG() {
  return <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/><path fill="#FBBC05" d="M10.4 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.8-6.1C1 16.4 0 20.100 0 24s1 7.600 2.600 10.800l7.800-6.100z"/><path fill="#34A853" d="M24 48c6.200 0 11.500-2 15.300-5.600l-7.500-5.800c-2.100 1.400-4.700 2.200-7.800 2.200-6.300 0-11.700-4.100-13.600-9.800l-7.800 6.100C6.500 42.600 14.600 48 24 48z"/></svg>;
}

export default function GoogleButton({ onSuccess, text = 'Continue with Google' }) {
  const { google, googleEnabled } = useAuth();
  const toast = useToast();
  const ref = useRef(null);
  const enabled = !!CLIENT_ID && googleEnabled;

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    const init = () => {
      if (cancelled || !window.google?.accounts?.id || !ref.current) return;
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: async ({ credential }) => { try { const u = await google(credential); onSuccess?.(u); } catch (e) { toast.error(e.message); } },
      });
      window.google.accounts.id.renderButton(ref.current, { theme: 'filled_black', size: 'large', width: ref.current.offsetWidth || 360, text: 'continue_with', shape: 'rectangular' });
    };
    if (window.google?.accounts?.id) init();
    else {
      let s = document.querySelector('script[data-gsi]');
      if (!s) { s = document.createElement('script'); s.src = 'https://accounts.google.com/gsi/client'; s.async = true; s.dataset.gsi = '1'; document.head.appendChild(s); }
      s.addEventListener('load', init);
    }
    return () => { cancelled = true; };
  }, [enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  if (enabled) return <div ref={ref} style={{ minHeight: 44, display: 'flex', justifyContent: 'center' }} />;
  return (
    <button type="button" className="btn btn-ghost btn-block" style={{ color: 'var(--text)', borderColor: 'var(--border)' }}
      onClick={() => toast.info('Google sign-in is not configured. Set GOOGLE_CLIENT_ID (server) and VITE_GOOGLE_CLIENT_ID (client).')}>
      <GoogleG /> {text}
    </button>
  );
}
