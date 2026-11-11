import {
  TEST_EVENT_SETTINGS,
  TEST_NOTIFICATIONS,
  TEST_PAGE_SETTINGS,
  TEST_REGISTRATIONS,
  TEST_SPECIALIZATIONS,
  TEST_SYSTEM_SETTINGS,
} from '@/test/fixtures';
import type {
  AdminNotification,
  AuthSession,
  CreateRegistrationInput,
  EventSettings,
  PageCustomizationSettings,
  RegistrationStats,
  RegistrationStatus,
  Specialization,
  StudentRegistration,
  SystemSettings,
  UpdateRegistrationInput,
} from '@/types/domain';
import type {
  AuthStateChangeEvent,
  PaginatedRegistrationsQuery,
  PaginatedRegistrationsResult,
} from '@/services/api/types';
import { appDataEvents } from '@/services/api/dataSync';
import { AppServiceError } from '@/services/api/errors';
import { isWithinDateFilter, normalizeInstagramHandle } from '@/utils/formatters';

export const TEST_ADMIN_EMAIL = 'test-admin@vitest.local';
export const TEST_ADMIN_PASSWORD = 'vitest-fixture-pass';

let state = {
  registrations: structuredClone(TEST_REGISTRATIONS),
  specializations: structuredClone(TEST_SPECIALIZATIONS),
  eventSettings: structuredClone(TEST_EVENT_SETTINGS),
  pageSettings: structuredClone(TEST_PAGE_SETTINGS),
  systemSettings: structuredClone(TEST_SYSTEM_SETTINGS),
  notifications: structuredClone(TEST_NOTIFICATIONS),
  session: null as AuthSession | null,
  seq: 1251,
};

const authListeners = new Set<(change: AuthStateChangeEvent) => void>();

export function resetTestBackendState() {
  state = {
    registrations: structuredClone(TEST_REGISTRATIONS),
    specializations: structuredClone(TEST_SPECIALIZATIONS),
    eventSettings: structuredClone(TEST_EVENT_SETTINGS),
    pageSettings: structuredClone(TEST_PAGE_SETTINGS),
    systemSettings: structuredClone(TEST_SYSTEM_SETTINGS),
    notifications: structuredClone(TEST_NOTIFICATIONS),
    session: null,
    seq: 1251,
  };
}

export const testAuthService = {
  async login(email: string, password: string, rememberMe: boolean): Promise<AuthSession> {
    if (email.trim().toLowerCase() !== TEST_ADMIN_EMAIL || password !== TEST_ADMIN_PASSWORD) {
      throw new AppServiceError('INVALID_CREDENTIALS', 'Invalid credentials', 401);
    }
    const session: AuthSession = {
      sessionId: 'test-session-id',
      user: {
        id: 'test-admin-id',
        email: TEST_ADMIN_EMAIL,
        nameAr: 'مشرف الاختبار',
        nameEn: 'Test Admin',
        roleAr: 'مدير النظام',
        roleEn: 'System Admin',
      },
      authenticatedAt: new Date().toISOString(),
      rememberMe,
    };
    state.session = session;
    authListeners.forEach((cb) => cb({ event: 'SIGNED_IN', session }));
    return session;
  },
  async logout(): Promise<void> {
    state.session = null;
    authListeners.forEach((cb) => cb({ event: 'SIGNED_OUT', session: null }));
  },
  getCurrentSession(): AuthSession | null {
    return state.session;
  },
  async restoreSession(): Promise<AuthSession | null> {
    return state.session;
  },
  onAuthStateChange(cb: (change: AuthStateChangeEvent) => void) {
    authListeners.add(cb);
    return () => {
      authListeners.delete(cb);
    };
  },
  async requestPasswordReset(): Promise<{ sent: boolean }> {
    return { sent: true };
  },
  async updatePassword(): Promise<void> {},
};

export const testSpecializationService = {
  async list(includeInactive = false): Promise<Specialization[]> {
    return includeInactive ? state.specializations : state.specializations.filter((s) => s.isActive);
  },
  async getRegistrationCounts(): Promise<Record<string, number>> {
    const counts: Record<string, number> = {};
    state.registrations.forEach((r) => {
      counts[r.specializationId] = (counts[r.specializationId] ?? 0) + 1;
    });
    return counts;
  },
  async create(input: Omit<Specialization, 'id' | 'createdAt' | 'updatedAt'>): Promise<Specialization> {
    const now = new Date().toISOString();
    const created: Specialization = {
      ...input,
      id: `spec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: now,
      updatedAt: now,
    };
    state.specializations = [...state.specializations, created];
    appDataEvents.notify();
    return created;
  },
  async update(
    id: string,
    input: Partial<Omit<Specialization, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<Specialization> {
    let updated: Specialization | undefined;
    state.specializations = state.specializations.map((s) => {
      if (s.id !== id) return s;
      updated = { ...s, ...input, updatedAt: new Date().toISOString() };
      return updated;
    });
    if (!updated) throw new AppServiceError('UNKNOWN_ERROR', 'Not found');
    appDataEvents.notify();
    return updated;
  },
  async toggleActive(id: string): Promise<Specialization> {
    const target = state.specializations.find((s) => s.id === id);
    if (!target) throw new AppServiceError('UNKNOWN_ERROR', 'Not found');
    return this.update(id, { isActive: !target.isActive });
  },
  async remove(id: string): Promise<void> {
    state.specializations = state.specializations.filter((s) => s.id !== id);
    appDataEvents.notify();
  },
};

export const testRegistrationService = {
  async list(): Promise<StudentRegistration[]> {
    return state.registrations;
  },
  async listPaginated(query: PaginatedRegistrationsQuery = {}): Promise<PaginatedRegistrationsResult> {
    const q = (query.search ?? '').trim().toLowerCase();
    const filtered = state.registrations.filter((reg) => {
      if (q) {
        const fullName = `${reg.firstName} ${reg.lastName}`.toLowerCase();
        if (
          !fullName.includes(q) &&
          !reg.instagramHandle.toLowerCase().includes(q) &&
          !reg.referenceId.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      if (query.specializationId && reg.specializationId !== query.specializationId) return false;
      if (query.status && reg.status !== query.status) return false;
      if (query.dateFilter && !isWithinDateFilter(reg.createdAt, query.dateFilter)) return false;
      return true;
    });
    const pageSize = query.pageSize ?? 10;
    const page = query.page ?? 1;
    const start = (page - 1) * pageSize;
    return {
      items: filtered.slice(start, start + pageSize),
      totalCount: filtered.length,
      page,
      pageSize,
    };
  },
  async getById(id: string): Promise<StudentRegistration | undefined> {
    return state.registrations.find((r) => r.id === id);
  },
  async getByReferenceId(referenceId: string): Promise<StudentRegistration | undefined> {
    return state.registrations.find(
      (r) => r.referenceId.toLowerCase() === referenceId.trim().toLowerCase(),
    );
  },
  async getStats(): Promise<RegistrationStats> {
    const all = state.registrations;
    const approved = all.filter((r) => r.status === 'approved').length;
    const capacity = state.eventSettings.capacity;
    return {
      total: all.length,
      newCount: all.filter((r) => r.status === 'new').length,
      pending: all.filter((r) => r.status === 'pending' || r.status === 'new').length,
      approved,
      rejected: all.filter((r) => r.status === 'rejected').length,
      capacity,
      remainingSeats: Math.max(0, capacity - approved),
    };
  },
  async create(input: CreateRegistrationInput): Promise<StudentRegistration> {
    if (input.website && input.website.trim().length > 0) {
      throw new AppServiceError('BOT_DETECTED', 'Bot detected', 400);
    }
    if (!state.pageSettings.isRegistrationOpen) {
      throw new AppServiceError('REGISTRATION_CLOSED', 'Closed', 403);
    }
    const spec = state.specializations.find((s) => s.id === input.specializationId);
    if (!spec || !spec.isActive) {
      throw new AppServiceError('SPECIALIZATION_UNAVAILABLE', 'Invalid specialization', 400);
    }
    const cleanHandle = normalizeInstagramHandle(input.instagramHandle).toLowerCase();
    const cleanDigits = (input.phone ?? '').replace(/\D/g, '');
    const duplicate = state.registrations.some(
      (r) =>
        r.status !== 'rejected' &&
        (r.instagramHandle.toLowerCase() === cleanHandle ||
          (cleanDigits.length >= 8 && (r.phone ?? '').replace(/\D/g, '') === cleanDigits)),
    );
    if (duplicate) {
      throw new AppServiceError('DUPLICATE_REGISTRATION', 'Duplicate', 409);
    }
    const num = String(state.seq++).padStart(6, '0');
    const now = new Date().toISOString();
    const created: StudentRegistration = {
      id: `reg-${Date.now()}`,
      referenceId: `REG-${num}`,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      phone: input.phone?.trim(),
      specializationId: spec.id,
      specializationNameAr: spec.nameAr,
      specializationNameEn: spec.nameEn,
      instagramHandle: cleanHandle,
      status: 'new',
      confirmedAttendance: input.confirmedAttendance,
      createdAt: now,
      updatedAt: now,
    };
    state.registrations = [created, ...state.registrations];
    appDataEvents.notify();
    return created;
  },
  async createByAdmin(
    input: CreateRegistrationInput & {
      status?: RegistrationStatus;
      university?: string;
      email?: string;
    },
  ): Promise<StudentRegistration> {
    const spec = state.specializations.find((s) => s.id === input.specializationId);
    const num = String(state.seq++).padStart(6, '0');
    const now = new Date().toISOString();
    const created: StudentRegistration = {
      id: `reg-${Date.now()}`,
      referenceId: `REG-${num}`,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      phone: input.phone?.trim(),
      university: input.university,
      email: input.email,
      specializationId: input.specializationId,
      specializationNameAr: spec?.nameAr ?? '',
      specializationNameEn: spec?.nameEn ?? '',
      instagramHandle: normalizeInstagramHandle(input.instagramHandle).toLowerCase(),
      status: input.status ?? 'pending',
      confirmedAttendance: true,
      createdAt: now,
      updatedAt: now,
    };
    state.registrations = [created, ...state.registrations];
    appDataEvents.notify();
    return created;
  },
  async update(id: string, input: UpdateRegistrationInput): Promise<StudentRegistration> {
    let updated: StudentRegistration | undefined;
    state.registrations = state.registrations.map((r) => {
      if (r.id !== id) return r;
      const spec = input.specializationId
        ? state.specializations.find((s) => s.id === input.specializationId)
        : undefined;
      updated = {
        ...r,
        ...input,
        specializationNameAr: spec?.nameAr ?? r.specializationNameAr,
        specializationNameEn: spec?.nameEn ?? r.specializationNameEn,
        updatedAt: new Date().toISOString(),
      };
      return updated;
    });
    if (!updated) throw new AppServiceError('UNKNOWN_ERROR', 'Not found');
    appDataEvents.notify();
    return updated;
  },
  async updateStatus(id: string, status: RegistrationStatus): Promise<StudentRegistration> {
    return this.update(id, { status });
  },
  async bulkUpdateStatus(ids: string[], status: RegistrationStatus): Promise<void> {
    const idSet = new Set(ids);
    state.registrations = state.registrations.map((r) =>
      idSet.has(r.id) ? { ...r, status, updatedAt: new Date().toISOString() } : r,
    );
    appDataEvents.notify();
  },
  async remove(id: string): Promise<void> {
    state.registrations = state.registrations.filter((r) => r.id !== id);
    appDataEvents.notify();
  },
  async bulkRemove(ids: string[]): Promise<void> {
    const idSet = new Set(ids);
    state.registrations = state.registrations.filter((r) => !idSet.has(r.id));
    appDataEvents.notify();
  },
};

export const testSettingsService = {
  async getEventSettings(): Promise<EventSettings> {
    return state.eventSettings;
  },
  async updateEventSettings(settings: EventSettings): Promise<EventSettings> {
    state.eventSettings = settings;
    appDataEvents.notify();
    return settings;
  },
  async getPageSettings(): Promise<PageCustomizationSettings> {
    return state.pageSettings;
  },
  async updatePageSettings(settings: PageCustomizationSettings): Promise<PageCustomizationSettings> {
    state.pageSettings = settings;
    state.eventSettings = {
      ...state.eventSettings,
    };
    appDataEvents.notify();
    return settings;
  },
  async getSystemSettings(): Promise<SystemSettings> {
    return state.systemSettings;
  },
  async updateSystemSettings(settings: SystemSettings): Promise<SystemSettings> {
    state.systemSettings = settings;
    return settings;
  },
  async resetDemoData(): Promise<void> {
    resetTestBackendState();
    appDataEvents.notify();
  },
};

export const testNotificationService = {
  async list(): Promise<AdminNotification[]> {
    return state.notifications;
  },
  async markAsRead(id: string): Promise<void> {
    state.notifications = state.notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n));
    appDataEvents.notify();
  },
  async markAllAsRead(): Promise<void> {
    state.notifications = state.notifications.map((n) => ({ ...n, isRead: true }));
    appDataEvents.notify();
  },
};
