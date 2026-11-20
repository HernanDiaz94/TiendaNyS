import { lazy, Suspense } from 'react';
import { Storefront } from './components/Storefront.jsx';

const AdminApp = lazy(() => import('./admin/AdminApp.jsx'));

function AdminFallback() {
  return (
    <main className="auth-loading" aria-busy="true">
      <p>Cargando panel…</p>
    </main>
  );
}

export default function App() {
  const path = window.location.pathname;
  const isAdminPath = path === '/admin' || path.startsWith('/admin/');

  if (!isAdminPath) return <Storefront />;

  return (
    <Suspense fallback={<AdminFallback />}>
      <AdminApp />
    </Suspense>
  );
}
