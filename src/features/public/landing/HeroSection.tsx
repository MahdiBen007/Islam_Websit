import { Award, BadgeCheck, CheckCircle2, Clock, Compass, Lightbulb } from 'lucide-react';
import heroIllustration from '@/assets/hero-illustration.jpg';
import { DirectionalArrow } from '@/components/common/DirectionalArrow';
import { useAppData } from '@/app/providers/AppDataProvider';
import { useLanguage } from '@/hooks/useLanguage';

interface HeroSectionProps {
  onOpenRegistration: () => void;
}

export function HeroSection({ onOpenRegistration }: HeroSectionProps) {
  const { eventSettings, pageSettings } = useAppData();
  const { language, t } = useLanguage();

  const clubName = language === 'ar' ? eventSettings.clubNameAr : eventSettings.clubNameEn;
  const heroBadge = language === 'ar' ? pageSettings.heroBadgeAr : pageSettings.heroBadgeEn;
  const heroHeadline =
    language === 'ar' ? pageSettings.heroHeadlineAr : pageSettings.heroHeadlineEn;
  const heroDescription =
    language === 'ar' ? pageSettings.heroDescriptionAr : pageSettings.heroDescriptionEn;
  const ctaText =
    language === 'ar' ? pageSettings.ctaButtonTextAr : pageSettings.ctaButtonTextEn;

  const metrics = [
    {
      value: t('hero.metric1Value'),
      label: t('hero.metric1Label'),
      icon: CheckCircle2,
      iconClass: 'bg-[#12365C]/10 text-[#12365C]',
    },
    {
      value: t('hero.metric2Value'),
      label: t('hero.metric2Label'),
      icon: Clock,
      iconClass: 'bg-[#1769B5]/12 text-[#1769B5]',
    },
    {
      value: t('hero.metric3Value'),
      label: t('hero.metric3Label'),
      icon: Award,
      iconClass: 'bg-[#F5C928]/25 text-[#12365C]',
    },
  ];

  return (
    <section
      id="home"
      className="relative w-full overflow-hidden py-6 sm:py-10 md:py-14 bg-gradient-to-br from-[#EAF2FC] via-[#F6FAFF] to-[#E3EEFA]"
    >
      {/* Subtle Ambient Brand Accents */}
      <div
        className="absolute -top-24 -start-24 w-80 h-80 bg-[#1769B5]/10 rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-24 -end-24 w-80 h-80 bg-[#F5C928]/15 rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-[1200px] mx-auto px-3.5 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-10 items-center">
          {/* Text Column */}
          <div className="lg:col-span-7 flex flex-col items-start text-start">
            {/* Club & Event Badge */}
            <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1 sm:px-4 sm:py-1.5 rounded-full bg-white shadow-xs border border-[#D4E2F4] mb-3.5 sm:mb-5 max-w-full">
              <span
                className="inline-block w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-[#F5C928] ring-3 ring-[#F5C928]/30 animate-pulse shrink-0"
                aria-hidden="true"
              />
              <span className="text-xs sm:type-label-md text-[#1769B5] font-bold truncate">
                {clubName}
              </span>
              <span className="text-outline-variant shrink-0" aria-hidden="true">
                •
              </span>
              <span className="text-xs sm:type-label-md text-[#12365C] font-medium truncate">
                {heroBadge}
              </span>
            </div>

            {/* Hero Headline */}
            <h1 className="text-[27px] leading-[1.28] sm:text-4xl lg:text-[2.65rem] sm:leading-[1.2] font-bold tracking-tight text-[#12365C] mb-3 sm:mb-4 max-w-2xl">
              {heroHeadline}
            </h1>

            {/* Supporting Description */}
            <p className="text-[13.5px] sm:type-body-lg text-[#334155] max-w-xl mb-5 sm:mb-7 leading-relaxed line-clamp-2 sm:line-clamp-none">
              {heroDescription}
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2.5 sm:gap-3.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={onOpenRegistration}
                data-testid="hero-register-btn"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#F5C928] text-[#12365C] font-bold type-label-md sm:type-label-lg px-6 sm:px-8 py-3 sm:py-3.5 rounded-xl shadow-[0_8px_22px_rgba(245,201,40,0.4)] hover:bg-[#eab814] transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
              >
                <span>{ctaText}</span>
                <DirectionalArrow className="w-4 h-4" direction="forward" />
              </button>

              <a
                href="#about-event"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white text-[#1769B5] font-bold type-label-md sm:type-label-lg px-6 py-3 sm:py-3.5 rounded-xl shadow-xs border border-[#1769B5]/30 hover:bg-[#1769B5] hover:text-white transition-all duration-200"
              >
                <span>{t('hero.discoverEvent')}</span>
                <Compass className="w-4 h-4" aria-hidden="true" />
              </a>
            </div>

            {/* Quick Metrics Bar */}
            {pageSettings.showMetricsBar && (
              <div className="mt-5 sm:mt-7 w-full max-w-lg rounded-xl shadow-[0_8px_24px_-10px_rgba(18,54,92,0.12)] border border-[#D4E2F4] overflow-hidden grid grid-cols-3 gap-px bg-[#E4EDF7]">
                {metrics.map((metric) => {
                  const Icon = metric.icon;
                  return (
                    <div
                      key={metric.value}
                      className="bg-white/95 px-2 py-2.5 sm:px-3.5 sm:py-3 flex flex-col sm:flex-row items-center text-center sm:text-start gap-1.5 sm:gap-2.5"
                    >
                      <div
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 ${metric.iconClass}`}
                      >
                        <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[13.5px] sm:text-base text-[#12365C] font-bold whitespace-nowrap leading-tight">
                          {metric.value}
                        </span>
                        <span className="text-[11px] sm:text-xs text-[#52637A] leading-tight">
                          {metric.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Visual / Illustration Column */}
          <div className="lg:col-span-5 relative flex items-center justify-center mt-2 mb-2 lg:my-0">
            <div className="relative w-full max-w-[420px] rounded-xl bg-white p-2 sm:p-3 shadow-[0_18px_40px_-14px_rgba(18,54,92,0.18)] border border-[#D4E2F4]">
              {/* Decorative Ambient Glows */}
              <div
                className="absolute -top-5 -start-5 w-32 h-32 bg-[#F5C928]/35 rounded-full blur-2xl pointer-events-none"
                aria-hidden="true"
              />
              <div
                className="absolute -bottom-6 -end-6 w-36 h-36 bg-[#1769B5]/25 rounded-full blur-2xl pointer-events-none"
                aria-hidden="true"
              />

              {/* Floating Top Badge */}
              <div className="absolute -top-2.5 start-3 sm:-top-3 sm:start-4 z-10 bg-white shadow-sm px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full flex items-center gap-1.5 border border-[#F5C928]/60">
                <Lightbulb className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#d97706]" aria-hidden="true" />
                <span className="text-[11px] sm:text-xs text-[#12365C] font-bold">
                  {t('hero.floatingBadgeTop')}
                </span>
              </div>

              {/* Floating Bottom Badge */}
              <div className="absolute -bottom-2.5 end-3 sm:-bottom-3 sm:end-4 z-10 bg-[#12365C] text-white shadow-md px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-lg flex items-center gap-1.5 border border-[#1769B5]/40">
                <BadgeCheck className="w-3.5 h-3.5 text-[#F5C928]" aria-hidden="true" />
                <span className="text-[11px] sm:text-xs font-medium">
                  {t('hero.floatingBadgeBottom')}
                </span>
              </div>

              <img
                src={heroIllustration}
                alt={t('hero.illustrationAlt')}
                className="w-full h-auto block rounded-lg relative z-0"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
