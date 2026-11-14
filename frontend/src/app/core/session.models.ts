export interface LoginPayload {
  username: string;
  password: string;
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
