import { AlertTriangle } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { useLanguage } from '@/hooks/useLanguage';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  isLoading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  cancelLabel,
  variant = 'danger',
  isLoading = false,
}: ConfirmDialogProps) {
  const { t } = useLanguage();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidthClass="max-w-md">
      <div className="flex flex-col gap-5">
        <div className="flex items-start gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              variant === 'danger'
                ? 'bg-error-container text-error'
                : 'bg-secondary-fixed text-secondary'
            }`}
          >
            <AlertTriangle className="w-5 h-5" aria-hidden="true" />
          </div>
          <p className="type-body-md text-on-surface-variant leading-relaxed">{message}</p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface type-label-md transition-colors cursor-pointer disabled:opacity-50"
          >
            {cancelLabel ?? t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            data-testid="confirm-dialog-submit"
            className={`px-5 py-2 rounded-xl type-label-md transition-colors cursor-pointer disabled:opacity-50 ${
              variant === 'danger'
                ? 'bg-error text-on-error hover:bg-error/90'
                : 'bg-primary text-on-primary hover:bg-secondary'
            }`}
          >
            {isLoading ? t('common.loading') : (confirmLabel ?? t('common.confirm'))}
          </button>
        </div>
      </div>
    </Modal>
  );
}
