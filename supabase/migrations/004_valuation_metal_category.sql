-- New question flow on the valuation form.
-- Adds optional columns for "What metal?" and "What item type?" so the
-- form can capture Rishi's preferred structure without forcing customers
-- into the old item_type enum. Carat already exists as a text column.
--
-- Run in Supabase → SQL Editor.

alter table public.valuation_requests
  add column if not exists metal_type text,
  add column if not exists item_category text;

comment on column public.valuation_requests.metal_type is
  'Customer-selected metal type: Gold, Silver or Platinum.';
comment on column public.valuation_requests.item_category is
  'Customer-selected item category: Coins, Bullion, Jewellery, Watch, Handbag or Other.';

-- The legacy item_type enum is preserved for backward compatibility — it
-- continues to receive the dedicated-page defaults (e.g. "handbags" on
-- /sell-handbags) so existing admin reporting and the AML status flow are
-- unaffected.
