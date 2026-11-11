import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  Filter,
  GraduationCap,
  Hourglass,
  Info,
  Navigation,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import { DirectionalArrow } from '@/components/common/DirectionalArrow';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import { useAppData } from '@/app/providers/AppDataProvider';
import { useToast } from '@/app/providers/ToastProvider';
import { useLanguage } from '@/hooks/useLanguage';
import { registrationService } from '@/services/registrations/registrationService';
import { settingsService } from '@/services/settings/settingsService';
import type { RegistrationStatus, StudentRegistration } from '@/types/domain';
import { formatRelativeDate, getInitials } from '@/utils/formatters';
import { RegistrationRowActions } from '@/features/admin/registrations/RegistrationRowActions';
import { StudentDetailsDrawer } from '@/features/admin/registrations/StudentDetailsDrawer';
import { StudentFormModal } from '@/features/admin/registrations/StudentFormModal';

export function AdminDashboardPage() {
  const { registrations, stats, pageSettings } = useAppData();
  const { language, t } = useLanguage();
  const { showToast } = useToast();

  const [quickFilter, setQuickFilter] = useState<'all' | 'pending'>('all');
  const [selectedStudent, setSelectedStudent] = useState<StudentRegistration | null>(null);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentRegistration | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StudentRegistration | null>(null);

  const toggleRegistrationAvailability = async () => {
    try {
      const nextOpen = !pageSettings.isRegistrationOpen;
      await settingsService.updatePageSettings({
        ...pageSettings,
        isRegistrationOpen: nextOpen,
      });
      showToast(
        nextOpen ? t('admin.dashboard.regOpenBadge') : t('admin.dashboard.regClosedBadge'),
        'info',
      );
    } catch {
      showToast(t('admin.eventSettings.saveErrorToast'), 'error');
    }
  };

  const handleStatusChange = async (id: string, status: RegistrationStatus) => {
    try {
      await registrationService.updateStatus(id, status);
      showToast(t('admin.registrations.toasts.statusUpdated'), 'success');
    } catch {
      showToast(t('admin.eventSettings.saveErrorToast'), 'error');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await registrationService.remove(deleteTarget.id);
      if (selectedStudent?.id === deleteTarget.id) {
        setSelectedStudent(null);
      }
      setDeleteTarget(null);
      showToast(t('admin.registrations.toasts.deleted'), 'success');
    } catch {
      setDeleteTarget(null);
      showToast(t('admin.eventSettings.saveErrorToast'), 'error');
    }
  };

  const filteredRecent = (
    quickFilter === 'pending'
      ? registrations.filter((r) => r.status === 'pending' || r.status === 'new')
      : registrations
  ).slice(0, 5);

  return (
    <div className="flex flex-col w-full gap-3.5 sm:gap-4">
      {/* Executive Welcome Banner (Sleek & compact across all screens) */}
      <section className="relative overflow-hidden flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-gradient-to-br from-[#0F2C4C] via-[#12365C] to-[#175799] text-white px-4 py-3 sm:px-5 sm:py-3.5 rounded-xl shadow-[0_8px_24px_-10px_rgba(18,54,92,0.38)] border border-[#1E538A]">
        <div
          className="absolute -top-12 -end-12 w-36 h-36 rounded-full bg-[#F5C928]/15 blur-2xl pointer-events-none"
          aria-hidden="true"
        />
        <div className="relative z-10 flex flex-col gap-0.5 min-w-0">
          <h1 className="text-base sm:text-lg text-white font-bold leading-snug">
            {t('admin.dashboard.welcomeTitle')}
          </h1>
          <p className="hidden sm:block text-xs text-[#DBEAFE]">
            {t('admin.dashboard.welcomeSubtitle')}
          </p>
        </div>
        <div className="relative z-10 flex items-center shrink-0">
          <Link
            to="/admin/registrations"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-[#F5C928] hover:bg-[#eab814] text-[#12365C] font-bold rounded-lg text-xs sm:text-[13px] transition-all shadow-[0_4px_14px_rgba(245,201,40,0.35)] whitespace-nowrap"
          >
            <Users className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{t('admin.dashboard.viewAllRegistrations')}</span>
          </Link>
        </div>
      </section>

      {/* Exactly 3 KPI Cards */}
      <section aria-label="Key Statistics" className="grid grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3.5">
        {/* Card 1: Total Registered */}
        <div className="col-span-2 md:col-span-1 bg-white p-3 sm:p-3.5 rounded-xl shadow-[0_4px_14px_-6px_rgba(18,54,92,0.1)] border border-[#C5D8EE] border-t-3 border-t-[#12365C] flex items-center justify-between gap-2.5 hover:shadow-md transition-all">
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[11px] sm:text-xs text-[#475569] font-medium truncate">
              {t('admin.dashboard.kpiTotal')}
            </span>
            <span
              data-testid="kpi-total-count"
              className="text-xl sm:text-2xl leading-tight text-[#12365C] font-bold"
            >
              {stats.total}
            </span>
            <span className="hidden sm:block text-[11px] text-[#1769B5] font-medium truncate">
              {t('admin.dashboard.kpiTotalHint')}
            </span>
          </div>
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[#DBEAFE] text-[#1769B5] flex items-center justify-center shrink-0">
            <Users className="w-4 h-4" aria-hidden="true" />
          </div>
        </div>

        {/* Card 2: Pending Review */}
        <div className="bg-white p-3 sm:p-3.5 rounded-xl shadow-[0_4px_14px_-6px_rgba(18,54,92,0.1)] border border-[#C5D8EE] border-t-3 border-t-[#D97706] flex items-center justify-between gap-2 hover:shadow-md transition-all">
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[11px] sm:text-xs text-[#475569] font-medium truncate">
              {t('admin.dashboard.kpiPending')}
            </span>
            <span
              data-testid="kpi-pending-count"
              className="text-xl sm:text-2xl leading-tight text-[#B45309] font-bold"
            >
              {stats.pending}
            </span>
            <span className="hidden sm:flex text-[11px] text-[#92400E] font-medium items-center gap-1 leading-snug">
              <Hourglass className="w-3 h-3 shrink-0" aria-hidden="true" />
              <span>{t('admin.dashboard.kpiPendingHint')}</span>
            </span>
          </div>
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[#FEF3C7] text-[#B45309] flex items-center justify-center shrink-0">
            <Hourglass className="w-4 h-4" aria-hidden="true" />
          </div>
        </div>

        {/* Card 3: Accepted */}
        <div className="bg-white p-3 sm:p-3.5 rounded-xl shadow-[0_4px_14px_-6px_rgba(18,54,92,0.1)] border border-[#C5D8EE] border-t-3 border-t-[#16A34A] flex items-center justify-between gap-2 hover:shadow-md transition-all">
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[11px] sm:text-xs text-[#475569] font-medium truncate">
              {t('admin.dashboard.kpiAccepted')}
            </span>
            <span
              data-testid="kpi-accepted-count"
              className="text-xl sm:text-2xl leading-tight text-[#15803D] font-bold"
            >
              {stats.approved}
            </span>
            <span className="hidden sm:flex text-[11px] text-[#166534] font-medium items-center gap-1 leading-snug">
              <CheckCircle2 className="w-3 h-3 shrink-0" aria-hidden="true" />
              <span>{t('admin.dashboard.kpiAcceptedHint')}</span>
            </span>
          </div>
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[#DCFCE7] text-[#15803D] flex items-center justify-center shrink-0">
            <UserCheck className="w-4 h-4" aria-hidden="true" />
          </div>
        </div>
      </section>

      {/* Registration Status & Quick Actions (Compact harmonious ratio across all widths) */}
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-3.5">
        {/* Registration Status Card */}
        <div className="xl:col-span-5 bg-white p-3.5 sm:p-4 rounded-xl shadow-[0_4px_14px_-6px_rgba(18,54,92,0.1)] border border-[#C5D8EE] flex flex-col justify-between gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm sm:text-base text-[#12365C] font-bold">
              {t('admin.dashboard.regStatusTitle')}
            </h2>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                pageSettings.isRegistrationOpen
                  ? 'bg-[#DCFCE7] text-[#166534] border border-[#86EFAC]'
                  : 'bg-[#FEE2E2] text-[#991B1B] border border-[#FCA5A5]'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  pageSettings.isRegistrationOpen ? 'bg-[#16A34A]' : 'bg-[#DC2626]'
                }`}
                aria-hidden="true"
              />
              <span>
                {pageSettings.isRegistrationOpen
                  ? t('admin.dashboard.regOpenBadge')
                  : t('admin.dashboard.regClosedBadge')}
              </span>
            </span>
          </div>

          <div className="flex items-center justify-between gap-3 p-3 bg-[#F4F8FD] border border-[#D4E2F4] rounded-lg">
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-xs sm:text-[13px] text-[#12365C] font-bold">
                {t('admin.dashboard.regToggleTitle')}
              </span>
              <span className="hidden sm:block text-[11px] sm:text-xs text-[#475569]">
                {t('admin.dashboard.regToggleDesc')}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span
                className={`text-[11px] font-bold ${
                  pageSettings.isRegistrationOpen ? 'text-[#15803D]' : 'text-[#DC2626]'
                }`}
              >
                {pageSettings.isRegistrationOpen
                  ? t('admin.dashboard.regToggleOpenLabel')
                  : t('admin.dashboard.regToggleClosedLabel')}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={pageSettings.isRegistrationOpen}
                aria-label={t('admin.dashboard.regToggleTitle')}
                data-testid="dashboard-reg-toggle"
                onClick={() => void toggleRegistrationAvailability()}
                className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer flex items-center ${
                  pageSettings.isRegistrationOpen
                    ? 'bg-[#16A34A] justify-end'
                    : 'bg-[#94A3B8] justify-start'
                }`}
              >
                <span className="w-5 h-5 bg-white rounded-full shadow-md" />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] sm:text-xs text-[#475569]">
            <span className="flex items-center gap-1 font-medium">
              <Info className="w-3.5 h-3.5 text-[#1769B5]" aria-hidden="true" />
              <span>
                {t('admin.dashboard.capacityText', {
                  current: stats.total,
                  max: stats.capacity,
                })}
              </span>
            </span>
            <span className="text-[#B45309] font-bold">
              {t('admin.dashboard.remainingSeatsText', { count: stats.remainingSeats })}
            </span>
          </div>
        </div>

        {/* Quick Navigation Shortcuts */}
        <div className="xl:col-span-7 bg-white p-3.5 sm:p-4 rounded-xl shadow-[0_4px_14px_-6px_rgba(18,54,92,0.1)] border border-[#C5D8EE] flex flex-col justify-between gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Navigation className="w-4 h-4 text-[#1769B5]" aria-hidden="true" />
              <h2 className="text-sm sm:text-base text-[#12365C] font-bold">
                {t('admin.dashboard.quickActionsTitle')}
              </h2>
            </div>
            <span className="text-[11px] text-[#64748B]">{t('admin.dashboard.quickActionsHint')}</span>
          </div>

          <div className="grid grid-cols-2 xl:grid-cols-4 gap-2">
            <Link
              to="/admin/registrations"
              className="flex flex-col items-center justify-center p-2.5 rounded-lg bg-[#F4F8FD] border border-[#D4E2F4] hover:border-[#12365C] hover:bg-[#12365C] hover:text-white text-[#12365C] transition-all group text-center gap-1"
            >
              <div className="w-8 h-8 rounded-lg bg-[#DBEAFE] group-hover:bg-white/15 text-[#1769B5] group-hover:text-[#F5C928] flex items-center justify-center transition-colors">
                <Users className="w-4 h-4" aria-hidden="true" />
              </div>
              <span className="text-xs font-bold leading-tight">
                {t('admin.dashboard.actionRegistrations')}
              </span>
            </Link>

            <Link
              to="/admin/specializations"
              className="flex flex-col items-center justify-center p-2.5 rounded-lg bg-[#F4F8FD] border border-[#D4E2F4] hover:border-[#12365C] hover:bg-[#12365C] hover:text-white text-[#12365C] transition-all group text-center gap-1"
            >
              <div className="w-8 h-8 rounded-lg bg-[#E0F2FE] group-hover:bg-white/15 text-[#0369A1] group-hover:text-[#F5C928] flex items-center justify-center transition-colors">
                <GraduationCap className="w-4 h-4" aria-hidden="true" />
              </div>
              <span className="text-xs font-bold leading-tight">
                {t('admin.dashboard.actionSpecializations')}
              </span>
            </Link>

            <Link
              to="/admin/event-settings"
              className="flex flex-col items-center justify-center p-2.5 rounded-lg bg-[#F4F8FD] border border-[#D4E2F4] hover:border-[#12365C] hover:bg-[#12365C] hover:text-white text-[#12365C] transition-all group text-center gap-1"
            >
              <div className="w-8 h-8 rounded-lg bg-[#FEF3C7] group-hover:bg-white/15 text-[#B45309] group-hover:text-[#F5C928] flex items-center justify-center transition-colors">
                <CalendarDays className="w-4 h-4" aria-hidden="true" />
              </div>
              <span className="text-xs font-bold leading-tight">
                {t('admin.dashboard.actionEventSettings')}
              </span>
            </Link>

            <Link
              to="/"
              className="flex flex-col items-center justify-center p-2.5 rounded-lg bg-[#F4F8FD] border border-[#D4E2F4] hover:border-[#12365C] hover:bg-[#12365C] hover:text-white text-[#12365C] transition-all group text-center gap-1"
            >
              <div className="w-8 h-8 rounded-lg bg-[#DCFCE7] group-hover:bg-white/15 text-[#15803D] group-hover:text-[#F5C928] flex items-center justify-center transition-colors">
                <ExternalLink className="w-4 h-4" aria-hidden="true" />
              </div>
              <span className="text-xs font-bold leading-tight">
                {t('admin.dashboard.actionPreviewPage')}
              </span>
            </Link>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                setEditingStudent(null);
                setFormModalOpen(true);
              }}
              className="inline-flex items-center gap-1 text-[#1769B5] hover:text-[#12365C] text-xs font-bold transition-colors cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{t('admin.dashboard.actionAddManual')}</span>
            </button>
          </div>
        </div>
      </section>

      {/* Latest Registrations (Unified compact table on md+/medium/desktop; clean cards on mobile <768px) */}
      <section className="bg-white p-3.5 sm:p-4 rounded-xl shadow-[0_4px_14px_-6px_rgba(18,54,92,0.1)] border border-[#C5D8EE] flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
          <div>
            <h2 className="text-sm sm:text-base text-[#12365C] font-bold">
              {t('admin.dashboard.recentTitle')}
            </h2>
            <p className="hidden sm:block text-xs text-[#475569]">
              {t('admin.dashboard.recentSubtitle')}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setQuickFilter((prev) => (prev === 'all' ? 'pending' : 'all'))}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors flex items-center gap-1.5 cursor-pointer ${
                quickFilter === 'pending'
                  ? 'bg-[#FEF3C7] text-[#92400E] border-[#FCD34D]'
                  : 'bg-[#F4F8FD] text-[#12365C] border-[#C5D8EE] hover:bg-[#E5EFFA]'
              }`}
            >
              <Filter className="w-3.5 h-3.5" aria-hidden="true" />
              <span>
                {quickFilter === 'pending'
                  ? t('admin.registrations.statusPending')
                  : t('admin.dashboard.filterQuick')}
              </span>
            </button>
            <Link
              to="/admin/registrations"
              className="px-3 py-1.5 bg-[#12365C] text-white text-xs font-semibold rounded-lg hover:bg-[#1769B5] transition-colors inline-flex items-center gap-1.5"
            >
              <span>{t('admin.dashboard.viewAllRegistrations')}</span>
              <DirectionalArrow className="w-3.5 h-3.5" direction="forward" />
            </Link>
          </div>
        </div>

        {/* Sleek Table on Tablet / Medium Laptop / Desktop (md: 768px+) — no orphan 5th card */}
        <div className="hidden md:block w-full rounded-xl border border-[#D4E2F4] overflow-hidden">
          <table className="w-full text-start border-collapse">
            <thead>
              <tr className="bg-[#EAF1FA] text-[#12365C] text-xs font-bold border-b border-[#C5D8EE]">
                <th className="py-2.5 px-3 text-start">{t('admin.registrations.colStudentName')}</th>
                <th className="py-2.5 px-3 text-start">
                  {t('admin.registrations.colSpecialization')}
                </th>
                <th className="py-2.5 px-3 text-start">{t('admin.registrations.colInstagram')}</th>
                <th className="hidden xl:table-cell py-2.5 px-3 text-start">
                  {t('admin.registrations.colDate')}
                </th>
                <th className="py-2.5 px-3 text-start">{t('admin.registrations.colStatus')}</th>
                <th className="py-2.5 px-2.5 text-center">{t('admin.registrations.colActions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2ECF8] text-xs sm:text-[13px] text-[#15243B]">
              {filteredRecent.map((reg) => (
                <tr key={reg.id} className="hover:bg-[#F3F8FE] transition-colors">
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-[#12365C] text-[#F5C928] flex items-center justify-center text-[11px] font-bold shrink-0">
                        {getInitials(reg.firstName, reg.lastName)}
                      </div>
                      <span className="text-[#12365C] font-semibold truncate">
                        {reg.firstName} {reg.lastName}
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-[#475569] max-w-[160px] xl:max-w-none">
                    <span className="block truncate">
                      {language === 'ar' ? reg.specializationNameAr : reg.specializationNameEn}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[#1769B5] font-medium text-xs" dir="ltr">
                    <span className="block text-start truncate max-w-[125px] xl:max-w-none">
                      {reg.instagramHandle}
                    </span>
                  </td>
                  <td className="hidden xl:table-cell py-2.5 px-3 text-[#52637A] text-xs whitespace-nowrap">
                    {formatRelativeDate(reg.createdAt, language)}
                  </td>
                  <td className="py-2.5 px-3">
                    <StatusBadge status={reg.status} showDot={false} />
                  </td>
                  <td className="py-2.5 px-2.5 text-center">
                    <RegistrationRowActions
                      registration={reg}
                      onView={(item) => setSelectedStudent(item)}
                      onStatusChange={(id, status) => void handleStatusChange(id, status)}
                      onEdit={(item) => {
                        setEditingStudent(item);
                        setFormModalOpen(true);
                      }}
                      onDelete={(item) => setDeleteTarget(item)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Single-Column Card List (<768px) */}
        <div className="md:hidden grid grid-cols-1 gap-2.5">
          {filteredRecent.map((reg) => (
            <div
              key={reg.id}
              className="p-3 flex flex-col gap-2 bg-[#F8FBFF] border border-[#D4E2F4] rounded-xl"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-[#12365C] text-[#F5C928] flex items-center justify-center text-[11px] font-bold shrink-0">
                    {getInitials(reg.firstName, reg.lastName)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-[#12365C] font-bold truncate">
                      {reg.firstName} {reg.lastName}
                    </p>
                    <p className="text-[11px] text-[#1769B5] font-mono font-medium" dir="ltr">
                      {reg.instagramHandle}
                    </p>
                  </div>
                </div>
                <StatusBadge status={reg.status} showDot={false} />
              </div>

              <div className="flex items-center justify-between gap-2 text-[11px] text-[#475569]">
                <span className="px-2 py-0.5 rounded bg-[#EAF1FA] border border-[#D4E2F4] text-[#12365C] font-medium truncate max-w-[60%]">
                  {language === 'ar' ? reg.specializationNameAr : reg.specializationNameEn}
                </span>
                <span className="text-[#64748B] shrink-0">
                  {formatRelativeDate(reg.createdAt, language)}
                </span>
              </div>

              <div className="flex items-center justify-end pt-1 border-t border-[#E2ECF8]">
                <RegistrationRowActions
                  registration={reg}
                  testIdPrefix="mobile-dash-"
                  onView={(item) => setSelectedStudent(item)}
                  onStatusChange={(id, status) => void handleStatusChange(id, status)}
                  onEdit={(item) => {
                    setEditingStudent(item);
                    setFormModalOpen(true);
                  }}
                  onDelete={(item) => setDeleteTarget(item)}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between text-[#52637A] text-xs font-medium">
          <span>
            {t('admin.dashboard.showingRecent', {
              shown: filteredRecent.length,
              total: stats.total,
            })}
          </span>
        </div>
      </section>

      <StudentDetailsDrawer
        registration={selectedStudent}
        onClose={() => setSelectedStudent(null)}
        onEdit={(item) => {
          setEditingStudent(item);
          setFormModalOpen(true);
        }}
        onRequestDelete={(item) => setDeleteTarget(item)}
      />

      <StudentFormModal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        editingRegistration={editingStudent}
      />

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void handleConfirmDelete()}
        title={t('admin.registrations.modals.deleteTitle')}
        message={t('admin.registrations.modals.deleteMessage', {
          name: deleteTarget ? `${deleteTarget.firstName} ${deleteTarget.lastName}` : '',
        })}
      />
    </div>
  );
}
