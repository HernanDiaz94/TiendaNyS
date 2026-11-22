import { Analytics } from '@vercel/analytics/react';

import { Storefront } from './components/Storefront.jsx';
import AdminApp from './admin/AdminApp.jsx';

export default function App() {
  const path = window.location.pathname;
  const isAdminPath = path === '/admin' || path.startsWith('/admin/');

  // El panel queda fuera del analytics: solo se mide el tráfico de la tienda.
  if (isAdminPath) return <AdminApp />;

  return (
    <>
      <Storefront />
      <Analytics mode={import.meta.env.PROD ? 'production' : 'development'} />
    </>
  );
}
