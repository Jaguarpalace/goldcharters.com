export const supabaseEnv = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  // Server-only — never reference this from client components.
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
};

export function isSupabaseConfigured() {
  return Boolean(supabaseEnv.url && supabaseEnv.anonKey);
}

export function isSupabaseAdminConfigured() {
  return Boolean(supabaseEnv.url && supabaseEnv.serviceRoleKey);
}
