-- Per-page SEO metadata, editable from /admin/seo.
--
-- Design choices baked into this schema (each one a deliberate SEO safeguard):
--
--   1. `slug` is the primary key AND has no UPDATE policy. URLs never
--      change via the CMS — protects every backlink, every search ranking,
--      every internal link the site has earned.
--   2. CHECK constraints on title + description lengths reject obviously
--      broken values at the database boundary, so a bug in a UI form or
--      a direct SQL write can't put garbage in production.
--   3. RLS is admin-write but PUBLIC-read. Server-rendered pages query
--      this table during generateMetadata; if the read failed, the page
--      would render without a title which is worse than slightly stale.
--   4. updated_at is touched by trigger so the sitemap can use it as
--      <lastmod> — Google sees fresh-content signals on every edit.
--   5. Seed values mirror the existing hardcoded Metadata objects in the
--      app/* pages. First deploy of this migration changes nothing
--      visible — the CMS is purely an *override* layer with code as the
--      fallback.
--
-- Safe to re-run.

create table if not exists public.page_seo (
  slug text primary key,
  -- Visible meta-title, used for both the <title> tag and the og:title
  -- when og_title is null. Hard ceiling at 80 chars (Google truncates
  -- around ~60 in SERPs; the slack lets admins write a slightly longer
  -- "for ranking" title without breaking the constraint).
  title text not null,
  description text not null,
  -- Keywords are mostly ignored by modern search engines but admin still
  -- wants them captured for internal reporting / future use.
  keywords text[],
  -- Open Graph + Twitter overrides. Null = inherit from title/description.
  og_title text,
  og_description text,
  og_image_url text,
  -- Canonical URL override. Null = SITE_URL + slug.
  canonical_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.page_seo
  drop constraint if exists page_seo_title_length;
alter table public.page_seo
  add constraint page_seo_title_length
    check (char_length(title) between 5 and 80);

alter table public.page_seo
  drop constraint if exists page_seo_description_length;
alter table public.page_seo
  add constraint page_seo_description_length
    check (char_length(description) between 20 and 300);

-- Updated-at trigger so sitemap.lastmod tracks edits.
drop trigger if exists trg_touch_page_seo on public.page_seo;
create trigger trg_touch_page_seo
  before update on public.page_seo
  for each row execute function public.tg_touch_updated_at();

-- RLS — public read, admin write.
alter table public.page_seo enable row level security;

drop policy if exists page_seo_public_read on public.page_seo;
create policy page_seo_public_read on public.page_seo
  for select using (true);

drop policy if exists page_seo_admin_write on public.page_seo;
create policy page_seo_admin_write on public.page_seo
  for insert with check (public.is_admin());

drop policy if exists page_seo_admin_update on public.page_seo;
create policy page_seo_admin_update on public.page_seo
  for update using (public.is_admin()) with check (public.is_admin());

-- DELETE is intentionally NOT granted to admins via UI. The /admin/seo
-- screen edits existing rows only; pages are removed from the CMS by
-- removing the page from the app — a code change, not a CMS action.
-- We grant DELETE here for completeness (DB owner / service-role can
-- still clean up if needed) but the admin client refuses it.

-- ---------------------------------------------------------------------------
-- Seed: every CMS-editable public page, with the metadata currently
-- hardcoded in app/. Conflict on slug = no-op (re-running the migration
-- never overwrites whatever the admin has edited).
-- ---------------------------------------------------------------------------

insert into public.page_seo (slug, title, description, keywords, og_title, og_description) values
  (
    '/',
    'Charters Gold · Private UK Gold & Jewellery Specialists',
    'Sell gold, diamonds, fine jewellery, luxury watches and designer handbags to a discreet UK private valuation house. Same-day payment, transparent valuations, no obligation.',
    array['sell gold UK', 'gold buyer UK', 'cash for gold UK', 'gold valuation UK', 'jewellery valuation UK'],
    null,
    null
  ),
  (
    '/sell-gold',
    'Sell Gold For Cash · Private UK Specialists',
    'Sell gold rings, chains, bracelets, coins, bars and scrap gold to a discreet UK private valuation house. Same-day payment, live spot pricing, no obligation.',
    array['sell gold UK', 'sell gold for cash', 'sell gold Surrey', 'sell gold Egham', 'sell scrap gold', 'sell broken gold', 'sell gold coins', 'sell sovereigns', 'sell gold bars', 'gold buyer near me'],
    'Sell Gold For Cash · Private UK Specialists',
    'Discreet UK private valuation house. Same-day payment, live spot pricing, transparent offers.'
  ),
  (
    '/sell-jewellery',
    'Sell Fine Jewellery · Diamond, Antique & Branded Specialists',
    'Receive a professional valuation for diamond rings, designer jewellery, antique pieces and inherited jewellery from a discreet UK private specialist.',
    array['sell jewellery UK', 'sell diamond ring UK', 'sell engagement ring UK', 'sell antique jewellery', 'sell vintage jewellery', 'sell inherited jewellery', 'sell designer jewellery', 'sell branded jewellery', 'jewellery valuation UK'],
    'Sell Fine Jewellery UK · Diamond, Antique, Designer',
    'Professional jewellery valuation from a discreet UK private specialist. Same-day payment, transparent offers.'
  ),
  (
    '/sell-handbags',
    'Sell Designer Handbags · Hermès, Chanel, Louis Vuitton · UK Specialists',
    'Sell pre-loved designer handbags — Hermès, Chanel, Louis Vuitton, Dior, Gucci, Prada — to a discreet UK private specialist. Authentication included. Same-day payment available.',
    array['sell designer handbag UK', 'sell Hermes bag UK', 'sell Hermes Birkin UK', 'sell Hermes Kelly UK', 'sell Chanel bag UK', 'sell Louis Vuitton UK', 'sell pre-loved handbag', 'designer handbag buyer', 'authenticate designer handbag'],
    'Sell Designer Handbags · UK Specialists',
    'Hermès, Chanel, Louis Vuitton, Dior, Gucci, Prada. Authentication included. Fair offers, same-day payment.'
  ),
  (
    '/sell-watches',
    'Sell Luxury Watches · Rolex, Patek Philippe, AP · UK Specialists',
    'Sell luxury watches — Rolex, Patek Philippe, Audemars Piguet, Omega, Cartier — to a discreet UK specialist. Movement, papers and provenance fully assessed. Same-day payment available.',
    array['sell luxury watch UK', 'sell Rolex UK', 'sell Rolex Submariner UK', 'sell Rolex Daytona UK', 'sell Patek Philippe UK', 'sell Audemars Piguet UK', 'sell Omega watch UK', 'sell Cartier watch UK', 'luxury watch buyer UK'],
    'Sell Luxury Watches UK · Rolex, Patek Philippe, AP',
    'Specialist valuations for Rolex, Patek Philippe, Audemars Piguet, Omega and Cartier. Movement, papers, provenance assessed.'
  ),
  (
    '/contact',
    'Contact · Private Valuations',
    'Speak with a Charters Gold specialist. Telephone, email, WhatsApp or in-person appointment in Egham, Surrey.',
    null,
    null,
    null
  ),
  (
    '/blog',
    'Insights & Guides · Charters Gold',
    'Practical guides on selling gold, fine jewellery, luxury watches and designer handbags in the UK — written by Charters Gold specialists.',
    array['gold prices UK', 'sell gold guide', 'jewellery valuation guide', 'sell Rolex guide', 'sell Hermes guide'],
    null,
    null
  ),
  (
    '/gold-calculator',
    'Gold Calculator · Live Price Per Gram',
    'Free gold calculator with live spot pricing. Enter weights in grams across 9ct, 14ct, 18ct, 22ct, 24ct gold plus silver, platinum and palladium — instant guide price.',
    array['gold calculator UK', 'gold price per gram UK', 'gold price calculator', '22ct gold price per gram', '18ct gold price per gram', '9ct gold price per gram', 'live gold price UK', 'scrap gold price calculator'],
    'Gold Calculator UK · Live Spot Price Per Gram',
    'Instant gold guide price by carat and weight, refreshed every 15 minutes.'
  ),
  (
    '/how-it-works',
    'How It Works · Selling Gold & Jewellery To Us',
    'A simple three-step process: tell us about your items, receive a professional valuation, get paid by bank transfer. No pressure, no obligation.',
    null,
    null,
    null
  ),
  (
    '/faqs',
    'Frequently Asked Questions',
    'Answers to common questions about selling gold, jewellery, watches and handbags, our valuation process, ID requirements and payment timelines.',
    null,
    null,
    null
  ),
  (
    '/locations',
    'Areas We Cover · UK Gold & Jewellery Specialists',
    'Private valuations across Surrey, London, Berkshire and the wider South-East. By appointment, with discretion and same-day payment.',
    array['gold buyer Surrey', 'gold buyer London', 'gold buyer Egham', 'gold buyer Berkshire', 'gold buyer Ascot', 'gold buyer Heathrow', 'gold buyer Reading', 'gold buyer Twickenham', 'gold buyer Windsor'],
    null,
    null
  )
on conflict (slug) do nothing;
