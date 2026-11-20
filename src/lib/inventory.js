/**
 * Control de compras e inventario.
 *
 * `products.purchased_at` guarda la fecha del stock más antiguo que sigue en
 * la tienda. Cuando ingresa mercadería nueva no se pisa esa fecha si todavía
 * queda stock viejo: así la alerta de +6 meses no desaparece por una compra.
 */

const MS_DAY = 24 * 60 * 60 * 1000;

// 6 meses ≈ 183 días. Se usa como umbral de "inventario antiguo".
export const STALE_STOCK_DAYS = 183;

/** Parsea fechas ISO y también `yyyy-mm-dd` como hora local (mediodía). */
export function parseDate(value) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [year, month, day] = raw.split('-').map(Number);
    const date = new Date(year, month - 1, day, 12, 0, 0, 0);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function daysInStock(purchasedAt, now = Date.now()) {
  const date = parseDate(purchasedAt);
  if (!date) return null;
  return Math.max(0, Math.floor((Number(now) - date.getTime()) / MS_DAY));
}

export function monthsInStock(purchasedAt, now = Date.now()) {
  const days = daysInStock(purchasedAt, now);
  if (days === null) return null;
  return Math.floor(days / 30.44);
}

/** Un artículo es "antiguo" si tiene stock y su ingreso supera los 6 meses. */
export function isStaleStock(product, { now = Date.now(), days = STALE_STOCK_DAYS } = {}) {
  if (!product) return false;
  if (Number(product.stock) < 1) return false;
  const elapsed = daysInStock(product.purchased_at, now);
  return elapsed !== null && elapsed >= days;
}

export function listStaleProducts(products, options) {
  return (products || []).filter((product) => isStaleStock(product, options));
}

export function formatShortDate(value) {
  const date = parseDate(value);
  if (!date) return '—';
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

/** Valor para <input type="date"> con la fecha de hoy. */
export function todayInputValue(now = new Date()) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function emptyPurchaseDraft(productId = '') {
  return {
    productId: String(productId || ''),
    quantity: 1,
    unitCost: '',
    supplier: '',
    purchasedAt: todayInputValue(),
  };
}

export function validatePurchase(values) {
  const errors = {};
  const quantity = Number(values?.quantity);
  const supplier = String(values?.supplier ?? '').trim();
  const rawCost = values?.unitCost;
  const hasCost = rawCost !== '' && rawCost !== null && rawCost !== undefined;
  const unitCost = hasCost ? Number(rawCost) : null;
  const purchasedAt = parseDate(values?.purchasedAt);

  if (!values?.productId) {
    errors.productId = 'Elegí el artículo que ingresó.';
  }
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 9999) {
    errors.quantity = 'Ingresá una cantidad entera entre 1 y 9999.';
  }
  if (hasCost) {
    if (!Number.isFinite(unitCost) || unitCost < 0 || unitCost > 99999999) {
      errors.unitCost = 'El costo unitario no es válido.';
    } else if (Math.round(unitCost * 100) !== unitCost * 100) {
      errors.unitCost = 'Usá como máximo dos decimales.';
    }
  }
  if (supplier.length > 80) {
    errors.supplier = 'El proveedor no puede superar los 80 caracteres.';
  }
  if (!purchasedAt) {
    errors.purchasedAt = 'Elegí la fecha de compra.';
  } else if (purchasedAt.getTime() > Date.now() + MS_DAY) {
    errors.purchasedAt = 'La fecha no puede ser futura.';
  } else if (purchasedAt.getFullYear() < 2000) {
    errors.purchasedAt = 'Revisá la fecha de compra.';
  }

  return errors;
}

export function normalizePurchase(values) {
  const rawCost = values?.unitCost;
  const hasCost = rawCost !== '' && rawCost !== null && rawCost !== undefined;
  const date = parseDate(values?.purchasedAt) || new Date();
  return {
    productId: String(values?.productId ?? ''),
    quantity: Math.trunc(Number(values?.quantity)),
    unitCost: hasCost ? Math.round(Number(rawCost) * 100) / 100 : null,
    supplier: String(values?.supplier ?? '').trim().slice(0, 80),
    purchasedAt: date.toISOString(),
  };
}

/**
 * Devuelve la fecha de ingreso que debe quedar en el producto.
 * Si aún hay stock viejo, conserva la fecha más antigua.
 */
export function nextPurchasedAt(product, incomingDate) {
  const incoming = parseDate(incomingDate);
  if (!incoming) return new Date().toISOString();
  const current = parseDate(product?.purchased_at);
  const hasStock = Number(product?.stock) > 0;
  if (hasStock && current && current.getTime() < incoming.getTime()) {
    return current.toISOString();
  }
  return incoming.toISOString();
}
