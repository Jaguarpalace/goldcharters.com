'use client';

import { createBrowserClient } from '@supabase/ssr';
import { isSupabaseConfigured, supabaseEnv } from './env';

/**
 * Browser-safe Supabase client. Reads only the anon key.
 * Returns `null` when Supabase is not yet configured — callers must handle the
 * mock-data fallback gracefully so the project boots without a database.
 */
export function getBrowserSupabase() {
  if (!isSupabaseConfigured()) return null;
  return createBrowserClient(supabaseEnv.url, supabaseEnv.anonKey);
}
