-- Lets any signed-in admin read, invite and remove other team members.
--
-- The original 001 migration only gave a self-select policy on
-- admin_profiles, which means the Team page couldn't list anyone but the
-- current user via the session-scoped client. The service-role client used
-- by server actions bypasses RLS anyway — this policy is so admins can also
-- see the full team via the regular session client (e.g. for SSR lists).
--
-- Safe to re-run.

alter table public.admin_profiles enable row level security;

drop policy if exists admin_profiles_admin_all on public.admin_profiles;
create policy admin_profiles_admin_all on public.admin_profiles
  for all
  using (public.is_admin())
  with check (public.is_admin());
