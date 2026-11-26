import { demoProducts } from '../data/demoProducts.js';
import { nextPurchasedAt } from './inventory.js';
import { getSizeStock, normalizeStockBySize, totalFromStockBySize } from './products.js';
import {
  allocateLots,
  restoreAllocatedLots,
  withOpeningLots,
} from './lots.js';

const VALID_AUDIENCES = new Set(['unisex', 'hombre', 'mujer']);

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

// Migración: reemplaza las fotos viejas de Unsplash guardadas en localStorage
// por las nuevas fotos de la semilla, sin tocar stock, pedidos ni compras.
const SEED_IMAGES = new Map(
  demoProducts.map((product) => [String(product.id), product.image_url]),
);

const SEED_AUDIENCES = new Map(
  demoProducts.map((product) => [String(product.id), product.audience]),
);

// Artículos nuevos de la semilla: se agregan sin borrar el stock guardado.
const NEW_SEED_IDS = ['nys-013', 'nys-014', 'nys-015'];

function withNewSeedProducts(products) {
  const ids = new Set(products.map((product) => String(product.id)));
  const missing = demoProducts.filter(
    (product) => NEW_SEED_IDS.includes(String(product.id)) && !ids.has(String(product.id)),
  );
  return missing.length ? [...products, ...missing] : products;
}

function storedAudience(product) {
  const value = String(product.audience || '').trim().toLowerCase();
  if (VALID_AUDIENCES.has(value)) return value;
  return SEED_AUDIENCES.get(String(product.id)) || 'unisex';
}

// Fotos reemplazadas después del primer cambio de imágenes.
const REPLACED_IMAGE_IDS = new Map([
  ['nys-003', '9629915'],
  ['nys-004', '16216558'],
]);

function withInventoryDefaults(product) {
  const id = String(product.id);
  const seedImage = SEED_IMAGES.get(id);
  const currentImage = String(product.image_url || '');
  const replacedId = REPLACED_IMAGE_IDS.get(id);
  const mustMigrate = Boolean(
    (seedImage && currentImage.includes('images.unsplash.com'))
    || (replacedId && currentImage.includes(`/photos/${replacedId}/`)),
  );
  const imageUrl = mustMigrate ? seedImage : product.image_url;
  const sizes = Array.isArray(product.sizes) && product.sizes.length ? product.sizes : ['Único'];
  const hasMap = Boolean(
    product.stock_by_size
    && typeof product.stock_by_size === 'object'
    && !Array.isArray(product.stock_by_size)
    && Object.keys(product.stock_by_size).length > 0,
  );
  const stockBySize = hasMap
    ? normalizeStockBySize(product.stock_by_size, sizes)
    : Object.fromEntries(sizes.map((size, index) => [
      size,
      index === 0 ? Math.max(0, Math.trunc(Number(product.stock) || 0)) : 0,
    ]));

  return {
    ...product,
    image_url: imageUrl,
    audience: storedAudience(product),
    purchased_at: product.purchased_at || product.created_at || new Date().toISOString(),
    stock_by_size: stockBySize,
    stock: totalFromStockBySize(stockBySize),
  };
}

export function readDemoProducts() {
  const raw = readRaw(PRODUCTS_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const merged = withNewSeedProducts(parsed);
        const normalized = merged.map(withInventoryDefaults);
        const changed = merged.length !== parsed.length
          || normalized.some((product, index) => (
            product.image_url !== merged[index].image_url
            || product.audience !== merged[index].audience
            || JSON.stringify(product.stock_by_size) !== JSON.stringify(merged[index].stock_by_size)
            || product.stock !== merged[index].stock
          ));
        if (changed) writeDemoProducts(normalized);
        return normalized;
      }
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
  const sizes = Array.isArray(payload.sizes) && payload.sizes.length ? payload.sizes : ['Único'];
  const stockBySize = normalizeStockBySize(payload.stock_by_size, sizes);
  const product = {
    ...payload,
    id: makeId(),
    created_at: new Date().toISOString(),
    purchased_at: payload.purchased_at || new Date().toISOString(),
    audience: storedAudience(payload),
    is_active: payload.is_active !== false,
    featured: Boolean(payload.featured),
    stock_by_size: stockBySize,
    stock: totalFromStockBySize(stockBySize),
  };
  writeDemoProducts([product, ...products]);
  return product;
}

export function updateDemoProduct(id, patch) {
  const products = readDemoProducts();
  const index = products.findIndex((product) => String(product.id) === String(id));
  if (index === -1) throw fail('NOT_FOUND', 'El artículo no existe.');
  const next = { ...products[index], ...patch, id: products[index].id };
  if (patch.stock_by_size) {
    const sizes = Array.isArray(next.sizes) && next.sizes.length ? next.sizes : ['Único'];
    next.stock_by_size = normalizeStockBySize(patch.stock_by_size, sizes);
    next.stock = totalFromStockBySize(next.stock_by_size);
  }
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
  const purchasePool = readDemoPurchases().map((purchase) => ({ ...purchase }));
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
    if (getSizeStock(product, size) < quantity) {
      throw fail('STOCK_CHANGED', 'Se actualizó el stock de ese talle.');
    }

    const unitPrice = Number(product.price);
    const { allocations, remainingById } = allocateLots(
      purchasePool.filter((lot) => (
        String(lot.product_id) === String(product.id)
        && String(lot.size || 'Único') === size
      )),
      quantity,
    );
    for (const [lotId, remaining] of remainingById) {
      const index = purchasePool.findIndex((lot) => String(lot.id) === lotId);
      if (index !== -1) purchasePool[index] = {
        ...purchasePool[index],
        remaining_quantity: remaining,
      };
    }

    total += unitPrice * quantity;
    const decrementKey = `${String(product.id)}::${size.toLowerCase()}`;
    const previous = decrements.get(decrementKey) || { productId: product.id, size, quantity: 0 };
    decrements.set(decrementKey, { ...previous, quantity: previous.quantity + quantity });
    normalized.push({
      id: makeId(),
      product_id: product.id,
      product_name: product.name,
      size,
      quantity,
      unit_price: unitPrice,
      lot_allocations: allocations,
    });
  }

  const updated = products.map((product) => {
    const rows = [...decrements.values()].filter((row) => String(row.productId) === String(product.id));
    if (rows.length < 1) return product;
    const stockBySize = { ...(product.stock_by_size || {}) };
    for (const row of rows) {
      const key = Object.keys(stockBySize).find((entry) => entry.toLowerCase() === row.size.toLowerCase());
      const target = key ?? row.size;
      stockBySize[target] = Math.max(0, getSizeStock(product, row.size) - row.quantity);
    }
    return {
      ...product,
      stock_by_size: stockBySize,
      stock: totalFromStockBySize(stockBySize),
    };
  });
  writeDemoProducts(updated);
  writeDemoPurchases(purchasePool);

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
    const allocations = [];
    for (const item of orders[index].order_items || []) {
      if (item.product_id) {
        const size = String(item.size || 'Único');
        const key = `${String(item.product_id)}::${size.toLowerCase()}`;
        restored.set(key, {
          productId: item.product_id,
          size,
          quantity: (restored.get(key)?.quantity || 0) + item.quantity,
        });
      }
      if (Array.isArray(item.lot_allocations)) allocations.push(...item.lot_allocations);
    }
    writeDemoProducts(products.map((product) => {
      const rows = [...restored.values()].filter((row) => String(row.productId) === String(product.id));
      if (rows.length < 1) return product;
      const stockBySize = { ...(product.stock_by_size || {}) };
      for (const row of rows) {
        const key = Object.keys(stockBySize).find((entry) => entry.toLowerCase() === row.size.toLowerCase());
        const target = key ?? row.size;
        stockBySize[target] = Math.min(9999, getSizeStock(product, row.size) + row.quantity);
      }
      return {
        ...product,
        stock_by_size: stockBySize,
        stock: totalFromStockBySize(stockBySize),
      };
    }));
    writeDemoPurchases(restoreAllocatedLots(readDemoPurchases(), allocations));
  }

  orders[index] = { ...orders[index], status };
  writeDemoOrders(orders);
  return orders[index];
}

function writeDemoPurchases(purchases) {
  writeRaw(PURCHASES_KEY, JSON.stringify(purchases));
}

export function readDemoPurchases() {
  const raw = readRaw(PURCHASES_KEY);
  let parsed = [];
  if (raw) {
    try {
      const value = JSON.parse(raw);
      if (Array.isArray(value)) parsed = value;
    } catch {
      /* fall back to normalized empty list */
    }
  }
  const normalized = withOpeningLots(parsed, readDemoProducts());
  const changed = normalized.length !== parsed.length
    || normalized.some((purchase, index) => (
      purchase.remaining_quantity !== parsed[index]?.remaining_quantity
      || purchase.is_opening !== parsed[index]?.is_opening
    ));
  if (changed) writeDemoPurchases(normalized);
  return normalized;
}

export function listDemoPurchases() {
  return [...readDemoPurchases()].sort(
    (a, b) => new Date(b.purchased_at || 0).getTime() - new Date(a.purchased_at || 0).getTime(),
  );
}

export function createDemoPurchase({ productId, size = 'Único', quantity, unitCost, supplier, purchasedAt }) {
  const products = readDemoProducts();
  const index = products.findIndex((product) => String(product.id) === String(productId));
  if (index === -1) throw fail('PRODUCT_NOT_FOUND', 'El artículo ya no existe.');

  const amount = Math.trunc(Number(quantity));
  if (!Number.isInteger(amount) || amount < 1 || amount > 9999) {
    throw fail('INVALID_QUANTITY', 'La cantidad comprada no es válida.');
  }

  const product = products[index];
  const sizeName = String(size || 'Único').trim().slice(0, 20) || 'Único';
  const sizes = Array.isArray(product.sizes) && product.sizes.length ? product.sizes : ['Único'];
  if (!sizes.some((entry) => entry.toLowerCase() === sizeName.toLowerCase())) {
    throw fail('INVALID_SIZE', 'Ese talle no pertenece al artículo.');
  }
  const cost = unitCost === null || unitCost === undefined || unitCost === ''
    ? null
    : Math.round(Number(unitCost) * 100) / 100;
  const supplierName = String(supplier || '').trim().slice(0, 80);
  const entryDate = purchasedAt || new Date().toISOString();

  const stockBySize = { ...(product.stock_by_size || {}) };
  const key = Object.keys(stockBySize).find((entry) => entry.toLowerCase() === sizeName.toLowerCase());
  const target = key ?? sizeName;
  stockBySize[target] = Math.min(9999, getSizeStock(product, sizeName) + amount);

  const updated = {
    ...product,
    stock_by_size: stockBySize,
    stock: totalFromStockBySize(stockBySize),
    purchased_at: nextPurchasedAt(product, entryDate, sizeName),
  };
  products[index] = updated;
  writeDemoProducts(products);

  const purchase = {
    id: makeId(),
    product_id: product.id,
    product_name: product.name,
    size: sizeName,
    quantity: amount,
    remaining_quantity: amount,
    unit_cost: cost,
    supplier: supplierName,
    purchased_at: entryDate,
    created_at: new Date().toISOString(),
    is_opening: false,
  };
  writeDemoPurchases([purchase, ...readDemoPurchases()]);
  return { product: updated, purchase };
}

export function regularizeDemoCost({ productId, size = 'Único', unitCost, supplier, purchasedAt }) {
  const purchases = readDemoPurchases();
  const sizeName = String(size || 'Único').trim().slice(0, 20) || 'Único';
  const cost = Math.round(Number(unitCost) * 100) / 100;
  if (!Number.isFinite(cost) || cost < 0) throw fail('INVALID_COST', 'El costo unitario no es válido.');
  const date = purchasedAt || new Date().toISOString();

  let updated = 0;
  const nextPurchases = purchases.map((purchase) => {
    if (
      String(purchase.product_id) !== String(productId)
      || String(purchase.size ?? 'Único') !== sizeName
      || purchase.is_opening !== true
      || Number(purchase.remaining_quantity) < 1
    ) return purchase;
    updated += 1;
    return {
      ...purchase,
      unit_cost: cost,
      is_opening: false,
      supplier: String(supplier || '').trim().slice(0, 80) || purchase.supplier,
      purchased_at: date,
    };
  });
  if (updated === 0) throw fail('NO_OPENING_STOCK', 'No hay stock de apertura para ese talle.');
  writeDemoPurchases(nextPurchases);

  const products = readDemoProducts();
  const index = products.findIndex((product) => String(product.id) === String(productId));
  if (index !== -1) {
    const product = products[index];
    const stockBySize = { ...(product.stock_by_size || {}) };
    const key = Object.keys(stockBySize).find((entry) => entry.toLowerCase() === sizeName.toLowerCase()) ?? sizeName;
    if (Number(stockBySize[key]) > 0) stockBySize[key] = Number(stockBySize[key]);
    const purchaseDate = parseDemoDate(date);
    const currentDate = parseDemoDate(product.purchased_at);
    products[index] = {
      ...product,
      stock_by_size: stockBySize,
      purchased_at: currentDate && purchaseDate && currentDate.getTime() < purchaseDate.getTime()
        ? currentDate.toISOString()
        : purchaseDate?.toISOString() || date,
    };
    writeDemoProducts(products);
    return products[index];
  }
  return null;
}

function parseDemoDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
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
