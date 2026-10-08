import { useRouter } from 'expo-router';
import React, { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { Alert, Platform } from 'react-native';
import { getProfile, login, LoginCredentials, logout as logoutService, register, RegisterData } from '../services/auth.service';
import {
  authenticateWithGoogle,
  consumeGoogleWebCallback,
  GoogleCredential,
  googleErrorMessage,
} from '../services/googleAuth.service';
import { User } from '../types/user.types';
import { storage } from '../utils/storage';
import { sessionCheckFailure } from '../utils/sessionAuth';
import { setUnauthorizedCallback } from '../services/api';
import { socketService } from '../services/socket.service';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  sessionError: 'unreachable' | null;
  retrySession: () => void;
  login: (credentials: LoginCredentials) => Promise<void>;
  loginWithGoogle: (credential: GoogleCredential) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

type SessionCheckResult = {
  status: 'authenticated' | 'anonymous' | 'invalid' | 'unreachable';
  user?: User;
};

let sessionCheck: Promise<SessionCheckResult> | null = null;

const checkStoredSession = (force = false): Promise<SessionCheckResult> => {
  if (!force && sessionCheck) return sessionCheck;
  const run = (async (): Promise<SessionCheckResult> => {
    const token = await storage.getToken();
    if (!token) return { status: 'anonymous' };
    try {
      const profile = await getProfile();
      if (!profile?.user?.role) {
        await storage.clearAll();
        return { status: 'invalid' };
      }
      const normalized = normalizeUser(profile.user);
      await storage.setUser(normalized);
      return { status: 'authenticated', user: normalized };
    } catch (error) {
      if (sessionCheckFailure(error) === 'invalid') {
        await storage.clearAll();
        return { status: 'invalid' };
      }
      return { status: 'unreachable' };
    }
  })();
  sessionCheck = run;
  void run.finally(() => {
    if (sessionCheck === run) sessionCheck = null;
  });
  return run;
};

const normalizeUser = (userData: User): User => ({
  ...userData,
  id: userData.id || userData._id || '',
});

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionError, setSessionError] = useState<'unreachable' | null>(null);
  const router = useRouter();
  const epochRef = useRef(0);

  const applySessionCheck = (result: SessionCheckResult, epochAtStart: number) => {
    if (epochRef.current !== epochAtStart) return;
    if (result.status === 'authenticated' && result.user) {
      setUser(result.user);
      setSessionError(null);
      return;
    }
    setUser(null);
    setSessionError(result.status === 'unreachable' ? 'unreachable' : null);
  };

  useEffect(() => {
    const epochAtStart = epochRef.current;
    let active = true;

    void (async () => {
      try {
        const outcome = await consumeGoogleWebCallback();
        if (!active || epochRef.current !== epochAtStart) return;

        if (outcome?.type === 'session' && outcome.user) {
          setUser(normalizeUser(outcome.user));
          setSessionError(null);
          return;
        }

        if (outcome?.type === 'linked') {
          const result = await checkStoredSession(true);
          if (!active) return;
          applySessionCheck(result, epochAtStart);
          if (epochRef.current === epochAtStart && result.status === 'authenticated') {
            Alert.alert('Google', 'Google account linked.');
          }
          return;
        }

        if (outcome?.type === 'message') {
          if (outcome.intent === 'link') {
            Alert.alert('Google', outcome.message);
          } else if (typeof sessionStorage !== 'undefined') {
            sessionStorage.setItem('hysafe_google_notice', outcome.message);
          }
        }

        const result = await checkStoredSession();
        if (!active) return;
        applySessionCheck(result, epochAtStart);
      } catch {
        if (active && epochRef.current === epochAtStart) {
          setUser(null);
          setSessionError('unreachable');
        }
      } finally {
        if (active) setIsLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setUnauthorizedCallback(() => {
      epochRef.current += 1;
      setUser(null);
      setSessionError(null);
      setIsLoading(false);
      if (router) {
        try {
          router.replace('/(auth)/login');
        } catch (error) {
          console.error('Auto-logout redirect error:', error);
        }
      }
    });
  }, [router]);

  const retrySession = () => {
    const epochAtStart = epochRef.current;
    setIsLoading(true);
    setSessionError(null);
    void checkStoredSession(true)
      .then((result) => applySessionCheck(result, epochAtStart))
      .catch(() => {
        if (epochRef.current === epochAtStart) {
          setUser(null);
          setSessionError('unreachable');
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const handleLogin = async (credentials: LoginCredentials) => {
    try {
      const response = await login(credentials);
      if (response.user) {
        epochRef.current += 1;
        setSessionError(null);
        setUser(normalizeUser(response.user));
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

  const handleGoogleLogin = async (credential: GoogleCredential) => {
    try {
      const response = await authenticateWithGoogle(credential);
      if (response.user) {
        epochRef.current += 1;
        setSessionError(null);
        setUser(normalizeUser(response.user));
      }
    } catch (error) {
      throw new Error(googleErrorMessage(error, 'Google sign-in could not be completed. Please try again.'));
    }
  };

  const handleRegister = async (data: RegisterData) => {
    try {
      const response = await register(data);
      if (response.user) {
        epochRef.current += 1;
        setSessionError(null);
        setUser(normalizeUser(response.user));
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
    epochRef.current += 1;
    setSessionError(null);
    setIsLoading(false);
    try {
      socketService.disconnect();
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
    const epochAtStart = epochRef.current;
    try {
      const profile = await getProfile();
      if (epochRef.current !== epochAtStart) return;
      if (profile.user) {
        // Normalize user data - ensure id field exists
        const normalizedUser = normalizeUser(profile.user);
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
        sessionError,
        retrySession,
        login: handleLogin,
        loginWithGoogle: handleGoogleLogin,
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



