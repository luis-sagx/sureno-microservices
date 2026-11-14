export interface RegistrationFieldsPayload {
  nombres: string;
  apellidos: string;
  fecha_nacimiento: string;
  telefono: string;
  email_contacto?: string;
  username: string;
  password: string;
}

export interface RegistrationPayload extends RegistrationFieldsPayload {
  cedula: string;
}

export interface BusinessRegistrationPayload extends RegistrationFieldsPayload {
  ruc: string;
  razon_social: string;
  direccion_negocio: string;
}
