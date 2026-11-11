import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';
import i18n from '@/locales/i18n';
import { mockRepository } from '@/services/storage/mockRepository';

beforeEach(async () => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  mockRepository.resetAllDemoData();
  await i18n.changeLanguage('ar');
});

afterEach(() => {
  cleanup();
});
