import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';
import i18n from '@/locales/i18n';
import {
  resetTestBackendState,
  testAuthService,
  testNotificationService,
  testRegistrationService,
  testSettingsService,
  testSpecializationService,
} from '@/test/mockBackendServices';

vi.mock('@/services/auth/authService', () => ({
  authService: testAuthService,
  getRememberedAdminEmail: () => '',
}));

vi.mock('@/services/specializations/specializationService', () => ({
  specializationService: testSpecializationService,
}));

vi.mock('@/services/registrations/registrationService', () => ({
  registrationService: testRegistrationService,
}));

vi.mock('@/services/settings/settingsService', () => ({
  settingsService: testSettingsService,
}));

vi.mock('@/services/notifications/notificationService', () => ({
  notificationService: testNotificationService,
}));

vi.mock('@/services/storage/storageService', () => ({
  storageService: {
    validateLogoFile: vi.fn(),
    uploadClubLogo: vi.fn().mockResolvedValue({
      publicUrl: 'https://example.supabase.co/storage/v1/object/public/club-logos/test.png',
      path: 'logos/test.png',
    }),
    deleteClubLogo: vi.fn().mockResolvedValue(undefined),
  },
}));

beforeEach(async () => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  resetTestBackendState();
  await i18n.changeLanguage('ar');
});

afterEach(() => {
  cleanup();
});
