import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { RotateCcw, Save, Upload } from 'lucide-react';
import officialLogo from '@/assets/club-logo.png';
import { useAppData } from '@/app/providers/AppDataProvider';
import { useToast } from '@/app/providers/ToastProvider';
import { useLanguage } from '@/hooks/useLanguage';
import { settingsService } from '@/services/settings/settingsService';
import type { EventSettings } from '@/types/domain';

export function EventSettingsPage() {
  const { eventSettings } = useAppData();
  const { t } = useLanguage();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { isSubmitting },
  } = useForm<EventSettings>({
    defaultValues: eventSettings,
  });

  useEffect(() => {
    reset(eventSettings);
  }, [eventSettings, reset]);

  const currentLogo = watch('logoDataUrl');

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) {
      showToast('Max logo size is 1MB', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setValue('logoDataUrl', reader.result, { shouldDirty: true });
      }
    };
    reader.readAsDataURL(file);
  };

  const onSubmit = async (values: EventSettings) => {
    await settingsService.updateEventSettings({
      ...values,
      capacity: Number(values.capacity) || 150,
    });
    showToast(t('admin.eventSettings.savedToast'), 'success');
  };

  return (
    <div className="flex flex-col w-full gap-3.5 sm:gap-4 pb-6">
      <section className="bg-white p-3.5 sm:p-4 rounded-xl shadow-[0_4px_14px_-6px_rgba(18,54,92,0.09)] border border-[#C5D8EE]">
        <h1 className="text-lg sm:text-xl text-[#12365C] font-bold">
          {t('admin.eventSettings.title')}
        </h1>
        <p className="text-xs sm:text-[13px] text-[#475569] mt-0.5">
          {t('admin.eventSettings.subtitle')}
        </p>
      </section>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-3.5 sm:gap-4"
        data-testid="event-settings-form"
      >
        {/* Logo & Basic Info */}
        <section className="bg-white p-3.5 sm:p-4 rounded-xl shadow-[0_4px_14px_-6px_rgba(18,54,92,0.09)] border border-[#C5D8EE] flex flex-col gap-3.5">
          <h2 className="text-sm sm:text-base text-[#12365C] font-bold pb-2 border-b border-[#E4EDF7]">
            {t('admin.eventSettings.basicInfoSection')}
          </h2>

          {/* Club Logo Preview & Controls */}
          <div className="p-3.5 sm:p-4 rounded-xl bg-[#F4F8FD] border border-[#D4E2F4] flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
            <div className="flex items-center gap-3.5">
              <img
                src={currentLogo || officialLogo}
                alt={t('admin.eventSettings.logoTitle')}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-contain bg-white p-1 border border-[#C5D8EE] shrink-0"
              />
              <div>
                <p className="type-label-md sm:type-label-lg text-[#12365C] font-bold">
                  {t('admin.eventSettings.logoTitle')}
                </p>
                <p className="type-body-sm text-[#475569]">
                  {t('admin.eventSettings.logoHint')}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={handleLogoFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-[#BBD0E8] text-[#12365C] hover:bg-[#EAF1FA] font-semibold type-label-sm cursor-pointer"
              >
                <Upload className="w-4 h-4 text-[#1769B5]" aria-hidden="true" />
                <span>{t('admin.eventSettings.uploadLogo')}</span>
              </button>
              {currentLogo && (
                <button
                  type="button"
                  onClick={() => setValue('logoDataUrl', null)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#FEF3C7] border border-[#FCD34D] text-[#92400E] hover:bg-[#FDE68A] font-semibold type-label-sm cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" aria-hidden="true" />
                  <span>{t('admin.eventSettings.restoreOfficialLogo')}</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="ev-clubNameAr" className="type-label-md text-[#12365C] font-semibold">
                {t('admin.eventSettings.clubNameAr')}
              </label>
              <input
                id="ev-clubNameAr"
                type="text"
                dir="rtl"
                {...register('clubNameAr')}
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#F8FBFF] border border-[#BBD0E8] text-[#12365C] focus:bg-white focus:outline-none focus:border-[#1769B5] focus:ring-2 focus:ring-[#1769B5]/20 type-body-sm"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="ev-clubNameEn" className="type-label-md text-[#12365C] font-semibold">
                {t('admin.eventSettings.clubNameEn')}
              </label>
              <input
                id="ev-clubNameEn"
                type="text"
                dir="ltr"
                {...register('clubNameEn')}
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#F8FBFF] border border-[#BBD0E8] text-[#12365C] focus:bg-white focus:outline-none focus:border-[#1769B5] focus:ring-2 focus:ring-[#1769B5]/20 type-body-sm text-left"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="ev-eventNameAr" className="type-label-md text-[#12365C] font-semibold">
                {t('admin.eventSettings.eventNameAr')}
              </label>
              <input
                id="ev-eventNameAr"
                type="text"
                dir="rtl"
                {...register('eventNameAr')}
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#F8FBFF] border border-[#BBD0E8] text-[#12365C] focus:bg-white focus:outline-none focus:border-[#1769B5] focus:ring-2 focus:ring-[#1769B5]/20 type-body-sm"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="ev-eventNameEn" className="type-label-md text-[#12365C] font-semibold">
                {t('admin.eventSettings.eventNameEn')}
              </label>
              <input
                id="ev-eventNameEn"
                type="text"
                dir="ltr"
                {...register('eventNameEn')}
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#F8FBFF] border border-[#BBD0E8] text-[#12365C] focus:bg-white focus:outline-none focus:border-[#1769B5] focus:ring-2 focus:ring-[#1769B5]/20 type-body-sm text-left"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="ev-descAr" className="type-label-md text-[#12365C] font-semibold">
                {t('admin.eventSettings.descriptionAr')}
              </label>
              <textarea
                id="ev-descAr"
                rows={3}
                dir="rtl"
                {...register('descriptionAr')}
                className="w-full p-3.5 rounded-lg bg-[#F8FBFF] border border-[#BBD0E8] text-[#12365C] focus:bg-white focus:outline-none focus:border-[#1769B5] focus:ring-2 focus:ring-[#1769B5]/20 type-body-sm resize-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="ev-descEn" className="type-label-md text-[#12365C] font-semibold">
                {t('admin.eventSettings.descriptionEn')}
              </label>
              <textarea
                id="ev-descEn"
                rows={3}
                dir="ltr"
                {...register('descriptionEn')}
                className="w-full p-3.5 rounded-lg bg-[#F8FBFF] border border-[#BBD0E8] text-[#12365C] focus:bg-white focus:outline-none focus:border-[#1769B5] focus:ring-2 focus:ring-[#1769B5]/20 type-body-sm text-left resize-none"
              />
            </div>
          </div>
        </section>

        {/* Schedule & Venue */}
        <section className="bg-white p-3.5 sm:p-4 rounded-xl shadow-[0_4px_14px_-6px_rgba(18,54,92,0.09)] border border-[#C5D8EE] flex flex-col gap-3.5">
          <h2 className="text-sm sm:text-base text-[#12365C] font-bold pb-2 border-b border-[#E4EDF7]">
            {t('admin.eventSettings.scheduleSection')}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 sm:gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="ev-dateAr" className="type-label-md text-[#12365C] font-semibold">
                {t('admin.eventSettings.dateAr')}
              </label>
              <input
                id="ev-dateAr"
                type="text"
                dir="rtl"
                {...register('dateAr')}
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#F8FBFF] border border-[#BBD0E8] text-[#12365C] focus:bg-white focus:outline-none focus:border-[#1769B5] focus:ring-2 focus:ring-[#1769B5]/20 type-body-sm"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="ev-dateEn" className="type-label-md text-[#12365C] font-semibold">
                {t('admin.eventSettings.dateEn')}
              </label>
              <input
                id="ev-dateEn"
                type="text"
                dir="ltr"
                {...register('dateEn')}
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#F8FBFF] border border-[#BBD0E8] text-[#12365C] focus:bg-white focus:outline-none focus:border-[#1769B5] focus:ring-2 focus:ring-[#1769B5]/20 type-body-sm text-left"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="ev-capacity" className="type-label-md text-[#12365C] font-semibold">
                {t('admin.eventSettings.capacity')}
              </label>
              <input
                id="ev-capacity"
                type="number"
                min={1}
                {...register('capacity', { valueAsNumber: true })}
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#F8FBFF] border border-[#BBD0E8] text-[#12365C] focus:bg-white focus:outline-none focus:border-[#1769B5] focus:ring-2 focus:ring-[#1769B5]/20 type-body-sm"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="ev-timeAr" className="type-label-md text-[#12365C] font-semibold">
                {t('admin.eventSettings.timeAr')}
              </label>
              <input
                id="ev-timeAr"
                type="text"
                dir="rtl"
                {...register('timeAr')}
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#F8FBFF] border border-[#BBD0E8] text-[#12365C] focus:bg-white focus:outline-none focus:border-[#1769B5] focus:ring-2 focus:ring-[#1769B5]/20 type-body-sm"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="ev-timeEn" className="type-label-md text-[#12365C] font-semibold">
                {t('admin.eventSettings.timeEn')}
              </label>
              <input
                id="ev-timeEn"
                type="text"
                dir="ltr"
                {...register('timeEn')}
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#F8FBFF] border border-[#BBD0E8] text-[#12365C] focus:bg-white focus:outline-none focus:border-[#1769B5] focus:ring-2 focus:ring-[#1769B5]/20 type-body-sm text-left"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="ev-organizerAr" className="type-label-md text-[#12365C] font-semibold">
                {t('admin.eventSettings.organizerAr')}
              </label>
              <input
                id="ev-organizerAr"
                type="text"
                dir="rtl"
                {...register('organizerAr')}
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#F8FBFF] border border-[#BBD0E8] text-[#12365C] focus:bg-white focus:outline-none focus:border-[#1769B5] focus:ring-2 focus:ring-[#1769B5]/20 type-body-sm"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="ev-locationAr" className="type-label-md text-[#12365C] font-semibold">
                {t('admin.eventSettings.locationAr')}
              </label>
              <input
                id="ev-locationAr"
                type="text"
                dir="rtl"
                {...register('locationAr')}
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#F8FBFF] border border-[#BBD0E8] text-[#12365C] focus:bg-white focus:outline-none focus:border-[#1769B5] focus:ring-2 focus:ring-[#1769B5]/20 type-body-sm"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="ev-locationEn" className="type-label-md text-[#12365C] font-semibold">
                {t('admin.eventSettings.locationEn')}
              </label>
              <input
                id="ev-locationEn"
                type="text"
                dir="ltr"
                {...register('locationEn')}
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#F8FBFF] border border-[#BBD0E8] text-[#12365C] focus:bg-white focus:outline-none focus:border-[#1769B5] focus:ring-2 focus:ring-[#1769B5]/20 type-body-sm text-left"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="ev-organizerEn" className="type-label-md text-[#12365C] font-semibold">
                {t('admin.eventSettings.organizerEn')}
              </label>
              <input
                id="ev-organizerEn"
                type="text"
                dir="ltr"
                {...register('organizerEn')}
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#F8FBFF] border border-[#BBD0E8] text-[#12365C] focus:bg-white focus:outline-none focus:border-[#1769B5] focus:ring-2 focus:ring-[#1769B5]/20 type-body-sm text-left"
              />
            </div>
          </div>
        </section>

        {/* Contact & Social */}
        <section className="bg-white p-3.5 sm:p-4 rounded-xl shadow-[0_4px_14px_-6px_rgba(18,54,92,0.09)] border border-[#C5D8EE] flex flex-col gap-3.5">
          <h2 className="text-sm sm:text-base text-[#12365C] font-bold pb-2 border-b border-[#E4EDF7]">
            {t('admin.eventSettings.contactSection')}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="ev-email" className="type-label-md text-[#12365C] font-semibold">
                {t('admin.eventSettings.contactEmail')}
              </label>
              <input
                id="ev-email"
                type="email"
                dir="ltr"
                {...register('contactEmail')}
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#F8FBFF] border border-[#BBD0E8] text-[#12365C] focus:bg-white focus:outline-none focus:border-[#1769B5] focus:ring-2 focus:ring-[#1769B5]/20 type-body-sm text-left"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="ev-instagramUrl" className="type-label-md text-[#12365C] font-semibold">
                {t('admin.eventSettings.instagramUrl')}
              </label>
              <input
                id="ev-instagramUrl"
                type="url"
                dir="ltr"
                {...register('instagramUrl')}
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#F8FBFF] border border-[#BBD0E8] text-[#12365C] focus:bg-white focus:outline-none focus:border-[#1769B5] focus:ring-2 focus:ring-[#1769B5]/20 type-body-sm text-left"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="ev-addressAr" className="type-label-md text-[#12365C] font-semibold">
                {t('admin.eventSettings.contactAddressAr')}
              </label>
              <input
                id="ev-addressAr"
                type="text"
                dir="rtl"
                {...register('contactAddressAr')}
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#F8FBFF] border border-[#BBD0E8] text-[#12365C] focus:bg-white focus:outline-none focus:border-[#1769B5] focus:ring-2 focus:ring-[#1769B5]/20 type-body-sm"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="ev-addressEn" className="type-label-md text-[#12365C] font-semibold">
                {t('admin.eventSettings.contactAddressEn')}
              </label>
              <input
                id="ev-addressEn"
                type="text"
                dir="ltr"
                {...register('contactAddressEn')}
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#F8FBFF] border border-[#BBD0E8] text-[#12365C] focus:bg-white focus:outline-none focus:border-[#1769B5] focus:ring-2 focus:ring-[#1769B5]/20 type-body-sm text-left"
              />
            </div>

            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label htmlFor="ev-facebookUrl" className="type-label-md text-[#12365C] font-semibold">
                {t('admin.eventSettings.facebookUrl')}
              </label>
              <input
                id="ev-facebookUrl"
                type="url"
                dir="ltr"
                {...register('facebookUrl')}
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#F8FBFF] border border-[#BBD0E8] text-[#12365C] focus:bg-white focus:outline-none focus:border-[#1769B5] focus:ring-2 focus:ring-[#1769B5]/20 type-body-sm text-left"
              />
            </div>
          </div>
        </section>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            data-testid="save-event-settings-btn"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#12365C] text-white hover:bg-[#1769B5] font-bold type-label-lg transition-colors shadow-sm cursor-pointer disabled:opacity-60"
          >
            <Save className="w-5 h-5 text-[#F5C928]" aria-hidden="true" />
            <span>{t('common.save')}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
