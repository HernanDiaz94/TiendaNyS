import { describe, expect, it } from 'vitest';
import {
  SITE_URL,
  absoluteImageUrl,
  buildProductSlugMap,
  productPath,
  productSeoMeta,
  slugFromPath,
  slugify,
} from './productSeo.js';

const products = [
  {
    id: 'nys-006',
    name: 'Buzo Monte',
    description: 'Frisa suave para los días frescos.',
    price: 54900,
    stock: 4,
    category: 'Abrigos',
    color: 'Tostado',
    image_url: 'https://images.pexels.com/photos/5789010/pexels-photo-5789010.jpeg?w=1000',
    is_active: true,
  },
  {
    id: 'nys-011',
    name: 'Botitas Sur',
    description: 'Clásicas y cómodas.',
    price: 89900,
    stock: 0,
    category: 'Calzado',
    color: 'Marrón',
    image_url: '/botitas.jpg',
    is_active: true,
  },
  { id: 'nys-099', name: 'Inactivo', stock: 2, is_active: false },
];

describe('slugs y rutas', () => {
  it('genera slugs sin acentos', () => {
    expect(slugify('Pantalón Nube')).toBe('pantalon-nube');
    expect(slugify('Botitas Sur')).toBe('botitas-sur');
  });

  it('extrae el slug de una URL de producto', () => {
    expect(slugFromPath('/producto/buzo-monte/')).toBe('buzo-monte');
    expect(slugFromPath('/admin')).toBeNull();
  });

  it('arma el mapa slug -> producto e ignora inactivos', () => {
    const map = buildProductSlugMap(products);
    expect([...map.keys()]).toEqual(['buzo-monte', 'botitas-sur']);
    expect(map.get('buzo-monte').id).toBe('nys-006');
  });

  it('agrega el id cuando dos productos comparten nombre', () => {
    const repeated = [
      { id: 'a1', name: 'Remera' },
      { id: 'b2', name: 'Remera' },
    ];
    const map = buildProductSlugMap(repeated);
    expect([...map.keys()]).toEqual(['remera', 'remera-b2']);
    expect(productPath(repeated[1], repeated)).toBe('/producto/remera-b2/');
  });
});

describe('productSeoMeta', () => {
  it('incluye nombre, precio, URL canónica e imagen absoluta', () => {
    const meta = productSeoMeta(products[0], products);
    expect(meta.title).toContain('Buzo Monte');
    expect(meta.title).toContain('$');
    expect(meta.url).toBe(`${SITE_URL}/producto/buzo-monte/`);
    expect(meta.image).toMatch(/^https:\/\/images\.pexels\.com/);
  });

  it('marca disponibilidad según el stock en el JSON-LD', () => {
    expect(productSeoMeta(products[0], products).jsonLd.offers.availability)
      .toBe('https://schema.org/InStock');
    expect(productSeoMeta(products[1], products).jsonLd.offers.availability)
      .toBe('https://schema.org/OutOfStock');
    expect(productSeoMeta(products[1], products).jsonLd.offers.price).toBe('89900.00');
  });

  it('convierte imágenes relativas en absolutas', () => {
    expect(absoluteImageUrl('/botitas.jpg')).toBe(`${SITE_URL}/botitas.jpg`);
    expect(absoluteImageUrl('https://example.com/a.jpg')).toBe('https://example.com/a.jpg');
    expect(absoluteImageUrl('')).toBe(`${SITE_URL}/drop-01-2026.webp`);
  });

  it('limita la longitud de la descripción', () => {
    const meta = productSeoMeta({ ...products[0], description: 'a'.repeat(400) }, products);
    expect(meta.description.length).toBeLessThanOrEqual(160);
  });
});
