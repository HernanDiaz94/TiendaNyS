import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { buildWhatsAppUrl, cartCount, cartTotal, formatPrice } from '../lib/shop.js';
import { useCatalog } from '../hooks/useCatalog.js';
import { useCart } from '../hooks/useCart.js';
import { Header } from './Header.jsx';
import { Hero } from './Hero.jsx';
import { Catalog } from './Catalog.jsx';
import { Story } from './Story.jsx';
import { Footer } from './Footer.jsx';
import { ProductModal } from './ProductModal.jsx';
import { CartDrawer } from './CartDrawer.jsx';
import { WhatsAppIcon } from './ui.jsx';

const FALLBACK_HANDLE = 'nys_indumentaria_25';

export function Storefront() {
  const catalog = useCatalog();
  const {
    cart,
    add,
    increment,
    decrement,
    remove,
    clear,
    reconcile,
  } = useCart();

  const [selectedId, setSelectedId] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const searchRef = useRef(null);

  const handle = String(import.meta.env.VITE_INSTAGRAM_HANDLE || FALLBACK_HANDLE)
    .replace(/^@+/, '')
    .trim() || FALLBACK_HANDLE;
  const instagramUrl = `https://www.instagram.com/${handle}/`;
  const whatsappNumber = import.meta.env.VITE_WHATSAPP_NUMBER || '';
  const whatsappUrl = buildWhatsAppUrl(
    whatsappNumber,
    'Hola! Quiero consultar por la colección de NyS Indumentaria.',
  );
  const rawPaymentLink = import.meta.env.VITE_MERCADOPAGO_PAYMENT_URL || '';
  const paymentLink = /^https?:\/\/\S+$/i.test(rawPaymentLink) ? rawPaymentLink : '';

  const count = cartCount(cart);
  const total = cartTotal(cart);
  const selectedProduct = selectedId
    ? catalog.products.find((product) => product.id === selectedId) || null
    : null;

  const notify = useCallback((message, action = null) => {
    setToast({ id: Date.now(), message, action });
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 3400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (catalog.products.length > 0) reconcile(catalog.products);
  }, [catalog.products, reconcile]);

  const handleAdd = useCallback((product, size, quantity = 1) => {
    const status = add(product, size, quantity);
    if (status === 'out') {
      notify(`${product.name} está agotado.`);
      return status;
    }
    if (status === 'limit') {
      notify('Ya tenés el máximo disponible de ese artículo en tu bolsa.');
      return status;
    }
    const sizeLabel = size && size !== 'Único' ? ` · Talle ${size}` : '';
    notify(`${product.name}${sizeLabel} sumado a tu bolsa`, {
      label: 'Ver bolsa',
      onClick: () => setCartOpen(true),
    });
    return status;
  }, [add, notify]);

  const openSearch = () => {
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    document.getElementById('coleccion')?.scrollIntoView({
      behavior: reduceMotion ? 'auto' : 'smooth',
      block: 'start',
    });
    window.setTimeout(
      () => searchRef.current?.focus({ preventScroll: true }),
      reduceMotion ? 0 : 420,
    );
  };

  const handleOrderPlaced = () => {
    clear();
    catalog.refresh({ silent: true });
  };

  return (
    <>
      <a className="skip-link" href="#coleccion">Saltar al catálogo</a>

      <Header
        count={count}
        onCart={() => setCartOpen(true)}
        onSearch={openSearch}
        instagramUrl={instagramUrl}
      />

      <main id="main">
        <Hero whatsappUrl={whatsappUrl} instagramUrl={instagramUrl} />

        <Catalog
          products={catalog.products}
          loading={catalog.loading}
          error={catalog.error}
          onRetry={() => catalog.refresh()}
          onOpen={(product) => setSelectedId(product.id)}
          onAdd={handleAdd}
          searchRef={searchRef}
        />

        <Story instagramUrl={instagramUrl} handle={handle} />
      </main>

      <Footer instagramUrl={instagramUrl} whatsappUrl={whatsappUrl} handle={handle} />

      <ProductModal
        product={selectedProduct}
        onClose={() => setSelectedId(null)}
        onAdd={handleAdd}
        whatsappNumber={whatsappNumber}
        instagramUrl={instagramUrl}
      />

      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        cart={cart}
        total={total}
        onIncrement={increment}
        onDecrement={decrement}
        onRemove={remove}
        onOrderPlaced={handleOrderPlaced}
        onRefresh={() => catalog.refresh({ silent: true })}
        whatsappNumber={whatsappNumber}
        paymentLink={paymentLink}
      />

      {count > 0 && !cartOpen && !selectedId && (
        <button className="mobile-bag" type="button" onClick={() => setCartOpen(true)}>
          <span>
            <strong>{count} {count === 1 ? 'artículo' : 'artículos'}</strong>
            <small>{formatPrice(total)}</small>
          </span>
          <span className="mobile-bag-action">
            Ver bolsa <ArrowRight size={17} aria-hidden="true" />
          </span>
        </button>
      )}

      {whatsappUrl && (
        <a
          className={`float-wa ${count > 0 ? 'is-lifted' : ''}`}
          href={whatsappUrl}
          target="_blank"
          rel="noreferrer"
          aria-label="Escribir a NyS por WhatsApp"
        >
          <WhatsAppIcon size={24} />
        </a>
      )}

      {toast && (
        <div className="toast" role="status">
          <span className="toast-icon" aria-hidden="true"><Check size={15} /></span>
          <span className="toast-message">{toast.message}</span>
          {toast.action && (
            <button
              type="button"
              onClick={() => {
                toast.action.onClick();
                setToast(null);
              }}
            >
              {toast.action.label}
            </button>
          )}
        </div>
      )}
    </>
  );
}
