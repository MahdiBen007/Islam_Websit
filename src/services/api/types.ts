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

export interface PaginatedRegistrationsQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  specializationId?: string;
  status?: '' | RegistrationStatus;
  dateFilter?: 'all' | 'today' | 'week' | 'month';
}

export interface PaginatedRegistrationsResult {
  items: StudentRegistration[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface IRegistrationService {
  list(): Promise<StudentRegistration[]>;
  listPaginated(query: PaginatedRegistrationsQuery): Promise<PaginatedRegistrationsResult>;
  getById(id: string): Promise<StudentRegistration | undefined>;
  getByReferenceId(referenceId: string): Promise<StudentRegistration | undefined>;
  getStats(): Promise<RegistrationStats>;
  create(input: CreateRegistrationInput): Promise<StudentRegistration>;
  createByAdmin(
    input: CreateRegistrationInput & {
      status?: RegistrationStatus;
      university?: string;
      email?: string;
    },
  ): Promise<StudentRegistration>;
  update(id: string, input: UpdateRegistrationInput): Promise<StudentRegistration>;
  updateStatus(id: string, status: RegistrationStatus): Promise<StudentRegistration>;
  bulkUpdateStatus(ids: string[], status: RegistrationStatus): Promise<void>;
  remove(id: string): Promise<void>;
  bulkRemove(ids: string[]): Promise<void>;
}

export interface ISpecializationService {
  list(includeInactive?: boolean): Promise<Specialization[]>;
  getRegistrationCounts(): Promise<Record<string, number>>;
  create(
    input: Omit<Specialization, 'id' | 'createdAt' | 'updatedAt'> & {
      description?: string;
      displayOrder?: number;
    },
  ): Promise<Specialization>;
  update(
    id: string,
    input: Partial<Omit<Specialization, 'id' | 'createdAt' | 'updatedAt'>> & {
      description?: string;
      displayOrder?: number;
    },
  ): Promise<Specialization>;
  toggleActive(id: string): Promise<Specialization>;
  remove(id: string): Promise<void>;
}

export interface ISettingsService {
  getEventSettings(): Promise<EventSettings>;
  updateEventSettings(settings: EventSettings): Promise<EventSettings>;
  getPageSettings(): Promise<PageCustomizationSettings>;
  updatePageSettings(settings: PageCustomizationSettings): Promise<PageCustomizationSettings>;
  getSystemSettings(): Promise<SystemSettings>;
  updateSystemSettings(settings: SystemSettings): Promise<SystemSettings>;
}

export interface AuthStateChangeEvent {
  event: 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED' | 'PASSWORD_RECOVERY' | 'USER_UPDATED';
  session: AuthSession | null;
}

export interface IAuthService {
  login(email: string, password: string, rememberMe: boolean): Promise<AuthSession>;
  logout(): Promise<void>;
  getCurrentSession(): AuthSession | null;
  restoreSession(): Promise<AuthSession | null>;
  onAuthStateChange(callback: (change: AuthStateChangeEvent) => void): () => void;
  requestPasswordReset(email: string): Promise<{ sent: boolean }>;
  updatePassword(newPassword: string): Promise<void>;
}

export interface INotificationService {
  list(): Promise<AdminNotification[]>;
  markAsRead(id: string): Promise<void>;
  markAllAsRead(): Promise<void>;
}
