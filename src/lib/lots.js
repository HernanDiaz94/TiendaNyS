/**
 * Lotes de compra y consumo FIFO.
 *
 * Un lote guarda cuantas unidades siguen disponibles (`remaining_quantity`)
 * y a que costo unitario se compraron. Las unidades de apertura (stock previo
 * a este control) no tienen costo: se consumen primero y se marcan como
 * "sin costo" en el informe en vez de inventar una ganancia.
 */

export function normalizeQuantity(value) {
  const quantity = Math.trunc(Number(value));
  return Number.isFinite(quantity) && quantity > 0 ? quantity : 0;
}

export function normalizeCost(value) {
  if (value === null || value === undefined || value === '') return null;
  const cost = Number(value);
  if (!Number.isFinite(cost) || cost < 0) return null;
  return Math.round(cost * 100) / 100;
}

function lotTime(value) {
  const time = Date.parse(value || '');
  return Number.isFinite(time) ? time : 0;
}

/** Orden FIFO: apertura primero, luego fecha de compra, creación y id. */
export function sortPurchaseLots(lots) {
  return (Array.isArray(lots) ? lots : [])
    .map((lot, index) => ({ lot, index }))
    .sort((a, b) => {
      const opening = Number(Boolean(b.lot?.is_opening)) - Number(Boolean(a.lot?.is_opening));
      if (opening) return opening;
      const purchased = lotTime(a.lot?.purchased_at) - lotTime(b.lot?.purchased_at);
      if (purchased) return purchased;
      const created = lotTime(a.lot?.created_at) - lotTime(b.lot?.created_at);
      if (created) return created;
      return String(a.lot?.id ?? a.index).localeCompare(String(b.lot?.id ?? b.index));
    })
    .map(({ lot }) => lot);
}

/**
 * Consume `quantity` unidades con FIFO y devuelve las asignaciones por lote.
 * Si los lotes no alcanzan, agrega una asignación de apertura sin costo para
 * que la venta nunca falle por falta de historial.
 */
export function allocateLots(lots, quantity) {
  const total = normalizeQuantity(quantity);
  const allocations = [];
  const remainingById = new Map();
  let left = total;

  for (const lot of sortPurchaseLots(lots)) {
    if (left < 1) break;
    const available = Math.max(0, Math.trunc(Number(lot?.remaining_quantity) || 0));
    if (available < 1) continue;

    const take = Math.min(left, available);
    const key = lot.id === null || lot.id === undefined ? null : String(lot.id);
    allocations.push({
      purchase_id: key,
      quantity: take,
      unit_cost: normalizeCost(lot.unit_cost),
      is_opening: Boolean(lot.is_opening),
    });
    if (key !== null) remainingById.set(key, available - take);
    left -= take;
  }

  if (left > 0) {
    allocations.push({
      purchase_id: null,
      quantity: left,
      unit_cost: null,
      is_opening: true,
    });
  }

  return {
    allocations,
    remainingById,
    covered: total - left,
    shortfall: left,
  };
}

/** Devuelve el remanente al cancelar un pedido, sin superar la compra original. */
export function restoreAllocatedLots(lots, allocations) {
  const byId = new Map();
  const next = (Array.isArray(lots) ? lots : []).map((lot) => {
    const copy = { ...lot };
    if (copy.id !== null && copy.id !== undefined) byId.set(String(copy.id), copy);
    return copy;
  });

  for (const allocation of Array.isArray(allocations) ? allocations : []) {
    if (allocation?.purchase_id === null || allocation?.purchase_id === undefined) continue;
    const lot = byId.get(String(allocation.purchase_id));
    if (!lot) continue;
    const available = Math.max(0, Math.trunc(Number(lot.remaining_quantity) || 0));
    const original = Math.max(normalizeQuantity(lot.quantity), available);
    const restored = normalizeQuantity(allocation.quantity);
    lot.remaining_quantity = Math.min(original, available + restored);
  }

  return next;
}

function normalizePurchaseRow(row) {
  const remaining = row?.remaining_quantity;
  return {
    ...row,
    remaining_quantity: remaining === null || remaining === undefined
      ? 0
      : Math.max(0, Math.trunc(Number(remaining) || 0)),
    is_opening: Boolean(row?.is_opening)
      || String(row?.supplier || '').trim().toLowerCase() === 'apertura',
  };
}

/**
 * Normaliza compras guardadas y crea, una sola vez por producto con stock,
 * un lote de apertura sin costo para no perder el historial de ventas.
 */
export function withOpeningLots(purchases, products) {
  const rows = (Array.isArray(purchases) ? purchases : []).map(normalizePurchaseRow);
  const opened = new Set(
    rows
      .filter((row) => row.is_opening && row.product_id !== null && row.product_id !== undefined)
      .map((row) => String(row.product_id)),
  );
  const additions = [];

  for (const product of Array.isArray(products) ? products : []) {
    const stock = normalizeQuantity(product?.stock);
    const key = String(product?.id);
    if (stock < 1 || opened.has(key)) continue;
    additions.push({
      id: `opening-${key}`,
      product_id: product.id,
      product_name: product.name || '',
      quantity: stock,
      remaining_quantity: stock,
      unit_cost: null,
      supplier: 'Apertura',
      purchased_at: product.purchased_at || product.created_at || new Date().toISOString(),
      created_at: product.created_at || new Date().toISOString(),
      is_opening: true,
    });
  }

  return [...rows, ...additions];
}
