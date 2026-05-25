-- Append-only audit trail of every meaningful admin write.
--
-- Designed so a year from now you can answer:
--   "Who marked CG-000042 as sold, and when?"
--   "When was the privacy policy last reviewed?"
--   "Who deleted that customer record?"
--
-- The table is INSERT-only at the application level — no UPDATE / DELETE
-- policy is granted, even to admins. The whole point is that the trail
-- can't be rewritten after the fact. The service-role key (used by
-- server actions for writes) bypasses RLS, which is why inserts work
-- without an explicit insert policy; SELECT is admin-only.
--
-- Safe to re-run.

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  -- Who. Nullable when the actor's auth.users row has been deleted —
  -- we still keep the historical event row.
  actor_id uuid references auth.users(id) on delete set null,
  -- What kind of thing was touched. Free-text on purpose so adding a new
  -- table doesn't require an enum migration. Conventional values:
  --   'valuation_request' | 'stock_item' | 'customer' | 'page_seo' |
  --   'legal_page' | 'form_option' | 'site_settings' | 'customer_document'
  entity_type text not null,
  -- Optional. Null for entity types that don't have a stable id (e.g.
  -- the single-row site_settings table where slug is the obvious key).
  entity_id text,
  -- 'create' | 'update' | 'delete' | a specific verb like 'mark_reviewed',
  -- 'record_sale', 'change_status'. Application-defined.
  action text not null,
  -- Optional structured snapshots so the audit page can show a diff.
  -- Keep them small — only the columns the action actually changed.
  before jsonb,
  after jsonb,
  -- Optional human-readable summary (e.g. "Marked as bought · £4,500").
  note text,
  created_at timestamptz not null default now()
);

-- Common query shapes:
--   "show me everything that happened to CG-000042"
create index if not exists admin_audit_log_entity_idx
  on public.admin_audit_log (entity_type, entity_id, created_at desc);
--   "what did Paul do last week"
create index if not exists admin_audit_log_actor_idx
  on public.admin_audit_log (actor_id, created_at desc);
--   default board view, newest first
create index if not exists admin_audit_log_recent_idx
  on public.admin_audit_log (created_at desc);

-- RLS. Read-only for admins; no write policy intentionally — service-role
-- writes bypass RLS, which is the only path that should ever insert.
alter table public.admin_audit_log enable row level security;
drop policy if exists admin_audit_log_read on public.admin_audit_log;
create policy admin_audit_log_read on public.admin_audit_log
  for select using (public.is_admin());
