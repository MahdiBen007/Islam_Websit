import type {
  AdminNotification,
  EventSettings,
  PageCustomizationSettings,
  Specialization,
  StudentRegistration,
  SystemSettings,
} from '@/types/domain';
import {
  INITIAL_EVENT_SETTINGS,
  INITIAL_NOTIFICATIONS,
  INITIAL_PAGE_SETTINGS,
  INITIAL_REGISTRATIONS,
  INITIAL_SPECIALIZATIONS,
  INITIAL_SYSTEM_SETTINGS,
} from './mockSeedData';

/**
 * MOCK REPOSITORY (FRONTEND DEMONSTRATION ONLY)
 * ---------------------------------------------
 * Persists demo data in localStorage with safe JSON serialization and fallback
 * to in-memory state when storage is unavailable. Authentication secrets / passwords
 * are NEVER stored here.
 *
 * Replace the repository calls inside `src/services/*` with HTTP API requests
 * when connecting to a real backend server.
 */

const STORAGE_KEYS = {
  REGISTRATIONS: 'cic_mock_registrations_v1',
  SPECIALIZATIONS: 'cic_mock_specializations_v1',
  EVENT_SETTINGS: 'cic_mock_event_settings_v1',
  PAGE_SETTINGS: 'cic_mock_page_settings_v1',
  SYSTEM_SETTINGS: 'cic_mock_system_settings_v1',
  NOTIFICATIONS: 'cic_mock_notifications_v1',
  COUNTER: 'cic_mock_ref_counter_v1',
} as const;

type Listener = () => void;

const listeners = new Set<Listener>();

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return structuredClone(fallback);
    return JSON.parse(raw) as T;
  } catch {
    return structuredClone(fallback);
  }
}

function writeJson<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota or SSR failures gracefully
  }
  notifySubscribers();
}

export function subscribeToRepository(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifySubscribers(): void {
  listeners.forEach((listener) => listener());
}

export const mockRepository = {
  getRegistrations(): StudentRegistration[] {
    return readJson<StudentRegistration[]>(STORAGE_KEYS.REGISTRATIONS, INITIAL_REGISTRATIONS);
  },
  saveRegistrations(items: StudentRegistration[]): void {
    writeJson(STORAGE_KEYS.REGISTRATIONS, items);
  },

  getNextReferenceId(): string {
    const existing = this.getRegistrations();
    const maxNumeric = existing.reduce((max, item) => {
      const match = item.referenceId.match(/(\d+)$/);
      const num = match ? Number.parseInt(match[1], 10) : 0;
      return Number.isFinite(num) && num > max ? num : max;
    }, 1250);
    const storedCounter = readJson<number>(STORAGE_KEYS.COUNTER, maxNumeric);
    const next = Math.max(maxNumeric, storedCounter) + 1;
    writeJson(STORAGE_KEYS.COUNTER, next);
    return `REG-${String(next).padStart(6, '0')}`;
  },

  getSpecializations(): Specialization[] {
    return readJson<Specialization[]>(STORAGE_KEYS.SPECIALIZATIONS, INITIAL_SPECIALIZATIONS);
  },
  saveSpecializations(items: Specialization[]): void {
    writeJson(STORAGE_KEYS.SPECIALIZATIONS, items);
  },

  getEventSettings(): EventSettings {
    return readJson<EventSettings>(STORAGE_KEYS.EVENT_SETTINGS, INITIAL_EVENT_SETTINGS);
  },
  saveEventSettings(settings: EventSettings): void {
    writeJson(STORAGE_KEYS.EVENT_SETTINGS, settings);
  },

  getPageSettings(): PageCustomizationSettings {
    return readJson<PageCustomizationSettings>(STORAGE_KEYS.PAGE_SETTINGS, INITIAL_PAGE_SETTINGS);
  },
  savePageSettings(settings: PageCustomizationSettings): void {
    writeJson(STORAGE_KEYS.PAGE_SETTINGS, settings);
  },

  getSystemSettings(): SystemSettings {
    return readJson<SystemSettings>(STORAGE_KEYS.SYSTEM_SETTINGS, INITIAL_SYSTEM_SETTINGS);
  },
  saveSystemSettings(settings: SystemSettings): void {
    writeJson(STORAGE_KEYS.SYSTEM_SETTINGS, settings);
  },

  getNotifications(): AdminNotification[] {
    return readJson<AdminNotification[]>(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
  },
  saveNotifications(items: AdminNotification[]): void {
    writeJson(STORAGE_KEYS.NOTIFICATIONS, items);
  },

  resetAllDemoData(): void {
    this.saveRegistrations(structuredClone(INITIAL_REGISTRATIONS));
    this.saveSpecializations(structuredClone(INITIAL_SPECIALIZATIONS));
    this.saveEventSettings(structuredClone(INITIAL_EVENT_SETTINGS));
    this.savePageSettings(structuredClone(INITIAL_PAGE_SETTINGS));
    this.saveSystemSettings(structuredClone(INITIAL_SYSTEM_SETTINGS));
    this.saveNotifications(structuredClone(INITIAL_NOTIFICATIONS));
    writeJson(STORAGE_KEYS.COUNTER, 1250);
  },
};
