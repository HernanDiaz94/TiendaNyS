/**
 * Informe de rentabilidad con utilidad exacta por unidad vendida.
 *
 * La ganancia se calcula solo sobre las unidades cuyo lote tiene costo
 * conocido. Las unidades de apertura se cuentan aparte como "sin costo" para
 * no mostrar una utilidad inventada.
 */

import { normalizeCost, normalizeQuantity } from './lots.js';

function round2(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function ratio(numerator, denominator) {
  if (!denominator) return null;
  return round2((numerator / denominator) * 100);
}

export function computeItemCost(item) {
  const quantity = normalizeQuantity(item?.quantity);
  const allocations = Array.isArray(item?.lot_allocations) ? item.lot_allocations : [];
  let knownQuantity = 0;
  let knownCost = 0;

  for (const allocation of allocations) {
    const units = normalizeQuantity(allocation?.quantity);
    const cost = normalizeCost(allocation?.unit_cost);
    if (units < 1 || cost === null) continue;
    knownQuantity += units;
    knownCost += units * cost;
  }

  const allocatedKnown = knownQuantity;
  if (allocatedKnown > quantity && allocatedKnown > 0) {
    knownCost = (knownCost * quantity) / allocatedKnown;
  }
  knownQuantity = Math.min(allocatedKnown, quantity);

  const rawPrice = Number(item?.unit_price);
  const unitPrice = Number.isFinite(rawPrice) && rawPrice > 0 ? rawPrice : 0;
  const unknownQuantity = Math.max(0, quantity - knownQuantity);
  const knownRevenue = round2(knownQuantity * unitPrice);
  const totalRevenue = round2(quantity * unitPrice);
  const knownCostValue = round2(knownCost);
  const knownProfit = round2(knownRevenue - knownCostValue);

  return {
    quantity,
    unitPrice: round2(unitPrice),
    knownQuantity,
    unknownQuantity,
    knownCost: knownCostValue,
    knownRevenue,
    totalRevenue,
    knownProfit,
    unitCost: knownQuantity ? round2(knownCostValue / knownQuantity) : null,
    markup: ratio(knownProfit, knownCostValue),
    margin: ratio(knownProfit, knownRevenue),
  };
}

export function buildProfitReport({ orders, products, purchases } = {}) {
  const byId = new Map((Array.isArray(products) ? products : []).map((product) => [String(product.id), product]));
  const byProduct = new Map();
  const sales = [];
  let revenue = 0;
  let knownCost = 0;
  let knownProfit = 0;
  let knownUnits = 0;
  let unknownUnits = 0;

  for (const order of Array.isArray(orders) ? orders : []) {
    if (order?.status === 'cancelado') continue;
    for (const item of Array.isArray(order?.order_items) ? order.order_items : []) {
      const cost = computeItemCost(item);
      const name = byId.get(String(item?.product_id))?.name || item?.product_name || 'Artículo';
      sales.push({
        orderId: order.id,
        customerName: order.customer_name || '',
        createdAt: order.created_at,
        productName: name,
        size: item?.size || 'Único',
        ...cost,
      });

      revenue += cost.totalRevenue;
      knownCost += cost.knownCost;
      knownProfit += cost.knownProfit;
      knownUnits += cost.knownQuantity;
      unknownUnits += cost.unknownQuantity;

      const row = byProduct.get(name) || {
        productName: name,
        units: 0,
        revenue: 0,
        knownUnits: 0,
        unknownUnits: 0,
        cost: 0,
        profit: 0,
      };
      row.units += cost.quantity;
      row.revenue += cost.totalRevenue;
      row.knownUnits += cost.knownQuantity;
      row.unknownUnits += cost.unknownQuantity;
      row.cost += cost.knownCost;
      row.profit += cost.knownProfit;
      byProduct.set(name, row);
    }
  }

  let stockUnits = 0;
  let stockCost = 0;
  let stockRevenue = 0;
  let stockWithoutCost = 0;
  for (const lot of Array.isArray(purchases) ? purchases : []) {
    const units = normalizeQuantity(lot?.remaining_quantity);
    if (units < 1) continue;
    const product = byId.get(String(lot?.product_id));
    const price = Number(product?.price);
    const unitCost = normalizeCost(lot?.unit_cost);
    if (unitCost === null) {
      stockWithoutCost += units;
      continue;
    }
    stockUnits += units;
    stockCost += units * unitCost;
    stockRevenue += units * (Number.isFinite(price) ? price : 0);
  }

  const productRows = [...byProduct.values()]
    .map((row) => ({
      ...row,
      revenue: round2(row.revenue),
      cost: round2(row.cost),
      profit: round2(row.profit),
      markup: ratio(row.profit, row.cost),
      margin: ratio(row.profit, row.revenue),
    }))
    .sort((a, b) => b.profit - a.profit || a.productName.localeCompare(b.productName));

  return {
    sales: sales.sort((a, b) => Date.parse(b.createdAt || '') - Date.parse(a.createdAt || '')),
    byProduct: productRows,
    totals: {
      revenue: round2(revenue),
      knownCost: round2(knownCost),
      knownProfit: round2(knownProfit),
      knownUnits,
      unknownUnits,
      markup: ratio(knownProfit, knownCost),
      margin: ratio(knownProfit, revenue),
    },
    stock: {
      units: stockUnits,
      withoutCost: stockWithoutCost,
      cost: round2(stockCost),
      revenue: round2(stockRevenue),
      profit: round2(stockRevenue - stockCost),
      margin: ratio(stockRevenue - stockCost, stockRevenue),
    },
  };
}
