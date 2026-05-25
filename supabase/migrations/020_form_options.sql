-- Admin-editable registry of every option list shown on the public
-- valuation form. Replaces the schema-only constants in
-- lib/schemas/valuationFormOptions.ts as the *runtime* source of truth
-- for display + server validation; the schema constants stay in code as
-- the build-time defaults and the safe fallback when the DB is empty
-- or unreachable.
--
-- Set keys mirror the names admins will see in /admin/form-options.
-- Adding a new option is now an admin edit, not a code change.
--
-- Safe to re-run.

create table if not exists public.form_options (
  id uuid primary key default gen_random_uuid(),
  -- Which option list this row belongs to. See the seed below for the
  -- canonical set of keys.
  set_key text not null,
  -- Value stored on submission (also the validation allow-list entry).
  value text not null,
  -- Human-readable label shown in the dropdown. Often identical to value;
  -- different for purity lists where "9ct" maps to "9ct (37.5%)".
  label text not null,
  display_order int not null default 0,
  visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint form_options_set_value_unique unique (set_key, value)
);

create index if not exists form_options_set_order_idx
  on public.form_options (set_key, display_order)
  where visible = true;

-- RLS — public read because the public form needs to render the options.
-- Admin-only write.
alter table public.form_options enable row level security;
drop policy if exists form_options_public_read on public.form_options;
create policy form_options_public_read on public.form_options
  for select using (visible or public.is_admin());
drop policy if exists form_options_admin_write on public.form_options;
create policy form_options_admin_write on public.form_options
  for all using (public.is_admin()) with check (public.is_admin());

-- Touch trigger so we know when an admin last changed something.
drop trigger if exists trg_touch_form_options on public.form_options;
create trigger trg_touch_form_options
  before update on public.form_options
  for each row execute function public.tg_touch_updated_at();

-- ---------------------------------------------------------------------------
-- Seed. Order matters — display_order drives the dropdown order. Re-running
-- never overwrites an admin's reorder or rename.
-- ---------------------------------------------------------------------------

insert into public.form_options (set_key, value, label, display_order) values
  -- Metal
  ('metal', 'Gold',     'Gold',     1),
  ('metal', 'Silver',   'Silver',   2),
  ('metal', 'Platinum', 'Platinum', 3),
  -- Item form (metal branch)
  ('item_form', 'Coins',     'Coins',     1),
  ('item_form', 'Bullion',   'Bullion',   2),
  ('item_form', 'Scrap',     'Scrap',     3),
  ('item_form', 'Jewellery', 'Jewellery', 4),
  ('item_form', 'Other',     'Other',     5),
  -- Jewellery type
  ('jewellery_type', 'Ring',      'Ring',      1),
  ('jewellery_type', 'Necklace',  'Necklace',  2),
  ('jewellery_type', 'Bracelet',  'Bracelet',  3),
  ('jewellery_type', 'Earrings',  'Earrings',  4),
  ('jewellery_type', 'Pendant',   'Pendant',   5),
  ('jewellery_type', 'Other',     'Other',     6),
  -- Gemstone
  ('gemstone', 'Diamond',  'Diamond',  1),
  ('gemstone', 'Sapphire', 'Sapphire', 2),
  ('gemstone', 'Ruby',     'Ruby',     3),
  ('gemstone', 'Emerald',  'Emerald',  4),
  ('gemstone', 'Other',    'Other',    5),
  ('gemstone', 'None',     'None',     6),
  -- Watch brand
  ('watch_brand', 'Rolex',             'Rolex',             1),
  ('watch_brand', 'Patek Philippe',    'Patek Philippe',    2),
  ('watch_brand', 'Audemars Piguet',   'Audemars Piguet',   3),
  ('watch_brand', 'Omega',             'Omega',             4),
  ('watch_brand', 'Cartier',           'Cartier',           5),
  ('watch_brand', 'IWC',               'IWC',               6),
  ('watch_brand', 'Jaeger-LeCoultre',  'Jaeger-LeCoultre',  7),
  ('watch_brand', 'Other',             'Other',             8),
  -- Handbag brand
  ('handbag_brand', 'Hermès',         'Hermès',         1),
  ('handbag_brand', 'Chanel',         'Chanel',         2),
  ('handbag_brand', 'Louis Vuitton',  'Louis Vuitton',  3),
  ('handbag_brand', 'Dior',           'Dior',           4),
  ('handbag_brand', 'Gucci',          'Gucci',          5),
  ('handbag_brand', 'Prada',          'Prada',          6),
  ('handbag_brand', 'Bottega Veneta', 'Bottega Veneta', 7),
  ('handbag_brand', 'Other',          'Other',          8),
  -- Condition
  ('condition', 'Excellent', 'Excellent', 1),
  ('condition', 'Good',      'Good',      2),
  ('condition', 'Fair',      'Fair',      3),
  ('condition', 'Worn',      'Worn',      4),
  -- Box / papers
  ('box_papers', 'All',          'All',          1),
  ('box_papers', 'Box only',     'Box only',     2),
  ('box_papers', 'Papers only',  'Papers only',  3),
  ('box_papers', 'Neither',      'Neither',      4),
  -- Gold purity
  ('purity_gold', '9ct',  '9ct (37.5%)', 1),
  ('purity_gold', '10ct', '10ct (41.7%)', 2),
  ('purity_gold', '14ct', '14ct (58.5%)', 3),
  ('purity_gold', '18ct', '18ct (75.0%)', 4),
  ('purity_gold', '20ct', '20ct (83.3%)', 5),
  ('purity_gold', '21ct', '21ct (87.5%)', 6),
  ('purity_gold', '22ct', '22ct (91.6%)', 7),
  ('purity_gold', '24ct', '24ct (99.9%)', 8),
  -- Silver fineness
  ('purity_silver', '999 silver', 'Fine silver — 999 (99.9%)',  1),
  ('purity_silver', '958 silver', 'Britannia — 958 (95.8%)',    2),
  ('purity_silver', '925 silver', 'Sterling — 925 (92.5%)',     3),
  ('purity_silver', '900 silver', 'Coin silver — 900 (90%)',    4),
  -- Platinum fineness
  ('purity_platinum', '950 platinum', '950 (95%)', 1),
  ('purity_platinum', '900 platinum', '900 (90%)', 2),
  ('purity_platinum', '850 platinum', '850 (85%)', 3)
on conflict (set_key, value) do nothing;
