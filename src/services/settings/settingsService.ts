import type {
  EventSettings,
  PageCustomizationSettings,
  SystemSettings,
} from '@/types/domain';
import type { Database } from '@/types/database';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { appDataEvents } from '@/services/api/dataSync';
import { AppServiceError } from '@/services/api/errors';
import type { ISettingsService } from '@/services/api/types';

type EventSettingsRow = Database['public']['Tables']['event_settings']['Row'];
type PageSettingsRow = Database['public']['Tables']['page_settings']['Row'];

const SYSTEM_PREFS_KEY = 'cic_system_preferences_v1';

const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  defaultPublicLanguage: 'ar',
  defaultAdminLanguage: 'ar',
  emailNotificationsEnabled: true,
  autoConfirmSeatLabel: true,
};

function mapEventRow(row: EventSettingsRow): EventSettings & {
  contactPhone?: string;
  eventLogoPath?: string | null;
  isRegistrationOpen?: boolean;
} {
  return {
    clubNameAr: row.club_name_ar,
    clubNameEn: row.club_name_en,
    clubSubtitleAr: row.club_subtitle_ar,
    clubSubtitleEn: row.club_subtitle_en,
    eventNameAr: row.event_name_ar,
    eventNameEn: row.event_name_en,
    descriptionAr: row.description_ar,
    descriptionEn: row.description_en,
    dateAr: row.event_date_ar,
    dateEn: row.event_date_en,
    timeAr: row.event_time_ar,
    timeEn: row.event_time_en,
    locationAr: row.event_location_ar,
    locationEn: row.event_location_en,
    organizerAr: row.organizer_ar,
    organizerEn: row.organizer_en,
    organizerSummaryAr: row.organizer_summary_ar,
    organizerSummaryEn: row.organizer_summary_en,
    contactEmail: row.contact_email,
    contactAddressAr: row.contact_address_ar,
    contactAddressEn: row.contact_address_en,
    instagramUrl: row.instagram_url,
    facebookUrl: row.facebook_url,
    capacity: row.capacity,
    logoDataUrl: row.event_logo_url,
    contactPhone: row.contact_phone,
    eventLogoPath: row.event_logo_path,
    isRegistrationOpen: row.is_registration_open,
  };
}

function mapPageRow(row: PageSettingsRow): PageCustomizationSettings {
  return {
    isRegistrationOpen: row.is_registration_open,
    heroBadgeAr: row.hero_badge_ar,
    heroBadgeEn: row.hero_badge_en,
    heroHeadlineAr: row.hero_title_ar,
    heroHeadlineEn: row.hero_title_en,
    heroDescriptionAr: row.hero_subtitle_ar,
    heroDescriptionEn: row.hero_subtitle_en,
    ctaButtonTextAr: row.cta_button_label_ar,
    ctaButtonTextEn: row.cta_button_label_en,
    successHeadlineAr: row.success_title_ar,
    successHeadlineEn: row.success_title_en,
    successMessageAr: row.success_message_ar,
    successMessageEn: row.success_message_en,
    showMetricsBar: row.show_metrics_bar,
    showAboutSection: row.show_about_section,
    showCapCutBanner: row.show_capcut_banner,
    showPrivacyNote: row.show_privacy_note,
  };
}

export const settingsService: ISettingsService = {
  async getEventSettings(): Promise<EventSettings> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('event_settings')
      .select('*')
      .eq('singleton_key', true)
      .single();

    if (error || !data) {
      throw new AppServiceError('UNKNOWN_ERROR', error?.message ?? 'Event settings unavailable');
    }

    return mapEventRow(data);
  },

  async updateEventSettings(
    settings: EventSettings & {
      contactPhone?: string;
      eventLogoPath?: string | null;
      isRegistrationOpen?: boolean;
    },
  ): Promise<EventSettings> {
    const supabase = getSupabaseClient();
    const logoUrl =
      settings.logoDataUrl && !settings.logoDataUrl.startsWith('data:')
        ? settings.logoDataUrl
        : settings.logoDataUrl === null
          ? null
          : undefined;

    const payload: Database['public']['Tables']['event_settings']['Update'] = {
      club_name_ar: settings.clubNameAr.trim(),
      club_name_en: settings.clubNameEn.trim(),
      club_subtitle_ar: settings.clubSubtitleAr.trim(),
      club_subtitle_en: settings.clubSubtitleEn.trim(),
      event_name_ar: settings.eventNameAr.trim(),
      event_name_en: settings.eventNameEn.trim(),
      description_ar: settings.descriptionAr.trim(),
      description_en: settings.descriptionEn.trim(),
      event_date_ar: settings.dateAr.trim(),
      event_date_en: settings.dateEn.trim(),
      event_time_ar: settings.timeAr.trim(),
      event_time_en: settings.timeEn.trim(),
      event_location_ar: settings.locationAr.trim(),
      event_location_en: settings.locationEn.trim(),
      organizer_ar: settings.organizerAr.trim(),
      organizer_en: settings.organizerEn.trim(),
      organizer_summary_ar: settings.organizerSummaryAr.trim(),
      organizer_summary_en: settings.organizerSummaryEn.trim(),
      contact_email: settings.contactEmail.trim(),
      contact_address_ar: settings.contactAddressAr.trim(),
      contact_address_en: settings.contactAddressEn.trim(),
      instagram_url: settings.instagramUrl.trim(),
      facebook_url: settings.facebookUrl.trim(),
      capacity: Math.max(1, Number(settings.capacity) || 150),
    };

    if (logoUrl !== undefined) {
      payload.event_logo_url = logoUrl;
      if (logoUrl === null) {
        payload.event_logo_path = null;
      }
    }
    if (settings.eventLogoPath !== undefined) {
      payload.event_logo_path = settings.eventLogoPath;
    }
    if (settings.contactPhone !== undefined) {
      payload.contact_phone = settings.contactPhone.trim();
    }
    if (settings.isRegistrationOpen !== undefined) {
      payload.is_registration_open = settings.isRegistrationOpen;
    }

    const { data, error } = await supabase
      .from('event_settings')
      .update(payload)
      .eq('singleton_key', true)
      .select('*')
      .single();

    if (error || !data) {
      throw new AppServiceError('UNKNOWN_ERROR', error?.message ?? 'Failed to save event settings');
    }

    appDataEvents.notify();
    return mapEventRow(data);
  },

  async getPageSettings(): Promise<PageCustomizationSettings> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('page_settings')
      .select('*')
      .eq('singleton_key', true)
      .single();

    if (error || !data) {
      throw new AppServiceError('UNKNOWN_ERROR', error?.message ?? 'Page settings unavailable');
    }

    return mapPageRow(data);
  },

  async updatePageSettings(
    settings: PageCustomizationSettings,
  ): Promise<PageCustomizationSettings> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('page_settings')
      .update({
        is_registration_open: settings.isRegistrationOpen,
        hero_badge_ar: settings.heroBadgeAr.trim(),
        hero_badge_en: settings.heroBadgeEn.trim(),
        hero_title_ar: settings.heroHeadlineAr.trim(),
        hero_title_en: settings.heroHeadlineEn.trim(),
        hero_subtitle_ar: settings.heroDescriptionAr.trim(),
        hero_subtitle_en: settings.heroDescriptionEn.trim(),
        cta_button_label_ar: settings.ctaButtonTextAr.trim(),
        cta_button_label_en: settings.ctaButtonTextEn.trim(),
        success_title_ar: settings.successHeadlineAr.trim(),
        success_title_en: settings.successHeadlineEn.trim(),
        success_message_ar: settings.successMessageAr.trim(),
        success_message_en: settings.successMessageEn.trim(),
        show_metrics_bar: settings.showMetricsBar,
        show_about_section: settings.showAboutSection,
        show_capcut_banner: settings.showCapCutBanner,
        show_privacy_note: settings.showPrivacyNote,
      })
      .eq('singleton_key', true)
      .select('*')
      .single();

    if (error || !data) {
      throw new AppServiceError('UNKNOWN_ERROR', error?.message ?? 'Failed to save page settings');
    }

    appDataEvents.notify();
    return mapPageRow(data);
  },

  async getSystemSettings(): Promise<SystemSettings> {
    try {
      const raw = window.localStorage.getItem(SYSTEM_PREFS_KEY);
      if (!raw) return DEFAULT_SYSTEM_SETTINGS;
      return { ...DEFAULT_SYSTEM_SETTINGS, ...(JSON.parse(raw) as Partial<SystemSettings>) };
    } catch {
      return DEFAULT_SYSTEM_SETTINGS;
    }
  },

  async updateSystemSettings(settings: SystemSettings): Promise<SystemSettings> {
    try {
      window.localStorage.setItem(SYSTEM_PREFS_KEY, JSON.stringify(settings));
    } catch {
      // Ignore storage access errors
    }
    return settings;
  },
};
