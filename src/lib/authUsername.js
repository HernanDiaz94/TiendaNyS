export const INVALID_LOGIN_MESSAGE = 'No pudimos iniciar sesión. Revisá el usuario y la contraseña.';

export function isEmailIdentifier(value) {
  return String(value || '').includes('@');
}

/**
 * Convierte el valor del formulario en un email para Supabase Auth.
 * Si no parece un email, lo resuelve como alias de administrador.
 * El mensaje de error es el mismo que el de credenciales invalidas para
 * no revelar si un nombre de usuario existe.
 */
export async function resolveLoginEmail(identifier, lookupUsername) {
  const value = String(identifier || '').trim();
  if (!value) return '';
  if (isEmailIdentifier(value)) return value.toLowerCase();

  const email = await lookupUsername(value);
  if (!email) throw new Error(INVALID_LOGIN_MESSAGE);
  return String(email).toLowerCase();
}
