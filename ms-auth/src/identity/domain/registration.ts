import { IdentityValidationError } from './identity-validation-error.js';

export interface RegistrationInput {
  cedula: string;
  nombres: string;
  apellidos: string;
  fecha_nacimiento: string;
  telefono: string;
  email_contacto: string | null;
  username: string;
  password: string;
}

export interface BusinessRegistrationInput extends RegistrationInput {
  ruc: string;
  razon_social: string;
  direccion_negocio: string;
}

const text = (value: unknown, field: string, max: number): string => {
  if (typeof value !== 'string') {
    throw new IdentityValidationError(`${field} es obligatorio.`);
  }
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > max) {
    throw new IdentityValidationError(`${field} no es válido.`);
  }
  return trimmed;
};

const PERSON_NAME_PATTERN =
  /^\p{L}[\p{L}\p{M}]*(?:[ '\u2019-]\p{L}[\p{L}\p{M}]*)*$/u;
const USERNAME_PATTERN = /^[\p{L}\p{N}][\p{L}\p{M}\p{N}._-]*$/u;

function personName(value: unknown, field: string): string {
  const name = text(value, field, 50);
  const length = Array.from(name).length;
  if (length < 2 || !PERSON_NAME_PATTERN.test(name)) {
    throw new IdentityValidationError(`${field} no es válido.`);
  }
  return name;
}

const optionalText = (
  value: unknown,
  field: string,
  max: number,
): string | null => {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') {
    throw new IdentityValidationError(`${field} no es válido.`);
  }
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > max) {
    throw new IdentityValidationError(`${field} no es válido.`);
  }
  return trimmed;
};

function isValidNaturalPersonCedula(cedula: string): boolean {
  if (!/^\d{10}$/.test(cedula)) return false;
  const province = Number(cedula.slice(0, 2));
  const thirdDigit = Number(cedula[2]);
  if (province < 1 || province > 24 || thirdDigit > 5) return false;

  const sum = cedula
    .slice(0, 9)
    .split('')
    .reduce((total, digit, index) => {
      const value = Number(digit) * (index % 2 === 0 ? 2 : 1);
      return total + (value > 9 ? value - 9 : value);
    }, 0);
  return (10 - (sum % 10)) % 10 === Number(cedula[9]);
}

export function validateCedula(value: unknown): string {
  const identityNumber = text(value, 'La cédula o RUC', 13);
  if (isValidNaturalPersonCedula(identityNumber)) return identityNumber;

  if (
    /^\d{13}$/.test(identityNumber) &&
    identityNumber.slice(10) !== '000' &&
    isValidNaturalPersonCedula(identityNumber.slice(0, 10))
  ) {
    return identityNumber;
  }
  throw new IdentityValidationError('La cédula o RUC de persona natural no es válido.');
}

function validateBusinessRuc(value: unknown): string {
  const ruc = text(value, 'El RUC', 13);
  if (!/^\d{13}$/.test(ruc) || ruc.slice(10) === '000') {
    throw new IdentityValidationError('El RUC debe tener 13 dígitos válidos.');
  }

  const province = Number(ruc.slice(0, 2));
  const personType = Number(ruc[2]);
  if (province < 1 || province > 24) {
    throw new IdentityValidationError('El RUC debe tener 13 dígitos válidos.');
  }

  if (personType <= 5) {
    if (!isValidNaturalPersonCedula(ruc.slice(0, 10))) {
      throw new IdentityValidationError('El RUC debe tener 13 dígitos válidos.');
    }
  } else if (personType !== 6 && personType !== 9) {
    throw new IdentityValidationError('El RUC debe tener 13 dígitos válidos.');
  }
  return ruc;
}

function validateAdultBirthDate(value: unknown): string {
  const date = text(value, 'La fecha de nacimiento', 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new IdentityValidationError(
      'La fecha de nacimiento debe usar AAAA-MM-DD.',
    );
  }
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (
    Number.isNaN(parsed.valueOf()) ||
    parsed.toISOString().slice(0, 10) !== date
  ) {
    throw new IdentityValidationError('La fecha de nacimiento no es válida.');
  }
  if (date < '1900-01-01') {
    throw new IdentityValidationError(
      'La fecha de nacimiento no puede ser anterior al 01/01/1900.',
    );
  }

  const today = new Date();
  let age = today.getUTCFullYear() - parsed.getUTCFullYear();
  const beforeBirthday =
    today.getUTCMonth() < parsed.getUTCMonth() ||
    (today.getUTCMonth() === parsed.getUTCMonth() &&
      today.getUTCDate() < parsed.getUTCDate());
  if (beforeBirthday) age -= 1;
  if (age < 18) {
    throw new IdentityValidationError(
      'Debes tener al menos 18 años para registrarte.',
    );
  }
  return date;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function validateRegistrationWithIdentity(
  input: unknown,
  validateIdentity: (value: unknown) => string,
): RegistrationInput {
  if (!isRecord(input)) {
    throw new IdentityValidationError(
      'Los datos de registro son obligatorios.',
    );
  }
  const email = optionalText(
    input.email_contacto,
    'El correo electrónico',
    255,
  )?.toLowerCase() ?? null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    throw new IdentityValidationError('El correo electrónico no es válido.');
  }
  const username = text(input.username, 'El nombre de usuario', 32).toLowerCase();
  if (
    username.length < 2 ||
    !USERNAME_PATTERN.test(username) ||
    username.endsWith('.') ||
    username.endsWith('-') ||
    username.endsWith('_')
  ) {
    throw new IdentityValidationError('El nombre de usuario no es válido.');
  }
  if (
    typeof input.password !== 'string' ||
    input.password.length < 12 ||
    !/\p{Lu}/u.test(input.password) ||
    !/\p{N}/u.test(input.password) ||
    !/[^\p{L}\p{M}\p{N}\s]/u.test(input.password)
  ) {
    throw new IdentityValidationError(
      'La contraseña debe tener al menos 12 caracteres, una mayúscula, un número y un carácter especial.',
    );
  }

  const telefono = text(input.telefono, 'El teléfono', 16);
  if (!/^\+?\d{7,15}$/.test(telefono)) {
    throw new IdentityValidationError('El teléfono no es válido.');
  }

  return {
    cedula: validateIdentity(input.cedula),
    nombres: personName(input.nombres, 'Los nombres'),
    apellidos: personName(input.apellidos, 'Los apellidos'),
    fecha_nacimiento: validateAdultBirthDate(input.fecha_nacimiento),
    telefono,
    email_contacto: email,
    username,
    password: input.password,
  };
}

export function validateRegistration(input: unknown): RegistrationInput {
  return validateRegistrationWithIdentity(input, validateCedula);
}

export function validateBusinessRequest(
  input: unknown,
): BusinessRegistrationInput {
  if (!isRecord(input)) {
    throw new IdentityValidationError(
      'Los datos de registro son obligatorios.',
    );
  }
  const registration = validateRegistrationWithIdentity(
    { ...input, cedula: input.ruc },
    validateBusinessRuc,
  );
  const ruc = registration.cedula;
  return {
    ...registration,
    ruc,
    razon_social: text(input.razon_social, 'La razón social', 160),
    direccion_negocio: text(
      input.direccion_negocio,
      'La dirección del negocio',
      2000,
    ),
  };
}
