import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { isSupabaseAdminConfigured, isSupabaseConfigured, supabaseEnv } from './env';

/**
 * Server-side Supabase client bound to the user's session cookie.
 * Use inside server components, route handlers and server actions.
 */
export function getServerSupabase() {
  if (!isSupabaseConfigured()) return null;
  const cookieStore = cookies();

  return createServerClient(supabaseEnv.url, supabaseEnv.anonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          // ignore — cookie writes from a server component are read-only
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: '', ...options });
        } catch {
          // ignore
        }
      },
    },
  });
}

/**
 * Privileged Supabase client using the service-role key.
 * NEVER import this from a client component — keep it inside server actions / route handlers only.
 */
export function getAdminSupabase() {
  if (!isSupabaseAdminConfigured()) return null;
  return createClient(supabaseEnv.url, supabaseEnv.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
