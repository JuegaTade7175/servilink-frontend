import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
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
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [userId, setUserId] = useState<number | null>(() => {
    const s = localStorage.getItem('userId');
    return s ? Number(s) : null;
  });
  const [userName, setUserName] = useState<string | null>(() => localStorage.getItem('userName'));
  const [userEmail, setUserEmail] = useState<string | null>(() => localStorage.getItem('userEmail'));
  const [role, setRole] = useState<Role | null>(() => localStorage.getItem('role') as Role | null);

  const login = useCallback((data: AuthResponse) => {
    localStorage.setItem('token', data.token);
    localStorage.setItem('userId', String(data.userId));
    localStorage.setItem('userName', data.name);
    localStorage.setItem('userEmail', data.email);
    localStorage.setItem('role', data.role);
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
    <AuthContext.Provider value={{
      token, userId, userName, userEmail, role,
      isAuthenticated: !!token,
      login, logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
