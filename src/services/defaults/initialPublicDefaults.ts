import type {
  EventSettings,
  PageCustomizationSettings,
  RegistrationStats,
  SystemSettings,
} from '@/types/domain';

export const EMPTY_EVENT_SETTINGS: EventSettings = {
  clubNameAr: '',
  clubNameEn: '',
  clubSubtitleAr: '',
  clubSubtitleEn: '',
  eventNameAr: '',
  eventNameEn: '',
  descriptionAr: '',
  descriptionEn: '',
  dateAr: '',
  dateEn: '',
  timeAr: '',
  timeEn: '',
  locationAr: '',
  locationEn: '',
  organizerAr: '',
  organizerEn: '',
  organizerSummaryAr: '',
  organizerSummaryEn: '',
  contactEmail: '',
  contactAddressAr: '',
  contactAddressEn: '',
  instagramUrl: '',
  facebookUrl: '',
  capacity: 0,
  logoDataUrl: null,
};

export const EMPTY_PAGE_SETTINGS: PageCustomizationSettings = {
  isRegistrationOpen: false,
  heroBadgeAr: '',
  heroBadgeEn: '',
  heroHeadlineAr: '',
  heroHeadlineEn: '',
  heroDescriptionAr: '',
  heroDescriptionEn: '',
  ctaButtonTextAr: '',
  ctaButtonTextEn: '',
  successHeadlineAr: '',
  successHeadlineEn: '',
  successMessageAr: '',
  successMessageEn: '',
  showMetricsBar: false,
  showAboutSection: false,
  showCapCutBanner: false,
  showPrivacyNote: false,
};

export const EMPTY_SYSTEM_SETTINGS: SystemSettings = {
  defaultPublicLanguage: 'ar',
  defaultAdminLanguage: 'ar',
  emailNotificationsEnabled: true,
  autoConfirmSeatLabel: true,
};

export const EMPTY_REGISTRATION_STATS: RegistrationStats = {
  total: 0,
  newCount: 0,
  pending: 0,
  approved: 0,
  rejected: 0,
  capacity: 0,
  remainingSeats: 0,
};
