import { demoProducts } from '../data/demoProducts.js';
import { nextPurchasedAt } from './inventory.js';

const PRODUCTS_KEY = 'nys-demo-products-v2';
const ORDERS_KEY = 'nys-demo-orders-v2';
const PURCHASES_KEY = 'nys-demo-purchases-v2';
const memory = new Map();

const STATUSES = ['pendiente', 'confirmado', 'preparando', 'listo', 'entregado', 'cancelado'];
const FINAL_STATUSES = ['entregado', 'cancelado'];

function readRaw(key) {
  try {
    const value = window.localStorage.getItem(key);
    if (value !== null) return value;
  } catch {
    /* localStorage can be unavailable in private browsing */
  }
  return memory.get(key) ?? null;
}

function writeRaw(key, value) {
  memory.set(key, value);
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* keep the in-memory copy so the demo still works this session */
  }
}

function makeId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `demo-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function fail(code, message) {
  const error = new Error(message || code);
  error.code = code;
  return error;
}

function seedProducts() {
  const now = new Date().toISOString();
  return demoProducts.map((product) => ({
    ...product,
    is_active: product.is_active !== false,
    featured: Boolean(product.featured),
    purchased_at: product.purchased_at || product.created_at || now,
  }));
}

function withInventoryDefaults(product) {
  return {
    ...product,
    purchased_at: product.purchased_at || product.created_at || new Date().toISOString(),
  };
}

export function readDemoProducts() {
  const raw = readRaw(PRODUCTS_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(withInventoryDefaults);
    } catch {
      /* fall back to the seed */
    }
  }
  const seeded = seedProducts();
  writeRaw(PRODUCTS_KEY, JSON.stringify(seeded));
  return seeded;
}

function writeDemoProducts(products) {
  writeRaw(PRODUCTS_KEY, JSON.stringify(products));
}

export function listDemoProducts() {
  return [...readDemoProducts()].sort(
    (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime(),
  );
}

export function createDemoProduct(payload) {
  const products = readDemoProducts();
  const product = {
    ...payload,
    id: makeId(),
    created_at: new Date().toISOString(),
    purchased_at: payload.purchased_at || new Date().toISOString(),
    is_active: payload.is_active !== false,
    featured: Boolean(payload.featured),
  };
  writeDemoProducts([product, ...products]);
  return product;
}

export function updateDemoProduct(id, patch) {
  const products = readDemoProducts();
  const index = products.findIndex((product) => String(product.id) === String(id));
  if (index === -1) throw fail('NOT_FOUND', 'El artículo no existe.');
  const next = { ...products[index], ...patch, id: products[index].id };
  products[index] = next;
  writeDemoProducts(products);
  return next;
}

export function deleteDemoProduct(id) {
  const products = readDemoProducts();
  const next = products.filter((product) => String(product.id) !== String(id));
  if (next.length === products.length) throw fail('NOT_FOUND', 'El artículo no existe.');
  writeDemoProducts(next);
}

function readDemoOrders() {
  const raw = readRaw(ORDERS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeDemoOrders(orders) {
  writeRaw(ORDERS_KEY, JSON.stringify(orders));
}

export function listDemoOrders() {
  return [...readDemoOrders()].sort(
    (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime(),
  );
}

export function createDemoOrder({ customer, items }) {
  const products = readDemoProducts();
  const byId = new Map(products.map((product) => [String(product.id), product]));
  const normalized = [];
  const decrements = new Map();
  let total = 0;

  if (!Array.isArray(items) || items.length < 1 || items.length > 20) {
    throw fail('INVALID_ITEMS', 'La bolsa está vacía o tiene demasiados artículos.');
  }

  for (const raw of items) {
    const product = byId.get(String(raw.id));
    if (!product || product.is_active === false) {
      throw fail('ITEM_UNAVAILABLE', 'Un artículo de tu bolsa ya no está disponible.');
    }

    const quantity = Math.trunc(Number(raw.quantity));
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
      throw fail('INVALID_ITEM', 'La cantidad de un artículo no es válida.');
    }

    const size = String(raw.size || 'Único').trim().slice(0, 20) || 'Único';
    const productSizes = Array.isArray(product.sizes) && product.sizes.length ? product.sizes : ['Único'];
    if (!productSizes.includes(size)) {
      throw fail('INVALID_SIZE', 'El talle elegido ya no está disponible.');
    }
    if (Number(product.stock) < quantity) {
      throw fail('STOCK_CHANGED', 'Se actualizó el stock de un artículo.');
    }

    const unitPrice = Number(product.price);
    total += unitPrice * quantity;
    decrements.set(product.id, (decrements.get(product.id) || 0) + quantity);
    normalized.push({
      id: makeId(),
      product_id: product.id,
      product_name: product.name,
      size,
      quantity,
      unit_price: unitPrice,
    });
  }

  const updated = products.map((product) => {
    const reserved = decrements.get(product.id) || 0;
    if (!reserved) return product;
    return { ...product, stock: Math.max(0, Number(product.stock) - reserved) };
  });
  writeDemoProducts(updated);

  const order = {
    id: makeId(),
    customer_name: String(customer?.name || '').trim(),
    customer_phone: String(customer?.phone || '').trim(),
    delivery_notes: String(customer?.notes || '').trim().slice(0, 300),
    status: 'pendiente',
    total,
    created_at: new Date().toISOString(),
    order_items: normalized,
  };
  writeDemoOrders([order, ...readDemoOrders()]);
  return order;
}

export function updateDemoOrderStatus(id, status) {
  if (!STATUSES.includes(status)) throw fail('INVALID_STATUS', 'Estado inválido.');
  const orders = readDemoOrders();
  const index = orders.findIndex((order) => String(order.id) === String(id));
  if (index === -1) throw fail('ORDER_NOT_FOUND', 'El pedido no existe.');
  if (FINAL_STATUSES.includes(orders[index].status)) {
    throw fail('ORDER_FINALIZED', 'El pedido ya está finalizado.');
  }

  if (status === 'cancelado') {
    const products = readDemoProducts();
    const restored = new Map();
    for (const item of orders[index].order_items || []) {
      if (!item.product_id) continue;
      restored.set(item.product_id, (restored.get(item.product_id) || 0) + item.quantity);
    }
    writeDemoProducts(products.map((product) => {
      const quantity = restored.get(product.id) || 0;
      if (!quantity) return product;
      return { ...product, stock: Math.min(9999, Number(product.stock) + quantity) };
    }));
  }

  orders[index] = { ...orders[index], status };
  writeDemoOrders(orders);
  return orders[index];
}

function readDemoPurchases() {
  const raw = readRaw(PURCHASES_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeDemoPurchases(purchases) {
  writeRaw(PURCHASES_KEY, JSON.stringify(purchases));
}

export function listDemoPurchases() {
  return [...readDemoPurchases()].sort(
    (a, b) => new Date(b.purchased_at || 0).getTime() - new Date(a.purchased_at || 0).getTime(),
  );
}

export function createDemoPurchase({ productId, quantity, unitCost, supplier, purchasedAt }) {
  const products = readDemoProducts();
  const index = products.findIndex((product) => String(product.id) === String(productId));
  if (index === -1) throw fail('PRODUCT_NOT_FOUND', 'El artículo ya no existe.');

  const amount = Math.trunc(Number(quantity));
  if (!Number.isInteger(amount) || amount < 1 || amount > 9999) {
    throw fail('INVALID_QUANTITY', 'La cantidad comprada no es válida.');
  }

  const product = products[index];
  const cost = unitCost === null || unitCost === undefined || unitCost === ''
    ? null
    : Math.round(Number(unitCost) * 100) / 100;
  const supplierName = String(supplier || '').trim().slice(0, 80);
  const entryDate = purchasedAt || new Date().toISOString();

  const updated = {
    ...product,
    stock: Math.min(9999, Number(product.stock) + amount),
    purchased_at: nextPurchasedAt(product, entryDate),
  };
  products[index] = updated;
  writeDemoProducts(products);

  const purchase = {
    id: makeId(),
    product_id: product.id,
    product_name: product.name,
    quantity: amount,
    unit_cost: cost,
    supplier: supplierName,
    purchased_at: entryDate,
    created_at: new Date().toISOString(),
  };
  writeDemoPurchases([purchase, ...readDemoPurchases()]);
  return { product: updated, purchase };
}

export function resetDemoData() {
  try {
    window.localStorage.removeItem(PRODUCTS_KEY);
    window.localStorage.removeItem(ORDERS_KEY);
    window.localStorage.removeItem(PURCHASES_KEY);
  } catch {
    /* ignore */
  }
  memory.delete(PRODUCTS_KEY);
  memory.delete(ORDERS_KEY);
  memory.delete(PURCHASES_KEY);
}
