import { useEffect, useState } from 'react';
import type { AuthSession, UserRole } from '../types/auth';

const SESSION_KEY = 'loader-castle-auth-session';

interface LoginInput {
  email: string;
  password: string;
  role: UserRole;
}

const demoNames: Record<UserRole, string> = {
  admin: 'Admin Manager',
  user: 'Counter User',
};

export function useAuthSession() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return;
    try {
      setSession(JSON.parse(raw) as AuthSession);
    } catch {
      localStorage.removeItem(SESSION_KEY);
    }
  }, []);

  const login = ({ email, password, role }: LoginInput) => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password.trim()) {
      setAuthError('Enter email and password to continue.');
      return false;
    }

    const nextSession: AuthSession = {
      id: crypto.randomUUID(),
      name: demoNames[role],
      email: cleanEmail,
      role,
      signedInAt: new Date().toISOString(),
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession));
    setSession(nextSession);
    setAuthError('');
    return true;
  };

  const logout = () => {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
  };

  return { session, authError, login, logout };
}
