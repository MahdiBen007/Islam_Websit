import {
  Building2,
  Calendar,
  Clapperboard,
  Clock,
  GraduationCap,
  Target,
  UserCheck,
  Users,
} from 'lucide-react';
import { useAppData } from '@/app/providers/AppDataProvider';
import { useLanguage } from '@/hooks/useLanguage';
import { INITIAL_EVENT_SETTINGS } from '@/services/storage/mockSeedData';

export function AboutEventSection() {
  const { eventSettings, pageSettings } = useAppData();
  const { language, t } = useLanguage();

  if (!pageSettings.showAboutSection) return null;

  const eventDate = language === 'ar' ? eventSettings.dateAr : eventSettings.dateEn;
  const eventTime = language === 'ar' ? eventSettings.timeAr : eventSettings.timeEn;
  const eventLocation =
    language === 'ar' ? eventSettings.locationAr : eventSettings.locationEn;
  const organizerName =
    language === 'ar' ? eventSettings.organizerAr : eventSettings.organizerEn;

  const metaItems = [
    {
      label: t('event.dateLabel'),
      value: eventDate,
      icon: Calendar,
      iconClass: 'bg-[#DBEAFE] text-[#1769B5]',
      valueClass: 'text-[#12365C]',
    },
    {
      label: t('event.timeLabel'),
      value: eventTime,
      icon: Clock,
      iconClass: 'bg-[#FEF3C7] text-[#b47800]',
      valueClass: 'text-[#12365C]',
    },
    {
      label: t('event.locationLabel'),
      value: eventLocation,
      icon: Building2,
      iconClass: 'bg-[#E2ECFA] text-[#12365C]',
      valueClass: 'text-[#12365C]',
    },
    {
      label: t('event.statusLabel'),
      value: pageSettings.isRegistrationOpen ? t('event.statusOpen') : t('event.statusClosed'),
      icon: UserCheck,
      iconClass: pageSettings.isRegistrationOpen
        ? 'bg-[#DCFCE7] text-[#15803D]'
        : 'bg-error-container text-error',
      valueClass: pageSettings.isRegistrationOpen ? 'text-[#1769B5]' : 'text-error',
    },
  ];

  const pillars = [
    {
      id: 'goal',
      index: '01',
      title: t('event.pillars.goalTitle'),
      desc: t('event.pillars.goalDesc'),
      icon: Target,
      iconWrapper: 'bg-[#12365C] text-white shadow-sm',
      accentBorder: 'group-hover:border-[#12365C]/40',
      badgeClass: 'text-[#12365C] bg-[#12365C]/8',
    },
    {
      id: 'audience',
      index: '02',
      title: t('event.pillars.audienceTitle'),
      desc: t('event.pillars.audienceDesc'),
      icon: Users,
      iconWrapper: 'bg-[#1769B5] text-white shadow-sm',
      accentBorder: 'group-hover:border-[#1769B5]/40',
      badgeClass: 'text-[#1769B5] bg-[#1769B5]/10',
    },
    {
      id: 'tool',
      index: '03',
      title: t('event.pillars.toolTitle'),
      desc: t('event.pillars.toolDesc'),
      icon: Clapperboard,
      iconWrapper: 'bg-[#F5C928] text-[#12365C] shadow-sm',
      accentBorder: 'group-hover:border-[#F5C928]/70',
      badgeClass: 'text-[#855800] bg-[#FEF3C7]',
    },
    {
      id: 'organizer',
      index: '04',
      title: t('event.pillars.organizerTitle'),
      desc:
        organizerName === INITIAL_EVENT_SETTINGS.organizerAr ||
        organizerName === INITIAL_EVENT_SETTINGS.organizerEn
          ? t('event.pillars.organizerDesc')
          : `${organizerName} — ${t('event.pillars.organizerDesc')}`,
      icon: GraduationCap,
      iconWrapper: 'bg-[#12365C] text-[#F5C928] shadow-sm',
      accentBorder: 'group-hover:border-[#1769B5]/40',
      badgeClass: 'text-[#12365C] bg-[#E8F0FA]',
    },
  ];

  return (
    <section id="about-event" className="w-full py-7 sm:py-10 md:py-12 bg-[#ECF3FB]">
      <div className="max-w-[1160px] mx-auto px-3.5 sm:px-6">
        {/* Section Header */}
        <div className="flex flex-col items-center text-center max-w-2xl mx-auto mb-5 sm:mb-7">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#1769B5]/12 text-[#1769B5] font-bold type-label-sm mb-2">
            {t('event.badge')}
          </div>
          <h2 className="text-2xl sm:type-headline-lg font-bold text-[#12365C] mb-1 sm:mb-1.5">
            {t('event.title')}
          </h2>
          <p className="hidden sm:block text-sm sm:type-body-md text-[#475569]">
            {t('event.subtitle')}
          </p>
        </div>

        {/* Structured Event Meta Strip (2x2 clean grid on mobile, 4-col bar on desktop) */}
        <div className="w-full rounded-xl shadow-[0_6px_20px_-10px_rgba(18,54,92,0.1)] border border-[#D4E2F4] mb-5 sm:mb-7 overflow-hidden grid grid-cols-2 lg:grid-cols-4 gap-px bg-[#E5EEF8]">
          {metaItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="bg-white px-3 py-3 sm:px-4 sm:py-3.5 flex items-start sm:items-center gap-2.5 sm:gap-3"
              >
                <div
                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center shrink-0 ${item.iconClass}`}
                >
                  <Icon className="w-4 h-4" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <span className="text-[11px] sm:text-xs text-[#64748B] block">{item.label}</span>
                  <span className={`text-[12.5px] sm:text-sm font-bold block leading-snug ${item.valueClass}`}>
                    {item.value}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* 4 Architectural Pillar Cards */}
        <div id="about-club" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {pillars.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <article
                key={pillar.id}
                className={`group relative overflow-hidden bg-white rounded-xl p-4 sm:p-5 shadow-[0_4px_16px_-8px_rgba(18,54,92,0.1)] border border-[#D4E2F4] hover:-translate-y-0.5 hover:shadow-[0_12px_26px_-10px_rgba(23,105,181,0.18)] transition-all duration-200 flex flex-col text-start ${pillar.accentBorder}`}
              >
                <div className="flex items-center justify-between gap-2.5 mb-2.5 sm:mb-3">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center transition-transform duration-200 group-hover:scale-105 ${pillar.iconWrapper}`}
                  >
                    <Icon className="w-[18px] h-[18px]" aria-hidden="true" />
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-bold ${pillar.badgeClass}`}
                  >
                    {pillar.index}
                  </span>
                </div>

                <h3 className="text-[15px] sm:text-base text-[#12365C] font-bold mb-1 sm:mb-1.5 leading-snug">
                  {pillar.title}
                </h3>
                <p className="text-[13px] sm:text-[13.5px] text-[#475569] leading-relaxed">
                  {pillar.desc}
                </p>

                <span
                  className="absolute bottom-0 inset-x-0 h-0.5 bg-transparent group-hover:bg-[#F5C928] transition-colors duration-200"
                  aria-hidden="true"
                />
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
