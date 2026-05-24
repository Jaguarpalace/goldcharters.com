-- Admin-editable list of email recipients for transactional alerts
-- (currently: new valuation requests).
--
-- This replaces the ADMIN_NOTIFICATION_EMAIL env var. The env var is kept
-- as a fallback in code so existing deployments keep working until the
-- admin populates the table from /admin/notifications.
--
-- Safe to re-run.

create table if not exists public.notification_recipients (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  -- Optional human label, e.g. "Office shared inbox" or "Paul – mobile".
  label text,
  -- When false, the row is preserved but no alert is sent to this address.
  enabled boolean not null default true,
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Email format check at the DB layer so bad data can't sneak in via SQL.
alter table public.notification_recipients
  drop constraint if exists notification_recipients_email_format;
alter table public.notification_recipients
  add constraint notification_recipients_email_format
    check (email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$');

create unique index if not exists notification_recipients_email_unique
  on public.notification_recipients (lower(email));

-- RLS: admin-only.
alter table public.notification_recipients enable row level security;
drop policy if exists notification_recipients_admin_all on public.notification_recipients;
create policy notification_recipients_admin_all on public.notification_recipients
  for all using (public.is_admin()) with check (public.is_admin());

-- Touch trigger so updated_at stays accurate.
drop trigger if exists trg_touch_notification_recipients on public.notification_recipients;
create trigger trg_touch_notification_recipients
  before update on public.notification_recipients
  for each row execute function public.tg_touch_updated_at();
