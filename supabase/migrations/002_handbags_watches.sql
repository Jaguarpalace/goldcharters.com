-- Adds handbags + watches across the data layer.
-- Run in Supabase → SQL Editor → New query → paste → Run.

-- 1. Extend the valuation_item_type enum so the form's new values are accepted.
alter type valuation_item_type add value if not exists 'handbags';
alter type valuation_item_type add value if not exists 'watches';

-- 2. New homepage sections for the two product lines.
insert into public.homepage_sections (section_key, title, body, cta_label, cta_href, extra, display_order, visible)
values
  (
    'handbag_intro',
    'Sell Designer Handbags',
    'Discreet valuations for pre-loved designer handbags — Hermès, Chanel, Louis Vuitton, Dior, Gucci, Prada, Bottega Veneta and other premium houses. Authenticity verified, fair offers, fast settlement.',
    'Sell My Handbag',
    '/sell-handbags',
    jsonb_build_object('bullets', jsonb_build_array(
      'Hermès · Birkin, Kelly, Constance',
      'Chanel · Classic Flap, Boy, 2.55',
      'Louis Vuitton · select pieces',
      'Dior, Gucci, Prada, Bottega Veneta',
      'Authenticity verified by specialists',
      'Original box & dustbag enhances offer',
      'Upload multiple photos'
    )),
    6,
    true
  ),
  (
    'watch_intro',
    'Sell Luxury Watches',
    'Specialist valuations for fine timepieces — Rolex, Patek Philippe, Audemars Piguet, Omega, Cartier and other premium watchmakers. Movement, condition, papers and box all factored in.',
    'Sell My Watch',
    '/sell-watches',
    jsonb_build_object('bullets', jsonb_build_array(
      'Rolex · Submariner, Daytona, GMT, Datejust',
      'Patek Philippe · Nautilus, Calatrava, Aquanaut',
      'Audemars Piguet · Royal Oak',
      'Omega, Cartier, IWC, Jaeger-LeCoultre',
      'Box, papers & service history valued',
      'Vintage pieces welcomed',
      'Upload multiple photos'
    )),
    7,
    true
  )
on conflict (section_key) do nothing;

-- 3. Service cards shown on the homepage services grid.
insert into public.services (title, slug, short_description, icon_key, cta_label, cta_href, pathway, display_order, visible)
values
  ('Sell Designer Handbags', 'sell-handbags',
    'Hermès, Chanel, Louis Vuitton and other premium houses. Authentication and fair valuation by specialists.',
    'handbag', 'Sell Handbag', '/sell-handbags', 'sell', 7, true),
  ('Sell Luxury Watches', 'sell-watches',
    'Rolex, Patek Philippe, Audemars Piguet and other fine timepieces. Movement, papers and provenance assessed.',
    'watch', 'Sell Watch', '/sell-watches', 'sell', 8, true)
on conflict (slug) do nothing;

-- 4. Items-we-buy entries.
-- After migration 006 adds the unique-on-name constraint, the bare
-- `on conflict do nothing` correctly handles duplicate names without
-- error. Until then, this insert will still create duplicates if
-- re-run, which is what 006 cleans up.
insert into public.items_we_buy (name, display_order, visible) values
  ('Hermès handbags', 21, true),
  ('Chanel handbags', 22, true),
  ('Louis Vuitton handbags', 23, true),
  ('Designer handbags', 24, true),
  ('Rolex watches', 25, true),
  ('Patek Philippe watches', 26, true),
  ('Audemars Piguet watches', 27, true),
  ('Omega watches', 28, true),
  ('Cartier watches', 29, true),
  ('Luxury watches', 30, true)
on conflict do nothing;
