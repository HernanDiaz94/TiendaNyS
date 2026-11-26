import { describe, expect, it } from 'vitest';
import {
  applyTheme,
  DEFAULT_THEME,
  nextTheme,
  normalizeTheme,
  readTheme,
  THEME_STORAGE_KEY,
} from './theme.js';

describe('theme helpers', () => {
  it('normaliza solo los temas conocidos', () => {
    expect(normalizeTheme('dark')).toBe('dark');
    expect(normalizeTheme('light')).toBe('light');
    expect(normalizeTheme('DARK')).toBe(DEFAULT_THEME);
    expect(normalizeTheme(null)).toBe(DEFAULT_THEME);
  });

  it('alterna entre claro y oscuro', () => {
    expect(nextTheme('light')).toBe('dark');
    expect(nextTheme('dark')).toBe('light');
    expect(nextTheme(undefined)).toBe('dark');
  });

  it('lee el tema guardado y tolera almacenamiento roto', () => {
    expect(readTheme({ getItem: () => 'dark' })).toBe('dark');
    expect(readTheme({ getItem: () => null })).toBe('light');
    expect(readTheme({ getItem: () => { throw new Error('bloqueado'); } })).toBe('light');
    expect(readTheme(null)).toBe('light');
  });

  it('aplica el tema al documento y actualiza los meta tags', () => {
    const makeMeta = (content) => ({
      content,
      setAttribute(name, value) {
        if (name === 'content') this.content = value;
      },
    });
    const attributes = {
      'meta[name="color-scheme"]': makeMeta('light'),
      'meta[name="theme-color"]': makeMeta('#0b0b0b'),
    };
    const doc = {
      documentElement: { dataset: {}, style: {} },
      querySelector: (selector) => attributes[selector] || null,
    };

    applyTheme(doc, 'dark');

    expect(doc.documentElement.dataset.theme).toBe('dark');
    expect(doc.documentElement.style.colorScheme).toBe('dark');
    expect(attributes['meta[name="color-scheme"]'].content).toBe('dark');
    expect(attributes['meta[name="theme-color"]'].content).toBe('#10110f');

    applyTheme(doc, 'light');
    expect(doc.documentElement.dataset.theme).toBe('light');
    expect(attributes['meta[name="theme-color"]'].content).toBe('#0b0b0b');
  });

  it('usa la clave estable de almacenamiento', () => {
    expect(THEME_STORAGE_KEY).toBe('nys-theme');
  });
});
