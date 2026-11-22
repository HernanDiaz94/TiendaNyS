import { describe, expect, it } from 'vitest';
import { buildPexelsSrcSet, DEFAULT_IMAGE_SIZES } from './imageUrls.js';

const PEXELS = 'https://images.pexels.com/photos/5789010/pexels-photo-5789010.jpeg?auto=compress&cs=tinysrgb&w=1000';

describe('buildPexelsSrcSet', () => {
  it('genera varios anchos para fotos de Pexels', () => {
    const result = buildPexelsSrcSet(PEXELS);
    expect(result).toContain('w=320 320w');
    expect(result).toContain('w=640 640w');
    expect(result).toContain('w=1000 1000w');
  });

  it('incluye el ancho declarado en la URL original', () => {
    const result = buildPexelsSrcSet(PEXELS.replace('w=1000', 'w=1400'));
    expect(result).toContain('w=1400 1400w');
  });

  it('conserva otros parámetros y normaliza el formato automático', () => {
    const result = buildPexelsSrcSet(`${PEXELS}&fit=crop&fm=jpg`);
    expect(result).toContain('fit=crop');
    expect(result).not.toContain('fm=jpg');
    expect(result).toContain('auto=compress');
  });

  it('no genera srcset para URLs que no son de Pexels', () => {
    expect(buildPexelsSrcSet('/drop-01-2026.webp')).toBeUndefined();
    expect(buildPexelsSrcSet('https://example.com/foto.jpg')).toBeUndefined();
    expect(buildPexelsSrcSet('')).toBeUndefined();
  });
});

describe('DEFAULT_IMAGE_SIZES', () => {
  it('define tamaños responsive', () => {
    expect(DEFAULT_IMAGE_SIZES).toContain('100vw');
    expect(DEFAULT_IMAGE_SIZES).toContain('50vw');
  });
});
