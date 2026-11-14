import { IdentityValidationError } from './identity-validation-error.js';

export function validateCommercialName(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== 'string') {
    throw new IdentityValidationError('El nombre comercial debe ser texto o null.');
  }

  const name = value.trim();
  if (name.length > 160) {
    throw new IdentityValidationError(
      'El nombre comercial no puede superar 160 caracteres.',
    );
  }
  return name || null;
}

export function commercialNameFromSettings(input: unknown): string | null {
  if (
    typeof input !== 'object' ||
    input === null ||
    !Object.prototype.hasOwnProperty.call(input, 'nombre_comercial')
  ) {
    throw new IdentityValidationError('El nombre comercial es obligatorio.');
  }
  return validateCommercialName(
    (input as { nombre_comercial: unknown }).nombre_comercial,
  );
}
