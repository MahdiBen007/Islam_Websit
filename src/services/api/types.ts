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

export interface IRegistrationService {
  list(): Promise<StudentRegistration[]>;
  getById(id: string): Promise<StudentRegistration | undefined>;
  getByReferenceId(referenceId: string): Promise<StudentRegistration | undefined>;
  getStats(): Promise<RegistrationStats>;
  create(input: CreateRegistrationInput): Promise<StudentRegistration>;
  update(id: string, input: UpdateRegistrationInput): Promise<StudentRegistration>;
  updateStatus(id: string, status: RegistrationStatus): Promise<StudentRegistration>;
  bulkUpdateStatus(ids: string[], status: RegistrationStatus): Promise<void>;
  remove(id: string): Promise<void>;
  bulkRemove(ids: string[]): Promise<void>;
}

export interface ISpecializationService {
  list(includeInactive?: boolean): Promise<Specialization[]>;
  create(input: Omit<Specialization, 'id' | 'createdAt' | 'updatedAt'>): Promise<Specialization>;
  update(
    id: string,
    input: Partial<Omit<Specialization, 'id' | 'createdAt' | 'updatedAt'>>,
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
  resetDemoData(): Promise<void>;
}

export interface IAuthService {
  login(email: string, password: string, rememberMe: boolean): Promise<AuthSession>;
  logout(): Promise<void>;
  getCurrentSession(): AuthSession | null;
  requestPasswordReset(email: string): Promise<{ sent: boolean }>;
}

export interface INotificationService {
  list(): Promise<AdminNotification[]>;
  markAsRead(id: string): Promise<void>;
  markAllAsRead(): Promise<void>;
}
