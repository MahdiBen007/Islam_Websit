import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Mail, Menu, Sparkles, X } from 'lucide-react';
import { ClubLogo } from '@/components/common/ClubLogo';
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher';
import { useAppData } from '@/app/providers/AppDataProvider';
import { useLanguage } from '@/hooks/useLanguage';

interface PublicHeaderProps {
  variant?: 'landing' | 'success';
  onOpenRegistration?: () => void;
}

export function PublicHeader({ variant = 'landing', onOpenRegistration }: PublicHeaderProps) {
  const { eventSettings } = useAppData();
  const { language, t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const clubName = language === 'ar' ? eventSettings.clubNameAr : eventSettings.clubNameEn;
  const clubSubtitle =
    language === 'ar' ? eventSettings.clubSubtitleAr : eventSettings.clubSubtitleEn;

  const isHomePage = location.pathname === '/';

  const navItems = [
    { key: 'home', label: t('nav.home'), href: isHomePage ? '#home' : '/' },
    { key: 'aboutClub', label: t('nav.aboutClub'), href: isHomePage ? '#about-club' : '/#about-club' },
    { key: 'event', label: t('nav.event'), href: isHomePage ? '#about-event' : '/#about-event' },
    {
      key: 'registration',
      label: t('nav.registration'),
      href: isHomePage ? '#registration' : '/?register=1',
    },
  ];

  return (
    <header className="sticky top-0 w-full z-40 bg-surface-container-lowest/95 backdrop-blur-md shadow-[0_4px_20px_rgba(18,54,92,0.07)] border-b border-outline-variant/50">
      {/* Top Brand Accent Bar */}
      <div
        className="h-1 w-full bg-gradient-to-r from-[#12365C] via-[#1769B5] to-[#F5C928]"
        aria-hidden="true"
      />

      <div className="h-[62px] sm:h-[74px] max-w-[1200px] mx-auto px-3.5 sm:px-6 flex items-center justify-between gap-2 sm:gap-3">
        {/* Club Brand Lockup */}
        <Link to="/" className="flex items-center gap-2 sm:gap-3 min-w-0 group">
          <div className="p-0.5 rounded-lg sm:rounded-xl bg-surface-container-low border border-outline-variant/40 shadow-2xs shrink-0">
            <ClubLogo size="md" className="w-9 h-9 sm:w-11 sm:h-11 rounded-md sm:rounded-lg bg-transparent p-0" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm sm:text-lg text-primary font-bold leading-snug truncate group-hover:text-secondary transition-colors">
              {clubName}
            </span>
            <span className="text-[10.5px] sm:text-xs text-secondary font-medium truncate">
              {clubSubtitle}
            </span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav aria-label="Main navigation" className="hidden md:flex items-center gap-1.5 lg:gap-2">
          {navItems.map((item, idx) =>
            item.key === 'registration' && isHomePage && onOpenRegistration ? (
              <button
                key={item.key}
                type="button"
                onClick={onOpenRegistration}
                className="px-3.5 py-2 rounded-lg type-label-md transition-all whitespace-nowrap text-on-surface-variant hover:text-secondary hover:bg-surface-container-low cursor-pointer"
              >
                {item.label}
              </button>
            ) : item.href.startsWith('#') ? (
              <a
                key={item.key}
                href={item.href}
                className={`px-3.5 py-2 rounded-lg type-label-md transition-all whitespace-nowrap ${
                  idx === 0
                    ? 'text-secondary bg-secondary-fixed/70 font-bold'
                    : 'text-on-surface-variant hover:text-secondary hover:bg-surface-container-low'
                }`}
              >
                {item.label}
              </a>
            ) : (
              <Link
                key={item.key}
                to={item.href}
                className={`px-3.5 py-2 rounded-lg type-label-md transition-all whitespace-nowrap ${
                  idx === 0
                    ? 'text-secondary bg-secondary-fixed/70 font-bold'
                    : 'text-on-surface-variant hover:text-secondary hover:bg-surface-container-low'
                }`}
              >
                {item.label}
              </Link>
            ),
          )}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <LanguageSwitcher />

          {variant === 'landing' ? (
            <button
              type="button"
              onClick={onOpenRegistration}
              data-testid="header-register-btn"
              className="hidden sm:inline-flex items-center justify-center gap-1.5 type-label-md font-bold bg-[#F5C928] text-[#12365C] hover:bg-[#eab814] px-5 py-2.5 rounded-lg shadow-[0_4px_14px_rgba(245,201,40,0.4)] hover:-translate-y-0.5 transition-all whitespace-nowrap cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-[#12365C]" aria-hidden="true" />
              <span>{t('nav.registerNow')}</span>
            </button>
          ) : (
            <a
              href="#footer-contact"
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-on-primary hover:bg-secondary type-label-md transition-colors whitespace-nowrap"
            >
              <Mail className="w-4 h-4" aria-hidden="true" />
              <span>{t('nav.contactUs')}</span>
            </a>
          )}

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
            className="md:hidden p-2 rounded-lg text-primary bg-surface-container-low hover:bg-surface-container border border-outline-variant/40 transition-colors cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-surface-container-lowest border-t border-outline-variant/40 px-4 py-4 shadow-lg">
          <nav aria-label="Mobile navigation" className="flex flex-col gap-1.5">
            {navItems.map((item) =>
              item.key === 'registration' && isHomePage && onOpenRegistration ? (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenRegistration();
                  }}
                  className="text-start px-4 py-2.5 rounded-lg type-label-lg text-on-surface hover:bg-surface-container-low hover:text-secondary transition-colors cursor-pointer"
                >
                  {item.label}
                </button>
              ) : item.href.startsWith('#') ? (
                <a
                  key={item.key}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-4 py-2.5 rounded-lg type-label-lg text-on-surface hover:bg-surface-container-low hover:text-secondary transition-colors"
                >
                  {item.label}
                </a>
              ) : (
                <Link
                  key={item.key}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-4 py-2.5 rounded-lg type-label-lg text-on-surface hover:bg-surface-container-low hover:text-secondary transition-colors"
                >
                  {item.label}
                </Link>
              ),
            )}
            {variant === 'landing' && (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenRegistration?.();
                }}
                className="mt-2 inline-flex items-center justify-center gap-2 type-label-lg font-bold bg-[#F5C928] text-[#12365C] px-5 py-3 rounded-lg shadow-sm cursor-pointer"
              >
                <Sparkles className="w-4 h-4" aria-hidden="true" />
                <span>{t('nav.registerNow')}</span>
              </button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
