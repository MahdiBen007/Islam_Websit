export type Language = 'ar' | 'en';

export type RegistrationStatus = 'new' | 'pending' | 'approved' | 'rejected';

export interface Specialization {
  id: string;
  nameAr: string;
  nameEn: string;
  icon: 'terminal' | 'engineering' | 'campaign' | 'science' | 'analytics' | 'palette' | 'cpu' | 'book';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StudentRegistration {
  id: string;
  referenceId: string;
  firstName: string;
  lastName: string;
  specializationId: string;
  specializationNameAr: string;
  specializationNameEn: string;
  instagramHandle: string; // Stored normalized with leading @
  university?: string;
  email?: string;
  phone?: string;
  status: RegistrationStatus;
  confirmedAttendance: boolean;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRegistrationInput {
  firstName: string;
  lastName: string;
  specializationId: string;
  instagramHandle: string;
  confirmedAttendance: boolean;
  university?: string;
  email?: string;
  phone?: string;
}

export interface UpdateRegistrationInput {
  firstName?: string;
  lastName?: string;
  specializationId?: string;
  instagramHandle?: string;
  university?: string;
  email?: string;
  phone?: string;
  status?: RegistrationStatus;
  adminNotes?: string;
}

export interface EventSettings {
  clubNameAr: string;
  clubNameEn: string;
  clubSubtitleAr: string;
  clubSubtitleEn: string;
  eventNameAr: string;
  eventNameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  dateAr: string;
  dateEn: string;
  timeAr: string;
  timeEn: string;
  locationAr: string;
  locationEn: string;
  organizerAr: string;
  organizerEn: string;
  organizerSummaryAr: string;
  organizerSummaryEn: string;
  contactEmail: string;
  contactAddressAr: string;
  contactAddressEn: string;
  instagramUrl: string;
  facebookUrl: string;
  capacity: number;
  logoDataUrl: string | null; // null uses official bundled club logo
}

export interface PageCustomizationSettings {
  isRegistrationOpen: boolean;
  heroBadgeAr: string;
  heroBadgeEn: string;
  heroHeadlineAr: string;
  heroHeadlineEn: string;
  heroDescriptionAr: string;
  heroDescriptionEn: string;
  ctaButtonTextAr: string;
  ctaButtonTextEn: string;
  successHeadlineAr: string;
  successHeadlineEn: string;
  successMessageAr: string;
  successMessageEn: string;
  showMetricsBar: boolean;
  showAboutSection: boolean;
  showCapCutBanner: boolean;
  showPrivacyNote: boolean;
}

export interface SystemSettings {
  defaultPublicLanguage: Language;
  defaultAdminLanguage: Language;
  emailNotificationsEnabled: boolean;
  autoConfirmSeatLabel: boolean;
}

/**
 * Authenticated admin user metadata (never stores password or secret credentials).
 */
export interface AdminUser {
  id: string;
  nameAr: string;
  nameEn: string;
  email: string;
  roleAr: string;
  roleEn: string;
}

export interface AuthSession {
  sessionId: string;
  user: AdminUser;
  rememberMe: boolean;
  authenticatedAt: string;
}

export interface AdminNotification {
  id: string;
  titleAr: string;
  titleEn: string;
  messageAr: string;
  messageEn: string;
  isRead: boolean;
  createdAt: string;
  registrationId?: string;
}

export interface RegistrationStats {
  total: number;
  newCount: number;
  pending: number;
  approved: number;
  rejected: number;
  capacity: number;
  remainingSeats: number;
}
