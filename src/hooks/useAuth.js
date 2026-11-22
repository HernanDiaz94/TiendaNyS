import { useCallback, useEffect, useState } from 'react';
import { INVALID_LOGIN_MESSAGE, resolveLoginEmail } from '../lib/authUsername.js';
import { isSupabaseConfigured, supabase } from '../lib/supabase.js';

const DEMO_SESSION_KEY = 'nys-demo-session';
const DEMO_USERS_KEY = 'nys-demo-users';
export const DEMO_PASSWORD = import.meta.env.VITE_DEMO_ADMIN_PASSWORD || 'nys-demo';
export const DEMO_USERNAME = import.meta.env.VITE_DEMO_ADMIN_USERNAME || 'admin';

// Solo demo: las contraseñas se guardan hasheadas de forma simple para no dejarlas
// en texto plano en localStorage. Esto NO reemplaza a Supabase Auth en producción.
function hashPassword(value) {
  let hash = 5381;
  const text = String(value || '');
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) + hash + text.charCodeAt(i)) | 0;
  }
  return `demo-${hash}`;
}

function readJson(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key) || window.sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* almacenamiento no disponible: la sesión en memoria sigue funcionando */
  }
}

function readDemoSession() {
  try {
    const raw = window.sessionStorage.getItem(DEMO_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function readDemoUsers() {
  const users = readJson(DEMO_USERS_KEY, []);
  return Array.isArray(users) ? users : [];
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

  const signIn = useCallback(async ({ identifier, username, email, password }) => {
    const value = String(identifier || email || username || '').trim();
    const looksLikeEmail = value.includes('@');

    if (isDemo) {
      if (looksLikeEmail) {
        const normalized = value.toLowerCase();
        const user = readDemoUsers().find((item) => String(item.email).toLowerCase() === normalized);
        if (!user) {
          throw new Error('No hay ningún administrador registrado con ese correo.');
        }
        if (hashPassword(password) !== user.password_hash) {
          throw new Error('La contraseña no es correcta.');
        }
        const demoSession = { demo: true, user: { email: user.email } };
        try {
          window.sessionStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(demoSession));
        } catch {
          /* la sesión sigue funcionando para este render */
        }
        setSession(demoSession);
        return demoSession;
      }

      if (String(password) !== DEMO_PASSWORD) {
        throw new Error('La contraseña de demostración no es correcta.');
      }
      if (value !== DEMO_USERNAME) {
        throw new Error('El nombre de usuario no es correcto.');
      }
      const demoSession = { demo: true, user: { username: value } };
      try {
        window.sessionStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(demoSession));
      } catch {
        /* la sesión sigue funcionando para este render */
      }
      setSession(demoSession);
      return demoSession;
    }

    const loginEmail = await resolveLoginEmail(value, async (username) => {
      const { data: resolved, error: lookupError } = await supabase.rpc(
        'resolve_admin_username',
        { p_username: username },
      );
      if (lookupError) throw new Error(INVALID_LOGIN_MESSAGE);
      return resolved;
    });

    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password,
    });
    if (error) throw new Error(INVALID_LOGIN_MESSAGE);
    setSession(data.session);
    return data.session;
  }, [isDemo]);

  const signUp = useCallback(async ({ email, password }) => {
    if (!isDemo) {
      throw new Error('El registro de usuarios solo está disponible en modo demostración.');
    }

    const normalized = String(email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      throw new Error('Ingresá un correo electrónico válido (por ejemplo tu@gmail.com).');
    }
    if (String(password || '').length < 6) {
      throw new Error('La contraseña debe tener al menos 6 caracteres.');
    }

    const users = readDemoUsers();
    if (users.some((item) => String(item.email).toLowerCase() === normalized)) {
      throw new Error('Ya existe un administrador registrado con ese correo.');
    }

    const user = {
      email: normalized,
      password_hash: hashPassword(password),
      role: 'admin',
      created_at: new Date().toISOString(),
    };
    writeJson(DEMO_USERS_KEY, [...users, user]);

    const demoSession = { demo: true, user: { email: user.email } };
    try {
      window.sessionStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(demoSession));
    } catch {
      /* la sesión sigue funcionando para este render */
    }
    setSession(demoSession);
    return demoSession;
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

  return { session, ready, isDemo, signIn, signUp, signOut };
}
