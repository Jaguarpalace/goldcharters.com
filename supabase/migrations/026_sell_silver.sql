-- /sell-silver page — mirrors /sell-gold with a silver-only calculator.
--
-- This migration:
--   1. Seeds a `silver_intro` homepage_sections row so the page hero is
--      CMS-editable from /admin/homepage just like sell_intro and
--      jewellery_intro. Bullets live in extra.bullets, same shape.
--   2. Seeds a /sell-silver page_seo row so /admin/seo can manage the
--      title, description, keywords and OG tags the same way.
--
-- Safe to re-run (conflict on natural keys is a no-op so admin edits are
-- never overwritten).
--
-- Only one schema change: extend the valuation_item_type enum so the
-- /sell-silver form's hidden item_type='silver' value is accepted by
-- the valuation_requests insert. Calculator rates for silver (925, 999)
-- already exist from the original seed.sql, so nothing else needs
-- adding for the calculator to render.
alter type public.valuation_item_type add value if not exists 'silver';

insert into public.homepage_sections (section_key, title, subtitle, body, cta_label, cta_href, extra, display_order, visible)
values
  (
    'silver_intro',
    'Sell Silver With Confidence',
    null,
    'Whether you have sterling silver, silver coins, bars, scrap silver or hallmarked pieces, our specialists provide fast and professional valuations based on live silver prices.',
    'Sell My Silver',
    '/sell-silver',
    jsonb_build_object(
      'bullets',
      jsonb_build_array(
        'Sterling silver accepted',
        'Silver coins and bars',
        'Scrap and broken silver',
        'Hallmarked pieces',
        'Fast valuation',
        'Same-day payment available',
        'Upload multiple photos',
        'Use the silver calculator first'
      )
    ),
    -- 8 = after handbag_intro (6) and watch_intro (7) so the admin
    -- editor lists this new row at the end of the per-page intros
    -- block. Public ordering is unaffected — each section is rendered
    -- by name on its dedicated page.
    8,
    true
  )
on conflict (section_key) do nothing;

insert into public.page_seo (slug, title, description, keywords, og_title, og_description)
values
  (
    '/sell-silver',
    'Sell Silver For Cash · Private UK Specialists',
    'Sell sterling silver, silver coins, bars, scrap silver and hallmarked pieces to a discreet UK private valuation house. Same-day payment, live spot pricing, no obligation.',
    array['sell silver UK','sell silver for cash','sell sterling silver','sell silver coins','sell silver bars','sell scrap silver','silver buyer UK','silver valuation UK'],
    'Sell Silver For Cash · Private UK Specialists',
    'Discreet UK private valuation house. Live silver spot pricing, transparent offers, same-day payment.'
  )
on conflict (slug) do nothing;
