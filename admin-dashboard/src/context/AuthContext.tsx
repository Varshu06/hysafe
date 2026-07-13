import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@types';
import { storage } from '@utils/storage';
import { authService } from '@services/auth.service';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (phone: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUserState] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize from storage
    const storedToken = storage.getToken();
    const storedUser = storage.getUser();

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUserState(storedUser);
    }

    setIsLoading(false);
  }, []);

  const login = async (phone: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await authService.login({ phone, password });
      const { token, user } = response;

      storage.setToken(token);
      storage.setUser(user);

      setToken(token);
      setUserState(user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    storage.clearAll();
    setToken(null);
    setUserState(null);
  };

  const setUser = (newUser: User) => {
    storage.setUser(newUser);
    setUserState(newUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
