import { describe, expect, it } from 'vitest';
import {
  SIZE_GUIDE_KEYS,
  createSizeGuide,
  guideKeyForCategory,
  normalizeSizeGuide,
  resolveSizeGuide,
  validateSizeGuide,
} from './sizeGuides.js';

describe('guideKeyForCategory', () => {
  it('maps the store categories to a generic guide', () => {
    expect(guideKeyForCategory('Calzado')).toBe(SIZE_GUIDE_KEYS.CALZADO);
    expect(guideKeyForCategory('Pantalones')).toBe(SIZE_GUIDE_KEYS.INFERIOR);
    expect(guideKeyForCategory('Abrigos')).toBe(SIZE_GUIDE_KEYS.SUPERIOR);
    expect(guideKeyForCategory('Ropa interior')).toBe(SIZE_GUIDE_KEYS.INTERIOR);
    expect(guideKeyForCategory('Accesorios')).toBe(SIZE_GUIDE_KEYS.UNICO);
  });

  it('ignores accents and unknown categories', () => {
    expect(guideKeyForCategory('Remeras')).toBe(SIZE_GUIDE_KEYS.SUPERIOR);
    expect(guideKeyForCategory('')).toBe('');
    expect(guideKeyForCategory('Muebles')).toBe('');
  });
});

describe('createSizeGuide', () => {
  it('returns a fresh copy of the generic guide', () => {
    const first = createSizeGuide(SIZE_GUIDE_KEYS.CALZADO);
    first.rows[0].values.ar = '99';

    const second = createSizeGuide(SIZE_GUIDE_KEYS.CALZADO);
    expect(second.rows[0].values.ar).toBe('36');
    expect(second.columns.map((column) => column.key)).toEqual(['ar', 'br', 'us', 'eu', 'cm']);
  });

  it('returns null for unknown keys', () => {
    expect(createSizeGuide('no-existe')).toBeNull();
  });
});

describe('normalizeSizeGuide', () => {
  it('keeps editable columns and rows and drops unsafe values', () => {
    const guide = normalizeSizeGuide({
      key: 'superior',
      label: '  Medidas  propias  ',
      columns: [
        { key: 'PECHO', label: 'Pecho' },
        { key: '', label: 'Descartada' },
      ],
      rows: [
        { size: ' M ', values: { pecho: ' 96-100 ', otro: 'x' } },
        { size: '', values: { pecho: '80' } },
      ],
      note: 'Medidas reales',
    });

    expect(guide.label).toBe('Medidas propias');
    expect(guide.columns).toEqual([{ key: 'pecho', label: 'Pecho' }]);
    expect(guide.rows).toEqual([{ size: 'M', values: { pecho: '96-100' } }]);
    expect(guide.note).toBe('Medidas reales');
  });

  it('rejects malformed or unknown guides', () => {
    expect(normalizeSizeGuide(null)).toBeNull();
    expect(normalizeSizeGuide({ key: 'otro' })).toBeNull();
    expect(validateSizeGuide({ key: 'otro' })).toContain('formato');
    expect(validateSizeGuide(null)).toBe('');
  });
});

describe('resolveSizeGuide', () => {
  it('prefers the editable guide from Supabase', () => {
    const product = {
      category: 'Abrigos',
      size_guide_key: 'calzado',
      size_measurements: {
        key: 'superior',
        label: 'Medidas reales',
        columns: [{ key: 'pecho', label: 'Pecho' }],
        rows: [{ size: 'M', values: { pecho: '100' } }],
        note: 'Medidas del local',
      },
    };

    expect(resolveSizeGuide(product).label).toBe('Medidas reales');
  });

  it('falls back to the assigned key and then to the category', () => {
    expect(resolveSizeGuide({ category: 'Remeras', size_guide_key: 'calzado' }).key).toBe('calzado');
    expect(resolveSizeGuide({ category: 'Pantalones', size_guide_key: null }).key).toBe('inferior');
    expect(resolveSizeGuide({ category: 'Ropa interior' }).key).toBe('interior');
    expect(resolveSizeGuide({ category: 'Muebles' })).toBeNull();
  });

  it('builds the underwear guide with waist, hip and AR columns', () => {
    const guide = createSizeGuide(SIZE_GUIDE_KEYS.INTERIOR);
    expect(guide.columns.map((column) => column.key)).toEqual(['cintura', 'cadera', 'ar']);
    expect(guide.rows).toHaveLength(6);
  });
});
