import { describe, expect, it } from 'vitest';
import {
  createDemoProduct,
  listDemoProducts,
  listDemoPurchases,
  regularizeDemoCost,
  resetDemoData,
} from './demoStore.js';
import { sizeHasCost } from './inventory.js';

describe('regularizacion del stock existente', () => {
  it('convierte el lote de apertura en costo sin cambiar el stock', () => {
    resetDemoData();
    const product = createDemoProduct({
      name: 'Buzo prueba',
      category: 'Abrigos',
      price: 20000,
      stock: 0,
      sizes: ['M'],
      stock_by_size: { M: 3 },
      is_active: false,
    });

    const opening = listDemoPurchases().filter((purchase) => purchase.product_id === product.id);
    expect(opening).toHaveLength(1);
    expect(opening[0].is_opening).toBe(true);

    regularizeDemoCost({
      productId: product.id,
      size: 'M',
      unitCost: 9500,
      supplier: 'Local',
      purchasedAt: '2026-10-01T12:00:00.000Z',
    });

    const purchases = listDemoPurchases().filter((purchase) => purchase.product_id === product.id);
    expect(sizeHasCost(purchases, product.id, 'M')).toBe(true);
    expect(purchases.reduce((sum, purchase) => sum + purchase.remaining_quantity, 0)).toBe(3);
    expect(listDemoProducts().find((entry) => entry.id === product.id).stock).toBe(3);
  });

  it('rechaza regularizar un talle sin stock de apertura', () => {
    resetDemoData();
    const product = createDemoProduct({
      name: 'Remera prueba',
      category: 'Remeras',
      price: 10000,
      stock: 0,
      sizes: ['S'],
      stock_by_size: { S: 0 },
      is_active: false,
    });
    let error = null;
    try {
      regularizeDemoCost({
        productId: product.id,
        size: 'S',
        unitCost: 4000,
        supplier: '',
        purchasedAt: '2026-10-01T12:00:00.000Z',
      });
    } catch (failure) {
      error = failure;
    }
    expect(error?.code).toBe('NO_OPENING_STOCK');
  });
});
