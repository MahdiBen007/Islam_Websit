import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  Camera,
  Check,
  ChevronDown,
  Download,
  FilterX,
  Hourglass,
  RefreshCw,
  Search,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import { DirectionalChevron } from '@/components/common/DirectionalArrow';
import { SpecializationIcon } from '@/components/common/SpecializationIcon';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import { useAppData } from '@/app/providers/AppDataProvider';
import { useToast } from '@/app/providers/ToastProvider';
import { useLanguage } from '@/hooks/useLanguage';
import { exportRegistrationsToCsv } from '@/services/exports/exportService';
import { registrationService } from '@/services/registrations/registrationService';
import type { RegistrationStatus, StudentRegistration } from '@/types/domain';
import {
  formatRelativeDate,
  getInitials,
  stripAtPrefix,
} from '@/utils/formatters';
import { RegistrationRowActions } from './RegistrationRowActions';
import { StudentDetailsDrawer } from './StudentDetailsDrawer';
import { StudentFormModal } from './StudentFormModal';

export function RegistrationsManagementPage() {
  const { registrations, specializations, stats, dataVersion, refreshAll } = useAppData();
  const { language, t } = useLanguage();
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [specializationFilter, setSpecializationFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | RegistrationStatus>('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [paginatedRows, setPaginatedRows] = useState<StudentRegistration[]>([]);
  const [totalFiltered, setTotalFiltered] = useState(0);

  const [drawerStudent, setDrawerStudent] = useState<StudentRegistration | null>(null);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentRegistration | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StudentRegistration | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const specIconMap = useMemo(() => {
    const map = new Map<string, (typeof specializations)[number]['icon']>();
    specializations.forEach((s) => map.set(s.id, s.icon));
    return map;
  }, [specializations]);

  const fetchPaginatedRows = useCallback(async () => {
    try {
      const result = await registrationService.listPaginated({
        page,
        pageSize,
        search: searchQuery,
        specializationId: specializationFilter,
        status: statusFilter,
        dateFilter,
      });
      setPaginatedRows(result.items);
      setTotalFiltered(result.totalCount);
    } catch {
      setPaginatedRows([]);
      setTotalFiltered(0);
    }
  }, [page, pageSize, searchQuery, specializationFilter, statusFilter, dateFilter]);

  useEffect(() => {
    let active = true;
    void registrationService
      .listPaginated({
        page,
        pageSize,
        search: searchQuery,
        specializationId: specializationFilter,
        status: statusFilter,
        dateFilter,
      })
      .then((result) => {
        if (!active) return;
        setPaginatedRows(result.items);
        setTotalFiltered(result.totalCount);
      })
      .catch(() => {
        if (!active) return;
        setPaginatedRows([]);
        setTotalFiltered(0);
      });
    return () => {
      active = false;
    };
  }, [page, pageSize, searchQuery, specializationFilter, statusFilter, dateFilter, dataVersion]);

  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const currentPage = Math.min(page, totalPages);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const allVisibleSelected =
    paginatedRows.length > 0 && paginatedRows.every((r) => selectedIds.has(r.id));

  const toggleSelectAllVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        paginatedRows.forEach((r) => next.delete(r.id));
      } else {
        paginatedRows.forEach((r) => next.add(r.id));
      }
      return next;
    });
  };

  const toggleRowSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSpecializationFilter('');
    setStatusFilter('');
    setDateFilter('all');
    setPage(1);
  };

  const handleRefresh = async () => {
    await Promise.all([refreshAll(), fetchPaginatedRows()]);
    showToast(t('admin.registrations.toasts.refreshed'), 'info');
  };

  const handleExportAll = async () => {
    try {
      const result = await registrationService.listPaginated({
        page: 1,
        pageSize: 200,
        search: searchQuery,
        specializationId: specializationFilter,
        status: statusFilter,
        dateFilter,
      });
      exportRegistrationsToCsv(result.items, language);
      showToast(t('admin.registrations.toasts.exported'), 'success');
    } catch {
      showToast(t('admin.eventSettings.saveErrorToast'), 'error');
    }
  };

  const handleExportSelected = () => {
    const rowMap = new Map<string, StudentRegistration>();
    registrations.forEach((r) => rowMap.set(r.id, r));
    paginatedRows.forEach((r) => rowMap.set(r.id, r));
    const selectedRows = Array.from(selectedIds)
      .map((id) => rowMap.get(id))
      .filter((r): r is StudentRegistration => Boolean(r));
    exportRegistrationsToCsv(selectedRows, language);
    showToast(t('admin.registrations.toasts.exported'), 'success');
  };

  const handleStatusChange = async (id: string, status: RegistrationStatus) => {
    try {
      await registrationService.updateStatus(id, status);
      showToast(t('admin.registrations.toasts.statusUpdated'), 'success');
    } catch {
      showToast(t('admin.eventSettings.saveErrorToast'), 'error');
    }
  };

  const handleBulkStatus = async (status: RegistrationStatus) => {
    try {
      const ids = Array.from(selectedIds);
      await registrationService.bulkUpdateStatus(ids, status);
      setSelectedIds(new Set());
      showToast(t('admin.registrations.toasts.bulkUpdated'), 'success');
    } catch {
      showToast(t('admin.eventSettings.saveErrorToast'), 'error');
    }
  };

  const handleConfirmSingleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await registrationService.remove(deleteTarget.id);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(deleteTarget.id);
        return next;
      });
      if (drawerStudent?.id === deleteTarget.id) {
        setDrawerStudent(null);
      }
      setDeleteTarget(null);
      showToast(t('admin.registrations.toasts.deleted'), 'success');
    } catch {
      setDeleteTarget(null);
      showToast(t('admin.eventSettings.saveErrorToast'), 'error');
    }
  };

  const handleConfirmBulkDelete = async () => {
    try {
      const ids = Array.from(selectedIds);
      await registrationService.bulkRemove(ids);
      setSelectedIds(new Set());
      setBulkDeleteOpen(false);
      showToast(t('admin.registrations.toasts.bulkDeleted'), 'success');
    } catch {
      setBulkDeleteOpen(false);
      showToast(t('admin.eventSettings.saveErrorToast'), 'error');
    }
  };

  const acceptanceRate =
    stats.total > 0 ? ((stats.approved / stats.total) * 100).toFixed(1) : '0.0';

  const fromIndex = totalFiltered === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const toIndex = Math.min(currentPage * pageSize, totalFiltered);

  return (
    <div className="flex flex-col w-full gap-3.5 sm:gap-4 pb-6">
      {/* 1. Header & Actions */}
      <section className="bg-white p-3.5 sm:p-4 rounded-xl border border-[#C5D8EE] shadow-[0_4px_14px_-6px_rgba(18,54,92,0.09)] flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg sm:text-xl text-[#12365C] font-bold">
              {t('admin.registrations.title')}
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#DBEAFE] text-[#1E40AF] border border-[#93C5FD] text-[11px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1D4ED8]" aria-hidden="true" />
              <span>{t('admin.registrations.badge')}</span>
            </span>
          </div>
          <p className="hidden sm:block text-xs sm:text-[13px] text-[#475569]">
            {t('admin.registrations.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full lg:w-auto shrink-0">
          <button
            type="button"
            onClick={() => {
              setEditingStudent(null);
              setFormModalOpen(true);
            }}
            data-testid="add-student-btn"
            className="col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#EFF5FC] text-[#12365C] hover:bg-[#DCE9F8] transition-all border border-[#BBD0E8] text-xs sm:text-[13px] font-bold cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5 text-[#1769B5]" aria-hidden="true" />
            <span>{t('admin.dashboard.actionAddManual')}</span>
          </button>

          <button
            type="button"
            onClick={() => void handleRefresh()}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-[#12365C] hover:bg-[#F3F8FE] transition-all border border-[#BBD0E8] text-xs sm:text-[13px] font-semibold cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#1769B5]" aria-hidden="true" />
            <span>{t('common.refresh')}</span>
          </button>

          <button
            type="button"
            onClick={handleExportAll}
            data-testid="export-csv-btn"
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#12365C] text-white hover:bg-[#1769B5] transition-all shadow-xs text-xs sm:text-[13px] font-bold cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#F5C928]" aria-hidden="true" />
            <span>{t('admin.registrations.exportExcel')}</span>
          </button>
        </div>
      </section>

      {/* 2. Compact 3 KPI Cards */}
      <section className="grid grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3.5">
        <div className="col-span-2 md:col-span-1 bg-white rounded-xl p-3 sm:p-3.5 shadow-[0_4px_14px_-6px_rgba(18,54,92,0.1)] border border-[#C5D8EE] border-t-3 border-t-[#12365C] flex items-center justify-between gap-2">
          <div className="flex flex-col min-w-0">
            <span className="text-[11px] sm:text-xs text-[#475569] font-medium truncate">
              {t('admin.registrations.kpiTotal')}
            </span>
            <span className="text-xl sm:text-2xl text-[#12365C] font-bold mt-0.5 leading-tight">
              {stats.total}
            </span>
          </div>
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[#DBEAFE] flex items-center justify-center text-[#1769B5] shrink-0">
            <Users className="w-4 h-4" aria-hidden="true" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-3 sm:p-3.5 shadow-[0_4px_14px_-6px_rgba(18,54,92,0.1)] border border-[#C5D8EE] border-t-3 border-t-[#D97706] flex items-center justify-between gap-2">
          <div className="flex flex-col min-w-0">
            <span className="text-[11px] sm:text-xs text-[#475569] font-medium truncate">
              {t('admin.registrations.kpiPending')}
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5 flex-wrap">
              <span className="text-xl sm:text-2xl text-[#B45309] font-bold leading-tight">
                {stats.pending}
              </span>
              <span className="hidden sm:inline text-[11px] text-[#92400E] font-medium truncate">
                {t('admin.registrations.requiresAudit')}
              </span>
            </div>
          </div>
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[#FEF3C7] flex items-center justify-center text-[#B45309] shrink-0">
            <Hourglass className="w-4 h-4" aria-hidden="true" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-3 sm:p-3.5 shadow-[0_4px_14px_-6px_rgba(18,54,92,0.1)] border border-[#C5D8EE] border-t-3 border-t-[#16A34A] flex items-center justify-between gap-2">
          <div className="flex flex-col min-w-0">
            <span className="text-[11px] sm:text-xs text-[#475569] font-medium truncate">
              {t('admin.registrations.kpiApproved')}
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5 flex-wrap">
              <span className="text-xl sm:text-2xl text-[#15803D] font-bold leading-tight">
                {stats.approved}
              </span>
              <span className="hidden sm:inline text-[11px] text-[#166534] font-medium truncate">
                {t('admin.registrations.acceptanceRate', { rate: acceptanceRate })}
              </span>
            </div>
          </div>
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[#DCFCE7] flex items-center justify-center text-[#15803D] shrink-0">
            <UserCheck className="w-4 h-4" aria-hidden="true" />
          </div>
        </div>
      </section>

      {/* 3. Search & Filter Bar */}
      <section className="bg-white rounded-xl p-3 shadow-[0_4px_14px_-6px_rgba(18,54,92,0.08)] border border-[#C5D8EE]">
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-12 gap-2 sm:gap-2.5">
          {/* Search Input */}
          <div className="col-span-2 md:col-span-4 xl:col-span-5 relative">
            <Search
              className="w-3.5 h-3.5 absolute start-3 top-1/2 -translate-y-1/2 text-[#475569] pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              data-testid="registrations-search-input"
              aria-label={t('admin.registrations.searchPlaceholder')}
              placeholder={t('admin.registrations.searchPlaceholder')}
              className="w-full h-9 ps-9 pe-3 rounded-lg bg-[#F8FBFF] border border-[#BBD0E8] text-[#12365C] placeholder:text-[#64748B] focus:bg-white focus:outline-none focus:border-[#1769B5] focus:ring-2 focus:ring-[#1769B5]/20 text-xs sm:text-[13px] font-medium transition-all"
            />
          </div>

          {/* Specialization Filter */}
          <div className="col-span-1 xl:col-span-2 relative">
            <select
              value={specializationFilter}
              onChange={(e) => {
                setSpecializationFilter(e.target.value);
                setPage(1);
              }}
              aria-label={t('admin.registrations.allSpecializations')}
              data-testid="filter-specialization"
              className="w-full h-9 ps-2.5 pe-7 appearance-none rounded-lg bg-[#F8FBFF] border border-[#BBD0E8] text-[#12365C] font-medium text-xs sm:text-[13px] focus:bg-white focus:outline-none focus:border-[#1769B5] focus:ring-2 focus:ring-[#1769B5]/20 cursor-pointer"
            >
              <option value="">{t('admin.registrations.allSpecializations')}</option>
              {specializations.map((spec) => (
                <option key={spec.id} value={spec.id}>
                  {language === 'ar' ? spec.nameAr : spec.nameEn}
                </option>
              ))}
            </select>
            <ChevronDown
              className="w-3.5 h-3.5 absolute end-2 top-1/2 -translate-y-1/2 text-[#475569] pointer-events-none"
              aria-hidden="true"
            />
          </div>

          {/* Status Filter */}
          <div className="col-span-1 xl:col-span-2 relative">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as '' | RegistrationStatus);
                setPage(1);
              }}
              aria-label={t('admin.registrations.allStatuses')}
              data-testid="filter-status"
              className="w-full h-9 ps-2.5 pe-7 appearance-none rounded-lg bg-[#F8FBFF] border border-[#BBD0E8] text-[#12365C] font-medium text-xs sm:text-[13px] focus:bg-white focus:outline-none focus:border-[#1769B5] focus:ring-2 focus:ring-[#1769B5]/20 cursor-pointer"
            >
              <option value="">{t('admin.registrations.allStatuses')}</option>
              <option value="new">{t('admin.registrations.statusNew')}</option>
              <option value="pending">{t('admin.registrations.statusPending')}</option>
              <option value="approved">{t('admin.registrations.statusApproved')}</option>
              <option value="rejected">{t('admin.registrations.statusRejected')}</option>
            </select>
            <ChevronDown
              className="w-3.5 h-3.5 absolute end-2 top-1/2 -translate-y-1/2 text-[#475569] pointer-events-none"
              aria-hidden="true"
            />
          </div>

          {/* Date Filter */}
          <div className="col-span-1 xl:col-span-2 relative">
            <select
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value as 'all' | 'today' | 'week' | 'month');
                setPage(1);
              }}
              aria-label={t('admin.registrations.allDates')}
              data-testid="filter-date"
              className="w-full h-9 ps-2.5 pe-7 appearance-none rounded-lg bg-[#F8FBFF] border border-[#BBD0E8] text-[#12365C] font-medium text-xs sm:text-[13px] focus:bg-white focus:outline-none focus:border-[#1769B5] focus:ring-2 focus:ring-[#1769B5]/20 cursor-pointer"
            >
              <option value="all">{t('admin.registrations.allDates')}</option>
              <option value="today">{t('admin.registrations.dateToday')}</option>
              <option value="week">{t('admin.registrations.dateWeek')}</option>
              <option value="month">{t('admin.registrations.dateMonth')}</option>
            </select>
            <Calendar
              className="w-3.5 h-3.5 absolute end-2 top-1/2 -translate-y-1/2 text-[#475569] pointer-events-none"
              aria-hidden="true"
            />
          </div>

          {/* Reset Filters */}
          <div className="col-span-1 xl:col-span-1 flex items-center">
            <button
              type="button"
              onClick={resetFilters}
              data-testid="reset-filters-btn"
              className="w-full h-9 flex items-center justify-center gap-1 rounded-lg bg-[#EFF5FC] border border-[#C5D8EE] text-[#12365C] hover:bg-[#FEE2E2] hover:text-[#991B1B] hover:border-[#FCA5A5] font-semibold transition-colors text-xs cursor-pointer"
            >
              <FilterX className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{t('common.reset')}</span>
            </button>
          </div>
        </div>
      </section>

      {/* 4. Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div
          data-testid="bulk-actions-bar"
          className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-primary text-on-primary rounded-2xl shadow-lg"
        >
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-full bg-tertiary-fixed text-primary flex items-center justify-center type-label-sm font-bold">
              {selectedIds.size}
            </span>
            <span className="type-label-md font-medium">
              {t('admin.registrations.selectedCount', { count: selectedIds.size })}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void handleBulkStatus('approved')}
              data-testid="bulk-accept-btn"
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-secondary text-on-primary hover:bg-brand-blue type-label-sm transition-colors cursor-pointer"
            >
              <Check className="w-4 h-4" aria-hidden="true" />
              <span>{t('admin.registrations.bulkAccept')}</span>
            </button>
            <button
              type="button"
              onClick={() => void handleBulkStatus('pending')}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/15 text-on-primary hover:bg-white/25 type-label-sm transition-colors cursor-pointer"
            >
              <Hourglass className="w-4 h-4" aria-hidden="true" />
              <span>{t('admin.registrations.bulkPending')}</span>
            </button>
            <button
              type="button"
              onClick={handleExportSelected}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/15 text-on-primary hover:bg-white/25 type-label-sm transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              <span>{t('admin.registrations.exportSelected')}</span>
            </button>
            <button
              type="button"
              onClick={() => setBulkDeleteOpen(true)}
              data-testid="bulk-delete-btn"
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-error/30 text-tertiary-fixed hover:bg-error hover:text-on-error type-label-sm transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" aria-hidden="true" />
              <span>{t('admin.registrations.bulkDelete')}</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="text-on-primary-container hover:text-on-primary px-2 type-label-sm underline cursor-pointer"
            >
              {t('admin.registrations.deselectAll')}
            </button>
          </div>
        </div>
      )}

      {/* 5. Main Registrations Table + Responsive Mobile/Medium Cards */}
      <section className="bg-white rounded-xl shadow-[0_4px_16px_-6px_rgba(18,54,92,0.1)] border border-[#C5D8EE] overflow-hidden flex flex-col">
        {paginatedRows.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center gap-3">
            <Users className="w-10 h-10 text-[#64748B]" aria-hidden="true" />
            <h3 className="type-headline-sm text-[#12365C] font-bold">
              {t('admin.registrations.emptyTitle')}
            </h3>
            <p className="type-body-sm text-[#475569] max-w-md">
              {t('admin.registrations.emptyDesc')}
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="mt-2 px-4 py-2 rounded-lg bg-[#EFF5FC] border border-[#C5D8EE] text-[#12365C] hover:bg-[#DCE9F8] type-label-sm font-bold cursor-pointer"
            >
              {t('common.reset')}
            </button>
          </div>
        ) : (
          <>
            {/* Compact Executive Table on Tablet / Medium Laptop / Desktop (md: 768px+) */}
            <div className="hidden md:block w-full">
              <table className="w-full text-start border-collapse">
                <thead>
                  <tr className="bg-[#EAF1FA] text-[#12365C] text-xs font-bold border-b border-[#C5D8EE]">
                    <th className="py-2.5 px-2.5 xl:px-3.5 w-9 text-center">
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={toggleSelectAllVisible}
                        aria-label="Select all visible rows"
                        className="w-4 h-4 rounded text-[#12365C] cursor-pointer accent-[#12365C]"
                      />
                    </th>
                    <th className="hidden xl:table-cell py-2.5 px-3 text-start">
                      {t('admin.registrations.colRefId')}
                    </th>
                    <th className="py-2.5 px-2.5 xl:px-3 text-start">
                      {t('admin.registrations.colStudentName')}
                    </th>
                    <th className="py-2.5 px-2.5 xl:px-3 text-start">
                      {t('admin.registrations.colSpecialization')}
                    </th>
                    <th className="py-2.5 px-2.5 xl:px-3 text-start">
                      {t('admin.registrations.colInstagram')}
                    </th>
                    <th className="hidden xl:table-cell py-2.5 px-3 text-start">
                      {t('admin.registrations.colDate')}
                    </th>
                    <th className="py-2.5 px-2.5 xl:px-3 text-start">
                      {t('admin.registrations.colStatus')}
                    </th>
                    <th className="py-2.5 px-2 xl:px-3 text-center">
                      {t('admin.registrations.colActions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2ECF8] text-xs sm:text-[13px] text-[#15243B]">
                  {paginatedRows.map((reg) => {
                    const isChecked = selectedIds.has(reg.id);
                    const specName =
                      language === 'ar' ? reg.specializationNameAr : reg.specializationNameEn;
                    const cleanInsta = stripAtPrefix(reg.instagramHandle);
                    return (
                      <tr
                        key={reg.id}
                        data-testid={`reg-row-${reg.referenceId}`}
                        className={`hover:bg-[#F3F8FE] transition-colors ${
                          isChecked ? 'bg-[#DBEAFE]/35' : ''
                        }`}
                      >
                        <td className="py-2.5 px-2.5 xl:px-3.5 text-center">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleRowSelect(reg.id)}
                            aria-label={`Select ${reg.firstName} ${reg.lastName}`}
                            className="w-4 h-4 rounded text-[#12365C] cursor-pointer accent-[#12365C]"
                          />
                        </td>
                        <td className="hidden xl:table-cell py-2.5 px-3 text-xs text-[#1769B5] font-mono font-semibold whitespace-nowrap">
                          {reg.referenceId}
                        </td>
                        <td className="py-2.5 px-2.5 xl:px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-[#12365C] text-[#F5C928] flex items-center justify-center text-[11px] font-bold shrink-0">
                              {getInitials(reg.firstName, reg.lastName)}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-[#12365C] font-semibold truncate">
                                {reg.firstName} {reg.lastName}
                              </span>
                              <span className="xl:hidden text-[11px] text-[#1769B5] font-mono font-medium">
                                {reg.referenceId}
                              </span>
                              {reg.university && (
                                <span className="hidden xl:block text-[11px] text-[#52637A]">
                                  {reg.university}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-2.5 xl:px-3">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#EAF1FA] border border-[#D4E2F4] text-[11px] sm:text-xs text-[#12365C] font-medium max-w-[140px] xl:max-w-none">
                            <SpecializationIcon
                              icon={specIconMap.get(reg.specializationId) ?? 'book'}
                              className="w-3.5 h-3.5 text-[#1769B5] shrink-0"
                            />
                            <span className="truncate">{specName}</span>
                          </span>
                        </td>
                        <td className="py-2.5 px-2.5 xl:px-3">
                          <a
                            href={`https://instagram.com/${cleanInsta}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            dir="ltr"
                            className="inline-flex items-center gap-1 text-[#1769B5] hover:underline text-xs font-mono font-medium max-w-[115px] xl:max-w-none"
                          >
                            <Camera
                              className="w-3.5 h-3.5 text-[#64748B] shrink-0"
                              aria-hidden="true"
                            />
                            <span className="truncate">{reg.instagramHandle}</span>
                          </a>
                        </td>
                        <td className="hidden xl:table-cell py-2.5 px-3 text-[#52637A] text-xs whitespace-nowrap">
                          {formatRelativeDate(reg.createdAt, language)}
                        </td>
                        <td className="py-2.5 px-2.5 xl:px-3">
                          <StatusBadge status={reg.status} />
                        </td>
                        <td className="py-2.5 px-2 xl:px-3 text-center">
                          <RegistrationRowActions
                            registration={reg}
                            onView={(item) => setDrawerStudent(item)}
                            onStatusChange={(id, status) => void handleStatusChange(id, status)}
                            onEdit={(item) => {
                              setEditingStudent(item);
                              setFormModalOpen(true);
                            }}
                            onDelete={(item) => setDeleteTarget(item)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List (<768px) */}
            <div className="md:hidden grid grid-cols-1 gap-2.5 p-3 bg-[#F7FAFE]">
              {paginatedRows.map((reg) => {
                const isChecked = selectedIds.has(reg.id);
                const specName =
                  language === 'ar' ? reg.specializationNameAr : reg.specializationNameEn;
                return (
                  <div
                    key={reg.id}
                    className={`p-3.5 rounded-xl border transition-colors flex flex-col gap-2.5 ${
                      isChecked
                        ? 'bg-[#EFF5FC] border-[#1769B5]'
                        : 'bg-white border-[#C5D8EE] shadow-[0_2px_10px_-4px_rgba(18,54,92,0.08)]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleRowSelect(reg.id)}
                          aria-label={`Select ${reg.firstName} ${reg.lastName}`}
                          className="w-4 h-4 rounded accent-[#12365C] shrink-0 cursor-pointer"
                        />
                        <div className="min-w-0">
                          <p className="type-label-md text-[#12365C] font-bold truncate">
                            {reg.firstName} {reg.lastName}
                          </p>
                          <p className="text-[11px] text-[#1769B5] font-mono font-semibold">
                            {reg.referenceId}
                          </p>
                        </div>
                      </div>
                      <StatusBadge status={reg.status} />
                    </div>

                    <div className="flex items-center justify-between gap-2 type-body-sm text-[#475569]">
                      <span className="px-2 py-0.5 rounded bg-[#EAF1FA] border border-[#D4E2F4] text-[#12365C] font-medium text-xs truncate max-w-[58%]">
                        {specName}
                      </span>
                      <span dir="ltr" className="font-mono text-[#1769B5] font-medium text-xs shrink-0">
                        {reg.instagramHandle}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1.5 border-t border-[#E6EEF8]">
                      <span className="type-label-sm text-[#52637A]">
                        {formatRelativeDate(reg.createdAt, language)}
                      </span>
                      <RegistrationRowActions
                        registration={reg}
                        testIdPrefix="mobile-"
                        onView={(item) => setDrawerStudent(item)}
                        onStatusChange={(id, status) => void handleStatusChange(id, status)}
                        onEdit={(item) => {
                          setEditingStudent(item);
                          setFormModalOpen(true);
                        }}
                        onDelete={(item) => setDeleteTarget(item)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Footer */}
            <div className="p-3.5 sm:p-4 bg-[#EFF5FC] border-t border-[#C5D8EE] flex flex-col sm:flex-row items-center justify-between gap-3 type-label-sm text-[#12365C]">
              <div className="flex flex-wrap items-center gap-4">
                <span>
                  {t('admin.registrations.showingRange', {
                    from: fromIndex,
                    to: toIndex,
                    total: totalFiltered,
                  })}
                </span>
                <label className="flex items-center gap-2">
                  <span>{t('admin.registrations.perPage')}</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                    className="bg-surface-container-lowest text-on-surface py-1 px-2 rounded-lg border border-outline-variant/30 cursor-pointer"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </label>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  aria-label="Previous page"
                  className="w-8 h-8 rounded-lg bg-surface-container-lowest text-on-surface flex items-center justify-center hover:bg-surface-container disabled:opacity-40 transition-colors shadow-2xs cursor-pointer"
                >
                  <DirectionalChevron className="w-4 h-4" direction="back" />
                </button>

                {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setPage(pageNum)}
                    aria-current={pageNum === currentPage ? 'page' : undefined}
                    className={`w-8 h-8 rounded-lg font-medium flex items-center justify-center transition-colors cursor-pointer ${
                      pageNum === currentPage
                        ? 'bg-primary text-on-primary shadow-xs'
                        : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container'
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}

                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  aria-label="Next page"
                  className="w-8 h-8 rounded-lg bg-surface-container-lowest text-on-surface flex items-center justify-center hover:bg-surface-container disabled:opacity-40 transition-colors shadow-2xs cursor-pointer"
                >
                  <DirectionalChevron className="w-4 h-4" direction="forward" />
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      <StudentDetailsDrawer
        registration={drawerStudent}
        onClose={() => setDrawerStudent(null)}
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
        onConfirm={() => void handleConfirmSingleDelete()}
        title={t('admin.registrations.modals.deleteTitle')}
        message={t('admin.registrations.modals.deleteMessage', {
          name: deleteTarget ? `${deleteTarget.firstName} ${deleteTarget.lastName}` : '',
        })}
      />

      <ConfirmDialog
        isOpen={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={() => void handleConfirmBulkDelete()}
        title={t('admin.registrations.modals.bulkDeleteTitle')}
        message={t('admin.registrations.modals.bulkDeleteMessage', {
          count: selectedIds.size,
        })}
      />
    </div>
  );
}
