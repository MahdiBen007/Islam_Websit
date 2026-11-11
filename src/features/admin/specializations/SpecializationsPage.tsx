import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  AlertCircle,
  Edit3,
  Plus,
  Power,
  Search,
  Trash2,
} from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { SpecializationIcon } from '@/components/common/SpecializationIcon';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import { useAppData } from '@/app/providers/AppDataProvider';
import { useToast } from '@/app/providers/ToastProvider';
import { useLanguage } from '@/hooks/useLanguage';
import { isAppServiceError } from '@/services/api/errors';
import { specializationService } from '@/services/specializations/specializationService';
import type { Specialization } from '@/types/domain';

const specializationSchema = z.object({
  nameAr: z.string().trim().min(2, 'admin.specializations.validationAr'),
  nameEn: z.string().trim().min(2, 'admin.specializations.validationEn'),
  icon: z.enum([
    'terminal',
    'engineering',
    'campaign',
    'science',
    'analytics',
    'palette',
    'cpu',
    'book',
  ]),
  isActive: z.boolean(),
});

type SpecializationFormValues = z.infer<typeof specializationSchema>;

const ICON_OPTIONS: Array<{ value: Specialization['icon']; labelAr: string; labelEn: string }> = [
  { value: 'terminal', labelAr: 'البرمجة والتقنية', labelEn: 'Programming & IT' },
  { value: 'cpu', labelAr: 'الذكاء الاصطناعي', labelEn: 'AI & Systems' },
  { value: 'palette', labelAr: 'التصميم والفنون', labelEn: 'Design & Media' },
  { value: 'campaign', labelAr: 'الإعلام والتواصل', labelEn: 'Media & Comms' },
  { value: 'analytics', labelAr: 'الأعمال والتسويق', labelEn: 'Business & Analytics' },
  { value: 'engineering', labelAr: 'الهندسة', labelEn: 'Engineering' },
  { value: 'science', labelAr: 'العلوم', labelEn: 'Science' },
  { value: 'book', labelAr: 'العلوم الإنسانية', labelEn: 'Humanities' },
];

export function SpecializationsPage() {
  const { specializations, specializationCounts } = useAppData();
  const { language, t } = useLanguage();
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSpec, setEditingSpec] = useState<Specialization | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Specialization | null>(null);

  const registrationCounts = useMemo(() => {
    const map = new Map<string, number>();
    Object.entries(specializationCounts).forEach(([specId, count]) => {
      map.set(specId, count);
    });
    return map;
  }, [specializationCounts]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return specializations;
    return specializations.filter(
      (s) => s.nameAr.toLowerCase().includes(q) || s.nameEn.toLowerCase().includes(q),
    );
  }, [specializations, searchQuery]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SpecializationFormValues>({
    resolver: zodResolver(specializationSchema),
    defaultValues: {
      nameAr: '',
      nameEn: '',
      icon: 'terminal',
      isActive: true,
    },
  });

  useEffect(() => {
    if (!modalOpen) return;
    if (editingSpec) {
      reset({
        nameAr: editingSpec.nameAr,
        nameEn: editingSpec.nameEn,
        icon: editingSpec.icon,
        isActive: editingSpec.isActive,
      });
    } else {
      reset({
        nameAr: '',
        nameEn: '',
        icon: 'terminal',
        isActive: true,
      });
    }
  }, [modalOpen, editingSpec, reset]);

  const onSubmit = async (values: SpecializationFormValues) => {
    try {
      if (editingSpec) {
        await specializationService.update(editingSpec.id, values);
        showToast(t('admin.specializations.toasts.updated'), 'success');
      } else {
        await specializationService.create(values);
        showToast(t('admin.specializations.toasts.created'), 'success');
      }
      setModalOpen(false);
    } catch (error) {
      const msg =
        isAppServiceError(error) && error.code === 'SPECIALIZATION_DUPLICATE'
          ? t('admin.specializations.toasts.duplicateError')
          : t('admin.specializations.toasts.error');
      showToast(msg, 'error');
    }
  };

  const handleToggle = async (spec: Specialization) => {
    try {
      await specializationService.toggleActive(spec.id);
      showToast(t('admin.specializations.toasts.toggled'), 'info');
    } catch {
      showToast(t('admin.specializations.toasts.error'), 'error');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await specializationService.remove(deleteTarget.id);
      setDeleteTarget(null);
      showToast(t('admin.specializations.toasts.deleted'), 'success');
    } catch (error) {
      setDeleteTarget(null);
      const msg =
        isAppServiceError(error) && error.code === 'SPECIALIZATION_IN_USE'
          ? t('admin.specializations.toasts.inUseError')
          : t('admin.specializations.toasts.error');
      showToast(msg, 'error');
    }
  };

  return (
    <div className="flex flex-col w-full gap-3.5 sm:gap-4">
      {/* Header */}
      <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-xl shadow-[0_4px_14px_-6px_rgba(18,54,92,0.09)] border border-[#C5D8EE]">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-lg sm:text-xl text-[#12365C] font-bold">
            {t('admin.specializations.title')}
          </h1>
          <p className="hidden sm:block text-xs sm:text-[13px] text-[#475569]">
            {t('admin.specializations.subtitle')}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingSpec(null);
            setModalOpen(true);
          }}
          data-testid="add-specialization-btn"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#12365C] hover:bg-[#1769B5] text-white font-bold text-xs sm:text-[13px] transition-colors shadow-xs cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 text-[#F5C928]" aria-hidden="true" />
          <span>{t('admin.specializations.addButton')}</span>
        </button>
      </section>

      {/* Search */}
      <div className="bg-white rounded-xl p-3 shadow-[0_4px_14px_-6px_rgba(18,54,92,0.08)] border border-[#C5D8EE]">
        <div className="relative max-w-md">
          <Search
            className="w-3.5 h-3.5 absolute start-3 top-1/2 -translate-y-1/2 text-[#475569] pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('admin.specializations.searchPlaceholder')}
            aria-label={t('admin.specializations.searchPlaceholder')}
            className="w-full h-9 ps-9 pe-3 rounded-lg bg-[#F8FBFF] border border-[#BBD0E8] text-[#12365C] placeholder:text-[#64748B] font-medium text-xs sm:text-[13px] focus:bg-white focus:outline-none focus:border-[#1769B5] focus:ring-2 focus:ring-[#1769B5]/20"
          />
        </div>
      </div>

      {/* Specializations Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-3.5">
        {filtered.map((spec) => {
          const count = registrationCounts.get(spec.id) ?? 0;
          return (
            <article
              key={spec.id}
              data-testid={`specialization-card-${spec.id}`}
              className={`bg-white rounded-xl p-4 shadow-[0_4px_14px_-6px_rgba(18,54,92,0.09)] border transition-all flex flex-col justify-between gap-3 ${
                spec.isActive
                  ? 'border-[#C5D8EE] hover:border-[#1769B5]/60 hover:shadow-md'
                  : 'border-[#CBD5E1] opacity-80 bg-[#F8FAFC]'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-[#EAF1FA] border border-[#D4E2F4] flex items-center justify-center shrink-0">
                    <SpecializationIcon icon={spec.icon} className="w-4 h-4 text-[#1769B5]" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="type-label-md text-[#12365C] font-bold truncate">
                      {language === 'ar' ? spec.nameAr : spec.nameEn}
                    </h2>
                    <p className="text-xs text-[#52637A] truncate">
                      {language === 'ar' ? spec.nameEn : spec.nameAr}
                    </p>
                  </div>
                </div>

                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold shrink-0 ${
                    spec.isActive
                      ? 'bg-[#DCFCE7] text-[#166534] border border-[#86EFAC]'
                      : 'bg-[#E2E8F0] text-[#475569] border border-[#CBD5E1]'
                  }`}
                >
                  {spec.isActive
                    ? t('admin.specializations.statusActive')
                    : t('admin.specializations.statusInactive')}
                </span>
              </div>

              <div className="flex items-center justify-between pt-2.5 border-t border-[#E4EDF7]">
                <span className="text-xs text-[#475569] font-medium">
                  {t('admin.specializations.registrationsCount', { count })}
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => void handleToggle(spec)}
                    data-testid={`toggle-spec-${spec.id}`}
                    title={
                      spec.isActive
                        ? t('admin.specializations.toggleDisable')
                        : t('admin.specializations.toggleEnable')
                    }
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                      spec.isActive
                        ? 'bg-[#FEF3C7] text-[#92400E] border border-[#FCD34D] hover:bg-[#FDE68A]'
                        : 'bg-[#DBEAFE] text-[#1E40AF] border border-[#93C5FD] hover:bg-[#1769B5] hover:text-white'
                    }`}
                  >
                    <Power className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>
                      {spec.isActive
                        ? t('admin.specializations.toggleDisable')
                        : t('admin.specializations.toggleEnable')}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingSpec(spec);
                      setModalOpen(true);
                    }}
                    data-testid={`edit-spec-${spec.id}`}
                    aria-label={t('common.edit')}
                    className="p-2 rounded-lg text-[#475569] hover:bg-[#EAF1FA] hover:text-[#12365C] transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4" aria-hidden="true" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeleteTarget(spec)}
                    data-testid={`delete-spec-${spec.id}`}
                    aria-label={t('common.delete')}
                    className="p-2 rounded-lg text-[#DC2626] hover:bg-[#FEE2E2] transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          editingSpec
            ? t('admin.specializations.editModalTitle')
            : t('admin.specializations.addModalTitle')
        }
      >
        <form
          noValidate
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
          data-testid="specialization-form"
        >
          <div className="flex flex-col gap-1.5">
            <label htmlFor="spec-nameAr" className="type-label-md text-primary font-medium">
              {t('admin.specializations.nameArLabel')} *
            </label>
            <input
              id="spec-nameAr"
              type="text"
              dir="rtl"
              {...register('nameAr')}
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-on-surface type-body-sm focus:outline-none focus:border-brand-blue"
            />
            {errors.nameAr?.message && (
              <span className="type-label-sm text-error flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{t(errors.nameAr.message)}</span>
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="spec-nameEn" className="type-label-md text-primary font-medium">
              {t('admin.specializations.nameEnLabel')} *
            </label>
            <input
              id="spec-nameEn"
              type="text"
              dir="ltr"
              {...register('nameEn')}
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-on-surface type-body-sm text-left focus:outline-none focus:border-brand-blue"
            />
            {errors.nameEn?.message && (
              <span className="type-label-sm text-error flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{t(errors.nameEn.message)}</span>
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="spec-icon" className="type-label-md text-primary font-medium">
              {t('admin.specializations.iconLabel')}
            </label>
            <select
              id="spec-icon"
              {...register('icon')}
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-on-surface type-body-sm focus:outline-none focus:border-brand-blue"
            >
              {ICON_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {language === 'ar' ? opt.labelAr : opt.labelEn}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer select-none pt-1">
            <input
              type="checkbox"
              {...register('isActive')}
              className="w-4 h-4 rounded accent-primary cursor-pointer"
            />
            <span className="type-body-sm text-on-surface">
              {t('admin.specializations.activeLabel')}
            </span>
          </label>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-outline-variant/20">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-surface-container text-on-surface hover:bg-surface-container-high type-label-md cursor-pointer"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              data-testid="save-specialization-btn"
              className="px-5 py-2 rounded-xl bg-primary text-on-primary hover:bg-secondary type-label-md cursor-pointer disabled:opacity-60"
            >
              {t('common.save')}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void handleConfirmDelete()}
        title={t('admin.specializations.deleteTitle')}
        message={t('admin.specializations.deleteMessage', {
          name: deleteTarget
            ? language === 'ar'
              ? deleteTarget.nameAr
              : deleteTarget.nameEn
            : '',
        })}
      />
    </div>
  );
}
