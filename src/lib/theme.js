export const THEME_STORAGE_KEY = 'nys-theme';
export const DEFAULT_THEME = 'light';
export const THEME_LIGHT = 'light';
export const THEME_DARK = 'dark';

export function normalizeTheme(value) {
  return value === THEME_DARK || value === THEME_LIGHT ? value : DEFAULT_THEME;
}

export function nextTheme(value) {
  return normalizeTheme(value) === THEME_DARK ? THEME_LIGHT : THEME_DARK;
}

export function readTheme(storage) {
  try {
    return normalizeTheme(storage?.getItem(THEME_STORAGE_KEY));
  } catch {
    return DEFAULT_THEME;
  }
}

export function applyTheme(doc, value) {
  if (!doc?.documentElement) return;
  const theme = normalizeTheme(value);
  doc.documentElement.dataset.theme = theme;
  doc.documentElement.style.colorScheme = theme;

  const schemeMeta = doc.querySelector?.('meta[name="color-scheme"]');
  if (schemeMeta) schemeMeta.setAttribute('content', theme);

  const colorMeta = doc.querySelector?.('meta[name="theme-color"]');
  if (colorMeta) {
    colorMeta.setAttribute('content', theme === THEME_DARK ? '#10110f' : '#0b0b0b');
  }
}
