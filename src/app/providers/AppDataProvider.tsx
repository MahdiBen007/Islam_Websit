import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type {
  AdminNotification,
  EventSettings,
  PageCustomizationSettings,
  RegistrationStats,
  Specialization,
  StudentRegistration,
  SystemSettings,
} from '@/types/domain';
import { useAuth } from '@/app/providers/AuthProvider';
import { appDataEvents } from '@/services/api/dataSync';
import {
  EMPTY_EVENT_SETTINGS,
  EMPTY_PAGE_SETTINGS,
  EMPTY_REGISTRATION_STATS,
  EMPTY_SYSTEM_SETTINGS,
} from '@/services/defaults/initialPublicDefaults';
import { notificationService } from '@/services/notifications/notificationService';
import { registrationService } from '@/services/registrations/registrationService';
import { settingsService } from '@/services/settings/settingsService';
import { specializationService } from '@/services/specializations/specializationService';

interface AppDataContextValue {
  registrations: StudentRegistration[];
  specializations: Specialization[];
  activeSpecializations: Specialization[];
  specializationCounts: Record<string, number>;
  stats: RegistrationStats;
  eventSettings: EventSettings;
  pageSettings: PageCustomizationSettings;
  systemSettings: SystemSettings;
  notifications: AdminNotification[];
  unreadCount: number;
  isLoading: boolean;
  hasLoadedPublic: boolean;
  error: string | null;
  dataVersion: number;
  refreshAll: () => Promise<void>;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [registrations, setRegistrations] = useState<StudentRegistration[]>([]);
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [specializationCounts, setSpecializationCounts] = useState<Record<string, number>>({});
  const [stats, setStats] = useState<RegistrationStats>(EMPTY_REGISTRATION_STATS);
  const [eventSettings, setEventSettings] = useState<EventSettings>(EMPTY_EVENT_SETTINGS);
  const [pageSettings, setPageSettings] =
    useState<PageCustomizationSettings>(EMPTY_PAGE_SETTINGS);
  const [systemSettings, setSystemSettings] = useState<SystemSettings>(EMPTY_SYSTEM_SETTINGS);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadedPublic, setHasLoadedPublic] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataVersion, setDataVersion] = useState(0);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [specsRes, eventRes, pageRes, sysRes] = await Promise.allSettled([
        specializationService.list(isAuthenticated),
        settingsService.getEventSettings(),
        settingsService.getPageSettings(),
        settingsService.getSystemSettings(),
      ]);

      if (specsRes.status === 'fulfilled') setSpecializations(specsRes.value);
      if (eventRes.status === 'fulfilled') setEventSettings(eventRes.value);
      if (pageRes.status === 'fulfilled') setPageSettings(pageRes.value);
      if (sysRes.status === 'fulfilled') setSystemSettings(sysRes.value);

      if (eventRes.status === 'fulfilled' && pageRes.status === 'fulfilled') {
        setHasLoadedPublic(true);
      } else {
        const failedReason =
          eventRes.status === 'rejected'
            ? eventRes.reason
            : pageRes.status === 'rejected'
              ? pageRes.reason
              : null;
        setError(failedReason instanceof Error ? failedReason.message : 'Unable to load public data');
      }

      if (isAuthenticated) {
        const [regsRes, statsRes, countsRes, notifsRes] = await Promise.allSettled([
          registrationService.list(),
          registrationService.getStats(),
          specializationService.getRegistrationCounts(),
          notificationService.list(),
        ]);

        if (regsRes.status === 'fulfilled') setRegistrations(regsRes.value);
        if (statsRes.status === 'fulfilled') setStats(statsRes.value);
        if (countsRes.status === 'fulfilled') setSpecializationCounts(countsRes.value);
        if (notifsRes.status === 'fulfilled') setNotifications(notifsRes.value);
      } else {
        setRegistrations([]);
        setSpecializationCounts({});
        setStats(EMPTY_REGISTRATION_STATS);
        setNotifications([]);
      }
      setDataVersion((v) => v + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (authLoading) return;
    void loadData();
    const unsubscribe = appDataEvents.subscribe(() => {
      void loadData();
    });
    return unsubscribe;
  }, [authLoading, loadData]);

  const refreshAll = useCallback(async () => {
    await loadData();
  }, [loadData]);

  const activeSpecializations = useMemo(
    () => specializations.filter((s) => s.isActive),
    [specializations],
  );

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications],
  );

  return (
    <AppDataContext.Provider
      value={{
        registrations,
        specializations,
        activeSpecializations,
        specializationCounts,
        stats,
        eventSettings,
        pageSettings,
        systemSettings,
        notifications,
        unreadCount,
        isLoading,
        hasLoadedPublic,
        error,
        dataVersion,
        refreshAll,
      }}
    >
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) {
    throw new Error('useAppData must be used inside AppDataProvider');
  }
  return ctx;
}
