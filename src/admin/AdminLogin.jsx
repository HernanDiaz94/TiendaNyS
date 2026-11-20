import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  ShieldCheck,
  ShoppingBag,
} from 'lucide-react';
import { DEMO_PASSWORD } from '../hooks/useAuth.js';
import { ErrorNote, Notice, Spinner } from '../components/ui.jsx';

export function AdminLogin({ onLogin, isDemo }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await onLogin({ email, password });
    } catch (loginError) {
      setError(loginError.message || 'No pudimos iniciar sesión.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="login-shell">
      <aside className="login-brand">
        <a className="back-store" href="/">
          <ArrowLeft size={16} aria-hidden="true" /> Volver a la tienda
        </a>

        <div className="login-brand-copy">
          <p className="eyebrow">N&amp;S / ADMIN</p>
          <h1>Tu tienda,<br /><em>bajo control.</em></h1>
          <p>
            Pedidos, stock, fotos y precios en un solo lugar. Simple, privado y
            pensado para resolver el día a día en minutos.
          </p>
          <ul className="login-perks">
            <li><ShoppingBag size={16} aria-hidden="true" /> Pedidos con datos de contacto y detalle.</li>
            <li><LockKeyhole size={16} aria-hidden="true" /> Acceso privado con Supabase Auth.</li>
            <li><ShieldCheck size={16} aria-hidden="true" /> Permisos y stock validados en la base.</li>
          </ul>
        </div>

        <p className="login-foot">CATAMARCA · {new Date().getFullYear()}</p>
      </aside>

      <section className="login-panel">
        <div className="login-card">
          <a className="login-logo" href="/" aria-label="NyS Indumentaria, inicio">
            <span>N<span>&amp;</span>S</span>
            <small>INDUMENTARIA</small>
          </a>

          <p className="eyebrow">PANEL PRIVADO</p>
          <h2>Hola de nuevo.</h2>
          <p className="login-lede">Ingresá con la cuenta de administración de la tienda.</p>

          {isDemo && (
            <Notice tone="info">
              <strong>Modo demostración.</strong> No hay Supabase conectado. Entrá con
              cualquier correo y la contraseña <code>{DEMO_PASSWORD}</code>. Los cambios
              quedan solo en este navegador.
            </Notice>
          )}

          <form className="auth-form" onSubmit={submit} noValidate>
            <div className="field">
              <label htmlFor="admin-email">Correo electrónico</label>
              <input
                id="admin-email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={isDemo ? 'demo@nys.local' : 'duena@ejemplo.com'}
                required={!isDemo}
                data-autofocus
              />
            </div>

            <div className="field">
              <label htmlFor="admin-password">Contraseña</label>
              <div className="password-wrap">
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
                </button>
              </div>
            </div>

            {error && <ErrorNote>{error}</ErrorNote>}

            <button className="btn btn--primary btn--full" type="submit" disabled={busy || !password}>
              {busy ? <><Spinner label="Ingresando" /> Ingresando…</> : <>Entrar al panel <ArrowRight size={17} aria-hidden="true" /></>}
            </button>
          </form>

          <p className="secure-line">
            <ShieldCheck size={15} aria-hidden="true" />
            {isDemo
              ? 'La autenticación demo es local y no debe usarse en producción.'
              : 'Acceso protegido por Supabase Auth, RLS y rol de administrador.'}
          </p>
        </div>
      </section>
    </main>
  );
}
