import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { usersApi } from '../api';
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

const KEYS = {
  token:  'sl_token',
  userId: 'sl_userId',
  name:   'sl_name',
  email:  'sl_email',
  role:   'sl_role',
} as const;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token,     setToken]     = useState<string | null>(() => localStorage.getItem(KEYS.token));
  const [userId,    setUserId]    = useState<number | null>(() => {
    const s = localStorage.getItem(KEYS.userId);
    return s ? Number(s) : null;
  });
  const [userName,  setUserName]  = useState<string | null>(() => localStorage.getItem(KEYS.name));
  const [userEmail, setUserEmail] = useState<string | null>(() => localStorage.getItem(KEYS.email));
  const [role,      setRole]      = useState<Role | null>(() => localStorage.getItem(KEYS.role) as Role | null);

  const login = useCallback((data: AuthResponse) => {
    localStorage.setItem(KEYS.token,  data.token);
    localStorage.setItem(KEYS.userId, String(data.userId));
    localStorage.setItem(KEYS.name,   data.name);
    localStorage.setItem(KEYS.email,  data.email);
    localStorage.setItem(KEYS.role,   data.role);
    setToken(data.token);
    setUserId(data.userId);
    setUserName(data.name);
    setUserEmail(data.email);
    setRole(data.role);
  }, []);

  const logout = useCallback(() => {
    Object.values(KEYS).forEach(k => localStorage.removeItem(k));
    setToken(null);
    setUserId(null);
    setUserName(null);
    setUserEmail(null);
    setRole(null);
  }, []);

  // Validate token on mount
  useEffect(() => {
    const validateToken = async () => {
      if (token) {
        try {
          await usersApi.me();
        } catch {
          // Token is invalid, clear all auth data
          logout();
        }
      }
    };
    validateToken();
  }, [token, logout]);

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
