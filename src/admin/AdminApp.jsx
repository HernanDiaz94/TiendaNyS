import { AdminLogin } from './AdminLogin.jsx';
import { AdminPanel } from './AdminPanel.jsx';
import { Spinner } from '../components/ui.jsx';
import { useAuth } from '../hooks/useAuth.js';

export default function AdminApp() {
  const auth = useAuth();

  if (!auth.ready) {
    return (
      <main className="auth-loading">
        <a className="login-logo" href="/">
          <span>N<span>&amp;</span>S</span>
          <small>INDUMENTARIA</small>
        </a>
        <Spinner label="Verificando acceso" />
        <p>Verificando acceso…</p>
        <a className="link-btn" href="/">Volver a la tienda</a>
      </main>
    );
  }

  if (!auth.session) {
    return <AdminLogin onLogin={auth.signIn} isDemo={auth.isDemo} />;
  }

  return (
    <AdminPanel
      session={auth.session}
      isDemo={auth.isDemo}
      onLogout={auth.signOut}
    />
  );
}
