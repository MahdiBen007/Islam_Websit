import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { arTranslation } from './ar/translation';
import { enTranslation } from './en/translation';
import type { Language } from '@/types/domain';

export const LANGUAGE_STORAGE_KEY = 'cic_language_v1';

export function getInitialLanguage(): Language {
  try {
    const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (saved === 'en' || saved === 'ar') return saved;
  } catch {
    // Ignore storage errors
  }
  return 'ar';
}

export function applyDocumentDirection(lang: Language): void {
  if (typeof document === 'undefined') return;
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.lang = lang;
  document.documentElement.dir = dir;
  document.body.dir = dir;
}

const initialLanguage = getInitialLanguage();
applyDocumentDirection(initialLanguage);

void i18n.use(initReactI18next).init({
  resources: {
    ar: { translation: arTranslation },
    en: { translation: enTranslation },
  },
  lng: initialLanguage,
  fallbackLng: 'ar',
  interpolation: {
    escapeValue: false,
  },
});

i18n.on('languageChanged', (lng) => {
  const normalized: Language = lng === 'en' ? 'en' : 'ar';
  applyDocumentDirection(normalized);
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, normalized);
  } catch {
    // Ignore storage errors
  }
});

export default i18n;
