import { useRouter } from 'expo-router';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { getProfile, login, LoginCredentials, logout as logoutService, register, RegisterData } from '../services/auth.service';
import { User, UserRole } from '../types/user.types';
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
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  // Navigate based on role after authentication
  useEffect(() => {
    // Only navigate if loading is completely done and router is ready
    if (!isLoading && user && router) {
      // Use setTimeout to ensure router is fully initialized
      setTimeout(() => {
        try {
          navigateToRoleScreen(user.role);
        } catch (error) {
          console.error('Navigation error:', error);
        }
      }, 100);
    }
  }, [user, isLoading]);

  const navigateToRoleScreen = (role: UserRole) => {
    if (!router) return;
    try {
      switch (role) {
        case 'customer':
          router.replace('/(customer)');
          break;
        case 'staff':
          router.replace('/(staff)');
          break;
        case 'admin':
          router.replace('/(admin)');
          break;
        default:
          router.replace('/(auth)/login');
      }
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  const checkAuth = async () => {
    try {
      // Add artificial delay for Flash Screen
      await new Promise(resolve => setTimeout(resolve, 2000));

      const token = await storage.getToken();
      const userData = await storage.getUser();
      
      if (token && userData) {
        // Normalize user data - ensure id field exists
        const normalizedUser = {
          ...userData,
          id: userData.id || userData._id || '',
        };
        setUser(normalizedUser);
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
        // Normalize user data - ensure id field exists
        const normalizedUser = {
          ...response.user,
          id: response.user.id || response.user._id || '',
        };
        setUser(normalizedUser);
        // Navigation will happen automatically via useEffect
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  };

  const handleRegister = async (data: RegisterData) => {
    try {
      const response = await register(data);
      if (response.user) {
        // Normalize user data - ensure id field exists
        const normalizedUser = {
          ...response.user,
          id: response.user.id || response.user._id || '',
        };
        setUser(normalizedUser);
        // Navigation will happen automatically via useEffect
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Registration failed');
    }
  };

  const handleLogout = async () => {
    try {
      await logoutService();
      setUser(null);
      if (router) {
        router.replace('/(auth)/login');
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const refreshProfile = async () => {
    try {
      const profile = await getProfile();
      if (profile.user) {
        // Normalize user data - ensure id field exists
        const normalizedUser = {
          ...profile.user,
          id: profile.user.id || profile.user._id || '',
        };
        setUser(normalizedUser);
        await storage.setUser(normalizedUser);
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




