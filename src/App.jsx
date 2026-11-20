import { Storefront } from './components/Storefront.jsx';
import AdminApp from './admin/AdminApp.jsx';

export default function App() {
  const path = window.location.pathname;
  const isAdminPath = path === '/admin' || path.startsWith('/admin/');

  if (!isAdminPath) return <Storefront />;

  return (
    <AdminApp />
  );
}
