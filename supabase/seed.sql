-- Seed data — mirrors the mock data shipped with the Next.js app so the live
-- site looks identical to the demo immediately after migration.
-- Run AFTER 001_initial_schema.sql.

-- Site settings (single row)
insert into public.site_settings (
  business_name, phone, email, whatsapp, address, opening_hours,
  top_bar_message, top_bar_review_text, top_bar_trust_text, top_bar_payment_text,
  footer_description, footer_disclaimer, seo_title, seo_description
) values (
  'Charters Gold',
  '0800 047 2348',
  'office@chartersgold.co.uk',
  '+44 7700 900123',
  'Avalon House, Unit 7A, Egham Business Village, Crabtree Road, Egham, Surrey, TW20 8RB',
  'Monday – Saturday · 10:00 – 18:00 · By appointment',
  'Discreet UK gold & jewellery specialists',
  'Excellent client reviews',
  'Private valuations · Insured handling',
  'Same-day payment available',
  'Charters Gold is a private valuation house specialising in gold, fine jewellery and antique pieces. We buy from private clients across the United Kingdom and curate a small collection of pieces available to purchase online.',
  'Valuations are subject to inspection, item condition, market prices and verification. Offers may vary depending on purity, weight, gemstones, brand, demand and documentation. Calculator prices are guide prices only.',
  'Charters Gold · Private UK Gold & Jewellery Specialists',
  'Sell gold, diamonds and fine jewellery to a discreet UK private valuation house, or browse our curated collection of jewellery and gold pieces.'
) on conflict do nothing;

-- Homepage sections
insert into public.homepage_sections (section_key, title, subtitle, body, cta_label, cta_href, extra, display_order)
values
  ('hero', 'Unlock the Value of Gold & Jewellery', 'Sell your gold and jewellery with confidence, or discover carefully selected jewellery and gold pieces available to buy online.', null, 'Sell Gold & Jewellery', '/sell-gold',
    jsonb_build_object(
      'secondary_cta_label','Shop Jewellery',
      'secondary_cta_href','/shop',
      'badges', jsonb_build_array('Same-Day Payment Available','Discreet Valuations','Gold & Jewellery Specialists','Secure UK Service','Based on Live Gold Prices')
    ), 1),
  ('sell_intro','Sell Your Gold With Confidence', null, 'Whether you have scrap gold, broken jewellery, coins, bars, chains or rings, our specialists provide fast and professional valuations based on live gold prices.', 'Sell My Gold', '/sell-gold',
    jsonb_build_object('bullets', jsonb_build_array('Scrap gold accepted','Broken gold accepted','Coins and bars accepted','Fast valuation','Same-day payment available','Upload multiple photos','Use the gold calculator first')), 2),
  ('jewellery_intro','Sell Fine, Antique & Branded Jewellery', null, 'From diamond rings and luxury bracelets to inherited jewellery and vintage pieces, receive a discreet valuation from experienced jewellery specialists.', 'Sell My Jewellery', '/sell-jewellery',
    jsonb_build_object('bullets', jsonb_build_array('Diamond jewellery','Designer jewellery','Antique pieces','Engagement rings','Inherited jewellery','Branded jewellery','Upload multiple photos')), 3),
  ('silver_intro','Sell Silver With Confidence', null, 'Whether you have sterling silver, silver coins, bars, scrap silver or hallmarked pieces, our specialists provide fast and professional valuations based on live silver prices.', 'Sell My Silver', '/sell-silver',
    jsonb_build_object('bullets', jsonb_build_array('Sterling silver accepted','Silver coins and bars','Scrap and broken silver','Hallmarked pieces','Fast valuation','Same-day payment available','Upload multiple photos','Use the silver calculator first')), 8),
  ('shop_intro','Shop Gold & Jewellery', null, 'Browse selected jewellery and gold pieces available to buy online, with clear product details, multiple images and live stock availability.', 'View Collection', '/shop', null, 4),
  ('valuation_explainer','How We Value Your Gold & Jewellery','Transparent, considered, market-led.','Every piece is reviewed by a specialist before an offer is made. We assess weight, carat and purity against live gold prices, then consider gemstones, diamond quality, brand provenance, age, rarity, condition and supporting documentation. You are under no obligation to accept the offer.', null, null,
    jsonb_build_object('criteria', jsonb_build_array('Gold weight','Carat / purity','Current gold price','Metal type','Gemstones','Diamond quality','Brand or designer value','Age and rarity','Condition','Box, papers or certificates','Market demand')), 5)
on conflict (section_key) do nothing;

-- Calculator rates
insert into public.calculator_rates (metal_type, carat_label, purity_percentage, price_per_gram, display_order) values
  ('Gold','9ct',37.5,23.4,1),
  ('Gold','10ct',41.7,26.0,2),
  ('Gold','14ct',58.5,36.5,3),
  ('Gold','18ct',75.0,46.8,4),
  ('Gold','20ct',83.3,52.0,5),
  ('Gold','21ct',87.5,54.6,6),
  ('Gold','22ct',91.6,57.2,7),
  ('Gold','24ct',99.9,62.4,8),
  ('Silver','925',92.5,0.68,9),
  ('Silver','999',99.9,0.74,10),
  ('Platinum','950',95.0,22.4,11),
  ('Palladium','500',50.0,12.8,12),
  ('Palladium','950',95.0,24.6,13)
on conflict do nothing;

-- Services
insert into public.services (title, slug, short_description, icon_key, cta_label, cta_href, pathway, display_order) values
  ('Sell Gold','sell-gold','Turn gold rings, chains, bracelets, coins, bars and scrap gold into a competitive cash offer.','bars','Sell Gold','/sell-gold','sell',1),
  ('Sell Jewellery','sell-jewellery','Receive a professional valuation for diamond rings, designer jewellery, antique pieces and inherited jewellery.','ring','Sell Jewellery','/sell-jewellery','sell',2),
  ('Gold Calculator','gold-calculator','Get an instant guide price by entering item weight and carat, using admin-controlled price-per-gram values.','calculator','Open Calculator','/gold-calculator','sell',3),
  ('Shop Jewellery','shop','Browse jewellery and gold pieces available to buy, with stock-controlled listings and basket functionality.','box','View Collection','/shop','buy',4),
  ('Gold Valuation','gold-valuation','Your gold is assessed using weight, purity, condition and current market prices.','scale','Request Valuation','/sell-gold','sell',5),
  ('Jewellery Valuation','jewellery-valuation','Fine jewellery is valued based on metal, gemstones, brand, age, condition and market demand.','diamond','Request Valuation','/sell-jewellery','sell',6)
on conflict (slug) do nothing;

-- Items we buy
insert into public.items_we_buy (name, display_order) values
  ('Gold rings',1),('Gold chains',2),('Gold bracelets',3),('Gold earrings',4),('Scrap gold',5),('Broken gold',6),
  ('Gold coins',7),('Sovereigns',8),('Gold bars',9),('Bullion',10),('Diamond rings',11),('Engagement rings',12),
  ('Wedding rings',13),('Antique jewellery',14),('Vintage jewellery',15),('Branded jewellery',16),
  ('Luxury necklaces',17),('Luxury bracelets',18),('Inherited jewellery',19),('Unwanted jewellery',20)
on conflict do nothing;

-- Trust cards
insert into public.trust_cards (title, display_order) values
  ('Competitive offers',1),('Same-day payment available',2),('Discreet private service',3),('Transparent valuations',4),
  ('Experienced specialists',5),('Secure item handling',6),('No pressure to sell',7),('UK-based service',8),
  ('Clear communication',9),('Professional customer care',10),('Curated jewellery stock',11),('Secure checkout for purchases',12)
on conflict do nothing;

-- FAQs
insert into public.faqs (category, question, answer, display_order) values
  ('selling_gold','How is gold valued?','Gold is usually valued based on weight, purity, current gold price and condition. Our specialists test purity in person before issuing a final offer.',1),
  ('selling_gold','Can I sell broken gold?','Yes. Broken gold, scrap gold and damaged jewellery can still hold significant value. We assess by weight and verified purity.',2),
  ('selling_gold','Do you buy gold coins and bars?','Yes. We value gold coins, sovereigns, bullion and gold bars based on weight, purity and current market conditions.',3),
  ('calculator','Is the calculator price guaranteed?','No. The calculator provides a guide price only. Final offers depend on inspection, market price, purity verification and item condition.',4),
  ('selling_jewellery','Can I upload multiple photos?','Yes. You can upload multiple photos from different angles to help us assess your items — hallmarks, stones, clasps, boxes and certificates where available.',5),
  ('buying_jewellery','Do you sell jewellery online?','Yes. Available pieces can be browsed in the shop section and added to the basket for secure checkout.',6),
  ('stock_orders','Are shop products actually in stock?','Yes. The website uses live stock status from our admin inventory system.',7),
  ('stock_orders','Can I buy one-off jewellery items?','Yes. Many pieces in our collection are unique, so once sold they automatically become unavailable.',8),
  ('selling_gold','Do I need ID when selling?','Yes. Valid ID may be required for security, compliance and fraud prevention.',9),
  ('selling_jewellery','Am I under pressure to sell?','No. You are under no obligation. Our specialists provide a clear valuation; the decision to accept is entirely yours.',10),
  ('delivery','How are purchased items delivered?','Pieces are sent fully insured via tracked, signed-for courier within the UK. Delivery options are confirmed at checkout.',11)
on conflict do nothing;

-- Product categories
insert into public.product_categories (name, slug, display_order) values
  ('Rings','rings',1),('Chains','chains',2),('Bracelets','bracelets',3),('Earrings','earrings',4),
  ('Necklaces','necklaces',5),('Gold coins','gold-coins',6),('Gold bars','gold-bars',7),
  ('Diamond jewellery','diamond-jewellery',8),('Watches','watches',9),
  ('Antique jewellery','antique-jewellery',10),('Branded jewellery','branded-jewellery',11)
on conflict (slug) do nothing;

-- Appointment events (pop-up locations + showroom).
-- Dates are relative to current_date so a fresh seed always has future
-- availability. Idempotent on (title) — re-running won't create duplicates.
insert into public.appointment_events
  (title, city, venue_name, address, postcode, latitude, longitude, description, starts_on, ends_on, day_start_time, day_end_time, slot_minutes, weekdays, display_order)
select * from (values
  ('Egham Showroom', 'Egham (Head Office)', 'Avalon House',
   'Unit 7A, Egham Business Village, Crabtree Road, Egham, Surrey, TW20 8RB', 'TW20 8RB', 51.4309, -0.5563,
   'Our private valuation rooms in Egham, Surrey. Discreet, by appointment, with same-day payment available.',
   current_date + 1, current_date + 1, time '10:00', time '18:00', 30, null::smallint[], 1),
  ('Bracknell Pop-Up', 'Bracknell', 'Bracknell — venue confirmed on booking', 'Central Bracknell, Berkshire', 'RG12 1AA', 51.4154, -0.7536,
   'We are bringing our valuation service to Bracknell for a few days. Book a private slot to have your gold, jewellery, watches or handbags valued in person.',
   current_date + 7, current_date + 7, time '10:00', time '17:00', 30, null::smallint[], 2),
  ('Leeds Pop-Up', 'Leeds', 'Leeds city centre — venue confirmed on booking', 'Leeds, West Yorkshire', 'LS1 1BA', 53.8008, -1.5491,
   'Visiting Leeds next month. Reserve a private appointment with one of our specialists — no obligation to sell.',
   current_date + 35, current_date + 35, time '11:00', time '18:00', 45, null::smallint[], 3)
) as v(title, city, venue_name, address, postcode, latitude, longitude, description, starts_on, ends_on, day_start_time, day_end_time, slot_minutes, weekdays, display_order)
where not exists (select 1 from public.appointment_events e where e.title = v.title);
