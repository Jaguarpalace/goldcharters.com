-- Move the last three hardcoded editorial blocks into the CMS:
--
--   - brand_intro          (3-paragraph "About Charters Gold" block)
--   - sell_buy_pathways    (twin Sell / Buy pathway cards)
--   - how_it_works_sell    (3-step "Selling To Us" process)
--   - how_it_works_buy     (3-step "Buying From Us" process)
--
-- Each row reuses the existing public.homepage_sections schema — no new
-- table, no new admin editor needed. Lists (paragraphs, steps, highlights)
-- live inside the `extra` jsonb column with a stable shape that the React
-- components read defensively.
--
-- First deploy is visually a no-op: the seed values are byte-for-byte the
-- strings the components hardcoded before this migration. Components keep
-- their hardcoded fallback so a missing row never breaks the public site.
--
-- Safe to re-run.

insert into public.homepage_sections (
  section_key, title, subtitle, body, cta_label, cta_href, extra, display_order, visible
) values
  (
    'brand_intro',
    'A Private Valuation House for Gold & Jewellery',
    'About Charters Gold',
    -- Paragraphs separated by a blank line. The component splits on \n\n
    -- so the admin can add / remove paragraphs without code changes.
    E'Charters Gold is an independent UK precious-metal buyer based in Egham, Surrey, specialising in the discreet valuation and purchase of gold, fine jewellery, luxury watches and designer handbags. Every piece is assessed in person by an experienced specialist — never weighed in a window or priced by an algorithm — so the offer you receive reflects what your gold and jewellery are genuinely worth on today''s market.\n\nOur approach is built around three principles: a fair price tied to the live spot gold price, total transparency about how that price is calculated, and same-day payment by bank transfer the moment you accept. Whether you are selling a single inherited ring, a collection of scrap gold, sovereigns, gold bars, a Rolex or Patek Philippe watch, or a pre-loved Hermès or Chanel handbag, the process is the same: upload photos and a few details, receive a written valuation within one working day, and choose whether to proceed.\n\nWe work by private appointment from our Surrey base and welcome clients from across London and the wider South-East who prefer a quiet, considered service over a busy high-street counter. Use the live gold calculator below for an instant guide price per gram across 9ct, 14ct, 18ct, 22ct and 24ct gold, then request a private valuation when you are ready for a firm offer.',
    null,
    null,
    null,
    900,
    true
  ),
  (
    'sell_buy_pathways',
    'Sell To Us · Buy From Us',
    'Two Distinct Journeys',
    'Our private clients choose one of two pathways. Both are handled with the same level of care and discretion.',
    null,
    null,
    jsonb_build_object(
      'pathways', jsonb_build_array(
        jsonb_build_object(
          'label',      '01 · Selling',
          'title',      'Sell To Us',
          'body',       'Receive a professional valuation for gold, diamonds, jewellery, coins and bars. Upload photos, use our gold calculator, or request a private valuation.',
          'cta_label',  'Start Selling',
          'cta_href',   '/sell-gold',
          'highlights', jsonb_build_array('Live gold pricing', 'Same-day payment available', 'Multi-photo upload'),
          'variant',    'sell'
        ),
        jsonb_build_object(
          'label',      '02 · Buying',
          'title',      'Buy From Us',
          'body',       'Browse selected gold and jewellery items available to purchase online, with clear product details, photos and secure checkout.',
          'cta_label',  'Shop Now',
          'cta_href',   '/shop',
          'highlights', jsonb_build_array('Live stock availability', 'Curated collection', 'Secure UK delivery'),
          'variant',    'buy'
        )
      )
    ),
    50,
    true
  ),
  (
    'how_it_works_sell',
    'A Considered, Step-by-Step Process',
    'How It Works',
    null,
    null,
    null,
    jsonb_build_object(
      'steps', jsonb_build_array(
        jsonb_build_object(
          'title', 'Upload Details or Visit Us',
          'body',  'Tell us what you have, use the calculator, upload photos, or arrange a private valuation.'
        ),
        jsonb_build_object(
          'title', 'Receive Your Valuation',
          'body',  'Our specialists assess your items professionally and explain your offer clearly.'
        ),
        jsonb_build_object(
          'title', 'Get Paid',
          'body',  'Accept your offer and receive fast payment by bank transfer or cash where available.'
        )
      )
    ),
    600,
    true
  ),
  (
    'how_it_works_buy',
    'A Considered, Step-by-Step Process',
    'How It Works',
    null,
    null,
    null,
    jsonb_build_object(
      'steps', jsonb_build_array(
        jsonb_build_object(
          'title', 'Browse The Collection',
          'body',  'Explore selected jewellery and gold pieces available to purchase.'
        ),
        jsonb_build_object(
          'title', 'Add To Basket',
          'body',  'View product details, check stock and add your chosen item to the basket.'
        ),
        jsonb_build_object(
          'title', 'Checkout Securely',
          'body',  'Complete your order through a secure checkout flow.'
        )
      )
    ),
    601,
    true
  )
on conflict (section_key) do nothing;
