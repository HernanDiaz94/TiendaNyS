import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  ShoppingBag,
  UserPlus,
} from 'lucide-react';
import { ErrorNote, Notice, Spinner } from '../components/ui.jsx';

export function AdminLogin({ onLogin, onSignUp, isDemo }) {
  const [mode, setMode] = useState('login');
  const [identifier, setIdentifier] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const switchMode = (next) => {
    setMode(next);
    setError('');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
  };

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (mode === 'register') {
        if (password !== confirmPassword) {
          throw new Error('Las contraseñas no coinciden.');
        }
        await onSignUp({ email, password });
      } else {
        await onLogin({ identifier, password });
      }
    } catch (loginError) {
      setError(loginError.message || 'No pudimos completar la operación.');
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

          <div className="auth-tabs" role="tablist" aria-label="Acceso al panel">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              className={mode === 'login' ? 'auth-tab is-active' : 'auth-tab'}
              onClick={() => switchMode('login')}
            >
              Ingresar
            </button>
            {isDemo && (
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'register'}
                className={mode === 'register' ? 'auth-tab is-active' : 'auth-tab'}
                onClick={() => switchMode('register')}
              >
                <UserPlus size={14} aria-hidden="true" /> Registrar admin
              </button>
            )}
          </div>

          <p className="eyebrow">{mode === 'login' ? 'PANEL PRIVADO' : 'NUEVO ADMINISTRADOR'}</p>
          <h2>{mode === 'login' ? 'Hola de nuevo.' : 'Crear cuenta.'}</h2>
          <p className="login-lede">
            {mode === 'login'
              ? 'Ingresá con tu correo registrado o con el usuario de la tienda.'
              : 'Registrá un correo (puede ser Gmail) para dar acceso al panel.'}
          </p>

          {isDemo && mode === 'register' && (
            <Notice tone="info">
              <strong>Solo demostración.</strong> La cuenta se guarda en este navegador y tiene acceso de administrador.
              Para producción se usa Supabase Auth con rol admin.
            </Notice>
          )}

          <form className="auth-form" onSubmit={submit} noValidate>
            {mode === 'login' ? (
              <div className="field">
                <label htmlFor="admin-identifier">Correo o usuario</label>
                <input
                  id="admin-identifier"
                  type="text"
                  autoComplete="username"
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  placeholder={isDemo ? 'admin o tu@correo.com' : 'tu@correo.com'}
                  data-autofocus
                />
              </div>
            ) : (
              <div className="field">
                <label htmlFor="admin-email">Correo electrónico</label>
                <div className="password-wrap">
                  <input
                    id="admin-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="tu@correo.com"
                    required
                  />
                  <Mail size={17} aria-hidden="true" className="field-icon" />
                </div>
              </div>
            )}

            <div className="field">
              <label htmlFor="admin-password">Contraseña</label>
              <div className="password-wrap">
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={mode === 'register' ? 'Mínimo 6 caracteres' : '••••••••'}
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

            {mode === 'register' && (
              <div className="field">
                <label htmlFor="admin-confirm">Confirmar contraseña</label>
                <input
                  id="admin-confirm"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Repetí la contraseña"
                  required
                />
              </div>
            )}

            {error && <ErrorNote>{error}</ErrorNote>}

            <button
              className="btn btn--primary btn--full"
              type="submit"
              disabled={busy || !password || (mode === 'register' && (!email || !confirmPassword))}
            >
              {busy
                ? <><Spinner label={mode === 'login' ? 'Ingresando' : 'Creando cuenta'} /> {mode === 'login' ? 'Ingresando…' : 'Creando…'}</>
                : mode === 'login'
                  ? <>Entrar al panel <ArrowRight size={17} aria-hidden="true" /></>
                  : <><UserPlus size={17} aria-hidden="true" /> Crear cuenta admin</>}
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
