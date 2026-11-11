import type { AdminNotification } from '@/types/domain';
import type { Database } from '@/types/database';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { appDataEvents } from '@/services/api/dataSync';
import { AppServiceError } from '@/services/api/errors';
import type { INotificationService } from '@/services/api/types';

type NotificationRow = Database['public']['Tables']['admin_notifications']['Row'];

function mapNotificationRow(row: NotificationRow): AdminNotification {
  return {
    id: row.id,
    titleAr: row.title_ar,
    titleEn: row.title_en,
    messageAr: row.message_ar,
    messageEn: row.message_en,
    isRead: row.is_read,
    createdAt: row.created_at,
    registrationId: row.registration_id ?? undefined,
  };
}

export const notificationService: INotificationService = {
  async list(): Promise<AdminNotification[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('admin_notifications')
      .select('*')
      .not('registration_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      throw new AppServiceError('UNKNOWN_ERROR', error.message);
    }

    return (data ?? []).map(mapNotificationRow);
  },

  async markAsRead(id: string): Promise<void> {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('admin_notifications')
      .update({ is_read: true })
      .eq('id', id);

    if (error) {
      throw new AppServiceError('UNKNOWN_ERROR', error.message);
    }

    appDataEvents.notify();
  },

  async markAllAsRead(): Promise<void> {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('admin_notifications')
      .update({ is_read: true })
      .eq('is_read', false);

    if (error) {
      throw new AppServiceError('UNKNOWN_ERROR', error.message);
    }

    appDataEvents.notify();
  },
};
