import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  Eye,
  EyeOff,
  LogOut,
  Minus,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShoppingBag,
  Star,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import { useCatalog } from '../hooks/useCatalog.js';
import { isSupabaseConfigured, supabase } from '../lib/supabase.js';
import { listDemoOrders, resetDemoData, updateDemoOrderStatus } from '../lib/demoStore.js';
import { buildWhatsAppUrl, formatPrice, shortReference } from '../lib/shop.js';
import { normalizeText } from '../lib/products.js';
import { ProductForm } from './ProductForm.jsx';
import { Modal } from '../components/Modal.jsx';
import { Notice, ProductImage, Spinner } from '../components/ui.jsx';

const STATUS_META = {
  pendiente: { label: 'Pendiente', tone: 'pending' },
  confirmado: { label: 'Confirmado', tone: 'confirmed' },
  preparando: { label: 'Preparando', tone: 'preparing' },
  listo: { label: 'Listo', tone: 'ready' },
  entregado: { label: 'Entregado', tone: 'done' },
  cancelado: { label: 'Cancelado', tone: 'cancelled' },
};
const STATUS_ORDER = Object.keys(STATUS_META);
const FINAL_STATUSES = ['entregado', 'cancelado'];

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function adminError(error, fallback) {
  const message = String(error?.message || '');
  if (message.includes('NOT_ADMIN') || message.includes('row-level security')) {
    return 'Tu usuario no tiene rol admin. Asignalo en Supabase (ver README).';
  }
  if (message.includes('ORDER_FINALIZED')) return 'Ese pedido ya está finalizado.';
  if (message.includes('ORDER_NOT_FOUND')) return 'El pedido ya no existe.';
  return fallback;
}

export function AdminPanel({ session, isDemo, onLogout }) {
  const catalog = useCatalog({ includeInactive: true });
  const [tab, setTab] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [orderQuery, setOrderQuery] = useState('');
  const [orderStatus, setOrderStatus] = useState('todos');
  const [productQuery, setProductQuery] = useState('');
  const [productFilter, setProductFilter] = useState('todos');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busyKey, setBusyKey] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const showFeedback = useCallback((tone, message) => {
    setFeedback({ tone, message, id: Date.now() });
  }, []);

  useEffect(() => {
    if (!feedback) return undefined;
    const timer = window.setTimeout(
      () => setFeedback(null),
      feedback.tone === 'error' ? 7000 : 4200,
    );
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const loadOrders = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setOrdersLoading(true);
    setOrdersError('');
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('orders')
          .select('*, order_items(*)')
          .order('created_at', { ascending: false })
          .limit(250);
        if (error) throw error;
        setOrders(data || []);
      } else {
        setOrders(listDemoOrders());
      }
    } catch (error) {
      setOrdersError(adminError(error, 'No pudimos cargar los pedidos. Verificá la conexión y el rol admin.'));
    } finally {
      if (!silent) setOrdersLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const refreshAll = async () => {
    setRefreshing(true);
    await Promise.all([catalog.refresh(), loadOrders({ silent: true })]);
    setRefreshing(false);
  };

  const stats = useMemo(() => {
    const activeOrders = orders.filter((order) => order.status !== 'cancelado');
    return {
      pending: orders.filter((order) => order.status === 'pendiente').length,
      revenue: activeOrders.reduce((sum, order) => sum + Number(order.total || 0), 0),
      products: catalog.products.filter((product) => product.is_active !== false).length,
      low: catalog.products.filter((product) => Number(product.stock) > 0 && Number(product.stock) <= 2).length,
      out: catalog.products.filter((product) => Number(product.stock) < 1).length,
    };
  }, [orders, catalog.products]);

  const filteredOrders = useMemo(() => {
    const query = normalizeText(orderQuery);
    return orders
      .filter((order) => orderStatus === 'todos' || order.status === orderStatus)
      .filter((order) => {
        if (!query) return true;
        return normalizeText([
          order.customer_name,
          order.customer_phone,
          order.id,
        ].join(' ')).includes(query);
      });
  }, [orders, orderQuery, orderStatus]);

  const filteredProducts = useMemo(() => {
    const query = normalizeText(productQuery);
    return catalog.products.filter((product) => {
      if (productFilter === 'activos' && product.is_active === false) return false;
      if (productFilter === 'ocultos' && product.is_active !== false) return false;
      if (productFilter === 'sin-stock' && Number(product.stock) > 0) return false;
      if (productFilter === 'stock-bajo' && !(Number(product.stock) > 0 && Number(product.stock) <= 2)) return false;
      if (productFilter === 'destacados' && !product.featured) return false;
      if (!query) return true;
      return normalizeText([product.name, product.category, product.color].join(' ')).includes(query);
    });
  }, [catalog.products, productFilter, productQuery]);

  const changeOrderStatus = async (order, status) => {
    if (status === order.status) return;
    if (status === 'cancelado') {
      const confirmed = window.confirm(
        `¿Cancelar el pedido #${shortReference(order.id)} y devolver el stock al catálogo?`,
      );
      if (!confirmed) return;
    }

    setBusyKey(`order:${order.id}`);
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.rpc('admin_update_order_status', {
          p_order_id: order.id,
          p_status: status,
        });
        if (error) throw error;
      } else {
        updateDemoOrderStatus(order.id, status);
      }
      setOrders((current) => current.map(
        (entry) => (entry.id === order.id ? { ...entry, status } : entry),
      ));
      showFeedback(
        'success',
        status === 'cancelado'
          ? 'Pedido cancelado. El stock volvió al catálogo.'
          : 'Estado del pedido actualizado.',
      );
      if (status === 'cancelado') catalog.refresh({ silent: true });
    } catch (error) {
      showFeedback('error', adminError(error, 'No pudimos cambiar el estado del pedido.'));
    } finally {
      setBusyKey('');
    }
  };

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (product) => {
    setEditing(product);
    setFormOpen(true);
  };

  const saveProduct = async (payload) => {
    if (editing) {
      await catalog.updateProduct(editing.id, payload);
      showFeedback('success', 'Artículo actualizado.');
    } else {
      await catalog.createProduct(payload);
      showFeedback('success', 'Artículo agregado al catálogo.');
    }
    setFormOpen(false);
    setEditing(null);
  };

  const toggleField = async (product, field) => {
    const nextValue = field === 'is_active' ? product.is_active === false : !product[field];
    setBusyKey(`flag:${product.id}`);
    try {
      await catalog.updateProduct(product.id, { [field]: nextValue });
      showFeedback('success', field === 'is_active'
        ? (nextValue ? 'El artículo ya es visible en la tienda.' : 'El artículo quedó oculto.')
        : (nextValue ? 'Artículo marcado como destacado.' : 'Artículo quitado de destacados.'));
    } catch (error) {
      showFeedback('error', error.message || 'No pudimos actualizar el artículo.');
    } finally {
      setBusyKey('');
    }
  };

  const saveStock = async (product, rawValue, input) => {
    const parsed = Number(rawValue);
    const stock = Math.max(0, Math.min(9999, Math.trunc(Number.isFinite(parsed) ? parsed : 0)));
    if (stock === Number(product.stock)) return;
    setBusyKey(`stock:${product.id}`);
    try {
      await catalog.updateProduct(product.id, { stock });
      showFeedback('success', `Stock de ${product.name}: ${stock}.`);
    } catch (error) {
      if (input) input.value = String(product.stock);
      showFeedback('error', error.message || 'No pudimos actualizar el stock.');
    } finally {
      setBusyKey('');
    }
  };

  const adjustStock = async (product, delta) => {
    const stock = Math.max(0, Math.min(9999, Number(product.stock) + delta));
    if (stock === Number(product.stock)) return;
    setBusyKey(`stock:${product.id}`);
    try {
      await catalog.updateProduct(product.id, { stock });
    } catch (error) {
      showFeedback('error', error.message || 'No pudimos actualizar el stock.');
    } finally {
      setBusyKey('');
    }
  };

  const removeProduct = async () => {
    if (!deleting) return;
    setBusyKey(`delete:${deleting.id}`);
    try {
      await catalog.deleteProduct(deleting.id);
      showFeedback('success', 'Artículo eliminado del catálogo.');
      setDeleting(null);
    } catch (error) {
      showFeedback('error', error.message || 'No pudimos eliminar el artículo.');
    } finally {
      setBusyKey('');
    }
  };

  const restoreDemo = async () => {
    if (!isDemo) return;
    if (!window.confirm('¿Restaurar el catálogo y los pedidos de demostración?')) return;
    resetDemoData();
    await Promise.all([catalog.refresh(), loadOrders()]);
    showFeedback('success', 'Datos de demostración restaurados.');
  };

  const statusCount = (status) => orders.filter((order) => order.status === status).length;

  return (
    <div className="admin-shell">
      <header className="admin-bar">
        <a className="admin-logo" href="/" aria-label="NyS Indumentaria, ir a la tienda">
          <span>N<span>&amp;</span>S</span>
          <small>ADMIN</small>
        </a>

        <div className="admin-bar-actions">
          {isDemo && <span className="demo-pill">DEMO</span>}
          <span className="admin-email">{session?.user?.email || 'admin@nys'}</span>
          <button
            className="icon-btn"
            type="button"
            onClick={refreshAll}
            aria-label="Actualizar datos"
            disabled={refreshing}
          >
            <RefreshCw size={17} className={refreshing ? 'is-spinning' : ''} aria-hidden="true" />
          </button>
          <button className="admin-logout" type="button" onClick={onLogout}>
            <LogOut size={16} aria-hidden="true" />
            <span>Salir</span>
          </button>
        </div>
      </header>

      <main className="admin-main">
        <div className="admin-heading">
          <div>
            <p className="eyebrow">PANEL · N&amp;S</p>
            <h1>Tu tienda, en orden.</h1>
            <p>Pedidos, stock y catálogo en un solo lugar.</p>
          </div>
          <button className="btn btn--primary" type="button" onClick={openCreate}>
            <Plus size={16} aria-hidden="true" /> Nuevo artículo
          </button>
        </div>

        {isDemo && (
          <div className="demo-banner">
            <p>
              <strong>Modo demostración.</strong> Los cambios se guardan en este navegador.
              Conectá Supabase para operar la tienda real.
            </p>
            <button type="button" className="link-btn" onClick={restoreDemo}>Restaurar demo</button>
          </div>
        )}

        {feedback && <Notice tone={feedback.tone}>{feedback.message}</Notice>}

        <div className="stat-grid">
          <article className="stat-card">
            <span className="stat-icon"><ShoppingBag size={18} aria-hidden="true" /></span>
            <div>
              <strong>{stats.pending}</strong>
              <span>Pedidos pendientes</span>
            </div>
          </article>
          <article className="stat-card">
            <span className="stat-icon"><TrendingUp size={18} aria-hidden="true" /></span>
            <div>
              <strong>{formatPrice(stats.revenue)}</strong>
              <span>Ventas registradas</span>
            </div>
          </article>
          <article className="stat-card">
            <span className="stat-icon"><Package size={18} aria-hidden="true" /></span>
            <div>
              <strong>{stats.products}</strong>
              <span>Artículos visibles</span>
            </div>
          </article>
          <article className={`stat-card ${stats.out > 0 ? 'stat-card--alert' : ''}`}>
            <span className="stat-icon"><AlertTriangle size={18} aria-hidden="true" /></span>
            <div>
              <strong>{stats.out}</strong>
              <span>Sin stock · {stats.low} con stock bajo</span>
            </div>
          </article>
        </div>

        <div className="admin-tabs" role="tablist" aria-label="Secciones del panel">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'orders'}
            className={tab === 'orders' ? 'active' : ''}
            onClick={() => setTab('orders')}
          >
            Pedidos <span>{stats.pending}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'catalog'}
            className={tab === 'catalog' ? 'active' : ''}
            onClick={() => setTab('catalog')}
          >
            Catálogo y stock <span>{catalog.products.length}</span>
          </button>
        </div>

        {tab === 'orders' ? (
          <section className="admin-section" role="tabpanel">
            <div className="admin-section-head">
              <div>
                <h2>Pedidos</h2>
                <p>Confirmá stock, pago y entrega. Al cancelar, el stock vuelve solo.</p>
              </div>
              <label className="admin-search">
                <Search size={16} aria-hidden="true" />
                <span className="sr-only">Buscar pedidos</span>
                <input
                  type="search"
                  value={orderQuery}
                  onChange={(event) => setOrderQuery(event.target.value)}
                  placeholder="Nombre o pedido…"
                />
              </label>
            </div>

            <div className="chips chips--admin">
              <button
                type="button"
                className={`chip chip--sm ${orderStatus === 'todos' ? 'is-active' : ''}`}
                onClick={() => setOrderStatus('todos')}
              >
                Todos <span>{orders.length}</span>
              </button>
              {STATUS_ORDER.map((status) => (
                <button
                  key={status}
                  type="button"
                  className={`chip chip--sm ${orderStatus === status ? 'is-active' : ''}`}
                  onClick={() => setOrderStatus(status)}
                >
                  {STATUS_META[status].label} <span>{statusCount(status)}</span>
                </button>
              ))}
            </div>

            {ordersError && (
              <Notice tone="error">
                {ordersError}{' '}
                <button type="button" className="link-btn link-btn--inline" onClick={() => loadOrders()}>
                  Reintentar
                </button>
              </Notice>
            )}

            {ordersLoading ? (
              <div className="admin-loading"><Spinner label="Cargando pedidos" /> Cargando pedidos…</div>
            ) : filteredOrders.length === 0 ? (
              <div className="admin-empty">
                <ShoppingBag size={26} aria-hidden="true" />
                <h3>{orders.length === 0 ? 'Todavía no hay pedidos.' : 'No hay pedidos con ese filtro.'}</h3>
                <p>{orders.length === 0 ? 'Compartí el catálogo para empezar a recibir solicitudes.' : 'Probá con otro estado o limpiá la búsqueda.'}</p>
                {orders.length > 0 && (
                  <button type="button" className="link-btn" onClick={() => { setOrderStatus('todos'); setOrderQuery(''); }}>
                    Ver todos
                  </button>
                )}
              </div>
            ) : (
              <div className="orders-list">
                {filteredOrders.map((order) => {
                  const meta = STATUS_META[order.status] || { label: order.status, tone: 'pending' };
                  const isFinal = FINAL_STATUSES.includes(order.status);
                  const customerWhatsApp = buildWhatsAppUrl(
                    order.customer_phone,
                    `Hola ${order.customer_name}, te escribimos de NyS por tu pedido #${shortReference(order.id)}.`,
                  );
                  return (
                    <article className="order-card" key={order.id}>
                      <header className="order-card-head">
                        <div className="order-ref">
                          <span>#{shortReference(order.id)}</span>
                          <span className={`status-pill status-pill--${meta.tone}`}>{meta.label}</span>
                        </div>
                        <time dateTime={order.created_at}>{formatDate(order.created_at)}</time>
                      </header>

                      <div className="order-card-body">
                        <div className="order-customer">
                          <h3>{order.customer_name}</h3>
                          <p>{order.customer_phone}</p>
                          {order.delivery_notes && <p className="order-note">Entrega: {order.delivery_notes}</p>}
                        </div>

                        <ul className="order-items">
                          {(order.order_items || []).map((item) => (
                            <li key={item.id}>
                              <span>{item.quantity} × {item.product_name}</span>
                              <span>
                                {item.size && item.size !== 'Único' ? `Talle ${item.size} · ` : ''}
                                {formatPrice((item.unit_price ?? 0) * item.quantity)}
                              </span>
                            </li>
                          ))}
                        </ul>

                        <strong className="order-total">{formatPrice(order.total)}</strong>
                      </div>

                      <footer className="order-card-foot">
                        <label>
                          Estado
                          <select
                            value={order.status}
                            disabled={isFinal || busyKey === `order:${order.id}`}
                            onChange={(event) => changeOrderStatus(order, event.target.value)}
                          >
                            {STATUS_ORDER.map((status) => (
                              <option key={status} value={status}>{STATUS_META[status].label}</option>
                            ))}
                          </select>
                        </label>

                        {busyKey === `order:${order.id}` && <Spinner label="Actualizando pedido" />}

                        {customerWhatsApp && (
                          <a className="btn btn--ghost btn--sm" href={customerWhatsApp} target="_blank" rel="noreferrer">
                            Escribir al cliente <ArrowUpRight size={14} aria-hidden="true" />
                          </a>
                        )}
                      </footer>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        ) : (
          <section className="admin-section" role="tabpanel">
            <div className="admin-section-head">
              <div>
                <h2>Catálogo y stock</h2>
                <p>Editá precios, talles, fotos y visibilidad. El stock se refleja al instante.</p>
              </div>
              <div className="admin-section-tools">
                <label className="admin-search">
                  <Search size={16} aria-hidden="true" />
                  <span className="sr-only">Buscar artículos</span>
                  <input
                    type="search"
                    value={productQuery}
                    onChange={(event) => setProductQuery(event.target.value)}
                    placeholder="Buscar artículo…"
                  />
                </label>
                <select
                  className="admin-select"
                  value={productFilter}
                  onChange={(event) => setProductFilter(event.target.value)}
                  aria-label="Filtrar artículos"
                >
                  <option value="todos">Todos</option>
                  <option value="activos">Visibles</option>
                  <option value="ocultos">Ocultos</option>
                  <option value="sin-stock">Sin stock</option>
                  <option value="stock-bajo">Stock bajo</option>
                  <option value="destacados">Destacados</option>
                </select>
                <button type="button" className="btn btn--primary btn--sm" onClick={openCreate}>
                  <Plus size={15} aria-hidden="true" /> Nuevo
                </button>
              </div>
            </div>

            {catalog.error && (
              <Notice tone="error">
                {catalog.error}{' '}
                <button type="button" className="link-btn link-btn--inline" onClick={() => catalog.refresh()}>
                  Reintentar
                </button>
              </Notice>
            )}

            {catalog.loading ? (
              <div className="admin-loading"><Spinner label="Cargando catálogo" /> Cargando catálogo…</div>
            ) : filteredProducts.length === 0 ? (
              <div className="admin-empty">
                <Package size={26} aria-hidden="true" />
                <h3>{catalog.products.length === 0 ? 'El catálogo está vacío.' : 'No hay artículos con ese filtro.'}</h3>
                <p>{catalog.products.length === 0 ? 'Creá el primer artículo para abrir la tienda.' : 'Probá con otra búsqueda o creá un artículo nuevo.'}</p>
                <button type="button" className="btn btn--primary" onClick={openCreate}>
                  <Plus size={15} aria-hidden="true" /> Nuevo artículo
                </button>
              </div>
            ) : (
              <div className="product-list">
                {filteredProducts.map((product) => {
                  const isOut = Number(product.stock) < 1;
                  const isInactive = product.is_active === false;
                  const rowBusy = busyKey.includes(product.id);
                  return (
                    <article
                      className={`product-row ${isOut ? 'is-out' : ''} ${isInactive ? 'is-inactive' : ''}`}
                      key={product.id}
                    >
                      <ProductImage src={product.image_url} alt={product.name} className="admin-thumb" />

                      <div className="product-row-main">
                        <strong>{product.name}</strong>
                        <span>
                          {product.category}
                          {product.color ? ` · ${product.color}` : ''}
                          {' · '}
                          {Array.isArray(product.sizes) && product.sizes.length ? product.sizes.join(' / ') : 'Único'}
                        </span>
                        <div className="row-badges">
                          {product.featured && <span className="mini-badge">Destacado</span>}
                          {isInactive && <span className="mini-badge mini-badge--muted">Oculto</span>}
                          {isOut && <span className="mini-badge mini-badge--alert">Sin stock</span>}
                          {!isOut && Number(product.stock) <= 2 && <span className="mini-badge mini-badge--warn">Stock bajo</span>}
                        </div>
                      </div>

                      <div className="product-row-price">
                        <span>Precio</span>
                        <strong>{formatPrice(product.price)}</strong>
                      </div>

                      <div className="stock-edit">
                        <button
                          type="button"
                          onClick={() => adjustStock(product, -1)}
                          disabled={isOut || rowBusy}
                          aria-label={`Restar stock de ${product.name}`}
                        >
                          <Minus size={14} aria-hidden="true" />
                        </button>
                        <input
                          key={`${product.id}-${product.stock}`}
                          type="number"
                          min="0"
                          max="9999"
                          defaultValue={product.stock}
                          aria-label={`Stock de ${product.name}`}
                          disabled={rowBusy}
                          onBlur={(event) => saveStock(product, event.target.value, event.target)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') event.currentTarget.blur();
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => adjustStock(product, 1)}
                          disabled={rowBusy}
                          aria-label={`Sumar stock de ${product.name}`}
                        >
                          <Plus size={14} aria-hidden="true" />
                        </button>
                      </div>

                      <div className="row-flags">
                        <button
                          type="button"
                          className={`flag-btn ${!isInactive ? 'is-on' : ''}`}
                          onClick={() => toggleField(product, 'is_active')}
                          disabled={rowBusy}
                          title={isInactive ? 'Mostrar en la tienda' : 'Ocultar de la tienda'}
                        >
                          {isInactive ? <EyeOff size={15} aria-hidden="true" /> : <Eye size={15} aria-hidden="true" />}
                          <span>{isInactive ? 'Oculto' : 'Visible'}</span>
                        </button>
                        <button
                          type="button"
                          className={`flag-btn ${product.featured ? 'is-on' : ''}`}
                          onClick={() => toggleField(product, 'featured')}
                          disabled={rowBusy}
                          title={product.featured ? 'Quitar de destacados' : 'Marcar como destacado'}
                          aria-pressed={Boolean(product.featured)}
                        >
                          <Star size={15} aria-hidden="true" />
                          <span>Destacado</span>
                        </button>
                      </div>

                      <div className="row-actions">
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => openEdit(product)}
                          aria-label={`Editar ${product.name}`}
                        >
                          <Pencil size={16} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className="icon-btn icon-btn--danger"
                          onClick={() => setDeleting(product)}
                          aria-label={`Eliminar ${product.name}`}
                        >
                          <Trash2 size={16} aria-hidden="true" />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </main>

      <ProductForm
        open={formOpen}
        product={editing}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSave={saveProduct}
        isDemo={isDemo}
      />

      <Modal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        labelledBy="delete-title"
        className="confirm-modal"
        overlayClassName="overlay--center"
      >
        <span className="confirm-icon" aria-hidden="true"><Trash2 size={22} /></span>
        <h2 id="delete-title">¿Eliminar “{deleting?.name}”?</h2>
        <p>
          Va a desaparecer del catálogo público. Los pedidos existentes conservan su
          historial y el nombre del artículo.
        </p>
        <div className="confirm-actions">
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => setDeleting(null)}
            data-autofocus
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn--danger"
            onClick={removeProduct}
            disabled={busyKey === `delete:${deleting?.id}`}
          >
            {busyKey === `delete:${deleting?.id}` ? <Spinner label="Eliminando" /> : <Trash2 size={15} aria-hidden="true" />}
            Eliminar
          </button>
        </div>
      </Modal>
    </div>
  );
}
