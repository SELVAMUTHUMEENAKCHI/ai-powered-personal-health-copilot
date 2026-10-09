export type UserRole = 'admin' | 'patient';

export interface UserSession {
  id: string;
  email: string;
  role: UserRole;
  patientId: string | null;
  name: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  patientId: string | null;
  name: string;
  iat?: number;
  exp?: number;
}

export interface LoginResponse {
  success: boolean;
  user: UserSession;
  message?: string;
}

export interface AuthErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
