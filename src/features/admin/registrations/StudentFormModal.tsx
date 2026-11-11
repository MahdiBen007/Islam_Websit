import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { useAppData } from '@/app/providers/AppDataProvider';
import { useToast } from '@/app/providers/ToastProvider';
import { useLanguage } from '@/hooks/useLanguage';
import { isAppServiceError } from '@/services/api/errors';
import { registrationService } from '@/services/registrations/registrationService';
import type { StudentRegistration } from '@/types/domain';
import { isValidInstagramHandle } from '@/utils/formatters';

const studentFormSchema = z.object({
  firstName: z.string().trim().min(2, 'registration.validation.firstNameRequired'),
  lastName: z.string().trim().min(2, 'registration.validation.lastNameRequired'),
  specializationId: z.string().min(1, 'registration.validation.specializationRequired'),
  instagramHandle: z
    .string()
    .trim()
    .min(1, 'registration.validation.instagramRequired')
    .refine((val) => isValidInstagramHandle(val), 'registration.validation.instagramInvalid'),
  university: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  status: z.enum(['new', 'pending', 'approved', 'rejected']),
});

type StudentFormValues = z.infer<typeof studentFormSchema>;

interface StudentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingRegistration?: StudentRegistration | null;
}

export function StudentFormModal({
  isOpen,
  onClose,
  editingRegistration,
}: StudentFormModalProps) {
  const { specializations } = useAppData();
  const { language, t } = useLanguage();
  const { showToast } = useToast();

  const isEdit = Boolean(editingRegistration);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<StudentFormValues>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      specializationId: '',
      instagramHandle: '',
      university: '',
      email: '',
      phone: '',
      status: 'pending',
    },
  });

  const editId = editingRegistration?.id ?? null;

  useEffect(() => {
    if (!isOpen) return;
    if (editingRegistration) {
      reset({
        firstName: editingRegistration.firstName,
        lastName: editingRegistration.lastName,
        specializationId: editingRegistration.specializationId,
        instagramHandle: editingRegistration.instagramHandle,
        university: editingRegistration.university ?? '',
        email: editingRegistration.email ?? '',
        phone: editingRegistration.phone ?? '',
        status: editingRegistration.status,
      });
    } else {
      reset({
        firstName: '',
        lastName: '',
        specializationId: specializations.find((s) => s.isActive)?.id ?? '',
        instagramHandle: '',
        university: '',
        email: '',
        phone: '',
        status: 'pending',
      });
    }
    // Only initialize form fields when opening the modal or switching target student
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editId, reset]);

  const onSubmit = async (values: StudentFormValues) => {
    try {
      if (editingRegistration) {
        await registrationService.update(editingRegistration.id, values);
        showToast(t('admin.registrations.toasts.savedEdit'), 'success');
      } else {
        await registrationService.createByAdmin({
          firstName: values.firstName,
          lastName: values.lastName,
          specializationId: values.specializationId,
          instagramHandle: values.instagramHandle,
          confirmedAttendance: true,
          university: values.university,
          email: values.email,
          phone: values.phone,
          status: values.status,
        });
        showToast(t('admin.registrations.toasts.addedStudent'), 'success');
      }
      onClose();
    } catch (error) {
      const message =
        isAppServiceError(error) && error.code === 'DUPLICATE_REGISTRATION'
          ? t('registration.duplicateError')
          : t('registration.submitError');
      showToast(message, 'error');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        isEdit
          ? t('admin.registrations.modals.editTitle')
          : t('admin.registrations.modals.addTitle')
      }
      maxWidthClass="max-w-xl"
    >
      <form
        noValidate
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4"
        data-testid="student-form-modal"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="modal-firstName" className="type-label-md text-primary font-medium">
              {t('registration.firstNameLabel')} *
            </label>
            <input
              id="modal-firstName"
              type="text"
              {...register('firstName')}
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-on-surface type-body-sm focus:outline-none focus:border-brand-blue"
            />
            {errors.firstName?.message && (
              <span className="type-label-sm text-error flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{t(errors.firstName.message)}</span>
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="modal-lastName" className="type-label-md text-primary font-medium">
              {t('registration.lastNameLabel')} *
            </label>
            <input
              id="modal-lastName"
              type="text"
              {...register('lastName')}
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-on-surface type-body-sm focus:outline-none focus:border-brand-blue"
            />
            {errors.lastName?.message && (
              <span className="type-label-sm text-error flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{t(errors.lastName.message)}</span>
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="modal-specializationId"
              className="type-label-md text-primary font-medium"
            >
              {t('registration.specializationLabel')} *
            </label>
            <select
              id="modal-specializationId"
              {...register('specializationId')}
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-on-surface type-body-sm focus:outline-none focus:border-brand-blue"
            >
              <option value="">{t('registration.specializationPlaceholder')}</option>
              {specializations.map((spec) => (
                <option key={spec.id} value={spec.id}>
                  {language === 'ar' ? spec.nameAr : spec.nameEn}
                </option>
              ))}
            </select>
            {errors.specializationId?.message && (
              <span className="type-label-sm text-error flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{t(errors.specializationId.message)}</span>
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="modal-instagram" className="type-label-md text-primary font-medium">
              {t('registration.instagramLabel')} *
            </label>
            <input
              id="modal-instagram"
              type="text"
              dir="ltr"
              {...register('instagramHandle')}
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-on-surface type-body-sm text-left focus:outline-none focus:border-brand-blue"
            />
            {errors.instagramHandle?.message && (
              <span className="type-label-sm text-error flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{t(errors.instagramHandle.message)}</span>
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="modal-university" className="type-label-md text-primary font-medium">
              {t('admin.registrations.modals.universityLabel')}
            </label>
            <input
              id="modal-university"
              type="text"
              {...register('university')}
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-on-surface type-body-sm focus:outline-none focus:border-brand-blue"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="modal-status" className="type-label-md text-primary font-medium">
              {t('admin.registrations.modals.statusLabel')}
            </label>
            <select
              id="modal-status"
              {...register('status')}
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-on-surface type-body-sm focus:outline-none focus:border-brand-blue"
            >
              <option value="new">{t('admin.registrations.statusNew')}</option>
              <option value="pending">{t('admin.registrations.statusPending')}</option>
              <option value="approved">{t('admin.registrations.statusApproved')}</option>
              <option value="rejected">{t('admin.registrations.statusRejected')}</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="modal-email" className="type-label-md text-primary font-medium">
              {t('admin.registrations.modals.emailLabel')}
            </label>
            <input
              id="modal-email"
              type="email"
              dir="ltr"
              {...register('email')}
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-on-surface type-body-sm text-left focus:outline-none focus:border-brand-blue"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="modal-phone" className="type-label-md text-primary font-medium">
              {t('admin.registrations.modals.phoneLabel')}
            </label>
            <input
              id="modal-phone"
              type="text"
              dir="ltr"
              {...register('phone')}
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-on-surface type-body-sm text-left focus:outline-none focus:border-brand-blue"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-outline-variant/25">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-surface-container text-on-surface hover:bg-surface-container-high type-label-md transition-colors cursor-pointer"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            data-testid="student-modal-save-btn"
            className="px-5 py-2 rounded-xl bg-primary text-on-primary hover:bg-secondary type-label-md transition-colors cursor-pointer disabled:opacity-60"
          >
            {isSubmitting ? t('common.loading') : t('common.save')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
