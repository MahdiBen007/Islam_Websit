import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { AuthSession } from '@/types/domain';
import { authService } from '@/services/auth/authService';

interface AuthContextValue {
  session: AuthSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isRecoveryMode: boolean;
  clearRecoveryMode: () => void;
  login: (email: string, password: string, rememberMe: boolean) => Promise<AuthSession>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() =>
    authService.getCurrentSession(),
  );
  const [isLoading, setIsLoading] = useState<boolean>(() => !authService.getCurrentSession());
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);

  useEffect(() => {
    let mounted = true;

    void authService.restoreSession().then((restored) => {
      if (!mounted) return;
      setSession(restored);
      setIsLoading(false);
    });

    const unsubscribe = authService.onAuthStateChange((change) => {
      if (!mounted) return;
      if (change.event === 'PASSWORD_RECOVERY') {
        setIsRecoveryMode(true);
      }
      setSession(change.session);
      setIsLoading(false);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const login = useCallback(async (email: string, password: string, rememberMe: boolean) => {
    const newSession = await authService.login(email, password, rememberMe);
    setIsRecoveryMode(false);
    setSession(newSession);
    return newSession;
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setIsRecoveryMode(false);
    setSession(null);
  }, []);

  const clearRecoveryMode = useCallback(() => {
    setIsRecoveryMode(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        isAuthenticated: Boolean(session),
        isLoading,
        isRecoveryMode,
        clearRecoveryMode,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
