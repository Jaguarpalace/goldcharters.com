-- Split mode, buyers, sales and invoices.
--
-- Three additions to the holdings ledger:
--
--   1. SPLIT. A bulk holding (e.g. "100g of 9ct" bought on one agreement)
--      can be broken into the physical pieces that make up that weight.
--      Each piece becomes its own stock_items row with its own CG number,
--      pointing back at the bulk row via parent_stock_item_id. The bulk row
--      is kept intact (status 'split') so the original purchase never
--      disappears - the children carry the weight from then on.
--
--   2. BUYERS. The people and businesses we sell to, saved once and reused.
--      Sales previously stored a free-text name/email on the stock row.
--
--   3. SALES + SALE ITEMS. One sale = one invoice (INV-00001, ...) to one
--      buyer covering one or more stock items. sale_items snapshots the
--      description/weight/price at the moment of sale so an invoice stays
--      as issued even if the stock row is edited later. stock_items.sale_id
--      links each sold piece to its invoice. The legacy sold_* columns on
--      stock_items are still written (finance and CSV exports read them).
--
-- VAT on these invoices is always 0% - vat_rate/vat_gbp exist so the
-- invoice can print "VAT 0% - £0.00" honestly rather than omitting it.
--
-- Safe to re-run. The enum value is added without being referenced in the
-- same script, so this runs as a single query in the Supabase SQL Editor.

-- ---------------------------------------------------------------------------
-- 1. Split support on stock_items
-- ---------------------------------------------------------------------------
alter type stock_item_status add value if not exists 'split';

alter table public.stock_items
  add column if not exists parent_stock_item_id uuid
    references public.stock_items(id) on delete set null;

create index if not exists stock_items_parent_idx
  on public.stock_items (parent_stock_item_id)
  where parent_stock_item_id is not null;

-- ---------------------------------------------------------------------------
-- 2. Buyers
-- ---------------------------------------------------------------------------
create table if not exists public.buyers (
  id uuid primary key default gen_random_uuid(),
  -- 'business' or 'individual' - decides which optional fields the form
  -- shows, nothing else.
  kind text not null default 'business'
    check (kind in ('business', 'individual')),
  -- Name for an individual, trading name for a business.
  name text not null,
  contact_name text,
  company_number text,
  vat_number text,
  email text,
  phone text,
  address_line1 text,
  address_line2 text,
  city text,
  postcode text,
  country text,
  notes text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.buyers
  drop constraint if exists buyers_email_format;
alter table public.buyers
  add constraint buyers_email_format
    check (email is null or email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$');

-- Typeahead on the sale form searches name / contact / email.
create index if not exists buyers_name_idx on public.buyers (lower(name));
create index if not exists buyers_active_idx
  on public.buyers (created_at desc)
  where deleted_at is null;

alter table public.buyers enable row level security;
drop policy if exists buyers_admin_all on public.buyers;
create policy buyers_admin_all on public.buyers
  for all using (public.is_admin()) with check (public.is_admin());

drop trigger if exists trg_touch_buyers on public.buyers;
create trigger trg_touch_buyers
  before update on public.buyers
  for each row execute function public.tg_touch_updated_at();

-- ---------------------------------------------------------------------------
-- 3. Invoice numbers
-- ---------------------------------------------------------------------------
-- Same pattern as stock numbers: a sequence so two admins saving at once
-- can never mint the same invoice number.
create sequence if not exists public.sales_invoice_number_seq
  start with 1 increment by 1 minvalue 1 no maxvalue cache 1;

create or replace function public.next_invoice_number()
returns text
language sql
volatile
as $$
  select 'INV-' || lpad(nextval('public.sales_invoice_number_seq')::text, 5, '0')
$$;

-- ---------------------------------------------------------------------------
-- 4. Sales (one row per invoice)
-- ---------------------------------------------------------------------------
create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null default public.next_invoice_number(),
  buyer_id uuid not null references public.buyers(id) on delete restrict,
  sold_at timestamptz not null default now(),
  subtotal_gbp numeric(12, 2) not null default 0,
  vat_rate numeric(5, 2) not null default 0,
  vat_gbp numeric(12, 2) not null default 0,
  total_gbp numeric(12, 2) not null default 0,
  -- Buyer details as they were when the invoice was issued. Editing the
  -- buyer record later must not rewrite an issued invoice.
  buyer_snapshot jsonb,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  -- A voided sale keeps its invoice number (never reused) and its rows;
  -- the stock items go back to 'held'.
  voided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sales_invoice_number_unique unique (invoice_number)
);

create index if not exists sales_buyer_idx on public.sales (buyer_id, sold_at desc);
create index if not exists sales_sold_at_idx
  on public.sales (sold_at desc)
  where voided_at is null;

alter table public.sales enable row level security;
drop policy if exists sales_admin_all on public.sales;
create policy sales_admin_all on public.sales
  for all using (public.is_admin()) with check (public.is_admin());

drop trigger if exists trg_touch_sales on public.sales;
create trigger trg_touch_sales
  before update on public.sales
  for each row execute function public.tg_touch_updated_at();

-- ---------------------------------------------------------------------------
-- 5. Sale lines
-- ---------------------------------------------------------------------------
create table if not exists public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  stock_item_id uuid not null references public.stock_items(id) on delete restrict,
  position integer not null default 1,
  -- Snapshot of the piece as sold.
  stock_number text not null,
  description text not null,
  metal_type text,
  carat text,
  weight_grams numeric(10, 3),
  quantity integer not null default 1 check (quantity > 0),
  unit_price_gbp numeric(12, 2) not null check (unit_price_gbp >= 0),
  line_total_gbp numeric(12, 2) not null check (line_total_gbp >= 0),
  created_at timestamptz not null default now()
);

create index if not exists sale_items_sale_idx on public.sale_items (sale_id, position);
create index if not exists sale_items_stock_idx on public.sale_items (stock_item_id);

alter table public.sale_items enable row level security;
drop policy if exists sale_items_admin_all on public.sale_items;
create policy sale_items_admin_all on public.sale_items
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 6. Stock item -> invoice link
-- ---------------------------------------------------------------------------
alter table public.stock_items
  add column if not exists sale_id uuid references public.sales(id) on delete set null;

create index if not exists stock_items_sale_idx
  on public.stock_items (sale_id)
  where sale_id is not null;
