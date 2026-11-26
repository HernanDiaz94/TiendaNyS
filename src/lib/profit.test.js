import { describe, expect, it } from 'vitest';
import { buildProfitReport, computeItemCost } from './profit.js';

describe('Rentabilidad exacta', () => {
  it('calcula ganancia, mark-up y margen con el ejemplo de la camisa', () => {
    const cost = computeItemCost({
      quantity: 1,
      unit_price: 12500,
      lot_allocations: [{ purchase_id: 'l1', quantity: 1, unit_cost: 10000 }],
    });
    expect(cost.knownProfit).toBe(2500);
    expect(cost.markup).toBe(25);
    expect(cost.margin).toBe(20);
    expect(cost.unknownQuantity).toBe(0);
  });

  it('separa las unidades sin costo en vez de inventar ganancia', () => {
    const cost = computeItemCost({
      quantity: 2,
      unit_price: 12500,
      lot_allocations: [
        { purchase_id: 'apertura', quantity: 1, unit_cost: null, is_opening: true },
        { purchase_id: 'l1', quantity: 1, unit_cost: 10000 },
      ],
    });
    expect(cost.knownQuantity).toBe(1);
    expect(cost.unknownQuantity).toBe(1);
    expect(cost.totalRevenue).toBe(25000);
    expect(cost.knownRevenue).toBe(12500);
    expect(cost.knownCost).toBe(10000);
    expect(cost.knownProfit).toBe(2500);
  });

  it('un pedido sin historial de lotes queda todo como sin costo', () => {
    const cost = computeItemCost({ quantity: 3, unit_price: 5000 });
    expect(cost.knownQuantity).toBe(0);
    expect(cost.unknownQuantity).toBe(3);
    expect(cost.knownProfit).toBe(0);
    expect(cost.unitCost).toBeNull();
  });

  it('el informe excluye cancelados y valora el stock restante con costo conocido', () => {
    const report = buildProfitReport({
      products: [
        { id: 'p1', name: 'Camisa', price: 12500 },
        { id: 'p2', name: 'Gorra', price: 20000 },
      ],
      orders: [
        {
          id: 'o1',
          status: 'entregado',
          created_at: '2026-11-25T10:00:00.000Z',
          customer_name: 'Ana',
          order_items: [{
            product_id: 'p1',
            product_name: 'Camisa',
            size: 'M',
            quantity: 2,
            unit_price: 12500,
            lot_allocations: [
              { purchase_id: 'l1', quantity: 1, unit_cost: 10000 },
              { purchase_id: 'ap', quantity: 1, unit_cost: null },
            ],
          }],
        },
        {
          id: 'o2',
          status: 'cancelado',
          order_items: [{
            product_id: 'p2',
            product_name: 'Gorra',
            quantity: 1,
            unit_price: 20000,
            lot_allocations: [{ purchase_id: 'l2', quantity: 1, unit_cost: 8000 }],
          }],
        },
      ],
      purchases: [
        { product_id: 'p1', remaining_quantity: 4, unit_cost: 10000 },
        { product_id: 'p1', remaining_quantity: 2, unit_cost: null },
      ],
    });

    expect(report.sales).toHaveLength(1);
    expect(report.totals.revenue).toBe(25000);
    expect(report.totals.knownCost).toBe(10000);
    expect(report.totals.knownProfit).toBe(2500);
    expect(report.totals.unknownUnits).toBe(1);
    expect(report.byProduct[0]).toMatchObject({ productName: 'Camisa', profit: 2500 });
    expect(report.stock).toMatchObject({ units: 4, withoutCost: 2, cost: 40000, profit: 10000 });
  });
});
