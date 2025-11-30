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
    // Only navigate if loading is completely done
    if (!isLoading) {
        if (user) {
            navigateToRoleScreen(user.role);
        } else {
            // If not authenticated, we just stay on the current screen (likely login or splash)
            // But to be safe, if we are at root and not logged in, go to login
            // router.replace('/(auth)/login'); // Removed auto-redirect to prevent Flash Screen interruption
        }
    }
  }, [user, isLoading]);

  const navigateToRoleScreen = (role: UserRole) => {
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
  };

  const checkAuth = async () => {
    try {
      // Add artificial delay for Flash Screen
      await new Promise(resolve => setTimeout(resolve, 2000));

      const token = await storage.getToken();
      const userData = await storage.getUser();
      
      if (token && userData) {
        setUser(userData);
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
        setUser(response.user);
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
      router.replace('/(auth)/login');
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




