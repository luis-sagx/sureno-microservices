export interface RegisterIndividualDto {
  cedula: string;
  nombres: string;
  apellidos: string;
  fecha_nacimiento: string;
  telefono: string;
  email_contacto?: string;
  username: string;
  password: string;
}

export interface RequestBusinessAccountDto extends Omit<RegisterIndividualDto, 'cedula'> {
  ruc: string;
  razon_social: string;
  nombre_comercial?: string;
  direccion_negocio: string;
}
