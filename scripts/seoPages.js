import {
  PRODUCT_ROUTE,
  SITE_URL,
  buildProductSlugMap,
  productSeoMeta,
} from '../src/lib/productSeo.js';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function replaceOnce(html, regex, replacement) {
  if (!regex.test(html)) throw new Error(`No se encontró ${regex} en el HTML base`);
  return html.replace(regex, () => replacement);
}

function replaceMeta(html, attribute, key, value) {
  const regex = new RegExp(`<meta\\s+${attribute}="${key}"\\s+content="[\\s\\S]*?"\\s*\\/?>`);
  return replaceOnce(html, regex, `<meta ${attribute}="${key}" content="${escapeHtml(value)}" />`);
}

/** Convierte el index.html de Vite en una página estática optimizada para un producto. */
export function renderProductHtml(template, product, products) {
  const meta = productSeoMeta(product, products);
  let html = template;

  html = replaceOnce(html, /<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(meta.title)}</title>`);
  html = replaceMeta(html, 'name', 'description', meta.description);
  html = replaceMeta(html, 'property', 'og:type', 'product');
  html = replaceMeta(html, 'property', 'og:title', meta.title);
  html = replaceMeta(html, 'property', 'og:description', meta.description);
  html = replaceMeta(html, 'property', 'og:image', meta.image);
  html = replaceMeta(html, 'property', 'og:image:alt', meta.imageAlt);
  html = replaceMeta(html, 'property', 'og:url', meta.url);
  html = replaceOnce(
    html,
    /<link rel="canonical"[^>]*\/?>/,
    `<link rel="canonical" href="${escapeHtml(meta.url)}" />`,
  );

  const serialized = JSON.stringify(meta.jsonLd, null, 2)
    .replace(/</g, '\\u003c')
    .split('\n')
    .join('\n      ');
  const jsonLd = `<script type="application/ld+json">\n      ${serialized}\n    </script>`;
  html = replaceOnce(html, /<script type="application\/ld\+json">[\s\S]*?<\/script>/, jsonLd);

  const twitter = [
    `\n    <meta name="twitter:title" content="${escapeHtml(meta.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(meta.description)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(meta.image)}" />`,
  ].join('');
  html = html.replace(/<meta name="twitter:card"[^>]*\/?>/, (match) => match + twitter);

  return html;
}

/** Agrega una URL por producto al sitemap generado en la etapa 1. */
export function renderSitemap(template, products) {
  const entries = [...buildProductSlugMap(products).keys()].map((slug) => {
    const location = `${SITE_URL}${PRODUCT_ROUTE}${slug}/`;
    return [
      '  <url>',
      `    <loc>${escapeHtml(location)}</loc>`,
      '    <changefreq>weekly</changefreq>',
      '    <priority>0.8</priority>',
      '  </url>',
    ].join('\n');
  });

  if (!entries.length) return template;
  return replaceOnce(template, /<\/urlset>/, `${entries.join('\n')}\n</urlset>`);
}
