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

