import { describe, expect, it } from 'vitest';
import {
  daysInStock,
  hasCostedPurchase,
  isCostedPurchase,
  isStaleStock,
  monthsInStock,
  listStaleProducts,
  nextPurchasedAt,
  normalizePurchase,
  sizeHasCost,
  STALE_STOCK_DAYS,
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

  it('keeps the oldest date while that size still has stock', () => {
    const product = {
      stock: 4,
      stock_by_size: { XL: 4, XXL: 0 },
      purchased_at: daysAgo(300),
    };
    expect(nextPurchasedAt(product, daysAgo(1), 'XL')).toBe(product.purchased_at);
    expect(nextPurchasedAt(product, daysAgo(1), 'XXL')).toBe(new Date(daysAgo(1)).toISOString());
    expect(nextPurchasedAt({ stock: 0, purchased_at: daysAgo(300) }, daysAgo(1)))
      .toBe(new Date(daysAgo(1)).toISOString());
  });
});

describe('purchase validation', () => {
  const valid = {
    productId: 'prod-1',
    size: 'XL',
    quantity: 6,
    unitCost: '1250.50',
    supplier: 'Distribuidora Norte',
    purchasedAt: '2026-11-10',
  };

  it('accepts a complete purchase with size and cost', () => {
    expect(validatePurchase(valid)).toEqual({});
    expect(normalizePurchase(valid)).toMatchObject({
      productId: 'prod-1',
      size: 'XL',
      quantity: 6,
      unitCost: 1250.5,
      supplier: 'Distribuidora Norte',
    });
  });

  it('requires the size and a real cost before publishing', () => {
    expect(validatePurchase({ ...valid, size: '' })).toHaveProperty('size');
    expect(validatePurchase({ ...valid, unitCost: '' })).toHaveProperty('unitCost');
    expect(validatePurchase({ ...valid, unitCost: null })).toHaveProperty('unitCost');
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
});

describe('cost gate', () => {
  const purchase = { product_id: 'prod-1', size: 'XL', unit_cost: 1250.5, is_opening: false };

  it('only accepts real purchases with a cost', () => {
    expect(isCostedPurchase(purchase)).toBe(true);
    expect(isCostedPurchase({ ...purchase, unit_cost: null })).toBe(false);
    expect(isCostedPurchase({ ...purchase, is_opening: true })).toBe(false);
    expect(isCostedPurchase({ ...purchase, supplier: 'Apertura' })).toBe(true);
  });

  it('checks costs per product and per size', () => {
    const purchases = [
      purchase,
      { product_id: 'prod-1', size: 'XXL', unit_cost: null, is_opening: false },
      { product_id: 'prod-2', size: 'XL', unit_cost: 900, is_opening: false },
    ];
    expect(hasCostedPurchase(purchases, 'prod-1')).toBe(true);
    expect(hasCostedPurchase(purchases, 'missing')).toBe(false);
    expect(sizeHasCost(purchases, 'prod-1', 'XL')).toBe(true);
    expect(sizeHasCost(purchases, 'prod-1', 'XXL')).toBe(false);
  });
});
