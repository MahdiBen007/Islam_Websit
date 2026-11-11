import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  AlertCircle,
  Camera,
  ChevronDown,
  Clapperboard,
  Lock,
  Phone,
  Send,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import capcutIcon from '@/assets/capcut-icon.svg';
import { ClubLogo } from '@/components/common/ClubLogo';
import { useAppData } from '@/app/providers/AppDataProvider';
import { useToast } from '@/app/providers/ToastProvider';
import { useLanguage } from '@/hooks/useLanguage';
import { registrationService } from '@/services/registrations/registrationService';
import {
  isValidInstagramHandle,
  isValidPhoneNumber,
  stripAtPrefix,
} from '@/utils/formatters';

const registrationSchema = z.object({
  firstName: z.string().trim().min(2, 'registration.validation.firstNameRequired'),
  lastName: z.string().trim().min(2, 'registration.validation.lastNameRequired'),
  phone: z
    .string()
    .trim()
    .min(1, 'registration.validation.phoneRequired')
    .refine((val) => isValidPhoneNumber(val), 'registration.validation.phoneInvalid'),
  specializationId: z.string().min(1, 'registration.validation.specializationRequired'),
  instagramHandle: z
    .string()
    .trim()
    .min(1, 'registration.validation.instagramRequired')
    .refine((val) => isValidInstagramHandle(val), 'registration.validation.instagramInvalid'),
  confirmedAttendance: z
    .boolean()
    .refine((val) => val === true, 'registration.validation.confirmRequired'),
});

type RegistrationFormValues = z.infer<typeof registrationSchema>;

interface RegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const EXIT_ANIMATION_MS = 280;

export function RegistrationModal({ isOpen, onClose }: RegistrationModalProps) {
  const { activeSpecializations, pageSettings, eventSettings } = useAppData();
  const { language, t } = useLanguage();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [isRendered, setIsRendered] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RegistrationFormValues>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      specializationId: '',
      instagramHandle: '',
      confirmedAttendance: false,
    },
  });

  const selectedSpecId = watch('specializationId');
  const instagramValue = watch('instagramHandle') ?? '';
  const cleanInsta = stripAtPrefix(instagramValue);

  // Sync mount/unmount with smooth enter/exit transitions
  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      let frame2 = 0;
      const frame1 = requestAnimationFrame(() => {
        frame2 = requestAnimationFrame(() => {
          setIsVisible(true);
        });
      });
      return () => {
        cancelAnimationFrame(frame1);
        cancelAnimationFrame(frame2);
      };
    } else {
      setIsVisible(false);
      const timer = window.setTimeout(() => {
        setIsRendered(false);
        setSubmitError(null);
      }, EXIT_ANIMATION_MS);
      return () => window.clearTimeout(timer);
    }
  }, [isOpen]);

  // Escape key & body scroll lock while rendered
  useEffect(() => {
    if (!isRendered) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isRendered, isSubmitting, onClose]);

  // Clear selection if admin deactivated the currently selected specialization
  useEffect(() => {
    if (selectedSpecId && !activeSpecializations.some((s) => s.id === selectedSpecId)) {
      setValue('specializationId', '');
    }
  }, [activeSpecializations, selectedSpecId, setValue]);

  const onSubmit = async (values: RegistrationFormValues) => {
    if (isSubmitting) return;
    setSubmitError(null);

    try {
      const created = await registrationService.create({
        firstName: values.firstName,
        lastName: values.lastName,
        phone: values.phone,
        specializationId: values.specializationId,
        instagramHandle: values.instagramHandle,
        confirmedAttendance: values.confirmedAttendance,
      });
      reset();
      onClose();
      navigate(`/success/${created.referenceId}`, {
        state: { registration: created },
      });
    } catch {
      const errMsg = t('registration.submitError');
      setSubmitError(errMsg);
      showToast(errMsg, 'error');
    }
  };

  if (!isRendered) return null;

  const clubName = language === 'ar' ? eventSettings.clubNameAr : eventSettings.clubNameEn;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="registration-modal-title"
      data-testid="registration-modal"
      data-state={isVisible ? 'open' : 'closing'}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
      className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 transition-all duration-300 ease-out ${
        isVisible
          ? 'bg-primary/50 backdrop-blur-sm opacity-100'
          : 'bg-primary/0 backdrop-blur-none opacity-0 pointer-events-none'
      }`}
    >
      <div
        className={`w-full sm:max-w-2xl bg-surface-container-lowest rounded-t-xl sm:rounded-xl shadow-2xl border border-outline-variant/25 overflow-hidden flex flex-col max-h-[92vh] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isVisible
            ? 'opacity-100 translate-y-0 sm:scale-100'
            : 'opacity-0 translate-y-8 sm:translate-y-4 sm:scale-95'
        }`}
      >
        {/* Modal Header */}
        <div className="relative px-4 py-3 sm:px-6 sm:py-4 bg-gradient-to-l from-primary-container via-primary to-primary-container text-on-primary flex items-center justify-between gap-3 shrink-0 overflow-hidden">
          <div
            className="absolute -top-10 -end-10 w-36 h-36 rounded-full bg-tertiary-fixed/15 blur-2xl pointer-events-none"
            aria-hidden="true"
          />
          <div className="relative z-10 flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            <div className="p-0.5 sm:p-1 bg-surface-container-lowest rounded-lg shadow-sm shrink-0">
              <ClubLogo size="sm" className="w-8 h-8 sm:w-9 sm:h-9 rounded-md" />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="inline-flex items-center gap-1.5 text-tertiary-fixed text-[11px] sm:type-label-sm font-medium mb-0.5 min-w-0">
                <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">
                  {clubName} • {t('registration.badge')}
                </span>
              </div>
              <h2
                id="registration-modal-title"
                className="text-base sm:type-headline-sm text-on-primary font-bold truncate"
              >
                {t('registration.title')}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label={t('registration.closeModalLabel')}
            data-testid="close-registration-modal-btn"
            className="relative z-10 w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-white/10 hover:bg-white/20 text-on-primary flex items-center justify-center transition-colors cursor-pointer shrink-0 disabled:opacity-50"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto">
          {!pageSettings.isRegistrationOpen ? (
            <div className="py-8 px-4 text-center flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-error-container text-error flex items-center justify-center">
                <Lock className="w-8 h-8" aria-hidden="true" />
              </div>
              <h3 className="type-headline-md text-primary font-bold">
                {t('registration.closedTitle')}
              </h3>
              <p className="type-body-md text-on-surface-variant max-w-md">
                {t('registration.closedDescription')}
              </p>
            </div>
          ) : (
            <form
              noValidate
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-3 sm:space-y-4"
              data-testid="student-registration-form"
            >
              <p className="hidden sm:block text-xs sm:type-body-sm text-on-surface-variant mb-0.5">
                {t('registration.subtitle')}
              </p>

              {submitError && (
                <div
                  role="alert"
                  className="p-3 rounded-lg bg-error-container text-on-error-container flex items-center gap-2.5 type-body-sm"
                >
                  <AlertCircle className="w-5 h-5 text-error shrink-0" aria-hidden="true" />
                  <span>{submitError}</span>
                </div>
              )}

              {/* First & Last Name */}
              <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
                <div className="flex flex-col gap-1">
                  <label htmlFor="firstName" className="text-xs sm:type-label-md text-primary font-medium">
                    {t('registration.firstNameLabel')}{' '}
                    <span className="text-tertiary">{t('common.requiredMark')}</span>
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    autoComplete="given-name"
                    placeholder={t('registration.firstNamePlaceholder')}
                    aria-invalid={Boolean(errors.firstName)}
                    {...register('firstName')}
                    className="w-full bg-surface-container-lowest text-on-surface text-sm sm:type-body-md px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-lg border border-outline-variant/60 shadow-2xs focus:border-brand-blue focus:ring-3 focus:ring-brand-blue/15 focus:outline-none transition-all"
                  />
                  {errors.firstName?.message && (
                    <span role="alert" className="type-label-sm text-error flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      <span>{t(errors.firstName.message)}</span>
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <label htmlFor="lastName" className="text-xs sm:type-label-md text-primary font-medium">
                    {t('registration.lastNameLabel')}{' '}
                    <span className="text-tertiary">{t('common.requiredMark')}</span>
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    autoComplete="family-name"
                    placeholder={t('registration.lastNamePlaceholder')}
                    aria-invalid={Boolean(errors.lastName)}
                    {...register('lastName')}
                    className="w-full bg-surface-container-lowest text-on-surface text-sm sm:type-body-md px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-lg border border-outline-variant/60 shadow-2xs focus:border-brand-blue focus:ring-3 focus:ring-brand-blue/15 focus:outline-none transition-all"
                  />
                  {errors.lastName?.message && (
                    <span role="alert" className="type-label-sm text-error flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      <span>{t(errors.lastName.message)}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Phone Number */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="phone" className="type-label-md text-primary font-medium">
                  {t('registration.phoneLabel')}{' '}
                  <span className="text-tertiary">{t('common.requiredMark')}</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    id="phone"
                    type="tel"
                    dir="ltr"
                    autoComplete="tel"
                    placeholder={t('registration.phonePlaceholder')}
                    aria-invalid={Boolean(errors.phone)}
                    {...register('phone')}
                    className="w-full text-left bg-surface-container-lowest text-on-surface type-body-md pl-11 pr-4 py-2.5 rounded-lg border border-outline-variant/60 shadow-2xs focus:border-brand-blue focus:ring-3 focus:ring-brand-blue/15 focus:outline-none transition-all"
                  />
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary flex items-center pointer-events-none">
                    <Phone className="w-4 h-4" aria-hidden="true" />
                  </div>
                </div>
                {errors.phone?.message && (
                  <span role="alert" className="type-label-sm text-error flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>{t(errors.phone.message)}</span>
                  </span>
                )}
              </div>

              {/* Specialization Select */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="specializationId"
                  className="type-label-md text-primary font-medium"
                >
                  {t('registration.specializationLabel')}{' '}
                  <span className="text-tertiary">{t('common.requiredMark')}</span>
                </label>
                <div className="relative">
                  <select
                    id="specializationId"
                    aria-invalid={Boolean(errors.specializationId)}
                    {...register('specializationId')}
                    className="w-full bg-surface-container-lowest text-on-surface type-body-md ps-4 pe-10 py-2.5 rounded-lg border border-outline-variant/60 shadow-2xs focus:border-brand-blue focus:ring-3 focus:ring-brand-blue/15 focus:outline-none transition-all appearance-none cursor-pointer"
                  >
                    <option value="">{t('registration.specializationPlaceholder')}</option>
                    {activeSpecializations.map((spec) => (
                      <option key={spec.id} value={spec.id}>
                        {language === 'ar' ? spec.nameAr : spec.nameEn}
                      </option>
                    ))}
                  </select>
                  <div className="absolute end-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant flex items-center">
                    <ChevronDown className="w-5 h-5" aria-hidden="true" />
                  </div>
                </div>
                {errors.specializationId?.message && (
                  <span role="alert" className="type-label-sm text-error flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>{t(errors.specializationId.message)}</span>
                  </span>
                )}
              </div>

              {/* Instagram Handle */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="instagramHandle"
                  className="type-label-md text-primary font-medium"
                >
                  {t('registration.instagramLabel')}{' '}
                  <span className="text-tertiary">{t('common.requiredMark')}</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    id="instagramHandle"
                    type="text"
                    dir="ltr"
                    autoComplete="off"
                    placeholder={t('registration.instagramPlaceholder')}
                    aria-invalid={Boolean(errors.instagramHandle)}
                    {...register('instagramHandle')}
                    className="w-full text-left bg-surface-container-lowest text-on-surface type-body-md pl-11 pr-4 py-2.5 rounded-lg border border-outline-variant/60 shadow-2xs focus:border-brand-blue focus:ring-3 focus:ring-brand-blue/15 focus:outline-none transition-all"
                  />
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary flex items-center pointer-events-none">
                    <Camera className="w-4 h-4" aria-hidden="true" />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 mt-0.5">
                  <span className="hidden sm:inline type-label-sm text-on-surface-variant">
                    {t('registration.instagramHint')}
                  </span>
                  <span
                    data-testid="instagram-live-preview"
                    className="inline-flex items-center gap-1 type-label-sm text-secondary bg-secondary-fixed/50 px-2.5 py-0.5 rounded-full"
                  >
                    <span dir="ltr" className="font-medium">
                      {cleanInsta ? `@${cleanInsta}` : t('registration.instagramPreviewDefault')}
                    </span>
                    <span>{t('registration.instagramPreviewSuffix')}</span>
                  </span>
                </div>

                {errors.instagramHandle?.message && (
                  <span role="alert" className="type-label-sm text-error flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>{t(errors.instagramHandle.message)}</span>
                  </span>
                )}
              </div>

              {/* CapCut Branding Card */}
              {pageSettings.showCapCutBanner && (
                <div className="w-full bg-surface-container rounded-lg p-3 sm:p-3.5 flex flex-row items-center text-start gap-3 shadow-2xs border border-outline-variant/25">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-lg bg-surface-container-lowest p-1 shadow-xs flex items-center justify-center overflow-hidden">
                    <img
                      src={capcutIcon}
                      alt="CapCut"
                      className="w-full h-full object-contain rounded-md"
                    />
                  </div>
                  <div className="flex flex-col items-start min-w-0">
                    <div className="inline-flex items-center gap-1.5 text-xs sm:type-label-md text-primary font-bold">
                      <Clapperboard className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-secondary shrink-0" aria-hidden="true" />
                      <span>{t('registration.capcutTitle')}</span>
                    </div>
                    <p className="hidden sm:block text-[11.5px] sm:type-label-sm text-on-surface-variant mt-0.5 leading-snug sm:leading-relaxed">
                      {t('registration.capcutDescription')}
                    </p>
                  </div>
                </div>
              )}

              {/* Confirmation Checkbox */}
              <div className="pt-1 flex flex-col gap-1.5">
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    id="confirmedAttendance"
                    type="checkbox"
                    aria-invalid={Boolean(errors.confirmedAttendance)}
                    {...register('confirmedAttendance')}
                    className="mt-1 w-5 h-5 rounded text-primary focus:ring-secondary accent-primary cursor-pointer shrink-0"
                  />
                  <span className="type-body-sm text-on-surface leading-normal">
                    {t('registration.confirmLabel')}
                  </span>
                </label>
                {errors.confirmedAttendance?.message && (
                  <span role="alert" className="type-label-sm text-error flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>{t(errors.confirmedAttendance.message)}</span>
                  </span>
                )}
              </div>

              {/* Submit Action */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  data-testid="submit-registration-btn"
                  className="w-full py-3.5 px-6 rounded-lg bg-primary text-on-primary type-label-lg font-medium shadow-md hover:bg-secondary hover:shadow-[0_0_24px_rgba(245,201,40,0.4)] transition-all duration-300 flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-65 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <span
                        className="w-5 h-5 border-2 border-on-primary/30 border-t-tertiary-fixed rounded-full animate-spin"
                        aria-hidden="true"
                      />
                      <span>{t('registration.submittingButton')}</span>
                    </>
                  ) : (
                    <>
                      <span>{t('registration.submitButton')}</span>
                      <Send className="w-4 h-4 text-tertiary-fixed" aria-hidden="true" />
                    </>
                  )}
                </button>
              </div>

              {/* Privacy Note */}
              {pageSettings.showPrivacyNote && (
                <div className="hidden sm:flex items-center justify-center gap-1.5 text-center text-on-surface-variant type-label-sm pt-1">
                  <ShieldCheck className="w-4 h-4 text-secondary shrink-0" aria-hidden="true" />
                  <span>{t('registration.privacyNote')}</span>
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
