import { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  Edit3,
  Eye,
  Hourglass,
  MoreVertical,
  Trash2,
  XCircle,
} from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import type { RegistrationStatus, StudentRegistration } from '@/types/domain';

interface RegistrationRowActionsProps {
  registration: StudentRegistration;
  onView: (reg: StudentRegistration) => void;
  onStatusChange: (id: string, status: RegistrationStatus) => void;
  onEdit: (reg: StudentRegistration) => void;
  onDelete: (reg: StudentRegistration) => void;
  testIdPrefix?: string;
}

export function RegistrationRowActions({
  registration,
  onView,
  onStatusChange,
  onEdit,
  onDelete,
  testIdPrefix = '',
}: RegistrationRowActionsProps) {
  const { t } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  return (
    <div className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={() => onView(registration)}
        title={t('admin.registrations.viewDetails')}
        aria-label={t('admin.registrations.viewDetails')}
        data-testid={`${testIdPrefix}view-reg-${registration.referenceId}`}
        className="p-1.5 text-secondary hover:bg-surface-container rounded-lg transition-colors cursor-pointer"
      >
        <Eye className="w-4 h-4" aria-hidden="true" />
      </button>

      <div className="relative inline-block" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
          title={t('admin.registrations.actionMenu')}
          aria-label={t('admin.registrations.actionMenu')}
          aria-expanded={menuOpen}
          data-testid={`${testIdPrefix}menu-reg-${registration.referenceId}`}
          className="p-1.5 text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors cursor-pointer"
        >
          <MoreVertical className="w-4 h-4" aria-hidden="true" />
        </button>

        {menuOpen && (
          <div className="absolute end-0 top-8 z-30 w-44 bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant/25 py-1.5 text-start type-label-sm">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onStatusChange(registration.id, 'approved');
              }}
              className="w-full text-start px-3 py-2 text-secondary hover:bg-surface-container flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
              <span>{t('admin.registrations.acceptAction')}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onStatusChange(registration.id, 'pending');
              }}
              className="w-full text-start px-3 py-2 text-tertiary hover:bg-surface-container flex items-center gap-2 cursor-pointer"
            >
              <Hourglass className="w-4 h-4" aria-hidden="true" />
              <span>{t('admin.registrations.pendingAction')}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onStatusChange(registration.id, 'rejected');
              }}
              className="w-full text-start px-3 py-2 text-error hover:bg-error-container/20 flex items-center gap-2 cursor-pointer"
            >
              <XCircle className="w-4 h-4" aria-hidden="true" />
              <span>{t('admin.registrations.rejectAction')}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onEdit(registration);
              }}
              className="w-full text-start px-3 py-2 text-on-surface hover:bg-surface-container flex items-center gap-2 cursor-pointer"
            >
              <Edit3 className="w-4 h-4" aria-hidden="true" />
              <span>{t('admin.registrations.editAction')}</span>
            </button>
            <div className="my-1 border-t border-outline-variant/20" />
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onDelete(registration);
              }}
              className="w-full text-start px-3 py-2 text-error hover:bg-error-container/25 flex items-center gap-2 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" aria-hidden="true" />
              <span>{t('admin.registrations.deleteAction')}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
