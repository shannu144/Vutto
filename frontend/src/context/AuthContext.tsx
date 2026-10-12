import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User } from '../types';
import { api } from '../services/api';

export interface UserPreset {
  key: string;
  label: string;
  email: string;
  password: string;
  role: 'BUYER' | 'ADMIN';
  initials: string;
}

export const PRESET_ACCOUNTS: UserPreset[] = [
  { key: 'elena', label: 'Elena Rostova (Buyer 1)', email: 'elena@vutto.com', password: 'Buyer@123', role: 'BUYER', initials: 'ER' },
  { key: 'marcus', label: 'Marcus Vance (Buyer 2)', email: 'marcus@vutto.com', password: 'Buyer@123', role: 'BUYER', initials: 'MV' },
  { key: 'alex', label: 'Alex Chen (Buyer 3)', email: 'alex@vutto.com', password: 'Buyer@123', role: 'BUYER', initials: 'AC' },
  { key: 'admin', label: 'Admin (System)', email: 'admin@vutto.com', password: 'Admin@123', role: 'ADMIN', initials: 'AD' },
];

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; name: string }) => Promise<void>;
  logout: () => void;
  switchPreset: (presetKey: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('vutto_token'));
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const userData = await api.getMe();
      setUser(userData);
    } catch {
      logout();
    }
  };

  useEffect(() => {
    if (token) {
      refreshUser().finally(() => setIsLoading(false));
    } else {
      switchPreset('elena').finally(() => setIsLoading(false));
    }
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.login(email, password);
    localStorage.setItem('vutto_token', res.token);
    setToken(res.token);
    setUser(res.user);
  };

  const register = async (data: { email: string; password: string; name: string }) => {
    const res = await api.register(data);
    localStorage.setItem('vutto_token', res.token);
    setToken(res.token);
    setUser(res.user);
  };

  const logout = () => {
    localStorage.removeItem('vutto_token');
    setToken(null);
    setUser(null);
  };

  const switchPreset = async (presetKey: string) => {
    const preset = PRESET_ACCOUNTS.find((p) => p.key === presetKey);
    if (!preset) return;
    try {
      await login(preset.email, preset.password);
    } catch (err) {
      console.error('Error switching to preset user:', err);
    }
  };

  const isAuthenticated = !!user;
  const isAdmin = user?.role === 'ADMIN';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isAdmin,
        isLoading,
        login,
        register,
        logout,
        switchPreset,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
