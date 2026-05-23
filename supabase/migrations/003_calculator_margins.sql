-- Auto-update calculator rates from live spot prices.
--
-- Adds a nullable margin_percentage to calculator_rates.
--   • If margin_percentage IS NULL, the manual price_per_gram is used (legacy behaviour).
--   • If margin_percentage IS SET (e.g. 92.0), the public calculator computes:
--       price_per_gram = live_spot_per_gram_pure_metal × (purity_percentage / 100) × (margin_percentage / 100)
--   This means the admin can choose either fully manual prices or live-driven prices per row.
--
-- Run in Supabase → SQL Editor.

alter table public.calculator_rates
  add column if not exists margin_percentage numeric(5,2);

comment on column public.calculator_rates.margin_percentage is
  'Optional. When set, the public calculator derives price_per_gram from live spot × purity × margin/100. Leave NULL to keep the manual price_per_gram.';
