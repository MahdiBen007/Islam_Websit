import type { RegistrationStatus } from '@/types/domain';
import { useLanguage } from '@/hooks/useLanguage';

interface StatusBadgeProps {
  status: RegistrationStatus;
  showDot?: boolean;
}

export function StatusBadge({ status, showDot = true }: StatusBadgeProps) {
  const { t } = useLanguage();

  const styles: Record<RegistrationStatus, { pill: string; dot: string; label: string }> = {
    new: {
      pill: 'bg-[#DBEAFE] text-[#1E40AF] border border-[#93C5FD]',
      dot: 'bg-[#1D4ED8]',
      label: t('admin.registrations.statusNew'),
    },
    pending: {
      pill: 'bg-[#FEF3C7] text-[#92400E] border border-[#FCD34D]',
      dot: 'bg-[#D97706]',
      label: t('admin.registrations.statusPending'),
    },
    approved: {
      pill: 'bg-[#DCFCE7] text-[#166534] border border-[#86EFAC]',
      dot: 'bg-[#16A34A]',
      label: t('admin.registrations.statusApproved'),
    },
    rejected: {
      pill: 'bg-[#FEE2E2] text-[#991B1B] border border-[#FCA5A5]',
      dot: 'bg-[#DC2626]',
      label: t('admin.registrations.statusRejected'),
    },
  };

  const current = styles[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold whitespace-nowrap ${current.pill}`}
    >
      {showDot && <span className={`w-1.5 h-1.5 rounded-full ${current.dot}`} aria-hidden="true" />}
      <span>{current.label}</span>
    </span>
  );
}
