import { describe, expect, it } from 'vitest';
import {
  STALE_STOCK_DAYS,
  daysInStock,
  isStaleStock,
  listStaleProducts,
  monthsInStock,
  nextPurchasedAt,
  normalizePurchase,
  validatePurchase,
} from './inventory.js';

const NOW = new Date('2026-11-20T12:00:00.000Z').getTime();
const daysAgo = (days) => new Date(NOW - days * 24 * 60 * 60 * 1000).toISOString();

describe('inventory aging', () => {
  it('counts days and months since the stock entry', () => {
    expect(daysInStock(daysAgo(30), NOW)).toBe(30);
    expect(monthsInStock(daysAgo(61), NOW)).toBe(2);
    expect(daysInStock('', NOW)).toBeNull();
  });

  it('flags products with stock older than six months', () => {
    const stale = { stock: 3, purchased_at: daysAgo(STALE_STOCK_DAYS + 1) };
    const fresh = { stock: 3, purchased_at: daysAgo(20) };
    const soldOut = { stock: 0, purchased_at: daysAgo(400) };
    expect(isStaleStock(stale, { now: NOW })).toBe(true);
    expect(isStaleStock(fresh, { now: NOW })).toBe(false);
    expect(isStaleStock(soldOut, { now: NOW })).toBe(false);
    expect(listStaleProducts([stale, fresh, soldOut], { now: NOW })).toEqual([stale]);
  });

  it('keeps the oldest date while old stock remains', () => {
    const product = { stock: 4, purchased_at: daysAgo(300) };
    expect(nextPurchasedAt(product, daysAgo(1))).toBe(product.purchased_at);
    expect(nextPurchasedAt({ stock: 0, purchased_at: daysAgo(300) }, daysAgo(1)))
      .toBe(new Date(daysAgo(1)).toISOString());
  });
});

describe('purchase validation', () => {
  const valid = {
    productId: 'prod-1',
    quantity: 6,
    unitCost: '1250.50',
    supplier: 'Distribuidora Norte',
    purchasedAt: '2026-11-10',
  };

  it('accepts a complete purchase', () => {
    expect(validatePurchase(valid)).toEqual({});
  });

  it('rejects missing product, bad quantity and future dates', () => {
    expect(validatePurchase({ ...valid, productId: '' })).toHaveProperty('productId');
    expect(validatePurchase({ ...valid, quantity: 0 })).toHaveProperty('quantity');
    expect(validatePurchase({ ...valid, quantity: 4.5 })).toHaveProperty('quantity');
    expect(validatePurchase({ ...valid, purchasedAt: '2999-01-01' })).toHaveProperty('purchasedAt');
  });

  it('rejects invalid costs and long suppliers', () => {
    expect(validatePurchase({ ...valid, unitCost: '-5' })).toHaveProperty('unitCost');
    expect(validatePurchase({ ...valid, unitCost: '10.999' })).toHaveProperty('unitCost');
    expect(validatePurchase({ ...valid, supplier: 'x'.repeat(81) })).toHaveProperty('supplier');
  });

  it('normalizes values and allows an empty cost', () => {
    const normalized = normalizePurchase({ ...valid, unitCost: '' });
    expect(normalized).toMatchObject({
      productId: 'prod-1',
      quantity: 6,
      unitCost: null,
      supplier: 'Distribuidora Norte',
    });
    expect(Number.isNaN(new Date(normalized.purchasedAt).getTime())).toBe(false);
  });
});
