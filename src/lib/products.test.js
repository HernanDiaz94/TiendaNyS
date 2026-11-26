import { describe, expect, it } from 'vitest';
import {
  filterProducts,
  getCatalogCategories,
  getCatalogSizes,
  getSizeStock,
  getTotalStock,
  normalizeStockBySize,
  normalizeAudience,
  normalizeProductDraft,
  parseSizes,
  sortSizes,
  stockState,
  validateProduct,
} from './products.js';

const catalog = [
  {
    id: '1',
    name: 'Remera Ácida',
    category: 'Remeras',
    description: 'Algodón pesado',
    color: 'Negro',
    price: 24900,
    stock: 5,
    sizes: ['S', 'M', 'L'],
    is_active: true,
    featured: true,
    created_at: '2026-11-10T12:00:00.000Z',
  },
  {
    id: '2',
    name: 'Zapatillas Calle',
    category: 'Calzado',
    description: 'Suela de goma',
    color: 'Blanco',
    price: 79900,
    stock: 0,
    sizes: ['38', '39', '40'],
    is_active: true,
    featured: false,
    created_at: '2026-11-12T12:00:00.000Z',
  },
  {
    id: '3',
    name: 'Buzo Oculto',
    category: 'Abrigos',
    description: 'Frisa',
    color: 'Gris',
    price: 58900,
    stock: 2,
    sizes: ['M', 'L'],
    is_active: false,
    featured: false,
    created_at: '2026-11-14T12:00:00.000Z',
  },
];

const audienceCatalog = [
  { id: 'h', name: 'Camisa', audience: 'hombre', is_active: true },
  { id: 'm', name: 'Pantalon', audience: 'mujer', is_active: true },
  { id: 'u', name: 'Gorra', audience: null, is_active: true },
  { id: 'u2', name: 'Bolso', audience: 'desconocido', is_active: true },
];

describe('catalog filtering', () => {
  it('includes unisex products in both Hombre and Mujer', () => {
    expect(filterProducts(audienceCatalog, { audience: 'hombre' }).map((p) => p.id)).toEqual(['h', 'u', 'u2']);
    expect(filterProducts(audienceCatalog, { audience: 'mujer' }).map((p) => p.id)).toEqual(['m', 'u', 'u2']);
    expect(filterProducts(audienceCatalog, { audience: 'Todos' })).toHaveLength(4);
    expect(normalizeAudience('  HOMBRE ')).toBe('hombre');
    expect(normalizeAudience(null)).toBe('unisex');
  });

  it('filters by category and ignores inactive products', () => {
    const result = filterProducts(catalog, { category: 'Remeras' });
    expect(result.map((product) => product.id)).toEqual(['1']);
  });

  it('filters by size', () => {
    const result = filterProducts(catalog, { size: '39' });
    expect(result.map((product) => product.id)).toEqual(['2']);
  });

  it('searches without accents and across fields', () => {
    expect(filterProducts(catalog, { query: 'acida' })).toHaveLength(1);
    expect(filterProducts(catalog, { query: 'algodon' })).toHaveLength(1);
    expect(filterProducts(catalog, { query: 'goma' })).toHaveLength(1);
  });

  it('can hide products without stock and sort by price', () => {
    const result = filterProducts(catalog, { onlyAvailable: true, sort: 'price-asc' });
    expect(result.map((product) => product.id)).toEqual(['1']);
  });

  it('derives categories and sizes only from visible products', () => {
    expect(getCatalogCategories(catalog).map((entry) => entry.category)).toEqual(['Remeras', 'Calzado']);
    expect(getCatalogSizes(catalog)).toEqual(['S', 'M', 'L', '38', '39', '40']);
  });

  it('sorts sizes with letters before numbers and numbers ascending', () => {
    expect(sortSizes(['40', 'M', 'S', '38', 'XL', '39'])).toEqual(['S', 'M', 'XL', '38', '39', '40']);
  });

  it('reports stock states', () => {
    expect(stockState(0).tone).toBe('out');
    expect(stockState(2).tone).toBe('low');
    expect(stockState(7).label).toBe('En stock');
  });
});

describe('product validation', () => {
  const valid = {
    name: 'Buzo Oversize',
    description: 'Frisa suave',
    category: 'Abrigos',
    color: 'Negro',
    price: '58900',
    stock: '4',
    sizes: ['S', 'M', 'L'],
    image_url: 'https://example.com/buzo.jpg',
  };

  it('accepts a valid product', () => {
    expect(validateProduct(valid)).toEqual({});
  });

  it('rejects missing name, invalid price and stock', () => {
    expect(validateProduct({ ...valid, name: '' })).toHaveProperty('name');
    expect(validateProduct({ ...valid, price: '0' })).toHaveProperty('price');
    expect(validateProduct({ ...valid, stock: '2.5' })).toHaveProperty('stock');
    expect(validateProduct({ ...valid, stock: '-1' })).toHaveProperty('stock');
  });

  it('requires at least one size', () => {
    expect(validateProduct({ ...valid, sizes: [] })).toHaveProperty('sizes');
  });

  it('defaults the audience to unisex and rejects unknown labels', () => {
    expect(normalizeProductDraft(valid).audience).toBe('unisex');
    expect(normalizeProductDraft({ ...valid, audience: 'HOMBRE' }).audience).toBe('hombre');
    expect(validateProduct({ ...valid, audience: 'nino' })).toHaveProperty('audience');
  });

  it('rejects unsafe or malformed image URLs', () => {
    expect(validateProduct({ ...valid, image_url: 'javascript:alert(1)' })).toHaveProperty('image_url');
    expect(validateProduct({ ...valid, image_url: 'data:image/png;base64,abc' })).toHaveProperty('image_url');
    expect(validateProduct(
      { ...valid, image_url: 'data:image/png;base64,abc' },
      { allowDataImages: true, maxImageLength: 100 },
    )).toEqual({});
  });

  it('parses and deduplicates sizes', () => {
    expect(parseSizes(' S, M, s ,, L ')).toEqual(['S', 'M', 'L']);
    expect(parseSizes(['Único', 'Único'])).toEqual(['Único']);
  });

  it('normalizes numeric fields and booleans', () => {
    const draft = normalizeProductDraft({ ...valid, price: '58900.999', stock: '4.8', featured: 1 });
    expect(draft.price).toBe(58901);
    expect(draft.stock).toBe(4);
    expect(draft.featured).toBe(true);
    expect(draft.is_active).toBe(true);
  });

  it('allows a draft without sale price', () => {
    expect(validateProduct({ ...valid, price: '', is_active: false }, { allowDraftPrice: true })).toEqual({});
    expect(validateProduct({ ...valid, price: '', is_active: true }, { allowDraftPrice: true })).toHaveProperty('price');
  });
});

describe('stock por talle', () => {
  const product = {
    id: 'p1',
    stock: 7,
    sizes: ['S', 'M', 'L'],
    stock_by_size: { S: 2, M: 5, L: 0 },
  };

  it('normaliza el mapa solo con los talles declarados', () => {
    expect(normalizeStockBySize({ S: '4', M: -2, X: 9 }, ['S', 'M', 'L'])).toEqual({
      S: 4, M: 0, L: 0,
    });
  });

  it('lee stock independiente por talle y total', () => {
    expect(getSizeStock(product, 'S')).toBe(2);
    expect(getSizeStock(product, 'M')).toBe(5);
    expect(getSizeStock(product, 'L')).toBe(0);
    expect(getTotalStock(product)).toBe(7);
  });

  it('mantiene compatibilidad con productos sin mapa', () => {
    expect(getSizeStock({ stock: 3, sizes: ['Único'] }, 'Único')).toBe(3);
    expect(getSizeStock({ stock: 3, sizes: ['S', 'M'] }, 'M')).toBe(0);
    expect(getTotalStock({ stock: 3 })).toBe(3);
  });

  it('normalizeProductDraft deriva el total desde el mapa', () => {
    const draft = normalizeProductDraft({
      name: 'Buzo',
      category: 'Abrigos',
      price: '10000',
      stock: 0,
      sizes: ['S', 'M'],
      stock_by_size: { S: 2, M: 3 },
    });
    expect(draft.stock).toBe(5);
    expect(draft.stock_by_size).toEqual({ S: 2, M: 3 });
  });
});
