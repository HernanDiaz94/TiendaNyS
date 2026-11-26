import { getSizeStock } from './products.js';

const MAX_CART_ITEMS = 20;
const MAX_QUANTITY = 10;

function cleanSize(size) {
  return String(size ?? 'Único').trim().slice(0, 20) || 'Único';
}

function safeImage(value) {
  return typeof value === 'string' && value.length > 0 && value.length <= 1000 ? value : '';
}

function buildCartItem(product, size, quantity) {
  const item = {
    id: String(product.id),
    name: String(product.name).trim().slice(0, 100),
    price: Number(product.price),
    stock: getSizeStock(product, size),
    size,
    quantity,
  };
  const image = safeImage(product.image_url);
  if (image) item.image_url = image;
  return item;
}

/**
 * Adds a product/size to the cart without ever exceeding the known stock.
 * Returns the same cart reference when nothing can be added.
 */
export function addToCart(cart, product, size = 'Único', quantity = 1) {
  if (!product) return cart;
  const itemSize = cleanSize(size);
  const stock = getSizeStock(product, itemSize);
  if (!Number.isFinite(stock) || stock < 1) return cart;

  const amount = Math.max(1, Math.min(MAX_QUANTITY, Math.trunc(Number(quantity) || 1)));
  const maxForItem = Math.min(stock, MAX_QUANTITY);
  const existing = cart.find((item) => item.id === String(product.id) && item.size === itemSize);

  if (existing) {
    const nextQuantity = Math.min(maxForItem, existing.quantity + amount);
    if (nextQuantity === existing.quantity) return cart;
    return cart.map((item) =>
      item === existing ? { ...item, quantity: nextQuantity, stock } : item,
    );
  }

  return [
    ...cart,
    buildCartItem(product, itemSize, Math.min(maxForItem, amount)),
  ];
}

export function changeQuantity(cart, id, size, quantity) {
  return cart.flatMap((item) => {
    if (item.id !== id || item.size !== size) return [item];
    const next = Math.max(0, Math.min(item.stock, MAX_QUANTITY, Math.trunc(Number(quantity) || 0)));
    return next === 0 ? [] : [{ ...item, quantity: next }];
  });
}

export function cartCount(cart) {
  return cart.reduce((sum, item) => sum + item.quantity, 0);
}

export function cartTotal(cart) {
  const cents = cart.reduce(
    (sum, item) => sum + Math.round(Number(item.price) * 100) * item.quantity,
    0,
  );
  return cents / 100;
}

export function normalizeDni(value) {
  const digits = String(value ?? '').replace(/\D/g, '');
  return /^\d{7,8}$/.test(digits) ? digits : null;
}

export function formatPrice(value) {
  const amount = Number(value);
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function shortReference(id) {
  return String(id ?? '').replace(/-/g, '').slice(0, 8).toUpperCase();
}

export function sanitizeCart(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();

  return value.slice(0, MAX_CART_ITEMS).flatMap((item) => {
    if (!item || typeof item !== 'object') return [];

    const id = typeof item.id === 'string' ? item.id.trim() : '';
    const name = typeof item.name === 'string' ? item.name.trim() : '';
    const size = typeof item.size === 'string' ? item.size.trim() : '';
    const price = Number(item.price);
    const stock = Number(item.stock);
    const quantity = Number(item.quantity);

    if (id.length < 1 || id.length > 64) return [];
    if (name.length < 1 || name.length > 100) return [];
    if (size.length < 1 || size.length > 20) return [];
    if (!Number.isFinite(price) || price <= 0 || price > 99999999) return [];
    if (!Number.isInteger(stock) || stock < 1 || stock > 9999) return [];
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) return [];
    if (quantity > stock) return [];

    const key = `${id}::${size.toLowerCase()}`;
    if (seen.has(key)) return [];
    seen.add(key);

    const clean = { id, name, price, stock, size, quantity };
    const image = safeImage(item.image_url);
    if (image) clean.image_url = image;
    return [clean];
  });
}

/**
 * Reconciles the stored cart with the latest catalog: refreshes price/stock,
 * removes unavailable products and caps quantities to current stock.
 */
export function reconcileCart(cart, products) {
  const byId = new Map((products || []).map((product) => [String(product.id), product]));
  let changed = false;
  const next = [];

  for (const item of cart) {
    const product = byId.get(String(item.id));
    const sizeStock = product ? getSizeStock(product, item.size) : 0;
    if (!product || product.is_active === false || sizeStock < 1) {
      changed = true;
      continue;
    }

    const stock = Math.min(9999, sizeStock);
    const price = Number(product.price);
    const quantity = Math.min(item.quantity, stock, MAX_QUANTITY);
    const image = safeImage(product.image_url);
    const name = String(product.name || item.name);

    if (
      stock !== item.stock
      || price !== item.price
      || quantity !== item.quantity
      || image !== (item.image_url || '')
      || name !== item.name
    ) {
      changed = true;
    }

    const merged = { ...item, name, price, stock, quantity };
    if (image) merged.image_url = image;
    else delete merged.image_url;
    next.push(merged);
  }

  return changed ? next : cart;
}

export function validateCustomer(customer, privacyAccepted) {
  const errors = {};
  const name = String(customer?.name ?? '').trim();
  const phone = String(customer?.phone ?? '').trim();
  const notes = String(customer?.notes ?? '');
  const digits = phone.replace(/\D/g, '');

  if (name.length < 2 || name.length > 100 || /[<>]/.test(name)) {
    errors.name = 'Ingresá tu nombre y apellido (entre 2 y 100 caracteres).';
  }
  if (
    phone.length < 8
    || phone.length > 30
    || !/^[+0-9 ().-]+$/.test(phone)
    || digits.length < 8
    || digits.length > 15
  ) {
    errors.phone = 'Ingresá un WhatsApp válido con código de área.';
  }
  if (notes.length > 300) {
    errors.notes = 'La nota no puede superar los 300 caracteres.';
  }
  if (!privacyAccepted) {
    errors.privacy = 'Necesitamos que aceptes el aviso de privacidad para continuar.';
  }

  return errors;
}

export function whatsappDigits(value) {
  return String(value ?? '').replace(/\D/g, '');
}

export function buildWhatsAppUrl(number, message) {
  const digits = whatsappDigits(number);
  if (digits.length < 8 || digits.length > 15) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function buildOrderMessage({ reference, customerName, total, items = [] }) {
  const lines = items.map(
    (item) => `• ${item.quantity} × ${item.name || item.product_name}${item.size && item.size !== 'Único' ? ` (talle ${item.size})` : ''} — ${formatPrice((item.unit_price ?? item.price) * item.quantity)}`,
  );
  return [
    `Hola! Soy ${customerName}. Acabo de enviar el pedido #${reference} en NyS Indumentaria.`,
    '',
    ...lines,
    '',
    `Total: ${formatPrice(total)}`,
    '¿Me confirman disponibilidad y entrega?',
  ].join('\n');
}

export function buildInquiryMessage({ items = [], total = 0 }) {
  const lines = items.map(
    (item) => `• ${item.quantity} × ${item.name}${item.size && item.size !== 'Único' ? ` (talle ${item.size})` : ''}`,
  );
  return [
    'Hola! Quiero consultar por estos artículos de NyS:',
    ...lines,
    `Total: ${formatPrice(total)}`,
    '¿Me pasan disponibilidad y forma de entrega?',
  ].join('\n');
}

export function buildOrderSummary({ reference, customerName, items = [], total }) {
  const lines = items.map(
    (item) => `${item.quantity} x ${item.product_name || item.name}${item.size && item.size !== 'Único' ? ` (${item.size})` : ''} — ${formatPrice((item.unit_price ?? item.price) * item.quantity)}`,
  );
  return [
    `NyS Indumentaria · Pedido #${reference}`,
    `Cliente: ${customerName}`,
    '',
    ...lines,
    '',
    `Total: ${formatPrice(total)}`,
  ].join('\n');
}
