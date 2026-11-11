import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
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
import {
  mockRepository,
  subscribeToRepository,
} from '@/services/storage/mockRepository';

interface AppDataState {
  registrations: StudentRegistration[];
  specializations: Specialization[];
  stats: RegistrationStats;
  eventSettings: EventSettings;
  pageSettings: PageCustomizationSettings;
  systemSettings: SystemSettings;
  notifications: AdminNotification[];
}

interface AppDataContextValue extends AppDataState {
  activeSpecializations: Specialization[];
  unreadCount: number;
  isLoading: boolean;
  refreshAll: () => Promise<void>;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

function loadSyncSnapshot(): AppDataState {
  const registrations = [...mockRepository.getRegistrations()].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const specializations = mockRepository.getSpecializations();
  const eventSettings = mockRepository.getEventSettings();
  const pageSettings = mockRepository.getPageSettings();
  const systemSettings = mockRepository.getSystemSettings();
  const notifications = mockRepository.getNotifications();

  const total = registrations.length;
  const newCount = registrations.filter((r) => r.status === 'new').length;
  const pending = registrations.filter((r) => r.status === 'pending' || r.status === 'new').length;
  const approved = registrations.filter((r) => r.status === 'approved').length;
  const rejected = registrations.filter((r) => r.status === 'rejected').length;
  const capacity = eventSettings.capacity;
  const remainingSeats = Math.max(0, capacity - total);

  return {
    registrations,
    specializations,
    stats: {
      total,
      newCount,
      pending,
      approved,
      rejected,
      capacity,
      remainingSeats,
    },
    eventSettings,
    pageSettings,
    systemSettings,
    notifications,
  };
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppDataState>(() => loadSyncSnapshot());

  const refreshAll = useCallback(async () => {
    setState(loadSyncSnapshot());
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToRepository(() => {
      setState(loadSyncSnapshot());
    });
    return unsubscribe;
  }, []);

  const activeSpecializations = state.specializations.filter((s) => s.isActive);
  const unreadCount = state.notifications.filter((n) => !n.isRead).length;

  return (
    <AppDataContext.Provider
      value={{
        ...state,
        activeSpecializations,
        unreadCount,
        isLoading: false,
        refreshAll,
      }}
    >
      {children}
    </AppDataContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAppData(): AppDataContextValue {
  const ctx = useContext(AppDataContext);
  if (!ctx) {
    throw new Error('useAppData must be used within AppDataProvider');
  }
  return ctx;
}
