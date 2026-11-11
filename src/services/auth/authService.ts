import type { AuthSession, AdminUser } from '@/types/domain';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { AppServiceError } from '@/services/api/errors';
import type { AuthStateChangeEvent, IAuthService } from '@/services/api/types';

const REMEMBER_EMAIL_KEY = 'cic_admin_remember_email_v1';

let currentSessionCache: AuthSession | null = null;
const inFlightProfileRequests = new Map<string, Promise<AdminUser | null>>();

function mapProfileToAdminUser(profile: {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
}): AdminUser {
  const isSuper = profile.role === 'super_admin';
  return {
    id: profile.id,
    email: profile.email,
    nameAr: profile.full_name,
    nameEn: profile.full_name,
    roleAr: isSuper ? 'المشرف العام للنظام' : 'مشرف إدارة الفعاليات',
    roleEn: isSuper ? 'System Super Administrator' : 'Event Administrator',
  };
}

export function getRememberedAdminEmail(): string {
  try {
    return window.localStorage.getItem(REMEMBER_EMAIL_KEY) ?? '';
  } catch {
    return '';
  }
}

async function fetchActiveAdminProfile(userId: string): Promise<AdminUser | null> {
  const existing = inFlightProfileRequests.get(userId);
  if (existing) return existing;

  const promise = (async (): Promise<AdminUser | null> => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, is_active')
      .eq('id', userId)
      .maybeSingle();

    if (error || !data || !data.is_active || !['admin', 'super_admin'].includes(data.role)) {
      return null;
    }

    return mapProfileToAdminUser(data);
  })().finally(() => {
    inFlightProfileRequests.delete(userId);
  });

  inFlightProfileRequests.set(userId, promise);
  return promise;
}

export const authService: IAuthService = {
  async login(email: string, password: string, rememberMe: boolean): Promise<AuthSession> {
    const supabase = getSupabaseClient();
    const normalizedEmail = email.trim().toLowerCase();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error || !data.session || !data.user) {
      throw new AppServiceError(
        'INVALID_CREDENTIALS',
        error?.message || 'Invalid credentials',
        401,
      );
    }

    const adminProfile = await fetchActiveAdminProfile(data.user.id);
    if (!adminProfile) {
      await supabase.auth.signOut();
      currentSessionCache = null;
      throw new AppServiceError(
        'NOT_AUTHORIZED_ADMIN',
        'Account is not an active administrator.',
        403,
      );
    }

    try {
      if (rememberMe) {
        window.localStorage.setItem(REMEMBER_EMAIL_KEY, normalizedEmail);
      } else {
        window.localStorage.removeItem(REMEMBER_EMAIL_KEY);
      }
    } catch {
      // Ignore storage access errors in private contexts
    }

    const authSession: AuthSession = {
      sessionId: data.session.access_token.slice(-16),
      user: adminProfile,
      authenticatedAt: new Date().toISOString(),
      rememberMe,
    };

    currentSessionCache = authSession;
    return authSession;
  },

  async logout(): Promise<void> {
    currentSessionCache = null;
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
  },

  getCurrentSession(): AuthSession | null {
    return currentSessionCache;
  },

  async restoreSession(): Promise<AuthSession | null> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.auth.getSession();

      if (error || !data.session?.user) {
        currentSessionCache = null;
        return null;
      }

      const adminProfile = await fetchActiveAdminProfile(data.session.user.id);
      if (!adminProfile) {
        await supabase.auth.signOut();
        currentSessionCache = null;
        return null;
      }

      const authSession: AuthSession = {
        sessionId: data.session.access_token.slice(-16),
        user: adminProfile,
        authenticatedAt: new Date(data.session.user.last_sign_in_at ?? Date.now()).toISOString(),
        rememberMe: Boolean(getRememberedAdminEmail()),
      };
      currentSessionCache = authSession;
      return authSession;
    } catch {
      currentSessionCache = null;
      return null;
    }
  },

  onAuthStateChange(callback: (change: AuthStateChangeEvent) => void): () => void {
    const supabase = getSupabaseClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session?.user) {
        currentSessionCache = null;
        callback({ event: 'SIGNED_OUT', session: null });
        return;
      }

      if (event === 'PASSWORD_RECOVERY') {
        void fetchActiveAdminProfile(session.user.id).then((adminProfile) => {
          const mappedSession: AuthSession | null = adminProfile
            ? {
                sessionId: session.access_token.slice(-16),
                user: adminProfile,
                authenticatedAt: new Date().toISOString(),
                rememberMe: Boolean(getRememberedAdminEmail()),
              }
            : null;
          currentSessionCache = mappedSession;
          callback({ event: 'PASSWORD_RECOVERY', session: mappedSession });
        });
        return;
      }

      if (
        event === 'SIGNED_IN' ||
        event === 'TOKEN_REFRESHED' ||
        event === 'USER_UPDATED' ||
        event === 'INITIAL_SESSION'
      ) {
        void fetchActiveAdminProfile(session.user.id).then(async (adminProfile) => {
          if (!adminProfile) {
            await supabase.auth.signOut();
            currentSessionCache = null;
            callback({ event: 'SIGNED_OUT', session: null });
            return;
          }
          const mappedSession: AuthSession = {
            sessionId: session.access_token.slice(-16),
            user: adminProfile,
            authenticatedAt: new Date(session.user.last_sign_in_at ?? Date.now()).toISOString(),
            rememberMe: Boolean(getRememberedAdminEmail()),
          };
          currentSessionCache = mappedSession;
          callback({
            event: event === 'INITIAL_SESSION' ? 'SIGNED_IN' : event,
            session: mappedSession,
          });
        });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  },

  async requestPasswordReset(email: string): Promise<{ sent: boolean }> {
    const supabase = getSupabaseClient();
    const normalizedEmail = email.trim().toLowerCase();
    const redirectTo =
      typeof window !== 'undefined' ? `${window.location.origin}/admin/login` : undefined;

    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo,
    });

    if (error) {
      throw new AppServiceError('UNKNOWN_ERROR', error.message);
    }

    return { sent: true };
  },

  async updatePassword(newPassword: string): Promise<void> {
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      throw new AppServiceError('VALIDATION_ERROR', error.message);
    }
  },
};
