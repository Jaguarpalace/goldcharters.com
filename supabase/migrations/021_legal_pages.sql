-- Lightweight CMS layer over the legal pages (/terms, /privacy, /cookies).
--
-- DESIGN NOTE — why the prose body is NOT in this table:
--
-- The numbered clauses on those pages are legal text that has been read
-- and approved by counsel. An admin typo or accidental deletion could
-- materially weaken the limitation-of-liability clause, the AML clause,
-- or the intellectual-property notice. The risk is much higher than the
-- benefit of CMS-editability, so the body stays in version-controlled
-- TSX files where every change is reviewed before merge.
--
-- What this table DOES make editable:
--   - eyebrow, title, intro    (cosmetic copy at the top of each page)
--   - last_reviewed_at         (admin clicks "Mark reviewed today" to
--                               bump the visible Last-updated date)
--
-- Both are low-risk surfaces — they don't change any legal obligation —
-- and they let admins refresh how recent the content looks without a
-- developer in the loop.
--
-- Safe to re-run.

create table if not exists public.legal_pages (
  slug text primary key,        -- 'terms' | 'privacy' | 'cookies'
  eyebrow text,                 -- override; null = use the hardcoded default
  title text,                   -- override
  intro text,                   -- override
  last_reviewed_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Touch trigger so we know when an admin last touched the row.
drop trigger if exists trg_touch_legal_pages on public.legal_pages;
create trigger trg_touch_legal_pages
  before update on public.legal_pages
  for each row execute function public.tg_touch_updated_at();

-- RLS: public read, admin write.
alter table public.legal_pages enable row level security;
drop policy if exists legal_pages_public_read on public.legal_pages;
create policy legal_pages_public_read on public.legal_pages
  for select using (true);
drop policy if exists legal_pages_admin_write on public.legal_pages;
create policy legal_pages_admin_write on public.legal_pages
  for all using (public.is_admin()) with check (public.is_admin());

-- Seed each legal page with its current Last-updated date (23 May 2026 in
-- the hardcoded TSX). on conflict (slug) do nothing so re-runs never
-- overwrite an admin's manual review-bump.
insert into public.legal_pages (slug, last_reviewed_at) values
  ('terms',   timestamptz '2026-05-23 00:00:00+00'),
  ('privacy', timestamptz '2026-05-23 00:00:00+00'),
  ('cookies', timestamptz '2026-05-23 00:00:00+00')
on conflict (slug) do nothing;
