/**
 * Helpers para servir imágenes en el tamaño y formato adecuados.
 *
 * Pexels ya negocia AVIF/WebP según el header `Accept` cuando se usa
 * `auto=compress`, así que acá solo generamos los anchos del `srcset`.
 * Las imágenes locales se convierten a WebP y se deja el JPG como fallback.
 */

const PEXELS_RE = /^https:\/\/images\.pexels\.com\/photos\/\d+\/pexels-photo-\d+\.jpe?g(?:\?.*)?$/i;
const BASE_WIDTHS = [320, 480, 640, 800, 1000];

/** `srcset` con varios anchos para fotos de Pexels. Devuelve undefined para otras URLs. */
export function buildPexelsSrcSet(url, baseWidths = BASE_WIDTHS) {
  if (!url || !PEXELS_RE.test(url)) return undefined;

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return undefined;
  }

  const declared = Number(parsed.searchParams.get('w'));
  const maxWidth = Number.isFinite(declared) && declared > 0 ? declared : 1000;
  const widths = [
    ...new Set([
      ...baseWidths.filter((width) => width < maxWidth),
      maxWidth,
    ]),
  ].sort((a, b) => a - b);

  parsed.searchParams.set('auto', 'compress');
  parsed.searchParams.set('cs', 'tinysrgb');
  parsed.searchParams.delete('fm'); // dejamos que el CDN elija AVIF/WebP

  return widths
    .map((width) => {
      parsed.searchParams.set('w', String(width));
      return `${parsed.toString()} ${width}w`;
    })
    .join(', ');
}

/** Valor por defecto de `sizes`: Mobile first, una columna → varias columnas. */
export const DEFAULT_IMAGE_SIZES = '(max-width: 720px) 100vw, (max-width: 1200px) 50vw, 33vw';
