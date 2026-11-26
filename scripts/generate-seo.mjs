/**
 * Genera una página HTML estática por producto después de `vite build`.
 *
 * Es lo que permite que WhatsApp, Facebook, Google y cualquier crawler vean
 * título, imagen, precio y disponibilidad de cada prenda sin ejecutar React.
 * Usa solo la publishable key de Supabase (nunca service_role).
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { loadEnv } from 'vite';

import { demoProducts } from '../src/data/demoProducts.js';
import { buildProductSlugMap } from '../src/lib/productSeo.js';
import { renderProductHtml, renderSitemap } from './seoPages.js';

const env = loadEnv('production', process.cwd(), 'VITE_');
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY;

async function loadProducts() {
  if (!supabaseUrl || !supabaseKey) {
    console.warn('[seo] Sin variables de Supabase: se usan los productos demo.');
    return demoProducts;
  }

  try {
    const endpoint = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/products?select=*&limit=1000`;
    const response = await fetch(endpoint, {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    const rows = await response.json();
    const active = rows.filter((product) => product.is_active !== false);
    console.log(`[seo] ${active.length} productos activos desde Supabase.`);
    return active;
  } catch (error) {
    console.warn(`[seo] No se pudo leer Supabase (${error.message}). Se usan productos demo.`);
    return demoProducts;
  }
}

async function main() {
  const templatePath = path.resolve('dist/index.html');
  const sitemapPath = path.resolve('dist/sitemap.xml');
  const template = await readFile(templatePath, 'utf8');
  const sitemapTemplate = await readFile(sitemapPath, 'utf8');

  const products = await loadProducts();
  const slugMap = buildProductSlugMap(products);

  for (const [slug, product] of slugMap) {
    const directory = path.resolve('dist/producto', slug);
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, 'index.html'), renderProductHtml(template, product, products));
  }

  await writeFile(sitemapPath, renderSitemap(sitemapTemplate, products));
  console.log(`[seo] Generadas ${slugMap.size} páginas de producto y sitemap actualizado.`);
}

main().catch((error) => {
  console.error('[seo] Error al generar páginas de producto:', error);
  process.exitCode = 1;
});
