import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import {
  AtSign,
  BadgeCheck,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clapperboard,
  ClipboardCheck,
  Clock,
  Copy,
  Files,
  GraduationCap,
  Hash,
  Home,
  MessageSquare,
  Phone,
  ReceiptText,
  Sparkles,
  Star,
  User,
} from 'lucide-react';
import capcutIcon from '@/assets/capcut-icon.svg';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { StatusBadge } from '@/components/common/StatusBadge';
import { useAppData } from '@/app/providers/AppDataProvider';
import { useToast } from '@/app/providers/ToastProvider';
import { useLanguage } from '@/hooks/useLanguage';
import { registrationService } from '@/services/registrations/registrationService';
import type { StudentRegistration } from '@/types/domain';
import { formatRelativeDate } from '@/utils/formatters';

interface LocationState {
  registration?: StudentRegistration;
}

export function RegistrationSuccessPage() {
  const { referenceId } = useParams<{ referenceId: string }>();
  const location = useLocation();
  const state = (location.state as LocationState | null) ?? null;

  const { eventSettings, pageSettings } = useAppData();
  const { language, t } = useLanguage();
  const { showToast } = useToast();

  const [registration, setRegistration] = useState<StudentRegistration | null>(
    state?.registration ?? null,
  );
  const [loading, setLoading] = useState(!state?.registration);

  useEffect(() => {
    let active = true;
    if (state?.registration) {
      setRegistration(state.registration);
      setLoading(false);
      return;
    }
    if (!referenceId) {
      setLoading(false);
      return;
    }
    void registrationService.getByReferenceId(referenceId).then((found) => {
      if (!active) return;
      setRegistration(found ?? null);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [referenceId, state?.registration]);

  const handleCopyReference = async () => {
    if (!registration) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(registration.referenceId);
      }
    } catch {
      // Clipboard API may be blocked in restricted contexts; toast still confirms action
    }
    showToast(t('success.copyToast'), 'success');
  };

  const successHeadline =
    language === 'ar' ? pageSettings.successHeadlineAr : pageSettings.successHeadlineEn;
  const successMessage =
    language === 'ar' ? pageSettings.successMessageAr : pageSettings.successMessageEn;
  const organizerName =
    language === 'ar' ? eventSettings.organizerAr : eventSettings.organizerEn;

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <PublicHeader variant="success" />

      <main className="flex-1 w-full">
        <div className="relative w-full max-w-5xl mx-auto px-3.5 sm:px-6 py-6 sm:py-10 overflow-hidden">
          <div
            className="absolute top-12 start-1/2 -translate-x-1/2 w-96 h-96 bg-secondary-fixed/30 rounded-full blur-3xl pointer-events-none -z-10"
            aria-hidden="true"
          />

          {loading ? (
            <div className="py-24 text-center type-body-lg text-on-surface-variant">
              {t('common.loading')}
            </div>
          ) : !registration ? (
            <div className="bg-surface-container-lowest rounded-3xl shadow-md p-6 sm:p-10 text-center max-w-xl mx-auto my-8 flex flex-col items-center gap-4">
              <h1 className="type-headline-md text-primary font-bold">
                {t('success.notFoundTitle')}
              </h1>
              <p className="type-body-md text-on-surface-variant">{t('success.notFoundDesc')}</p>
              <Link
                to="/"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-on-primary type-label-lg hover:bg-secondary transition-colors"
              >
                <Home className="w-4 h-4" aria-hidden="true" />
                <span>{t('success.returnHome')}</span>
              </Link>
            </div>
          ) : (
            <div data-testid="registration-success-view" className="flex flex-col gap-6 sm:gap-10">
              {/* 1. Success Hero Section */}
              <section className="flex flex-col items-center text-center">
                <div className="inline-flex items-center gap-2 px-3.5 py-1 sm:px-4 sm:py-1.5 rounded-full bg-surface-container-low shadow-2xs mb-4 sm:mb-6 border border-outline-variant/25">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary-container opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-tertiary" />
                  </span>
                  <span className="text-xs sm:type-label-md text-primary">{t('success.statusBadge')}</span>
                  <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-tertiary" aria-hidden="true" />
                </div>

                {/* Emblem */}
                <div className="relative mb-4 sm:mb-6">
                  <div className="absolute -top-3 -start-5 text-tertiary" aria-hidden="true">
                    <Star className="w-5 h-5 sm:w-6 sm:h-6 fill-tertiary-fixed-dim text-tertiary" />
                  </div>
                  <div
                    className="absolute top-1/2 -start-7 sm:-start-8 w-2 h-2 rounded-full bg-tertiary-fixed-dim"
                    aria-hidden="true"
                  />
                  <div
                    className="absolute top-2 -end-5 sm:-end-6 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-secondary"
                    aria-hidden="true"
                  />
                  <div className="relative w-20 h-20 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br from-primary-container via-secondary to-primary p-1 shadow-[0_12px_32px_rgba(18,54,92,0.22)] flex items-center justify-center">
                    <div className="w-full h-full rounded-full bg-primary-container/40 backdrop-blur-xs flex items-center justify-center">
                      <Check className="w-9 h-9 sm:w-12 sm:h-12 text-on-primary stroke-[3]" aria-hidden="true" />
                    </div>
                    <div className="absolute bottom-0.5 end-0.5 sm:bottom-1 sm:end-1 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-tertiary-fixed text-on-tertiary-fixed shadow-md flex items-center justify-center">
                      <BadgeCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true" />
                    </div>
                  </div>
                </div>

                <h1 className="text-2xl sm:type-display-lg font-bold text-primary mb-2 max-w-2xl">
                  {successHeadline}
                </h1>
                <p className="text-sm sm:type-body-lg text-on-surface-variant max-w-xl leading-relaxed">
                  {successMessage}
                </p>
              </section>

              {/* 2. Registration Summary Card */}
              <section>
                <div className="bg-surface-container-lowest rounded-xl sm:rounded-2xl shadow-[0_4px_24px_rgba(18,54,92,0.06)] border border-outline-variant/20 overflow-hidden">
                  <div className="px-4 py-3.5 sm:px-6 sm:py-4 bg-surface-container-low flex items-center justify-between border-b border-outline-variant/20">
                    <div className="flex items-center gap-2">
                      <ReceiptText className="w-4 h-4 sm:w-5 sm:h-5 text-secondary" aria-hidden="true" />
                      <h2 className="text-base sm:type-headline-sm text-primary font-bold">
                        {t('success.summaryTitle')}
                      </h2>
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-[11px] sm:type-label-sm px-2.5 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant">
                      <span className="w-1.5 h-1.5 rounded-full bg-tertiary" aria-hidden="true" />
                      <span>{t('success.recordedDataBadge')}</span>
                    </span>
                  </div>

                  <div className="p-4 sm:p-6 md:p-8 flex flex-col gap-4 sm:gap-6">
                    {/* Reference ID Banner */}
                    <div className="w-full bg-surface-container-low rounded-xl p-3.5 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 shadow-2xs border border-outline-variant/20">
                      <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-primary text-on-primary flex items-center justify-center shrink-0 shadow-xs">
                          <Hash className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden="true" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs sm:type-label-sm text-outline">
                            {t('success.referenceLabel')}
                          </span>
                          <span
                            data-testid="success-reference-id"
                            dir="ltr"
                            className="text-lg sm:type-headline-md text-primary tracking-wider font-mono font-bold text-start"
                          >
                            {registration.referenceId}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleCopyReference}
                        data-testid="copy-ref-inline-btn"
                        aria-label={t('success.copyFullButton')}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 sm:py-2.5 rounded-lg bg-surface-container-lowest hover:bg-secondary hover:text-on-secondary text-primary transition-all duration-200 shadow-xs border border-outline-variant/30 type-label-md cursor-pointer"
                      >
                        <Copy className="w-4 h-4" aria-hidden="true" />
                        <span>{t('success.copyButton')}</span>
                      </button>
                    </div>

                    {/* 6-Field Dynamic Student Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
                      <div className="p-4 rounded-xl bg-surface-container-low flex flex-col gap-1 text-start">
                        <span className="type-label-sm text-outline flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>{t('success.studentNameLabel')}</span>
                        </span>
                        <span
                          data-testid="success-student-name"
                          className="type-label-lg text-on-surface font-medium"
                        >
                          {registration.firstName} {registration.lastName}
                        </span>
                      </div>

                      <div className="p-4 rounded-xl bg-surface-container-low flex flex-col gap-1 text-start">
                        <span className="type-label-sm text-outline flex items-center gap-1.5">
                          <GraduationCap className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>{t('success.specializationLabel')}</span>
                        </span>
                        <span
                          data-testid="success-specialization"
                          className="type-label-lg text-on-surface font-medium"
                        >
                          {language === 'ar'
                            ? registration.specializationNameAr
                            : registration.specializationNameEn}
                        </span>
                      </div>

                      <div className="p-4 rounded-xl bg-surface-container-low flex flex-col gap-1 text-start">
                        <span className="type-label-sm text-outline flex items-center gap-1.5">
                          <AtSign className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>{t('success.instagramLabel')}</span>
                        </span>
                        <span
                          data-testid="success-instagram"
                          dir="ltr"
                          className="type-label-lg text-secondary font-mono text-start"
                        >
                          {registration.instagramHandle}
                        </span>
                      </div>

                      {registration.phone && (
                        <div className="p-4 rounded-xl bg-surface-container-low flex flex-col gap-1 text-start">
                          <span className="type-label-sm text-outline flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>{t('success.phoneLabel')}</span>
                          </span>
                          <span
                            data-testid="success-phone"
                            dir="ltr"
                            className="type-label-lg text-on-surface font-mono text-start"
                          >
                            {registration.phone}
                          </span>
                        </div>
                      )}

                      <div className="p-4 rounded-xl bg-surface-container-low flex flex-col gap-1 text-start">
                        <span className="type-label-sm text-outline flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>{t('success.dateLabel')}</span>
                        </span>
                        <span className="type-label-lg text-on-surface font-medium">
                          {formatRelativeDate(registration.createdAt, language)}
                        </span>
                      </div>

                      <div className="p-4 rounded-xl bg-surface-container-low flex flex-col gap-1 text-start">
                        <span className="type-label-sm text-outline flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>{t('success.organizerLabel')}</span>
                        </span>
                        <span className="type-label-lg text-on-surface font-medium">
                          {organizerName}
                        </span>
                      </div>

                      <div className="p-4 rounded-xl bg-surface-container-low flex flex-col gap-1 text-start">
                        <span className="type-label-sm text-outline flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>{t('success.statusLabel')}</span>
                        </span>
                        <div className="pt-0.5">
                          <StatusBadge status={registration.status} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* 3. What's Next Timeline */}
              <section>
                <div className="text-start mb-6">
                  <h2 className="type-headline-md text-primary font-bold mb-1">
                    {t('success.whatsNextTitle')}
                  </h2>
                  <p className="type-body-md text-on-surface-variant">
                    {t('success.whatsNextSubtitle')}
                  </p>
                </div>

                <div className="relative grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div
                    className="hidden md:block absolute top-7 start-16 end-16 h-0.5 bg-surface-container-highest z-0"
                    aria-hidden="true"
                  />

                  {/* Step 1 */}
                  <div className="relative z-10 flex md:flex-col items-start md:items-center text-start md:text-center gap-4 bg-surface-container-lowest md:bg-transparent p-4 md:p-0 rounded-xl shadow-xs md:shadow-none">
                    <div className="w-14 h-14 rounded-full bg-primary text-on-primary flex items-center justify-center shrink-0 shadow-md">
                      <CheckCircle2 className="w-6 h-6" aria-hidden="true" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center md:justify-center gap-2">
                        <span className="type-label-sm text-secondary font-bold">
                          {t('success.step1Tag')}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed type-label-sm">
                          {t('success.step1Status')}
                        </span>
                      </div>
                      <h3 className="type-headline-sm text-primary font-bold">
                        {t('success.step1Title')}
                      </h3>
                      <p className="type-body-sm text-on-surface-variant max-w-xs">
                        {t('success.step1Desc')}
                      </p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="relative z-10 flex md:flex-col items-start md:items-center text-start md:text-center gap-4 bg-surface-container-lowest md:bg-transparent p-4 md:p-0 rounded-xl shadow-xs md:shadow-none">
                    <div className="w-14 h-14 rounded-full bg-surface-container-lowest text-tertiary flex items-center justify-center shrink-0 shadow-md ring-4 ring-tertiary-fixed-dim/40">
                      <ClipboardCheck className="w-6 h-6" aria-hidden="true" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center md:justify-center gap-2">
                        <span className="type-label-sm text-tertiary font-bold">
                          {t('success.step2Tag')}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed type-label-sm">
                          {t('success.step2Status')}
                        </span>
                      </div>
                      <h3 className="type-headline-sm text-primary font-bold">
                        {t('success.step2Title')}
                      </h3>
                      <p className="type-body-sm text-on-surface-variant max-w-xs">
                        {t('success.step2Desc')}
                      </p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="relative z-10 flex md:flex-col items-start md:items-center text-start md:text-center gap-4 bg-surface-container-lowest md:bg-transparent p-4 md:p-0 rounded-xl shadow-xs md:shadow-none">
                    <div className="w-14 h-14 rounded-full bg-surface-container-high text-outline flex items-center justify-center shrink-0 shadow-xs">
                      <MessageSquare className="w-6 h-6" aria-hidden="true" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center md:justify-center gap-2">
                        <span className="type-label-sm text-outline font-bold">
                          {t('success.step3Tag')}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant type-label-sm">
                          {t('success.step3Status')}
                        </span>
                      </div>
                      <h3 className="type-headline-sm text-primary font-bold">
                        {t('success.step3Title')}
                      </h3>
                      <p className="type-body-sm text-on-surface-variant max-w-xs">
                        {t('success.step3Desc')}
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* 4. CapCut Event Identity Compact Card */}
              {pageSettings.showCapCutBanner && (
                <section>
                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary-container via-primary to-primary-container text-on-primary p-6 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4 w-full sm:w-auto text-start">
                      <div className="w-16 h-16 rounded-xl bg-surface-container-lowest/10 p-1.5 flex items-center justify-center shrink-0 backdrop-blur-md">
                        <img
                          src={capcutIcon}
                          alt="CapCut Logo"
                          className="w-full h-full object-contain rounded-lg"
                        />
                      </div>
                      <div className="flex flex-col">
                        <span className="inline-flex items-center gap-1 type-label-sm text-tertiary-fixed font-medium mb-0.5">
                          <Clapperboard className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>{t('success.capcutBadge')}</span>
                        </span>
                        <h4 className="type-headline-sm text-on-primary font-bold">
                          {t('success.capcutHeading')}
                        </h4>
                        <p className="type-body-sm text-on-primary-container">
                          {t('success.capcutSubtitle')}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0">
                      <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 text-on-primary type-label-sm backdrop-blur-xs">
                        <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>{t('success.capcutConfirmedBadge')}</span>
                      </span>
                    </div>
                  </div>
                </section>
              )}

              {/* 5. Action Buttons */}
              <section className="flex flex-col sm:flex-row items-center justify-center gap-4 pb-4">
                <Link
                  to="/"
                  data-testid="return-home-btn"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-secondary hover:bg-primary text-on-secondary type-label-lg transition-all duration-200 shadow-md"
                >
                  <Home className="w-5 h-5" aria-hidden="true" />
                  <span>{t('success.returnHome')}</span>
                </Link>

                <button
                  type="button"
                  onClick={handleCopyReference}
                  data-testid="copy-ref-bottom-btn"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 rounded-xl bg-surface-container-lowest hover:bg-surface-container-low text-primary type-label-lg transition-all duration-200 shadow-xs border border-outline-variant/30 cursor-pointer"
                >
                  <Files className="w-5 h-5 text-secondary" aria-hidden="true" />
                  <span>{t('success.copyFullButton')}</span>
                </button>
              </section>
            </div>
          )}
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
