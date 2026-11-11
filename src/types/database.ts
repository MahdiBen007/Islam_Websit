export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.18';
  };
  public: {
    Tables: {
      admin_notes: {
        Row: {
          admin_id: string | null;
          created_at: string;
          id: string;
          note: string;
          registration_id: string;
          updated_at: string;
        };
        Insert: {
          admin_id?: string | null;
          created_at?: string;
          id?: string;
          note?: string;
          registration_id: string;
          updated_at?: string;
        };
        Update: {
          admin_id?: string | null;
          created_at?: string;
          id?: string;
          note?: string;
          registration_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'admin_notes_admin_id_fkey';
            columns: ['admin_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'admin_notes_registration_id_fkey';
            columns: ['registration_id'];
            isOneToOne: false;
            referencedRelation: 'registrations';
            referencedColumns: ['id'];
          },
        ];
      };
      admin_notifications: {
        Row: {
          created_at: string;
          id: string;
          is_read: boolean;
          message_ar: string;
          message_en: string;
          registration_id: string | null;
          title_ar: string;
          title_en: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_read?: boolean;
          message_ar: string;
          message_en: string;
          registration_id?: string | null;
          title_ar: string;
          title_en: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_read?: boolean;
          message_ar?: string;
          message_en?: string;
          registration_id?: string | null;
          title_ar?: string;
          title_en?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'admin_notifications_registration_id_fkey';
            columns: ['registration_id'];
            isOneToOne: false;
            referencedRelation: 'registrations';
            referencedColumns: ['id'];
          },
        ];
      };
      audit_logs: {
        Row: {
          action: string;
          admin_id: string | null;
          created_at: string;
          details: Json;
          entity_id: string;
          entity_type: string;
          id: string;
        };
        Insert: {
          action: string;
          admin_id?: string | null;
          created_at?: string;
          details?: Json;
          entity_id: string;
          entity_type: string;
          id?: string;
        };
        Update: {
          action?: string;
          admin_id?: string | null;
          created_at?: string;
          details?: Json;
          entity_id?: string;
          entity_type?: string;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'audit_logs_admin_id_fkey';
            columns: ['admin_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      event_settings: {
        Row: {
          capacity: number;
          club_name_ar: string;
          club_name_en: string;
          club_subtitle_ar: string;
          club_subtitle_en: string;
          contact_address_ar: string;
          contact_address_en: string;
          contact_email: string;
          contact_phone: string;
          created_at: string;
          description_ar: string;
          description_en: string;
          event_date_ar: string;
          event_date_en: string;
          event_location_ar: string;
          event_location_en: string;
          event_logo_path: string | null;
          event_logo_url: string | null;
          event_name_ar: string;
          event_name_en: string;
          event_time_ar: string;
          event_time_en: string;
          facebook_url: string;
          instagram_url: string;
          is_active: boolean;
          is_registration_open: boolean;
          organizer_ar: string;
          organizer_en: string;
          organizer_summary_ar: string;
          organizer_summary_en: string;
          singleton_key: boolean;
          updated_at: string;
        };
        Insert: {
          capacity?: number;
          club_name_ar: string;
          club_name_en: string;
          club_subtitle_ar: string;
          club_subtitle_en: string;
          contact_address_ar: string;
          contact_address_en: string;
          contact_email: string;
          contact_phone?: string;
          created_at?: string;
          description_ar: string;
          description_en: string;
          event_date_ar: string;
          event_date_en: string;
          event_location_ar: string;
          event_location_en: string;
          event_logo_path?: string | null;
          event_logo_url?: string | null;
          event_name_ar: string;
          event_name_en: string;
          event_time_ar: string;
          event_time_en: string;
          facebook_url?: string;
          instagram_url?: string;
          is_active?: boolean;
          is_registration_open?: boolean;
          organizer_ar: string;
          organizer_en: string;
          organizer_summary_ar: string;
          organizer_summary_en: string;
          singleton_key?: boolean;
          updated_at?: string;
        };
        Update: {
          capacity?: number;
          club_name_ar?: string;
          club_name_en?: string;
          club_subtitle_ar?: string;
          club_subtitle_en?: string;
          contact_address_ar?: string;
          contact_address_en?: string;
          contact_email?: string;
          contact_phone?: string;
          created_at?: string;
          description_ar?: string;
          description_en?: string;
          event_date_ar?: string;
          event_date_en?: string;
          event_location_ar?: string;
          event_location_en?: string;
          event_logo_path?: string | null;
          event_logo_url?: string | null;
          event_name_ar?: string;
          event_name_en?: string;
          event_time_ar?: string;
          event_time_en?: string;
          facebook_url?: string;
          instagram_url?: string;
          is_active?: boolean;
          is_registration_open?: boolean;
          organizer_ar?: string;
          organizer_en?: string;
          organizer_summary_ar?: string;
          organizer_summary_en?: string;
          singleton_key?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      page_settings: {
        Row: {
          created_at: string;
          cta_button_label_ar: string;
          cta_button_label_en: string;
          hero_badge_ar: string;
          hero_badge_en: string;
          hero_subtitle_ar: string;
          hero_subtitle_en: string;
          hero_title_ar: string;
          hero_title_en: string;
          is_active: boolean;
          is_registration_open: boolean;
          show_about_section: boolean;
          show_capcut_banner: boolean;
          show_metrics_bar: boolean;
          show_privacy_note: boolean;
          singleton_key: boolean;
          success_message_ar: string;
          success_message_en: string;
          success_title_ar: string;
          success_title_en: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          cta_button_label_ar: string;
          cta_button_label_en: string;
          hero_badge_ar: string;
          hero_badge_en: string;
          hero_subtitle_ar: string;
          hero_subtitle_en: string;
          hero_title_ar: string;
          hero_title_en: string;
          is_active?: boolean;
          is_registration_open?: boolean;
          show_about_section?: boolean;
          show_capcut_banner?: boolean;
          show_metrics_bar?: boolean;
          show_privacy_note?: boolean;
          singleton_key?: boolean;
          success_message_ar: string;
          success_message_en: string;
          success_title_ar: string;
          success_title_en: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          cta_button_label_ar?: string;
          cta_button_label_en?: string;
          hero_badge_ar?: string;
          hero_badge_en?: string;
          hero_subtitle_ar?: string;
          hero_subtitle_en?: string;
          hero_title_ar?: string;
          hero_title_en?: string;
          is_active?: boolean;
          is_registration_open?: boolean;
          show_about_section?: boolean;
          show_capcut_banner?: boolean;
          show_metrics_bar?: boolean;
          show_privacy_note?: boolean;
          singleton_key?: boolean;
          success_message_ar?: string;
          success_message_en?: string;
          success_title_ar?: string;
          success_title_en?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          email: string;
          full_name: string;
          id: string;
          is_active: boolean;
          role: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          email: string;
          full_name: string;
          id: string;
          is_active?: boolean;
          role?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          full_name?: string;
          id?: string;
          is_active?: boolean;
          role?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      registrations: {
        Row: {
          confirmed_attendance: boolean;
          created_at: string;
          id: string;
          registration_number: string;
          rejection_reason: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          specialization_id: string;
          specialization_name_ar: string;
          specialization_name_en: string;
          status: string;
          student_id: string;
          submitted_at: string;
          updated_at: string;
        };
        Insert: {
          confirmed_attendance?: boolean;
          created_at?: string;
          id?: string;
          registration_number: string;
          rejection_reason?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          specialization_id: string;
          specialization_name_ar: string;
          specialization_name_en: string;
          status?: string;
          student_id: string;
          submitted_at?: string;
          updated_at?: string;
        };
        Update: {
          confirmed_attendance?: boolean;
          created_at?: string;
          id?: string;
          registration_number?: string;
          rejection_reason?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          specialization_id?: string;
          specialization_name_ar?: string;
          specialization_name_en?: string;
          status?: string;
          student_id?: string;
          submitted_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'registrations_reviewed_by_fkey';
            columns: ['reviewed_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'registrations_specialization_id_fkey';
            columns: ['specialization_id'];
            isOneToOne: false;
            referencedRelation: 'specializations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'registrations_student_id_fkey';
            columns: ['student_id'];
            isOneToOne: false;
            referencedRelation: 'students';
            referencedColumns: ['id'];
          },
        ];
      };
      specializations: {
        Row: {
          created_at: string;
          description: string;
          display_order: number;
          icon: string;
          id: string;
          is_active: boolean;
          name_ar: string;
          name_en: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string;
          display_order?: number;
          icon?: string;
          id?: string;
          is_active?: boolean;
          name_ar: string;
          name_en: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string;
          display_order?: number;
          icon?: string;
          id?: string;
          is_active?: boolean;
          name_ar?: string;
          name_en?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      students: {
        Row: {
          created_at: string;
          email: string | null;
          first_name: string;
          id: string;
          instagram_username: string;
          last_name: string;
          phone: string | null;
          university: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          first_name: string;
          id?: string;
          instagram_username: string;
          last_name: string;
          phone?: string | null;
          university?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          first_name?: string;
          id?: string;
          instagram_username?: string;
          last_name?: string;
          phone?: string | null;
          university?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      admin_create_registration: {
        Args: {
          p_email?: string;
          p_first_name: string;
          p_instagram_username: string;
          p_last_name: string;
          p_phone: string;
          p_specialization_id: string;
          p_status?: string;
          p_university?: string;
        };
        Returns: string;
      };
      admin_list_registrations: {
        Args: {
          p_date_filter?: string;
          p_page?: number;
          p_page_size?: number;
          p_search?: string;
          p_specialization_id?: string;
          p_status?: string;
        };
        Returns: Json;
      };
      admin_update_registration: {
        Args: {
          p_admin_note?: string;
          p_email?: string;
          p_first_name?: string;
          p_instagram_username?: string;
          p_last_name?: string;
          p_phone?: string;
          p_registration_id: string;
          p_rejection_reason?: string;
          p_specialization_id?: string;
          p_status?: string;
          p_university?: string;
        };
        Returns: string;
      };
      get_registration_stats: { Args: never; Returns: Json };
      get_specialization_counts: { Args: never; Returns: Json };
      submit_public_registration: {
        Args: {
          p_confirmed_attendance?: boolean;
          p_first_name: string;
          p_instagram_username: string;
          p_ip_hash?: string;
          p_last_name: string;
          p_phone: string;
          p_specialization_id: string;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
