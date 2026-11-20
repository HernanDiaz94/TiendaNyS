import { useCallback, useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase.js';

const DEMO_SESSION_KEY = 'nys-demo-session';
export const DEMO_PASSWORD = import.meta.env.VITE_DEMO_ADMIN_PASSWORD || 'nys-demo';

function readDemoSession() {
  try {
    const raw = window.sessionStorage.getItem(DEMO_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function useAuth() {
  const isDemo = !isSupabaseConfigured;
  const [session, setSession] = useState(() => (isDemo ? readDemoSession() : null));
  const [ready, setReady] = useState(isDemo);

  useEffect(() => {
    if (isDemo) return undefined;

    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setSession(data.session ?? null);
      setReady(true);
    }).catch(() => {
      if (alive) setReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!alive) return;
      setSession(nextSession);
      setReady(true);
    });

    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, [isDemo]);

  const signIn = useCallback(async ({ email, password }) => {
    if (isDemo) {
      if (String(password) !== DEMO_PASSWORD) {
        throw new Error('La contraseña de demostración no es correcta.');
      }
      const demoSession = {
        demo: true,
        user: { email: String(email || 'demo@nys.local').trim() },
      };
      try {
        window.sessionStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(demoSession));
      } catch {
        /* the session still works for this render */
      }
      setSession(demoSession);
      return demoSession;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: String(email || '').trim(),
      password,
    });
    if (error) {
      throw new Error(
        'No pudimos iniciar sesión. Revisá el correo y la contraseña, y confirmá que tu usuario tenga rol admin.',
      );
    }
    setSession(data.session);
    return data.session;
  }, [isDemo]);

  const signOut = useCallback(async () => {
    if (isDemo) {
      try {
        window.sessionStorage.removeItem(DEMO_SESSION_KEY);
      } catch {
        /* ignore */
      }
      setSession(null);
      return;
    }
    await supabase.auth.signOut();
    setSession(null);
  }, [isDemo]);

  return { session, ready, isDemo, signIn, signOut };
}
