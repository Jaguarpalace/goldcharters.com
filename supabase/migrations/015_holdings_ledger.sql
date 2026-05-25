-- Holdings ledger — physical inventory of gold/jewellery/watches/handbags we
-- have actually bought from sellers.
--
-- This sits one layer below the valuation pipeline:
--   * valuation_requests captures every enquiry, with status `bought` and
--     payment_amount once we've paid for the piece.
--   * stock_items (this table) captures the piece itself once it's in our
--     custody, snapshots the spot price at acquisition so historical margins
--     stay honest, and tracks whether it's still held or sold on.
--
-- Spot price is FROZEN at acquisition and at sale so margins don't drift as
-- the live spot moves later. The live portfolio value is computed at read
-- time by multiplying weight × purity × current spot (cached upstream).
--
-- Safe to re-run.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type stock_item_status as enum ('held', 'sold', 'written_off');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Global stock-number sequence
-- ---------------------------------------------------------------------------
-- Used by the server action to mint CG-000001, CG-000002, … on insert.
-- A sequence (not a count(*) + 1) avoids race conditions when two admins
-- create items at the same moment.
create sequence if not exists public.stock_items_number_seq
  start with 1
  increment by 1
  minvalue 1
  no maxvalue
  cache 1;

-- Tiny SQL helper used as the default for stock_items.stock_number so the
-- value is allocated atomically by the database on insert. Callers omit
-- stock_number from their inserts and pick the assigned value back out via
-- RETURNING.
create or replace function public.next_stock_number()
returns text
language sql
volatile
as $$
  select 'CG-' || lpad(nextval('public.stock_items_number_seq')::text, 6, '0')
$$;

-- ---------------------------------------------------------------------------
-- stock_items
-- ---------------------------------------------------------------------------
create table if not exists public.stock_items (
  id uuid primary key default gen_random_uuid(),
  -- Human-readable identifier, e.g. 'CG-000001'. Allocated atomically by
  -- the default expression on insert; admins shouldn't set this manually.
  stock_number text not null default public.next_stock_number(),

  -- Source links — both nullable so manual walk-in entries work too.
  valuation_request_id uuid references public.valuation_requests(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,

  -- Frozen item snapshot. We deliberately do NOT join live to items_we_buy /
  -- valuation_requests for display values — renaming a category later must
  -- never rewrite ledger history.
  item_type text,
  description text,
  metal_type text,                           -- 'Gold' | 'Silver' | 'Platinum' | 'Palladium' | null (watches/handbags)
  carat text,                                -- '9ct' | '14ct' | '18ct' | '22ct' | '24ct' | null
  purity_percentage numeric(5, 2),           -- 37.5, 58.5, 75.0, 91.6, 99.9 — used by the live-value calc
  weight_grams numeric(10, 3),

  -- Acquisition (always set).
  acquired_at timestamptz not null default now(),
  acquired_paid_gbp numeric(12, 2) not null,
  -- Spot price (per gram, pure metal) at the moment we bought. Nullable
  -- for non-metal items (watches, handbags) where there's no spot.
  acquired_spot_gbp_per_g numeric(12, 4),

  -- Lifecycle.
  status stock_item_status not null default 'held',

  -- Sale fields — populated only when status = 'sold'.
  sold_at timestamptz,
  sold_to_name text,
  sold_to_email text,
  sold_amount_gbp numeric(12, 2),
  sold_spot_gbp_per_g numeric(12, 4),

  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Stock numbers are unique forever — sold rows keep their number.
  constraint stock_items_stock_number_unique unique (stock_number)
);

-- Cheap email format guard; nullable so non-named sales (e.g. wholesaler
-- by reference number) still work.
alter table public.stock_items
  drop constraint if exists stock_items_sold_to_email_format;
alter table public.stock_items
  add constraint stock_items_sold_to_email_format
    check (sold_to_email is null or sold_to_email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$');

-- ---------------------------------------------------------------------------
-- Indexes — sized for the portfolio dashboard query patterns
-- ---------------------------------------------------------------------------
-- "Show everything currently held" — the hot query, runs on every dashboard load.
create index if not exists stock_items_status_idx
  on public.stock_items (status);

-- "Recent acquisitions" + the held list ordered chronologically.
create index if not exists stock_items_acquired_at_idx
  on public.stock_items (acquired_at desc);

-- "Sold between X and Y" — drives the daily/weekly CSV exports.
create index if not exists stock_items_sold_at_idx
  on public.stock_items (sold_at desc)
  where status = 'sold';

-- Lookup from a valuation request → its derived stock row.
create index if not exists stock_items_valuation_idx
  on public.stock_items (valuation_request_id)
  where valuation_request_id is not null;

-- Lookup all items bought from a given customer (Holdings tab on KYC page).
create index if not exists stock_items_customer_idx
  on public.stock_items (customer_id)
  where customer_id is not null;

-- ---------------------------------------------------------------------------
-- RLS — admin-only
-- ---------------------------------------------------------------------------
alter table public.stock_items enable row level security;
drop policy if exists stock_items_admin_all on public.stock_items;
create policy stock_items_admin_all on public.stock_items
  for all using (public.is_admin()) with check (public.is_admin());

drop trigger if exists trg_touch_stock_items on public.stock_items;
create trigger trg_touch_stock_items
  before update on public.stock_items
  for each row execute function public.tg_touch_updated_at();
