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
  nombre_comercial: string | null;
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

export function validateCedula(value: unknown): string {
  const cedula = text(value, 'La cédula', 10);
  if (!/^\d{10}$/.test(cedula)) {
    throw new IdentityValidationError('La cédula debe tener 10 dígitos.');
  }

  const province = Number(cedula.slice(0, 2));
  const thirdDigit = Number(cedula[2]);
  if (province < 1 || province > 24 || thirdDigit > 5) {
    throw new IdentityValidationError('La cédula no es válida.');
  }

  const sum = cedula
    .slice(0, 9)
    .split('')
    .reduce((total, digit, index) => {
      const value = Number(digit) * (index % 2 === 0 ? 2 : 1);
      return total + (value > 9 ? value - 9 : value);
    }, 0);
  const checkDigit = (10 - (sum % 10)) % 10;
  if (checkDigit !== Number(cedula[9])) {
    throw new IdentityValidationError('La cédula no es válida.');
  }
  return cedula;
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

export function validateRegistration(input: unknown): RegistrationInput {
  if (!isRecord(input)) {
    throw new IdentityValidationError(
      'Los datos de registro son obligatorios.',
    );
  }
  const email =
    input.email_contacto === undefined || input.email_contacto === null
      ? null
      : text(input.email_contacto, 'El correo electrónico', 255).toLowerCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new IdentityValidationError('El correo electrónico no es válido.');
  }
  const username = text(
    input.username,
    'El nombre de usuario',
    80,
  ).toLowerCase();
  if (username.length < 3 || !/^[a-z0-9._-]+$/.test(username)) {
    throw new IdentityValidationError('El nombre de usuario no es válido.');
  }
  if (typeof input.password !== 'string' || input.password.length < 12) {
    throw new IdentityValidationError(
      'La contraseña debe tener al menos 12 caracteres.',
    );
  }

  const telefono = text(input.telefono, 'El teléfono', 20);
  if (!/^[+\d ()-]{7,20}$/.test(telefono)) {
    throw new IdentityValidationError('El teléfono no es válido.');
  }

  return {
    cedula: validateCedula(input.cedula),
    nombres: text(input.nombres, 'Los nombres', 100),
    apellidos: text(input.apellidos, 'Los apellidos', 100),
    fecha_nacimiento: validateAdultBirthDate(input.fecha_nacimiento),
    telefono,
    email_contacto: email,
    username,
    password: input.password,
  };
}

export function validateBusinessRequest(
  input: unknown,
): BusinessRegistrationInput {
  if (!isRecord(input)) {
    throw new IdentityValidationError(
      'Los datos de registro son obligatorios.',
    );
  }
  const registration = validateRegistration(input);
  const ruc = text(input.ruc, 'El RUC', 13);
  if (!/^\d{13}$/.test(ruc) || ruc.endsWith('000')) {
    throw new IdentityValidationError('El RUC debe tener 13 dígitos válidos.');
  }
  return {
    ...registration,
    ruc,
    razon_social: text(input.razon_social, 'La razón social', 160),
    nombre_comercial: optionalText(
      input.nombre_comercial,
      'El nombre comercial',
      160,
    ),
    direccion_negocio: text(
      input.direccion_negocio,
      'La dirección del negocio',
      2000,
    ),
  };
}
