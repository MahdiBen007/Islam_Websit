import type { IAuthService } from '@/services/api/types';
import type { AdminUser, AuthSession } from '@/types/domain';

/**
 * MOCK AUTHENTICATION SERVICE (FRONTEND DEMONSTRATION ONLY)
 * ---------------------------------------------------------
 * - Demo credentials are checked strictly inside this mock service and are
 *   NEVER persisted to localStorage or sessionStorage.
 * - Only non-secret session metadata (`AuthSession`) is stored for demo navigation.
 */

const SESSION_KEY = 'cic_admin_demo_session_v1';
const REMEMBER_EMAIL_KEY = 'cic_admin_remember_email_v1';

export const DEMO_ADMIN_CREDENTIALS = {
  email: 'admin@university.edu.sa',
  password: '123456',
} as const;

const DEMO_ADMIN_USER: AdminUser = {
  id: 'admin-1',
  nameAr: 'المسؤول',
  nameEn: 'Administrator',
  email: DEMO_ADMIN_CREDENTIALS.email,
  roleAr: 'مدير النظام',
  roleEn: 'System Admin',
};

function delay(ms: number): Promise<void> {
  if (typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'test') {
    return Promise.resolve();
  }
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const authService: IAuthService = {
  async login(email: string, password: string, rememberMe: boolean): Promise<AuthSession> {
    await delay(250);

    const normalizedEmail = email.trim().toLowerCase();
    if (
      normalizedEmail !== DEMO_ADMIN_CREDENTIALS.email.toLowerCase() ||
      password !== DEMO_ADMIN_CREDENTIALS.password
    ) {
      throw new Error('INVALID_CREDENTIALS');
    }

    const session: AuthSession = {
      sessionId: `demo-session-${Date.now()}`,
      user: DEMO_ADMIN_USER,
      rememberMe,
      authenticatedAt: new Date().toISOString(),
    };

    try {
      const serialized = JSON.stringify(session);
      if (rememberMe) {
        window.localStorage.setItem(SESSION_KEY, serialized);
        window.localStorage.setItem(REMEMBER_EMAIL_KEY, normalizedEmail);
        window.sessionStorage.removeItem(SESSION_KEY);
      } else {
        window.sessionStorage.setItem(SESSION_KEY, serialized);
        window.localStorage.removeItem(SESSION_KEY);
        window.localStorage.removeItem(REMEMBER_EMAIL_KEY);
      }
    } catch {
      // Ignore storage failures gracefully
    }

    return session;
  },

  async logout(): Promise<void> {
    try {
      window.localStorage.removeItem(SESSION_KEY);
      window.sessionStorage.removeItem(SESSION_KEY);
    } catch {
      // Ignore storage failures gracefully
    }
  },

  getCurrentSession(): AuthSession | null {
    try {
      const raw =
        window.sessionStorage.getItem(SESSION_KEY) ?? window.localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as AuthSession;
      if (!parsed?.sessionId || !parsed?.user?.email) return null;
      return parsed;
    } catch {
      return null;
    }
  },

  async requestPasswordReset(email: string): Promise<{ sent: boolean }> {
    await delay(250);
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      throw new Error('INVALID_EMAIL');
    }
    return { sent: true };
  },
};

export function getRememberedAdminEmail(): string {
  try {
    return window.localStorage.getItem(REMEMBER_EMAIL_KEY) ?? '';
  } catch {
    return '';
  }
}
