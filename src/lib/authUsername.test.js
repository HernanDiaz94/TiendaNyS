import { describe, expect, it } from 'vitest';
import { INVALID_LOGIN_MESSAGE, isEmailIdentifier, resolveLoginEmail } from './authUsername.js';

describe('isEmailIdentifier', () => {
  it('detecta correos por el @', () => {
    expect(isEmailIdentifier('hernan.diiaz@gmail.com')).toBe(true);
    expect(isEmailIdentifier('hernan')).toBe(false);
  });
});

describe('resolveLoginEmail', () => {
  it('usa el correo directamente y lo normaliza', async () => {
    const lookup = () => { throw new Error('no deberia llamarse'); };
    await expect(resolveLoginEmail('  Hernan.Diiaz@Gmail.com ', lookup))
      .resolves.toBe('hernan.diiaz@gmail.com');
  });

  it('resuelve un nombre de usuario a traves del lookup', async () => {
    const lookup = async (username) => (username === 'hernan' ? 'hernan.diiaz@gmail.com' : null);
    await expect(resolveLoginEmail(' hernan ', lookup))
      .resolves.toBe('hernan.diiaz@gmail.com');
  });

  it('devuelve el mismo error que credenciales invalidas si no existe', async () => {
    await expect(resolveLoginEmail('noexiste', async () => null))
      .rejects.toThrow(INVALID_LOGIN_MESSAGE);
  });

  it('devuelve cadena vacia si no hay identificador', async () => {
    await expect(resolveLoginEmail('', async () => null)).resolves.toBe('');
  });
});
