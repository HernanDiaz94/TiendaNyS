import { normalizeText } from './products.js';

export const SITE_URL = 'https://tienda-nys.vercel.app';
export const PRODUCT_ROUTE = '/producto/';

const HOME_IMAGE = `${SITE_URL}/drop-01-2026.webp`;
const FALLBACK_DESCRIPTION = 'Una prenda elegida para acompañarte todos los días.';
const CATCH_DESCRIPTION = 'Comprá sin cuenta y coordinamos por WhatsApp.';

function truncate(value, max) {
  const text = String(value || '').trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const boundary = cut.lastIndexOf(' ');
  const clean = boundary > max * 0.6 ? cut.slice(0, boundary) : cut;
  return `${clean.trimEnd()}…`;
}

/** Slug SEO sin acentos ni caracteres especiales. */
export function slugify(value) {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70)
    .replace(/-+$/g, '');
}

export function productBaseSlug(product) {
  return slugify(product?.name) || slugify(product?.id) || 'producto';
}

/**
 * Mapa slug -> producto. Si dos productos comparten nombre, el segundo lleva
 * el id como sufijo para que las URLs sean únicas y deterministas.
 */
export function buildProductSlugMap(products) {
  const map = new Map();
  const seen = new Map();

  for (const product of products || []) {
    if (!product || product.is_active === false) continue;
    const base = productBaseSlug(product);
    const count = seen.get(base) || 0;
    seen.set(base, count + 1);

    const slug = count === 0 ? base : `${base}-${slugify(product.id) || count + 1}`;
    if (!map.has(slug)) map.set(slug, product);
  }

  return map;
}

export function productPath(product, products) {
  if (!product) return '/';
  for (const [slug, item] of buildProductSlugMap(products)) {
    if (String(item.id) === String(product.id)) return `${PRODUCT_ROUTE}${slug}/`;
  }
  return `${PRODUCT_ROUTE}${productBaseSlug(product)}/`;
}

export function slugFromPath(pathname) {
  const match = /^\/producto\/([^/]+)\/?$/.exec(String(pathname || ''));
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

export function absoluteImageUrl(value) {
  const image = String(value || '').trim();
  if (/^https?:\/\//i.test(image)) return image;
  if (image.startsWith('//')) return `https:${image}`;
  if (image.startsWith('/')) return `${SITE_URL}${image}`;
  if (!image) return HOME_IMAGE;
  return `${SITE_URL}/${image.replace(/^\.\//, '')}`;
}

/** Datos listos para inyectar en <head>: meta tags y JSON-LD Product/Offer. */
export function productSeoMeta(product, products) {
  const path = productPath(product, products);
  const url = `${SITE_URL}${path}`;
  const price = Number(product?.price);
  const hasPrice = Number.isFinite(price) && price > 0;

  const priceLabel = hasPrice
    ? new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0,
    }).format(price)
    : '';

  const name = String(product?.name || 'Producto').trim();
  const title = `${name}${priceLabel ? ` · ${priceLabel}` : ''} | NyS Indumentaria`;
  const detail = String(product?.description || FALLBACK_DESCRIPTION)
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.]+$/, '');
  const traits = [product?.category, product?.color].filter(Boolean).join(' · ');
  const description = truncate(
    `${detail}.${traits ? ` ${traits}.` : ''}${priceLabel ? ` ${priceLabel}.` : ''} ${CATCH_DESCRIPTION}`,
    160,
  );
  const stock = Math.max(0, Number(product?.stock) || 0);

  return {
    url,
    path,
    title,
    description,
    image: absoluteImageUrl(product?.image_url),
    imageAlt: name,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name,
      description: `${detail}.`,
      image: [absoluteImageUrl(product?.image_url)],
      sku: String(product?.id || ''),
      brand: { '@type': 'Brand', name: 'NyS' },
      category: product?.category || undefined,
      offers: {
        '@type': 'Offer',
        url,
        priceCurrency: 'ARS',
        price: Number.isFinite(price) ? price.toFixed(2) : undefined,
        availability: stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        seller: { '@type': 'ClothingStore', name: 'NyS Indumentaria', url: SITE_URL },
      },
    },
  };
}
