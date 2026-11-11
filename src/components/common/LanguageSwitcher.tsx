import { Globe } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

interface LanguageSwitcherProps {
  className?: string;
  compact?: boolean;
}

export function LanguageSwitcher({ className = '', compact = false }: LanguageSwitcherProps) {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div
      role="group"
      aria-label={t('common.languageLabel')}
      className={`inline-flex items-center rounded-lg bg-surface-container-low p-1 border border-outline-variant/60 ${className}`}
    >
      <button
        type="button"
        onClick={() => setLanguage('ar')}
        aria-pressed={language === 'ar'}
        data-testid="lang-btn-ar"
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md type-label-sm transition-all cursor-pointer ${
          language === 'ar'
            ? 'bg-surface-container-lowest text-primary font-bold shadow-xs ring-1 ring-outline-variant/40'
            : 'text-on-surface-variant hover:text-primary'
        }`}
      >
        {!compact && (
          <Globe className="hidden sm:inline-block w-3.5 h-3.5 text-secondary" aria-hidden="true" />
        )}
        <span>العربية</span>
      </button>
      <button
        type="button"
        onClick={() => setLanguage('en')}
        aria-pressed={language === 'en'}
        data-testid="lang-btn-en"
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md type-label-sm transition-all cursor-pointer ${
          language === 'en'
            ? 'bg-surface-container-lowest text-primary font-bold shadow-xs ring-1 ring-outline-variant/40'
            : 'text-on-surface-variant hover:text-primary'
        }`}
      >
        <span>
          <span className="sm:hidden">EN</span>
          <span className="hidden sm:inline">English</span>
        </span>
      </button>
    </div>
  );
}
