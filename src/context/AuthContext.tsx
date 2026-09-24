import { useRouter } from 'expo-router';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { getProfile, login, LoginCredentials, logout as logoutService, register, RegisterData } from '../services/auth.service';
import { User } from '../types/user.types';
import { storage } from '../utils/storage';
import { setUnauthorizedCallback } from '../services/api';

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

  useEffect(() => {
    setUnauthorizedCallback(() => {
      setUser(null);
      if (router) {
        try {
          router.replace('/(auth)/login');
        } catch (error) {
          console.error('Auto-logout redirect error:', error);
        }
      }
    });
  }, [router]);

  const checkAuth = async () => {
    try {
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
        // OrderContext will automatically refresh orders when user changes
      }
    } catch (error: any) {
      // Preserve the error message from auth.service (already user-friendly)
      if (error instanceof Error) {
        throw error; // Re-throw the error with its original message
      }
      // Fallback if error is not an Error instance
      throw new Error(error.message || 'Login failed. Please try again.');
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
      // If error is already an Error object with message, use it
      if (error instanceof Error) {
        throw error;
      }
      // Otherwise extract message from response
      throw new Error(error.response?.data?.message || error.message || 'Registration failed');
    }
  };

  const handleLogout = async () => {
    try {
      // Clear storage first
      await logoutService();
      
      // Clear user state immediately
      setUser(null);
      
      // Force navigation to login
      if (router) {
        try {
          // Use replace to prevent going back
          await router.replace('/(auth)/login');
          
          // For web browsers only, check if navigation worked
          if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
            setTimeout(() => {
              try {
                const currentPath = window.location.pathname;
                // If still not on login page after 200ms, try to force navigation
                if (!currentPath.includes('/login') && !currentPath.includes('/signup') && !currentPath.includes('/auth')) {
                  // Only use window.location.href if we're actually in a browser
                  if (typeof window.location.href !== 'undefined') {
                    window.location.href = '/';
                  }
                }
              } catch (e) {
                // Ignore errors with window.location - it's not supported in all environments
                console.log('Could not use window.location for navigation');
              }
            }, 200);
          }
        } catch (navError) {
          console.error('Navigation error during logout:', navError);
          // Fallback: try router again
          if (router) {
            router.replace('/(auth)/login');
          }
        }
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Even if logout fails, try to navigate to login
      setUser(null);
      if (router) {
        router.replace('/(auth)/login');
      }
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




