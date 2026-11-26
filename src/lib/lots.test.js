import { describe, expect, it } from 'vitest';
import {
  allocateLots,
  normalizeCost,
  restoreAllocatedLots,
  sortPurchaseLots,
  withOpeningLots,
} from './lots.js';

const lots = [
  {
    id: 'compra-2',
    remaining_quantity: 4,
    unit_cost: 12000,
    purchased_at: '2026-11-20T10:00:00.000Z',
    created_at: '2026-11-20T10:00:00.000Z',
  },
  {
    id: 'apertura',
    remaining_quantity: 3,
    unit_cost: null,
    purchased_at: '2026-11-01T10:00:00.000Z',
    created_at: '2026-11-26T10:00:00.000Z',
    is_opening: true,
  },
  {
    id: 'compra-1',
    remaining_quantity: 5,
    unit_cost: 10000,
    purchased_at: '2026-11-18T10:00:00.000Z',
    created_at: '2026-11-18T10:00:00.000Z',
  },
];

describe('FIFO de lotes', () => {
  it('consume la apertura primero aunque tenga fecha de creación posterior', () => {
    expect(sortPurchaseLots(lots).map((lot) => lot.id)).toEqual([
      'apertura',
      'compra-1',
      'compra-2',
    ]);
  });

  it('divide una venta entre varios lotes y descuenta solo lo consumido', () => {
    const result = allocateLots(lots, 6);
    expect(result.allocations).toEqual([
      { purchase_id: 'apertura', quantity: 3, unit_cost: null, is_opening: true },
      { purchase_id: 'compra-1', quantity: 3, unit_cost: 10000, is_opening: false },
    ]);
    expect(result.remainingById.get('apertura')).toBe(0);
    expect(result.remainingById.get('compra-1')).toBe(2);
    expect(result.remainingById.get('compra-2')).toBeUndefined();
    expect(result.shortfall).toBe(0);
  });

  it('marca como sin costo el faltante cuando no hay lotes suficientes', () => {
    const result = allocateLots([lots[1]], 5);
    expect(result.allocations).toEqual([
      { purchase_id: 'apertura', quantity: 3, unit_cost: null, is_opening: true },
      { purchase_id: null, quantity: 2, unit_cost: null, is_opening: true },
    ]);
    expect(result.shortfall).toBe(2);
  });

  it('devuelve el stock de los lotes al cancelar sin exceder la compra', () => {
    const updated = restoreAllocatedLots(lots, [
      { purchase_id: 'compra-1', quantity: 3 },
      { purchase_id: 'compra-2', quantity: 99 },
      { purchase_id: null, quantity: 4 },
    ]);
    expect(updated.find((lot) => lot.id === 'compra-1').remaining_quantity).toBe(5);
    expect(updated.find((lot) => lot.id === 'compra-2').remaining_quantity).toBe(4);
    expect(updated.find((lot) => lot.id === 'apertura').remaining_quantity).toBe(3);
    expect(lots[0].remaining_quantity).toBe(4);
  });

  it('crea un lote de apertura por producto con stock y no duplica al repetir', () => {
    const products = [
      { id: 'a', name: 'Camisa', stock: 5, purchased_at: '2026-10-01', created_at: '2026-10-01' },
      { id: 'b', name: 'Gorra', stock: 0 },
    ];
    const first = withOpeningLots([], products);
    expect(first).toHaveLength(1);
    expect(first[0]).toMatchObject({
      product_id: 'a',
      quantity: 5,
      remaining_quantity: 5,
      unit_cost: null,
      is_opening: true,
    });
    expect(withOpeningLots(first, products)).toHaveLength(1);
  });

  it('crea un lote de apertura por cada talle con stock', () => {
    const products = [{
      id: 'a',
      name: 'Camisa',
      stock: 9,
      sizes: ['S', 'M', 'L'],
      stock_by_size: { S: 4, M: 5, L: 0 },
      purchased_at: '2026-10-01',
      created_at: '2026-10-01',
    }];
    const lotsBySize = withOpeningLots([], products);
    expect(lotsBySize.map((lot) => lot.size)).toEqual(['S', 'M']);
    expect(lotsBySize.map((lot) => lot.remaining_quantity)).toEqual([4, 5]);
    expect(withOpeningLots(lotsBySize, products)).toHaveLength(2);
  });

  it('normaliza costos con dos decimales y sin costo', () => {
    expect(normalizeCost('10000')).toBe(10000);
    expect(normalizeCost('10000.999')).toBe(10001);
    expect(normalizeCost('')).toBeNull();
    expect(normalizeCost(undefined)).toBeNull();
  });
});
