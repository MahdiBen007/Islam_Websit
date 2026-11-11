import type { INotificationService } from '@/services/api/types';
import { mockRepository } from '@/services/storage/mockRepository';
import type { AdminNotification } from '@/types/domain';

export const notificationService: INotificationService = {
  async list(): Promise<AdminNotification[]> {
    return mockRepository.getNotifications();
  },

  async markAsRead(id: string): Promise<void> {
    const next = mockRepository
      .getNotifications()
      .map((item) => (item.id === id ? { ...item, isRead: true } : item));
    mockRepository.saveNotifications(next);
  },

  async markAllAsRead(): Promise<void> {
    const next = mockRepository.getNotifications().map((item) => ({ ...item, isRead: true }));
    mockRepository.saveNotifications(next);
  },
};
