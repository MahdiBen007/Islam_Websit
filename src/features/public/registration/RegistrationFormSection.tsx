import { Calendar, Clapperboard, Lock, MapPin, Sparkles } from 'lucide-react';
import capcutIcon from '@/assets/capcut-icon.svg';
import { DirectionalArrow } from '@/components/common/DirectionalArrow';
import { useAppData } from '@/app/providers/AppDataProvider';
import { useLanguage } from '@/hooks/useLanguage';

interface RegistrationFormSectionProps {
  onOpenModal: () => void;
}

export function RegistrationFormSection({ onOpenModal }: RegistrationFormSectionProps) {
  const { eventSettings, pageSettings } = useAppData();
  const { language, t } = useLanguage();

  const eventDate = language === 'ar' ? eventSettings.dateAr : eventSettings.dateEn;
  const eventLocation =
    language === 'ar' ? eventSettings.locationAr : eventSettings.locationEn;
  const ctaText =
    language === 'ar' ? pageSettings.ctaButtonTextAr : pageSettings.ctaButtonTextEn;

  return (
    <section id="registration" className="w-full py-6 sm:py-9 md:py-11 bg-surface">
      <div className="max-w-[1000px] mx-auto px-3.5 sm:px-6">
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[#0F2C4C] via-[#12365C] to-[#174A7E] text-on-primary p-4 sm:p-6 md:p-7 shadow-[0_16px_40px_-14px_rgba(18,54,92,0.38)] border border-[#24598F]/40">
          <div
            className="absolute -top-20 -start-20 w-56 h-56 rounded-full bg-[#F5C928]/20 blur-3xl pointer-events-none"
            aria-hidden="true"
          />
          <div
            className="absolute -bottom-24 -end-20 w-64 h-64 rounded-full bg-[#1769B5]/35 blur-3xl pointer-events-none"
            aria-hidden="true"
          />

          <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 sm:gap-6">
            <div className="flex flex-col items-start gap-2 sm:gap-2.5 max-w-xl">
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#F5C928] text-[#12365C] text-xs font-bold shadow-xs">
                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{t('registration.badge')}</span>
              </span>

              <h2 className="text-xl sm:type-headline-lg text-white font-bold leading-snug">
                {pageSettings.isRegistrationOpen
                  ? t('registration.ctaCardTitle')
                  : t('registration.closedTitle')}
              </h2>

              <p className="text-sm sm:type-body-md text-[#DBEAFE] leading-relaxed">
                {pageSettings.isRegistrationOpen
                  ? t('registration.ctaCardDescription')
                  : t('registration.closedDescription')}
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[#DBEAFE] text-xs">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/10 border border-white/10">
                  <Calendar className="w-3.5 h-3.5 text-[#F5C928]" aria-hidden="true" />
                  <span>{eventDate}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/10 border border-white/10">
                  <MapPin className="w-3.5 h-3.5 text-[#F5C928]" aria-hidden="true" />
                  <span>{eventLocation}</span>
                </span>
              </div>
            </div>

            <div className="w-full lg:w-auto flex flex-col items-stretch sm:flex-row lg:flex-col lg:items-end gap-2.5 sm:gap-3 shrink-0">
              {pageSettings.showCapCutBanner && (
                <div className="inline-flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/10 backdrop-blur-xs border border-white/15">
                  <img
                    src={capcutIcon}
                    alt="CapCut"
                    className="w-8 h-8 rounded-md bg-white p-0.5 object-contain shrink-0"
                  />
                  <div className="flex flex-col text-start">
                    <span className="inline-flex items-center gap-1 text-xs text-[#F5C928] font-bold">
                      <Clapperboard className="w-3 h-3" aria-hidden="true" />
                      <span>CapCut Workshop</span>
                    </span>
                    <span className="text-xs text-white/95">
                      {t('registration.capcutTitle')}
                    </span>
                  </div>
                </div>
              )}

              {pageSettings.isRegistrationOpen ? (
                <button
                  type="button"
                  onClick={onOpenModal}
                  data-testid="open-registration-modal-btn"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#F5C928] hover:bg-[#eab814] text-[#12365C] type-label-md sm:type-label-lg font-bold px-6 py-3 rounded-lg shadow-[0_8px_22px_rgba(245,201,40,0.38)] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                >
                  <span>{ctaText}</span>
                  <DirectionalArrow className="w-4 h-4" direction="forward" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onOpenModal}
                  data-testid="open-registration-modal-btn"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white/15 hover:bg-white/25 text-white type-label-md sm:type-label-lg px-6 py-3 rounded-lg transition-colors cursor-pointer"
                >
                  <Lock className="w-4 h-4" aria-hidden="true" />
                  <span>{t('registration.closedTitle')}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
