import type { ISettingsService } from '@/services/api/types';
import { mockRepository } from '@/services/storage/mockRepository';
import type {
  EventSettings,
  PageCustomizationSettings,
  SystemSettings,
} from '@/types/domain';

export const settingsService: ISettingsService = {
  async getEventSettings(): Promise<EventSettings> {
    return mockRepository.getEventSettings();
  },

  async updateEventSettings(settings: EventSettings): Promise<EventSettings> {
    mockRepository.saveEventSettings(settings);
    return settings;
  },

  async getPageSettings(): Promise<PageCustomizationSettings> {
    return mockRepository.getPageSettings();
  },

  async updatePageSettings(
    settings: PageCustomizationSettings,
  ): Promise<PageCustomizationSettings> {
    mockRepository.savePageSettings(settings);
    return settings;
  },

  async getSystemSettings(): Promise<SystemSettings> {
    return mockRepository.getSystemSettings();
  },

  async updateSystemSettings(settings: SystemSettings): Promise<SystemSettings> {
    mockRepository.saveSystemSettings(settings);
    return settings;
  },

  async resetDemoData(): Promise<void> {
    mockRepository.resetAllDemoData();
  },
};
