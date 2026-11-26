import {
  guideKeyForCategory,
  isSizeGuideKey,
  normalizeSizeGuide,
  validateSizeGuide,
} from './sizeGuides.js';

export const CATEGORIES = [
  'Remeras',
  'Camisas',
  'Pantalones',
  'Abrigos',
  'Calzado',
  'Accesorios',
  'Ropa interior',
];

export const AUDIENCES = ['unisex', 'hombre', 'mujer'];

export const AUDIENCE_OPTIONS = [
  { value: 'unisex', label: 'Unisex (sin etiqueta)' },
  { value: 'hombre', label: 'Hombre' },
  { value: 'mujer', label: 'Mujer' },
];

export const SIZE_PRESETS = [
  'XS', 'S', 'M', 'L', 'XL', 'XXL', 'Único',
  '36', '37', '38', '39', '40', '41', '42', '43', '44', '45',
];

const SIZE_ORDER = [
  'XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'Único',
  ...Array.from({ length: 23 }, (_, index) => String(28 + index)),
];

export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];

export const SORT_OPTIONS = [
  { value: 'featured', label: 'Destacados' },
  { value: 'newest', label: 'Más nuevos' },
  { value: 'price-asc', label: 'Menor precio' },
  { value: 'price-desc', label: 'Mayor precio' },
];

export function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/** Productos sin etiqueta (null, vacío o valor desconocido) caen en unisex. */
export function normalizeAudience(value) {
  const key = normalizeText(value);
  return key === 'hombre' || key === 'mujer' ? key : 'unisex';
}

export function normalizeAudienceFilter(value) {
  const key = normalizeText(value);
  return key === 'hombre' || key === 'mujer' ? key : '';
}

export function parseSizes(value) {
  const raw = Array.isArray(value) ? value : String(value ?? '').split(',');
  const seen = new Set();
  const sizes = [];

  for (const entry of raw) {
    const clean = String(entry ?? '').trim().replace(/\s+/g, ' ').slice(0, 20);
    if (!clean) continue;
    const key = clean.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    sizes.push(clean);
    if (sizes.length >= 20) break;
  }

  return sizes;
}

export function sortSizes(sizes) {
  return [...new Set(parseSizes(sizes))].sort((a, b) => {
    const indexA = SIZE_ORDER.indexOf(a.toUpperCase());
    const indexB = SIZE_ORDER.indexOf(b.toUpperCase());
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return a.localeCompare(b, 'es', { numeric: true });
  });
}

export function getCatalogSizes(products) {
  const sizes = new Set();
  for (const product of products || []) {
    if (product.is_active === false) continue;
    const list = Array.isArray(product.sizes) && product.sizes.length ? product.sizes : ['Único'];
    for (const size of list) sizes.add(size);
  }
  return sortSizes([...sizes]);
}

export function getCatalogCategories(products) {
  const counts = new Map();
  for (const product of products || []) {
    if (product.is_active === false) continue;
    counts.set(product.category, (counts.get(product.category) || 0) + 1);
  }

  const known = CATEGORIES.filter((category) => counts.has(category));
  const extra = [...counts.keys()].filter((category) => !CATEGORIES.includes(category));
  return [...known, ...extra].map((category) => ({ category, count: counts.get(category) }));
}

export function stockState(stock) {
  const amount = Math.max(0, Math.trunc(Number(stock) || 0));
  if (amount < 1) return { tone: 'out', label: 'Agotado' };
  if (amount <= 2) return { tone: 'low', label: `Últimas ${amount}` };
  return { tone: 'in', label: 'En stock' };
}

export function isNewProduct(createdAt, days = 21) {
  if (!createdAt) return false;
  const time = new Date(createdAt).getTime();
  if (!Number.isFinite(time)) return false;
  return Date.now() - time <= days * 24 * 60 * 60 * 1000;
}

export function sortProducts(products, sort = 'featured') {
  const list = [...products];
  const newest = (product) => {
    const time = new Date(product.created_at || 0).getTime();
    return Number.isFinite(time) ? time : 0;
  };

  if (sort === 'price-asc') return list.sort((a, b) => Number(a.price) - Number(b.price));
  if (sort === 'price-desc') return list.sort((a, b) => Number(b.price) - Number(a.price));
  if (sort === 'newest') return list.sort((a, b) => newest(b) - newest(a));

  return list.sort((a, b) => {
    if (Boolean(b.featured) !== Boolean(a.featured)) return Number(Boolean(b.featured)) - Number(Boolean(a.featured));
    return newest(b) - newest(a);
  });
}

export function filterProducts(products, filters = {}) {
  const category = filters.category && filters.category !== 'Todo' ? filters.category : null;
  const size = filters.size && filters.size !== 'Todos' ? filters.size : null;
  const audience = normalizeAudienceFilter(filters.audience);
  const query = normalizeText(filters.query);

  const visible = (products || [])
    .filter((product) => product.is_active !== false)
    .filter((product) => !category || product.category === category)
    .filter((product) => {
      if (!audience) return true;
      const label = normalizeAudience(product.audience);
      return label === 'unisex' || label === audience;
    })
    .filter((product) => {
      if (!size) return true;
      const sizes = Array.isArray(product.sizes) && product.sizes.length ? product.sizes : ['Único'];
      return sizes.includes(size);
    })
    .filter((product) => !filters.onlyAvailable || Number(product.stock) > 0)
    .filter((product) => {
      if (!query) return true;
      return normalizeText(
        [product.name, product.description, product.category, product.color, normalizeAudience(product.audience)].join(' '),
      ).includes(query);
    });

  return sortProducts(visible, filters.sort);
}

export function validateProduct(values, options = {}) {
  const allowDataImages = options.allowDataImages === true;
  const maxImageLength = Number(options.maxImageLength) || 500;
  const errors = {};

  const name = String(values?.name ?? '').trim();
  const description = String(values?.description ?? '').trim();
  const category = String(values?.category ?? '').trim();
  const audience = String(values?.audience ?? '').trim();
  const color = String(values?.color ?? '').trim();
  const imageUrl = String(values?.image_url ?? '').trim();
  const price = Number(values?.price);
  const stock = Number(values?.stock);
  const sizes = parseSizes(values?.sizes);

  if (name.length < 2 || name.length > 100) errors.name = 'El nombre debe tener entre 2 y 100 caracteres.';
  else if (/[<>]/.test(name)) errors.name = 'El nombre no puede incluir los caracteres < o >.';
  if (description.length > 500) errors.description = 'La descripción no puede superar los 500 caracteres.';
  if (!category) errors.category = 'Elegí una categoría.';
  else if (category.length > 40) errors.category = 'La categoría es demasiado larga.';
  if (audience && !AUDIENCES.includes(normalizeText(audience))) {
    errors.audience = 'Elegí un público válido: unisex, hombre o mujer.';
  }
  if (color.length > 40) errors.color = 'El color no puede superar los 40 caracteres.';

  if (!Number.isFinite(price) || price <= 0) errors.price = 'Ingresá un precio mayor a cero.';
  else if (price > 99999999) errors.price = 'El precio supera el máximo permitido.';
  else if (Math.round(price * 100) !== price * 100) errors.price = 'Usá como máximo dos decimales.';

  if (!Number.isInteger(stock) || stock < 0 || stock > 9999) {
    errors.stock = 'El stock debe ser un número entero entre 0 y 9999.';
  }

  if (sizes.length < 1) errors.sizes = 'Agregá al menos un talle.';
  else if (sizes.length > 20) errors.sizes = 'Podés cargar hasta 20 talles.';
  else if (sizes.some((size) => size.length > 20)) errors.sizes = 'Cada talle puede tener hasta 20 caracteres.';

  if (imageUrl) {
    const isDataImage = imageUrl.startsWith('data:image/');
    const isHttpImage = /^https?:\/\/\S+$/i.test(imageUrl);
    if (isDataImage && !allowDataImages) {
      errors.image_url = 'En producción subí la imagen al almacenamiento; no se permiten imágenes embebidas.';
    } else if (!isDataImage && !isHttpImage) {
      errors.image_url = 'Usá una URL http(s) válida o subí un archivo.';
    } else if (imageUrl.length > maxImageLength) {
      errors.image_url = 'La imagen es demasiado grande. Probá con otra más liviana.';
    }
  }

  const guideError = validateSizeGuide(values?.size_measurements);
  if (guideError) errors.size_guide = guideError;

  return errors;
}

export function normalizeProductDraft(values) {
  return {
    name: String(values?.name ?? '').trim(),
    description: String(values?.description ?? '').trim(),
    category: String(values?.category ?? '').trim(),
    audience: normalizeAudience(values?.audience),
    color: String(values?.color ?? '').trim(),
    image_url: String(values?.image_url ?? '').trim(),
    price: Math.round(Number(values?.price) * 100) / 100,
    stock: Math.trunc(Number(values?.stock)),
    sizes: parseSizes(values?.sizes),
    size_guide_key: isSizeGuideKey(values?.size_guide_key) ? values.size_guide_key : '',
    size_measurements: normalizeSizeGuide(values?.size_measurements),
    featured: Boolean(values?.featured),
    is_active: values?.is_active !== false,
  };
}

export function productDraftFrom(product) {
  return {
    name: product?.name || '',
    description: product?.description || '',
    category: product?.category || CATEGORIES[0],
    audience: normalizeAudience(product?.audience),
    color: product?.color || '',
    image_url: product?.image_url || '',
    price: product?.price ?? '',
    stock: product?.stock ?? 0,
    sizes: Array.isArray(product?.sizes) && product.sizes.length ? product.sizes : ['Único'],
    size_guide_key: isSizeGuideKey(product?.size_guide_key)
      ? product.size_guide_key
      : guideKeyForCategory(product?.category),
    size_measurements: normalizeSizeGuide(product?.size_measurements),
    featured: Boolean(product?.featured),
    is_active: product?.is_active !== false,
  };
}

export function emptyProductDraft() {
  return {
    name: '',
    description: '',
    category: CATEGORIES[0],
    audience: 'unisex',
    color: '',
    image_url: '',
    price: '',
    stock: 0,
    sizes: ['S', 'M', 'L'],
    size_guide_key: '',
    size_measurements: null,
    featured: false,
    is_active: true,
  };
}

export function validateImageFile(file) {
  if (!file) return 'Elegí un archivo de imagen.';
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return 'Formato no compatible. Usá JPG, PNG, WebP, AVIF o GIF.';
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return `La imagen supera los ${Math.round(MAX_IMAGE_BYTES / 1024 / 1024)} MB.`;
  }
  return null;
}
