import { describe, expect, it } from 'vitest';
import {
  addToCart,
  buildWhatsAppUrl,
  cartCount,
  cartTotal,
  changeQuantity,
  normalizeDni,
  reconcileCart,
  sanitizeCart,
  validateCustomer,
} from './shop.js';

const product = { id: 'tee-1', name: 'Remera', price: 12000, stock: 3 };

describe('cart rules', () => {
  it('adds the same product and size by increasing its quantity', () => {
    const once = addToCart([], product, 'M');
    const twice = addToCart(once, product, 'M');
    expect(twice).toHaveLength(1);
    expect(twice[0].quantity).toBe(2);
  });

  it('does not add beyond available stock', () => {
    const cart = [{ ...product, size: 'M', quantity: 3 }];
    expect(addToCart(cart, product, 'M')).toEqual(cart);
  });

  it('respects the requested quantity and the 10 unit cap', () => {
    const withTwo = addToCart([], { ...product, stock: 20 }, 'M', 2);
    expect(withTwo[0].quantity).toBe(2);
    const capped = addToCart([], { ...product, stock: 20 }, 'M', 99);
    expect(capped[0].quantity).toBe(10);
  });

  it('counts quantities and totals using integer cents', () => {
    const cart = [{ ...product, size: 'M', quantity: 2 }];
    expect(cartCount(cart)).toBe(2);
    expect(cartTotal(cart)).toBe(24000);
  });

  it('changes quantity and removes the line when it reaches zero', () => {
    const cart = [{ ...product, size: 'M', quantity: 2 }];
    expect(changeQuantity(cart, 'tee-1', 'M', 1)[0].quantity).toBe(1);
    expect(changeQuantity(cart, 'tee-1', 'M', 0)).toEqual([]);
    expect(changeQuantity(cart, 'tee-1', 'M', 99)[0].quantity).toBe(3);
  });
});

describe('cart sanitizing and reconciliation', () => {
  it('normalizes a DNI to digits and rejects invalid lengths', () => {
    expect(normalizeDni(' 31.234.567 ')).toBe('31234567');
    expect(normalizeDni('123')).toBeNull();
  });

  it('discards malformed or impossible entries restored from local storage', () => {
    const valid = { ...product, size: 'M', quantity: 1 };
    const tampered = { ...product, size: 'M', quantity: 999 };
    expect(sanitizeCart([valid, tampered, null, { id: 42 }])).toEqual([valid]);
  });

  it('removes unavailable products and refreshes stock and price', () => {
    const cart = [
      { ...product, size: 'M', quantity: 2 },
      { id: 'gone', name: 'Viejo', price: 100, stock: 1, size: 'S', quantity: 1 },
    ];
    const next = reconcileCart(cart, [
      { id: 'tee-1', name: 'Remera', price: 15000, stock: 1, is_active: true },
    ]);
    expect(next).toHaveLength(1);
    expect(next[0]).toMatchObject({ price: 15000, stock: 1, quantity: 1 });
  });

  it('returns the same cart reference when nothing changed', () => {
    const cart = [{ ...product, size: 'M', quantity: 2 }];
    expect(reconcileCart(cart, [product])).toBe(cart);
  });
});

describe('checkout validation and WhatsApp links', () => {
  const customer = { name: 'Ana Pérez', dni: '31234567', phone: '+54 9 11 5555 4444', notes: '' };

  it('accepts a complete customer and rejects missing privacy consent', () => {
    expect(validateCustomer(customer, true)).toEqual({});
    expect(validateCustomer(customer, false)).toHaveProperty('privacy');
  });

  it('rejects invalid DNI, phone and dangerous characters', () => {
    expect(validateCustomer({ ...customer, dni: '123' }, true)).toHaveProperty('dni');
    expect(validateCustomer({ ...customer, phone: 'abc' }, true)).toHaveProperty('phone');
    expect(validateCustomer({ ...customer, name: '<script>' }, true)).toHaveProperty('name');
    expect(validateCustomer({ ...customer, notes: 'x'.repeat(301) }, true)).toHaveProperty('notes');
  });

  it('builds a WhatsApp URL only with a plausible number', () => {
    const url = buildWhatsAppUrl('+54 9 11 5555-4444', 'Hola');
    expect(url).toContain('https://wa.me/5491155554444?text=Hola');
    expect(buildWhatsAppUrl('123', 'Hola')).toBeNull();
    expect(buildWhatsAppUrl('', 'Hola')).toBeNull();
  });
});
