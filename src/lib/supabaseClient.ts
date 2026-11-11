import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ?? '';
const supabasePublishableKey =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined)?.trim() ?? '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

export function getSupabaseConfigError(): Error {
  return new Error(
    'Supabase environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY) are not configured.',
  );
}

let clientInstance: SupabaseClient<Database> | null = null;

export function getSupabaseClient(): SupabaseClient<Database> {
  if (!isSupabaseConfigured) {
    throw getSupabaseConfigError();
  }
  if (!clientInstance) {
    clientInstance = createClient<Database>(supabaseUrl, supabasePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return clientInstance;
}

export function getSupabaseFunctionsUrl(functionName: string): string {
  if (!isSupabaseConfigured) {
    throw getSupabaseConfigError();
  }
  return `${supabaseUrl.replace(/\/+$/, '')}/functions/v1/${functionName}`;
}

export function getSupabasePublicHeaders(): Record<string, string> {
  if (!isSupabaseConfigured) {
    throw getSupabaseConfigError();
  }
  return {
    'Content-Type': 'application/json',
    apikey: supabasePublishableKey,
    Authorization: `Bearer ${supabasePublishableKey}`,
  };
}
