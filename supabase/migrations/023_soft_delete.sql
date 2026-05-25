-- Soft delete for the three transactional tables.
--
-- Why soft delete:
--   - Accidental clicks can wipe a customer record (with their KYC tab)
--     or a stock_items row (with sale + cost history). Hard-delete leaves
--     no recovery path.
--   - Auditors expect "we never lose a record" rather than "trust us".
--
-- Design choices baked in:
--
--   1. Single `deleted_at` timestamptz column per table. NULL = active.
--      Cheap to add, cheap to filter (partial index keeps the hot
--      "active rows" query fast).
--   2. Reads that should ignore soft-deleted rows filter `deleted_at IS NULL`
--      at the query level (RLS keeps the rows visible to admins so the
--      /admin/trash page can fetch them).
--   3. The existing delete server actions become *soft* deletes. New
--      restore() and purge() actions handle the recovery and hard-delete
--      paths.
--   4. Only these three tables get soft-delete. Configuration tables
--      (site_settings, page_seo, legal_pages, form_options,
--      homepage_sections, services, items_we_buy, faqs, etc.) stay
--      hard-deletable — losing a row there is a code-fixable nuisance,
--      not a data-integrity event.
--
-- Safe to re-run.

alter table public.valuation_requests
  add column if not exists deleted_at timestamptz;

alter table public.customers
  add column if not exists deleted_at timestamptz;

alter table public.stock_items
  add column if not exists deleted_at timestamptz;

-- Partial indexes on the active (deleted_at IS NULL) subset. The hot
-- queries (board lists, dashboards) all filter on this; a partial index
-- is dramatically faster than indexing the whole column.
create index if not exists valuation_requests_active_idx
  on public.valuation_requests (created_at desc)
  where deleted_at is null;

create index if not exists customers_active_idx
  on public.customers (created_at desc)
  where deleted_at is null;

create index if not exists stock_items_active_idx
  on public.stock_items (acquired_at desc)
  where deleted_at is null;

-- And a small index on (deleted_at desc) so the /admin/trash board can
-- list "most-recently-deleted first" efficiently.
create index if not exists valuation_requests_deleted_idx
  on public.valuation_requests (deleted_at desc)
  where deleted_at is not null;

create index if not exists customers_deleted_idx
  on public.customers (deleted_at desc)
  where deleted_at is not null;

create index if not exists stock_items_deleted_idx
  on public.stock_items (deleted_at desc)
  where deleted_at is not null;
