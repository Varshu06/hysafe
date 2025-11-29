import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { getStaffProfile, LoginCredentials, logout as logoutService, staffLogin } from '../services/auth.service';
import { Staff } from '../types/user.types';
import { storage } from '../utils/storage';

interface AuthContextType {
  staff: Staff | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [staff, setStaff] = useState<Staff | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await storage.getToken();
      const userData = await storage.getUser();
      
      if (token && userData) {
        setStaff(userData);
        // Optionally refresh profile from API
        // await refreshProfile();
      }
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (credentials: LoginCredentials) => {
    try {
      const response = await staffLogin(credentials);
      if (response.staff) {
        setStaff(response.staff);
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  };

  const logout = async () => {
    try {
      await logoutService();
      setStaff(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const refreshProfile = async () => {
    try {
      const profile = await getStaffProfile();
      if (profile.staff) {
        setStaff(profile.staff);
        await storage.setUser(profile.staff);
      }
    } catch (error) {
      console.error('Refresh profile error:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        staff,
        isLoading,
        isAuthenticated: !!staff,
        login,
        logout,
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

