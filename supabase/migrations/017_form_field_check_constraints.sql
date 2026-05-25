-- DB-level guards for the free-text columns that semantically hold a finite
-- set of values. Today these are protected only by server-action allow-lists,
-- so a developer with direct DB access (or a future server-action bug) could
-- write garbage. A CHECK constraint catches that at INSERT/UPDATE time.
--
-- We use CHECK (not Postgres enums) on purpose: CHECK constraints are easy
-- to evolve later (just DROP + ADD), whereas enum values can only be added,
-- never removed or reordered cleanly.
--
-- Source of truth for the allowed values is lib/schemas/valuationFormOptions.ts.
-- Keep these in sync when adding new options.
--
-- ─── form_variant
--   ('metal' | 'jewellery' | 'watch' | 'handbag')
-- ─── metal_type
--   ('Gold' | 'Silver' | 'Platinum')
-- ─── item_category
--   ('Coins' | 'Bullion' | 'Scrap' | 'Jewellery' | 'Other')
-- ─── jewellery_type
--   ('Ring' | 'Necklace' | 'Bracelet' | 'Earrings' | 'Pendant' | 'Other')
-- ─── gemstone
--   ('Diamond' | 'Sapphire' | 'Ruby' | 'Emerald' | 'Other' | 'None')
-- ─── condition
--   ('Excellent' | 'Good' | 'Fair' | 'Worn')
-- ─── box_papers
--   ('All' | 'Box only' | 'Papers only' | 'Neither')
-- ─── carat (purity)
--   gold carats ('9ct'..'24ct') + silver fineness ('999 silver' etc.) +
--   platinum fineness ('950 platinum' etc.)
--
-- Safe to re-run.

-- ---------------------------------------------------------------------------
-- Pre-flight backfill: legacy data may contain values the canonical schema no
-- longer permits. Migrate them to a safe nearest option before we add the
-- constraint so the ALTER doesn't fail on existing rows.
-- ---------------------------------------------------------------------------

-- Old server allow-list quietly accepted 'Some' for box_papers, but the
-- public form never offered it. Collapse to 'Box only' so the data isn't
-- lost while still complying with the canonical set.
update public.valuation_requests
set box_papers = 'Box only'
where box_papers = 'Some';

-- ---------------------------------------------------------------------------
-- valuation_requests
-- ---------------------------------------------------------------------------

alter table public.valuation_requests
  drop constraint if exists valuation_requests_form_variant_check;
alter table public.valuation_requests
  add constraint valuation_requests_form_variant_check
    check (form_variant is null or form_variant in ('metal', 'jewellery', 'watch', 'handbag'));

alter table public.valuation_requests
  drop constraint if exists valuation_requests_metal_type_check;
alter table public.valuation_requests
  add constraint valuation_requests_metal_type_check
    check (metal_type is null or metal_type in ('Gold', 'Silver', 'Platinum'));

alter table public.valuation_requests
  drop constraint if exists valuation_requests_item_category_check;
alter table public.valuation_requests
  add constraint valuation_requests_item_category_check
    check (item_category is null or item_category in ('Coins', 'Bullion', 'Scrap', 'Jewellery', 'Other'));

alter table public.valuation_requests
  drop constraint if exists valuation_requests_jewellery_type_check;
alter table public.valuation_requests
  add constraint valuation_requests_jewellery_type_check
    check (jewellery_type is null or jewellery_type in ('Ring', 'Necklace', 'Bracelet', 'Earrings', 'Pendant', 'Other'));

alter table public.valuation_requests
  drop constraint if exists valuation_requests_gemstone_check;
alter table public.valuation_requests
  add constraint valuation_requests_gemstone_check
    check (gemstone is null or gemstone in ('Diamond', 'Sapphire', 'Ruby', 'Emerald', 'Other', 'None'));

alter table public.valuation_requests
  drop constraint if exists valuation_requests_condition_check;
alter table public.valuation_requests
  add constraint valuation_requests_condition_check
    check (condition is null or condition in ('Excellent', 'Good', 'Fair', 'Worn'));

alter table public.valuation_requests
  drop constraint if exists valuation_requests_box_papers_check;
alter table public.valuation_requests
  add constraint valuation_requests_box_papers_check
    check (box_papers is null or box_papers in ('All', 'Box only', 'Papers only', 'Neither'));

-- Carat covers gold + silver + platinum purity strings.
alter table public.valuation_requests
  drop constraint if exists valuation_requests_carat_check;
alter table public.valuation_requests
  add constraint valuation_requests_carat_check
    check (
      carat is null or carat in (
        -- Gold carats
        '9ct', '10ct', '14ct', '18ct', '20ct', '21ct', '22ct', '24ct',
        -- Silver fineness
        '999 silver', '958 silver', '925 silver', '900 silver',
        -- Platinum fineness
        '950 platinum', '900 platinum', '850 platinum'
      )
    );

-- ---------------------------------------------------------------------------
-- stock_items — same purity / metal constraints so the ledger stays clean.
-- Palladium is allowed here (and not on valuation_requests) because manual
-- walk-in entries can include it.
-- ---------------------------------------------------------------------------

alter table public.stock_items
  drop constraint if exists stock_items_metal_type_check;
alter table public.stock_items
  add constraint stock_items_metal_type_check
    check (metal_type is null or metal_type in ('Gold', 'Silver', 'Platinum', 'Palladium'));

alter table public.stock_items
  drop constraint if exists stock_items_carat_check;
alter table public.stock_items
  add constraint stock_items_carat_check
    check (
      carat is null or carat in (
        '9ct', '10ct', '14ct', '18ct', '20ct', '21ct', '22ct', '24ct',
        '999 silver', '958 silver', '925 silver', '900 silver',
        '950 platinum', '900 platinum', '850 platinum'
      )
    );
