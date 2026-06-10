import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { AuthResponse, Role } from '../types';

interface AuthContextType {
  token: string | null;
  userId: number | null;
  userName: string | null;
  userEmail: string | null;
  role: Role | null;
  isAuthenticated: boolean;
  login: (data: AuthResponse) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem('sl_token')
  );
  const [userId, setUserId] = useState<number | null>(() => {
    const s = localStorage.getItem('sl_userId');
    return s ? Number(s) : null;
  });
  const [userName, setUserName] = useState<string | null>(
    () => localStorage.getItem('sl_name')
  );
  const [userEmail, setUserEmail] = useState<string | null>(
    () => localStorage.getItem('sl_email')
  );
  const [role, setRole] = useState<Role | null>(
    () => localStorage.getItem('sl_role') as Role | null
  );

  const login = useCallback((data: AuthResponse) => {
    localStorage.setItem('sl_token', data.token);
    localStorage.setItem('sl_userId', String(data.userId));
    localStorage.setItem('sl_name', data.name);
    localStorage.setItem('sl_email', data.email);
    localStorage.setItem('sl_role', data.role);
    setToken(data.token);
    setUserId(data.userId);
    setUserName(data.name);
    setUserEmail(data.email);
    setRole(data.role);
  }, []);

  const logout = useCallback(() => {
    localStorage.clear();
    setToken(null);
    setUserId(null);
    setUserName(null);
    setUserEmail(null);
    setRole(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        token,
        userId,
        userName,
        userEmail,
        role,
        isAuthenticated: !!token,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
