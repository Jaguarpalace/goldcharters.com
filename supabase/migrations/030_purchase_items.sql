-- Purchase itemisation.
--
-- Most sellers bring more than one piece, but a purchase (valuation_request)
-- previously carried a single lump payment_amount and one set of item fields,
-- so the printed Purchase Confirmation could not list what was actually
-- bought line by line. This table holds those lines.
--
-- Design notes:
--   * Additive only - requests without lines behave exactly as before, and
--     the print page falls back to the legacy single-item layout for them.
--   * Deliberately NOT derived from stock_items: the printed agreement is a
--     quasi-legal record and must stay as printed, independent of what later
--     happens to inventory. stock_item_id only tracks which lines have been
--     pushed into the holdings ledger (phase 2) to prevent double-imports.
--
-- Safe to re-run.

create table if not exists public.purchase_items (
  id uuid primary key default gen_random_uuid(),
  valuation_request_id uuid not null
    references public.valuation_requests(id) on delete cascade,
  position integer not null default 1,
  description text not null,
  metal_type text,
  carat text,
  weight_grams numeric,
  -- Hallmark details or a serial number, printed on the agreement line.
  hallmark text,
  price_gbp numeric not null check (price_gbp >= 0),
  -- Set when this line has been imported into the holdings ledger.
  stock_item_id uuid references public.stock_items(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists purchase_items_request_idx
  on public.purchase_items (valuation_request_id, position);

alter table public.purchase_items enable row level security;

drop policy if exists pi_select on public.purchase_items;
drop policy if exists pi_write on public.purchase_items;
create policy pi_select on public.purchase_items
  for select using (public.is_admin());
create policy pi_write on public.purchase_items
  for all using (public.is_admin()) with check (public.is_admin());
