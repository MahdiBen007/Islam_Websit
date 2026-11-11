import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { Language } from '@/types/domain';

export function useLanguage() {
  const { t, i18n } = useTranslation();
  const language: Language = i18n.language === 'en' ? 'en' : 'ar';
  const isRtl = language === 'ar';

  const setLanguage = useCallback(
    (nextLang: Language) => {
      void i18n.changeLanguage(nextLang);
    },
    [i18n],
  );

  const toggleLanguage = useCallback(() => {
    void i18n.changeLanguage(language === 'ar' ? 'en' : 'ar');
  }, [i18n, language]);

  return {
    t,
    language,
    isRtl,
    setLanguage,
    toggleLanguage,
  };
}
