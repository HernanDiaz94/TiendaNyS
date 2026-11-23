// Copia local para evitar un import circular con products.js.
function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export const SIZE_GUIDE_KEYS = {
  CALZADO: 'calzado',
  SUPERIOR: 'superior',
  INFERIOR: 'inferior',
  UNICO: 'unico',
};

const GENERIC_GUIDES = {
  calzado: {
    key: 'calzado',
    label: 'Calzado',
    columns: [
      { key: 'ar', label: 'AR' },
      { key: 'br', label: 'BR' },
      { key: 'us', label: 'US' },
      { key: 'eu', label: 'EU' },
      { key: 'cm', label: 'Plantilla (cm)' },
    ],
    rows: [
      { size: '36', values: { ar: '36', br: '34', us: '5', eu: '36', cm: '23' } },
      { size: '37', values: { ar: '37', br: '35', us: '6', eu: '37', cm: '24' } },
      { size: '38', values: { ar: '38', br: '36', us: '7', eu: '38', cm: '25' } },
      { size: '39', values: { ar: '39', br: '37', us: '8', eu: '39', cm: '26' } },
      { size: '40', values: { ar: '40', br: '38', us: '9', eu: '40', cm: '27' } },
      { size: '41', values: { ar: '41', br: '39', us: '10', eu: '41', cm: '28' } },
      { size: '42', values: { ar: '42', br: '40', us: '11', eu: '42', cm: '29' } },
      { size: '43', values: { ar: '43', br: '41', us: '12', eu: '43', cm: '30' } },
      { size: '44', values: { ar: '44', br: '42', us: '13', eu: '44', cm: '31' } },
    ],
    note: 'Medidas orientativas de la plantilla. Si dudás entre dos talles, elegí el mayor.',
  },
  superior: {
    key: 'superior',
    label: 'Ropa superior',
    columns: [
      { key: 'pecho', label: 'Pecho (cm)' },
      { key: 'cintura', label: 'Cintura (cm)' },
      { key: 'largo', label: 'Largo (cm)' },
    ],
    rows: [
      { size: 'XS', values: { pecho: '84-88', cintura: '68-72', largo: '66' } },
      { size: 'S', values: { pecho: '90-94', cintura: '74-78', largo: '68' } },
      { size: 'M', values: { pecho: '96-100', cintura: '80-84', largo: '70' } },
      { size: 'L', values: { pecho: '102-106', cintura: '86-90', largo: '72' } },
      { size: 'XL', values: { pecho: '108-112', cintura: '92-96', largo: '74' } },
      { size: 'XXL', values: { pecho: '114-118', cintura: '98-102', largo: '76' } },
    ],
    note: 'Medidas del cuerpo, no de la prenda. Tomá el contorno con la cinta nivelada.',
  },
  inferior: {
    key: 'inferior',
    label: 'Ropa inferior',
    columns: [
      { key: 'cintura', label: 'Cintura (cm)' },
      { key: 'cadera', label: 'Cadera (cm)' },
      { key: 'largo', label: 'Largo (cm)' },
    ],
    rows: [
      { size: 'XS', values: { cintura: '66-70', cadera: '88-92', largo: '98' } },
      { size: 'S', values: { cintura: '72-76', cadera: '94-98', largo: '100' } },
      { size: 'M', values: { cintura: '78-82', cadera: '100-104', largo: '102' } },
      { size: 'L', values: { cintura: '84-88', cadera: '106-110', largo: '104' } },
      { size: 'XL', values: { cintura: '90-94', cadera: '112-116', largo: '106' } },
      { size: 'XXL', values: { cintura: '96-100', cadera: '118-122', largo: '108' } },
    ],
    note: 'Medidas orientativas del cuerpo. Para un calce holgado, elegí un talle más.',
  },
  unico: {
    key: 'unico',
    label: 'Talle único',
    columns: [],
    rows: [],
    note: 'Prenda de talle único. Si tiene ajuste o elastano, se adapta a distintas medidas.',
  },
};

export const SIZE_GUIDE_CHOICES = [
  { value: '', label: 'Sin guía de talles' },
  { value: SIZE_GUIDE_KEYS.CALZADO, label: GENERIC_GUIDES.calzado.label },
  { value: SIZE_GUIDE_KEYS.SUPERIOR, label: GENERIC_GUIDES.superior.label },
  { value: SIZE_GUIDE_KEYS.INFERIOR, label: GENERIC_GUIDES.inferior.label },
  { value: SIZE_GUIDE_KEYS.UNICO, label: GENERIC_GUIDES.unico.label },
];

const CATEGORY_TO_GUIDE = {
  calzado: SIZE_GUIDE_KEYS.CALZADO,
  pantalones: SIZE_GUIDE_KEYS.INFERIOR,
  remeras: SIZE_GUIDE_KEYS.SUPERIOR,
  camisas: SIZE_GUIDE_KEYS.SUPERIOR,
  abrigos: SIZE_GUIDE_KEYS.SUPERIOR,
  accesorios: SIZE_GUIDE_KEYS.UNICO,
};

export function isSizeGuideKey(value) {
  return Object.prototype.hasOwnProperty.call(GENERIC_GUIDES, String(value || ''));
}

export function guideKeyForCategory(category) {
  return CATEGORY_TO_GUIDE[normalizeText(category)] || '';
}

export function createSizeGuide(key) {
  if (!isSizeGuideKey(key)) return null;
  const guide = GENERIC_GUIDES[key];
  return {
    key: guide.key,
    label: guide.label,
    columns: guide.columns.map((column) => ({ ...column })),
    rows: guide.rows.map((row) => ({ size: row.size, values: { ...row.values } })),
    note: guide.note,
  };
}

function cleanText(value, maxLength) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').slice(0, maxLength);
}

/** Sanitiza la guía editable que viene de Supabase (jsonb) antes de renderizarla. */
export function normalizeSizeGuide(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  if (!isSizeGuideKey(value.key)) return null;

  const fallback = GENERIC_GUIDES[value.key];
  const columns = Array.isArray(value.columns)
    ? value.columns.slice(0, 6).flatMap((column) => {
      if (!column || typeof column !== 'object') return [];
      const key = cleanText(column.key, 24).toLowerCase().replace(/[^a-z0-9_]/g, '');
      const label = cleanText(column.label, 30);
      return key && label ? [{ key, label }] : [];
    })
    : [];

  const rows = Array.isArray(value.rows)
    ? value.rows.slice(0, 30).flatMap((row) => {
      if (!row || typeof row !== 'object') return [];
      const size = cleanText(row.size, 12);
      if (!size) return [];
      const values = {};
      for (const column of columns) {
        values[column.key] = cleanText(row.values?.[column.key], 30);
      }
      return [{ size, values }];
    })
    : [];

  return {
    key: value.key,
    label: cleanText(value.label, 60) || fallback.label,
    columns,
    rows,
    note: cleanText(value.note, 240) || fallback.note,
  };
}

/** Prompt: guía editable de Supabase → genérica por categoría → genérica por key. */
export function resolveSizeGuide(product) {
  const custom = normalizeSizeGuide(product?.size_measurements);
  if (custom) return custom;

  const key = isSizeGuideKey(product?.size_guide_key)
    ? product.size_guide_key
    : guideKeyForCategory(product?.category);

  return createSizeGuide(key);
}

export function validateSizeGuide(value) {
  if (value === null || value === undefined || value === '') return '';
  if (!normalizeSizeGuide(value)) return 'La guía de talles no tiene un formato válido.';
  return '';
}
