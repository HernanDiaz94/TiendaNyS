import { describe, expect, it } from 'vitest';
import { renderProductHtml, renderSitemap } from './seoPages.js';

const template = `<!doctype html>
<html>
  <head>
    <meta name="description" content="Home" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="Home" />
    <meta property="og:description" content="Home" />
    <meta property="og:image" content="https://tienda-nys.vercel.app/home.webp" />
    <meta property="og:image:alt" content="Home" />
    <meta property="og:url" content="https://tienda-nys.vercel.app/" />
    <meta name="twitter:card" content="summary_large_image" />
    <link rel="canonical" href="https://tienda-nys.vercel.app/" />
    <title>Home</title>
    <script type="application/ld+json">{"@type":"ClothingStore"}</script>
  </head>
</html>`;

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://tienda-nys.vercel.app/</loc></url>
</urlset>`;

const products = [
  {
    id: 'nys-006',
    name: 'Buzo Monte',
    description: 'Frisa suave.',
    price: 54900,
    stock: 3,
    image_url: '/buzo.webp',
    is_active: true,
  },
];

describe('renderProductHtml', () => {
  const html = renderProductHtml(template, products[0], products);

  it('reemplaza título, canonical y Open Graph', () => {
    expect(html).toContain('<title>Buzo Monte · $');
    expect(html).toContain('<link rel="canonical" href="https://tienda-nys.vercel.app/producto/buzo-monte/" />');
    expect(html).toContain('property="og:type" content="product"');
    expect(html).toContain('https://tienda-nys.vercel.app/producto/buzo-monte/');
    expect(html).toContain('https://tienda-nys.vercel.app/buzo.webp');
  });

  it('reemplaza el JSON-LD de tienda por uno de producto', () => {
    expect(html).toContain('"@type": "Product"');
    expect(html).toContain('"priceCurrency": "ARS"');
    expect(html).not.toContain('{"@type":"ClothingStore"}');
  });

  it('agrega meta tags de Twitter y escapa comillas', () => {
    expect(html).toContain('<meta name="twitter:image"');
    const escaped = renderProductHtml(
      template,
      { ...products[0], name: 'Remera "Especial" & más' },
      products,
    );
    expect(escaped).toContain('Remera &quot;Especial&quot; &amp; m');
  });
});

describe('renderSitemap', () => {
  it('agrega una URL por producto', () => {
    const result = renderSitemap(sitemap, products);
    expect(result).toContain('https://tienda-nys.vercel.app/producto/buzo-monte/');
    expect(result).toContain('https://tienda-nys.vercel.app/');
  });
});
