import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { getProfile, login, LoginCredentials, logout as logoutService, register, RegisterData } from '../services/auth.service';
import { User } from '../types/user.types';
import { storage } from '../utils/storage';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await storage.getToken();
      const userData = await storage.getUser();
      
      if (token && userData) {
        setUser(userData);
        // Optionally refresh profile from API
        // await refreshProfile();
      }
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (credentials: LoginCredentials) => {
    try {
      const response = await login(credentials);
      if (response.user) {
        setUser(response.user);
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  };

  const handleRegister = async (data: RegisterData) => {
    try {
      const response = await register(data);
      if (response.user) {
        setUser(response.user);
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Registration failed');
    }
  };

  const handleLogout = async () => {
    try {
      await logoutService();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const refreshProfile = async () => {
    try {
      const profile = await getProfile();
      if (profile.user) {
        setUser(profile.user);
        await storage.setUser(profile.user);
      }
    } catch (error) {
      console.error('Refresh profile error:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login: handleLogin,
        register: handleRegister,
        logout: handleLogout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

