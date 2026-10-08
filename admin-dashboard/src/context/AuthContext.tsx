import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { User } from '@types';
import { storage } from '@utils/storage';
import { authService } from '@services/auth.service';
import api from '@utils/api';
import { socketService } from '@services/socket.service';
import { sessionCheckFailure } from '@utils/sessionAuth';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  sessionError: 'unreachable' | null;
  retrySession: () => void;
  login: (phone: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
}

type SessionCheckResult = {
  status: 'authenticated' | 'anonymous' | 'invalid' | 'unreachable';
  user?: User;
  token?: string;
};

let sessionCheck: Promise<SessionCheckResult> | null = null;

const checkStoredSession = (force = false): Promise<SessionCheckResult> => {
  if (!force && sessionCheck) return sessionCheck;
  const run = (async (): Promise<SessionCheckResult> => {
    const token = storage.getToken();
    if (!token) return { status: 'anonymous' };
    try {
      const profile = await authService.getCurrentUser();
      const user = profile?.user;
      if (!user?.role) {
        storage.removeToken();
        storage.removeUser();
        return { status: 'invalid' };
      }
      if (user.role !== 'admin') {
        storage.clearAll();
        return { status: 'anonymous' };
      }
      storage.setUser(user);
      return { status: 'authenticated', user, token };
    } catch (error) {
      if (sessionCheckFailure(error) === 'invalid') {
        storage.removeToken();
        storage.removeUser();
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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUserState] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionError, setSessionError] = useState<'unreachable' | null>(null);
  const epochRef = useRef(0);

  const applySessionCheck = (result: SessionCheckResult, epochAtStart: number) => {
    if (epochRef.current !== epochAtStart) return;
    if (result.status === 'authenticated' && result.user && result.token) {
      setToken(result.token);
      setUserState(result.user);
      setSessionError(null);
      socketService.connect();
      return;
    }
    setToken(null);
    setUserState(null);
    setSessionError(result.status === 'unreachable' ? 'unreachable' : null);
  };

  useEffect(() => {
    const epochAtStart = epochRef.current;
    let active = true;
    void checkStoredSession()
      .then((result) => {
        if (!active) return;
        applySessionCheck(result, epochAtStart);
      })
      .catch(() => {
        if (!active || epochRef.current !== epochAtStart) return;
        setToken(null);
        setUserState(null);
        setSessionError('unreachable');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const retrySession = () => {
    const epochAtStart = epochRef.current;
    setIsLoading(true);
    setSessionError(null);
    void checkStoredSession(true)
      .then((result) => applySessionCheck(result, epochAtStart))
      .catch(() => {
        if (epochRef.current === epochAtStart) {
          setToken(null);
          setUserState(null);
          setSessionError('unreachable');
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const login = async (phone: string, password: string) => {
    const response = await authService.login({ phone, password });
    const { token: nextToken, user: nextUser } = response;

    if (!nextUser || nextUser.role !== 'admin') {
      throw new Error('Access denied. Admin credentials required to access this dashboard.');
    }

    epochRef.current += 1;
    storage.setToken(nextToken);
    storage.setUser(nextUser);
    setToken(nextToken);
    setUserState(nextUser);
    setSessionError(null);
    socketService.connect();
  };

  const logout = () => {
    epochRef.current += 1;
    const currentToken = storage.getToken();
    socketService.disconnect();
    storage.clearAll();
    setToken(null);
    setUserState(null);
    setSessionError(null);
    setIsLoading(false);
    if (currentToken) {
      void api.post('/auth/logout', {}, {
        headers: { Authorization: `Bearer ${currentToken}` },
        timeout: 2500,
      }).catch(() => undefined);
    }
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
        sessionError,
        retrySession,
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
