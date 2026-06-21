export type UserRole = 'admin' | 'user';

export interface AuthSession {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  signedInAt: string;
}
