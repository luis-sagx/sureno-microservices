export interface LoginPayload {
  username: string;
  password: string;
}

export interface RegistrationPayload {
  cedula: string;
  nombres: string;
  apellidos: string;
  fecha_nacimiento: string;
  telefono: string;
  email_contacto?: string;
  username: string;
  password: string;
}

export interface BusinessRegistrationPayload extends RegistrationPayload {
  ruc: string;
  razon_social: string;
  nombre_comercial?: string;
  direccion_negocio: string;
}

export interface AuthUser {
  userId: string;
  username: string;
  roles: string[];
  estado_verificacion?: string;
  estado_solicitud?: string | null;
}

export interface LoginResponse {
  user_id: string;
  username: string;
  roles: string[];
  estado_verificacion: string;
  estado_solicitud?: string | null;
  session_expires_in_seconds: number;
}
