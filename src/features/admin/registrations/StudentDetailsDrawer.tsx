import { useEffect, useState } from 'react';
import {
  Award,
  Badge,
  CheckCircle2,
  ExternalLink,
  Hourglass,
  SlidersHorizontal,
  StickyNote,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import { StatusBadge } from '@/components/common/StatusBadge';
import { useAppData } from '@/app/providers/AppDataProvider';
import { useToast } from '@/app/providers/ToastProvider';
import { useLanguage } from '@/hooks/useLanguage';
import { registrationService } from '@/services/registrations/registrationService';
import type { RegistrationStatus, StudentRegistration } from '@/types/domain';
import { formatRelativeDate, getInitials, stripAtPrefix } from '@/utils/formatters';

interface StudentDetailsDrawerProps {
  registration: StudentRegistration | null;
  onClose: () => void;
  onEdit: (registration: StudentRegistration) => void;
  onRequestDelete: (registration: StudentRegistration) => void;
}

export function StudentDetailsDrawer({
  registration,
  onClose,
  onEdit,
  onRequestDelete,
}: StudentDetailsDrawerProps) {
  const { language, t } = useLanguage();
  const { showToast } = useToast();
  const { registrations } = useAppData();

  // Keep synced with live store updates
  const liveReg =
    registrations.find((item) => item.id === registration?.id) ?? registration;

  const [notes, setNotes] = useState(liveReg?.adminNotes ?? '');
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    setNotes(liveReg?.adminNotes ?? '');
  }, [liveReg?.id, liveReg?.adminNotes]);

  useEffect(() => {
    if (!liveReg) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [liveReg, onClose]);

  if (!liveReg) return null;

  const handleStatusChange = async (status: RegistrationStatus) => {
    await registrationService.updateStatus(liveReg.id, status);
    showToast(t('admin.registrations.toasts.statusUpdated'), 'success');
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      await registrationService.update(liveReg.id, { adminNotes: notes });
      showToast(t('admin.registrations.toasts.notesSaved'), 'success');
    } finally {
      setSavingNotes(false);
    }
  };

  const cleanInsta = stripAtPrefix(liveReg.instagramHandle);

  return (
    <div
      className="fixed inset-0 z-50 bg-primary/40 backdrop-blur-xs flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-student-name"
      data-testid="student-details-drawer"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-xl bg-surface-container-lowest shadow-2xl flex flex-col justify-between h-full overflow-y-auto">
        <div>
          {/* Drawer Header */}
          <div className="p-5 sm:p-6 bg-[#EFF5FC] flex items-start justify-between gap-4 border-b border-[#C5D8EE]">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-[#12365C] text-[#F5C928] flex items-center justify-center type-headline-sm font-bold shadow-md shrink-0">
                {getInitials(liveReg.firstName, liveReg.lastName)}
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2
                    id="drawer-student-name"
                    className="type-headline-md text-[#12365C] font-bold truncate"
                  >
                    {liveReg.firstName} {liveReg.lastName}
                  </h2>
                  <StatusBadge status={liveReg.status} showDot={false} />
                </div>
                <span className="type-label-md text-[#475569] font-mono mt-0.5">
                  {liveReg.referenceId} • {formatRelativeDate(liveReg.createdAt, language)}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('common.close')}
              data-testid="close-drawer-btn"
              className="p-1.5 rounded-lg text-[#12365C] bg-white border border-[#C5D8EE] hover:bg-[#DCE9F8] transition-colors cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          {/* Drawer Body */}
          <div className="p-6 flex flex-col gap-6">
            {/* Academic & Contact Details */}
            <div className="flex flex-col gap-3">
              <h3 className="type-label-lg text-primary font-bold flex items-center gap-2">
                <Badge className="w-4 h-4 text-secondary" aria-hidden="true" />
                <span>{t('admin.registrations.drawer.academicContact')}</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-surface-container-low p-4 rounded-xl">
                <div className="flex flex-col">
                  <span className="type-label-sm text-on-surface-variant">
                    {t('admin.registrations.drawer.university')}
                  </span>
                  <span className="type-label-md text-on-surface font-medium mt-0.5">
                    {liveReg.university || t('admin.registrations.drawer.notProvided')}
                  </span>
                </div>

                <div className="flex flex-col">
                  <span className="type-label-sm text-on-surface-variant">
                    {t('admin.registrations.drawer.specialization')}
                  </span>
                  <span className="type-label-md text-on-surface font-medium mt-0.5">
                    {language === 'ar'
                      ? liveReg.specializationNameAr
                      : liveReg.specializationNameEn}
                  </span>
                </div>

                <div className="flex flex-col">
                  <span className="type-label-sm text-on-surface-variant">
                    {t('admin.registrations.drawer.email')}
                  </span>
                  <span
                    dir="ltr"
                    className="type-label-md text-on-surface font-mono mt-0.5 text-start"
                  >
                    {liveReg.email || t('admin.registrations.drawer.notProvided')}
                  </span>
                </div>

                <div className="flex flex-col">
                  <span className="type-label-sm text-on-surface-variant">
                    {t('admin.registrations.drawer.phone')}
                  </span>
                  <span
                    dir="ltr"
                    className="type-label-md text-on-surface font-mono mt-0.5 text-start"
                  >
                    {liveReg.phone || t('admin.registrations.drawer.notProvided')}
                  </span>
                </div>

                <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-outline-variant/25">
                  <span className="type-label-sm text-on-surface-variant">
                    {t('admin.registrations.drawer.officialInstagram')}
                  </span>
                  <a
                    href={`https://instagram.com/${cleanInsta}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-surface-container-lowest text-secondary type-label-md shadow-2xs hover:shadow-xs transition-shadow"
                  >
                    <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                    <span dir="ltr" className="font-mono">
                      {liveReg.instagramHandle}
                    </span>
                  </a>
                </div>
              </div>
            </div>

            {/* Event Track */}
            <div className="flex flex-col gap-3">
              <h3 className="type-label-lg text-primary font-bold flex items-center gap-2">
                <Award className="w-4 h-4 text-tertiary" aria-hidden="true" />
                <span>{t('admin.registrations.drawer.selectedTrack')}</span>
              </h3>
              <div className="p-4 bg-surface-container-low rounded-xl flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-col">
                  <span className="type-label-md text-primary font-medium">
                    {t('admin.registrations.drawer.trackTitle')}
                  </span>
                  <span className="type-label-sm text-on-surface-variant">
                    {t('admin.registrations.drawer.trackSubtitle')}
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-tertiary-fixed text-on-tertiary-fixed type-label-sm font-medium">
                  {t('admin.registrations.drawer.seatConfirmed')}
                </span>
              </div>
            </div>

            {/* Quick Status Control */}
            <div className="flex flex-col gap-3">
              <h3 className="type-label-lg text-primary font-bold flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-secondary" aria-hidden="true" />
                <span>{t('admin.registrations.drawer.updateStatus')}</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => void handleStatusChange('approved')}
                  data-testid="drawer-accept-btn"
                  className="py-2.5 px-3 rounded-lg bg-[#16A34A] text-white hover:bg-[#15803D] font-bold type-label-sm flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                  <span>{t('admin.registrations.acceptAction')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => void handleStatusChange('pending')}
                  data-testid="drawer-pending-btn"
                  className="py-2.5 px-3 rounded-lg bg-[#FEF3C7] text-[#92400E] border border-[#FCD34D] hover:bg-[#FDE68A] font-bold type-label-sm flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
                >
                  <Hourglass className="w-4 h-4" aria-hidden="true" />
                  <span>{t('admin.registrations.pendingAction')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => void handleStatusChange('rejected')}
                  data-testid="drawer-reject-btn"
                  className="py-2.5 px-3 rounded-lg bg-[#FEE2E2] text-[#991B1B] border border-[#FCA5A5] hover:bg-[#DC2626] hover:text-white font-bold type-label-sm flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
                >
                  <XCircle className="w-4 h-4" aria-hidden="true" />
                  <span>{t('admin.registrations.rejectAction')}</span>
                </button>
              </div>
            </div>

            {/* Admin Notes */}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="type-label-lg text-primary font-bold flex items-center gap-2">
                  <StickyNote className="w-4 h-4 text-primary" aria-hidden="true" />
                  <span>{t('admin.registrations.drawer.adminNotes')}</span>
                </h3>
                <span className="type-label-sm text-on-surface-variant">
                  {t('admin.registrations.drawer.adminNotesPrivate')}
                </span>
              </div>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('admin.registrations.drawer.adminNotesPlaceholder')}
                className="w-full p-3.5 rounded-xl bg-surface-container-low text-on-surface placeholder:text-on-surface-variant type-body-sm border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-secondary/40 resize-none"
              />
              <button
                type="button"
                disabled={savingNotes}
                onClick={() => void handleSaveNotes()}
                className="self-end px-4 py-2 rounded-lg bg-primary-container text-on-primary hover:bg-secondary type-label-sm transition-all shadow-xs cursor-pointer disabled:opacity-60"
              >
                {t('admin.registrations.drawer.saveNotes')}
              </button>
            </div>
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="p-4 bg-surface-container-low border-t border-outline-variant/25 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onRequestDelete(liveReg)}
            data-testid="drawer-delete-btn"
            className="px-4 py-2 rounded-lg text-error hover:bg-error-container/30 type-label-sm flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" aria-hidden="true" />
            <span>{t('admin.registrations.drawer.deleteRegistration')}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onEdit(liveReg)}
              data-testid="drawer-edit-btn"
              className="px-4 py-2 rounded-lg bg-surface-container text-on-surface hover:bg-surface-container-high type-label-sm transition-colors cursor-pointer"
            >
              {t('admin.registrations.editAction')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-lg bg-primary text-on-primary hover:bg-secondary type-label-sm shadow-xs transition-all cursor-pointer"
            >
              {t('common.done')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
