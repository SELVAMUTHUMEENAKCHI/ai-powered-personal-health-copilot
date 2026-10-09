import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserSession } from '@health-copilot/shared';
import { apiRequest } from '../services/api';

interface RegisterData {
  role?: 'patient' | 'admin';
  name: string;
  email: string;
  password: string;
  phone?: string;
  dob?: string;
  gender?: 'male' | 'female' | 'other';
  bloodGroup?: string;
  preferredLanguage?: string;
}

interface RegisterResult {
  user: UserSession;
  patientId: string | null;
  abhaId?: string | null;
  message: string;
}

interface AuthContextType {
  user: UserSession | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<UserSession>;
  register: (data: RegisterData) => Promise<RegisterResult>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshSession = async () => {
    try {
      const data = await apiRequest<{ success: boolean; user: UserSession }>('/auth/me');
      if (data.success && data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshSession();
  }, []);

  const login = async (email: string, password: string): Promise<UserSession> => {
    setLoading(true);
    try {
      const data = await apiRequest<{ success: boolean; user: UserSession }>('/auth/login', {
        method: 'POST',
        data: { email, password },
      });
      setUser(data.user);
      return data.user;
    } finally {
      setLoading(false);
    }
  };

  const register = async (regData: RegisterData): Promise<RegisterResult> => {
    setLoading(true);
    try {
      const data = await apiRequest<{
        success: boolean;
        user: UserSession;
        patientId: string | null;
        abhaId?: string | null;
        message: string;
      }>('/auth/register', {
        method: 'POST',
        data: regData,
      });
      setUser(data.user);
      return {
        user: data.user,
        patientId: data.patientId,
        abhaId: data.abhaId || null,
        message: data.message,
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch {
      // Ignored
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
