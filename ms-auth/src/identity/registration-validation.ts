import { BadRequestException } from '@nestjs/common';
import {
  RegisterIndividualDto,
  RequestBusinessAccountDto,
} from './dto/registration.dto.js';

type RegistrationInput = Omit<RegisterIndividualDto, 'email_contacto'> & {
  email_contacto: string | null;
  nombres: string;
  apellidos: string;
  telefono: string;
  username: string;
};

const text = (value: unknown, field: string, max: number): string => {
  if (typeof value !== 'string') {
    throw new BadRequestException(`${field} es obligatorio.`);
  }
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > max) {
    throw new BadRequestException(`${field} no es válido.`);
  }
  return trimmed;
};

const optionalText = (value: unknown, field: string, max: number): string | null => {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') {
    throw new BadRequestException(`${field} no es válido.`);
  }
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > max) {
    throw new BadRequestException(`${field} no es válido.`);
  }
  return trimmed;
};

export function validateCedula(value: unknown): string {
  const cedula = text(value, 'La cédula', 10);
  if (!/^\d{10}$/.test(cedula)) {
    throw new BadRequestException('La cédula debe tener 10 dígitos.');
  }

  const province = Number(cedula.slice(0, 2));
  const thirdDigit = Number(cedula[2]);
  if (province < 1 || province > 24 || thirdDigit > 5) {
    throw new BadRequestException('La cédula no es válida.');
  }

  const sum = cedula.slice(0, 9).split('').reduce((total, digit, index) => {
    const value = Number(digit) * (index % 2 === 0 ? 2 : 1);
    return total + (value > 9 ? value - 9 : value);
  }, 0);
  const checkDigit = (10 - (sum % 10)) % 10;
  if (checkDigit !== Number(cedula[9])) {
    throw new BadRequestException('La cédula no es válida.');
  }
  return cedula;
}

function validateAdultBirthDate(value: unknown): string {
  const date = text(value, 'La fecha de nacimiento', 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new BadRequestException('La fecha de nacimiento debe usar AAAA-MM-DD.');
  }
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== date) {
    throw new BadRequestException('La fecha de nacimiento no es válida.');
  }

  const today = new Date();
  let age = today.getUTCFullYear() - parsed.getUTCFullYear();
  const beforeBirthday =
    today.getUTCMonth() < parsed.getUTCMonth() ||
    (today.getUTCMonth() === parsed.getUTCMonth() &&
      today.getUTCDate() < parsed.getUTCDate());
  if (beforeBirthday) age -= 1;
  if (age < 18) {
    throw new BadRequestException('Debes tener al menos 18 años para registrarte.');
  }
  return date;
}

export function validateRegistration(
  input: RegisterIndividualDto,
): RegistrationInput {
  if (!input || typeof input !== 'object') {
    throw new BadRequestException('Los datos de registro son obligatorios.');
  }
  const email =
    input.email_contacto === undefined || input.email_contacto === null
      ? null
      : text(input.email_contacto, 'El correo electrónico', 255).toLowerCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new BadRequestException('El correo electrónico no es válido.');
  }
  const username = text(input.username, 'El nombre de usuario', 80).toLowerCase();
  if (username.length < 3 || !/^[a-z0-9._-]+$/.test(username)) {
    throw new BadRequestException('El nombre de usuario no es válido.');
  }
  if (typeof input.password !== 'string' || input.password.length < 12) {
    throw new BadRequestException('La contraseña debe tener al menos 12 caracteres.');
  }

  const telefono = text(input.telefono, 'El teléfono', 20);
  if (!/^[+\d ()-]{7,20}$/.test(telefono)) {
    throw new BadRequestException('El teléfono no es válido.');
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

export function validateBusinessRequest(input: RequestBusinessAccountDto) {
  const registration = validateRegistration(input);
  const ruc = text(input.ruc, 'El RUC', 13);
  if (!/^\d{13}$/.test(ruc) || ruc.endsWith('000')) {
    throw new BadRequestException('El RUC debe tener 13 dígitos válidos.');
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
    direccion_negocio: text(input.direccion_negocio, 'La dirección del negocio', 2000),
  };
}
