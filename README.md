# Charters Gold

A premium CMS-driven website for a UK private gold & jewellery valuation house and online boutique.

Built with **Next.js 14 (App Router) + TypeScript + Tailwind CSS + Supabase + Vercel**.

---

## What's included

### Public site (luxury black & metallic gold)
- Sticky top trust bar with editable review / trust / payment / phone messages
- Header with separate **Sell To Us** and **Buy From Us** journeys + basket indicator
- Cinematic hero with editable headline, subhead, CTAs and badges
- Two-pathway "Sell To Us / Buy From Us" cards
- Six premium service cards
- Sell Gold + Sell Jewellery dedicated sections
- **Interactive Gold Calculator** — pulls rates from Supabase, calculates totals client-side
- **Valuation request form** with multi-image upload (up to 12 photos · drag & drop · previews · remove)
- Shop teaser + items-we-buy grid
- "How We Value" explainer + tabbed How It Works (sell / buy)
- 12-card "Why Clients Trust Us" panel
- FAQ section with category filtering
- Premium footer with editable description, contact, links, disclaimer

### Sell journey
- `/sell-gold`, `/sell-jewellery`, `/gold-calculator` pages
- Valuation form posts to a server action, persists to Supabase, uploads photos to the private `valuation-uploads` bucket
- Form validates server-side: file types, sizes, count, contact method, consent

### Buy / shop journey
- `/shop` catalogue with category, search, in-stock-only filter, sort
- `/shop/[slug]` product detail with gallery, status badge, spec table, related products
- Add-to-basket logic respects unique pieces (qty 1 cap)
- `/basket` and `/checkout` flows
- Stripe-ready order server action (placeholder for `stripe.paymentIntents.create`)

### Admin dashboard (`/admin`)
- Supabase Auth login (`/admin/login`)
- Overview with at-a-glance stats and quick actions
- Editors for: Homepage sections · Services · Items We Buy · Calculator Rates (fully working) · Products / Stock · Categories · Stock Movements · Orders · Valuation Requests (full read with uploaded photos) · FAQs · Contact · Media · Blog · Settings
- All admin routes gated by `is_admin()` RLS check

### Supabase
- Full SQL migration (`supabase/migrations/001_initial_schema.sql`) — tables, enums, RLS policies, storage buckets
- Seed data (`supabase/seed.sql`) — homepage content, services, calculator rates, FAQs, categories
- Three storage buckets: `public-media`, `product-images`, `valuation-uploads` (private)

### Mock-data fallback
**The site runs immediately without Supabase.** Every query falls back to built-in mock data so you can develop the UI in isolation. As soon as you add Supabase env vars, the same code starts reading from Postgres.

---

## Project structure

```
app/
  layout.tsx                  ← root layout, fonts, top bar, header, footer
  page.tsx                    ← homepage
  sell-gold/                  ← sell gold page
  sell-jewellery/             ← sell jewellery page
  gold-calculator/            ← dedicated calculator page
  shop/                       ← catalogue + dynamic product detail
  basket/ · checkout/
  faqs/ · contact/ · how-it-works/
  admin/
    layout.tsx                ← thin wrapper
    login/                    ← public login page
    (dashboard)/              ← auth-gated route group
      layout.tsx              ← sidebar + auth check
      page.tsx                ← overview
      homepage/, services/, items-we-buy/, calculator-rates/,
      products/, categories/, stock/, orders/,
      valuation-requests/, faqs/, contact/, media/, blog/, settings/
components/
  public/                     ← TopTrustBar, Header, Footer, Hero, SellBuyPathways, …
  shop/                       ← ProductCard, ProductGallery, BasketView, CheckoutForm, …
lib/
  supabase/                   ← client / server / env
  queries/                    ← homepage, services, items, faqs, products, calculator
  actions/                    ← server actions: valuationRequests, orders, calculatorRates
  cart/cartStore.ts           ← zustand cart (localStorage-persisted)
  mock-data/                  ← built-in fallback content
types/                        ← TypeScript mirror of the DB schema
supabase/
  migrations/001_initial_schema.sql
  seed.sql
```

---

## Quick start (no Supabase yet)

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. Mock data renders the full public site. Admin is in **preview mode**: routes load but persistence is disabled.

---

## Connect Supabase (production setup)

### 1. Create the project
1. Go to <https://supabase.com>, create a new project
2. Wait for it to provision

### 2. Run the migrations
1. **Database → SQL Editor → New query**
2. Paste the contents of `supabase/migrations/001_initial_schema.sql`, run
3. Optional: paste `supabase/seed.sql` and run to seed CMS content

### 3. Create your admin user
1. **Authentication → Users → Add user** (email + password)
2. Go back to **SQL Editor** and run:
   ```sql
   insert into public.admin_profiles (id, email, role)
   select id, email, 'admin' from auth.users where email = 'you@example.com';
   ```
3. You can now sign in at `/admin/login`

### 4. Storage buckets
The SQL migration creates them automatically:
- `public-media` (public) — homepage images, blog featured images
- `product-images` (public) — product galleries
- `valuation-uploads` (private) — customer photos, admin-only signed access

### 5. Environment variables
Copy `.env.local.example` to `.env.local` and fill in:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ…
SUPABASE_SERVICE_ROLE_KEY=eyJ…   # SERVER ONLY — keep secret
```

Find these under **Project Settings → API**.

### 6. Restart `npm run dev`
The site automatically switches from mock data to live Supabase reads.

---

## Deploy to Vercel

1. Push the project to a Git repo (GitHub / GitLab / Bitbucket)
2. <https://vercel.com> → New Project → import the repo
3. **Framework**: Next.js (auto-detected)
4. **Environment variables**: add the same three keys from `.env.local`
5. Deploy

Recommended Vercel settings:
- Node version: 20+
- Output: standard Next.js (no static export)
- Region: London (`lhr1`) for UK latency

### Notes
- `SUPABASE_SERVICE_ROLE_KEY` is **server-only**. Do not prefix it with `NEXT_PUBLIC_`. It is used by the valuation-request server action to write to private tables and the private storage bucket.
- Uploaded images live in Supabase Storage — **never** on Vercel's filesystem.
- Public CMS pages use ISR (`export const revalidate = 60` or `120`). The calculator page also revalidates on demand after admin edits via `revalidatePath('/gold-calculator')`.

---

## How CMS edits reach the public site

1. Admin signs in at `/admin/login` (Supabase Auth)
2. Admin updates a row (e.g. calculator price-per-gram) via a server action
3. Server action writes to Supabase using the admin's session — RLS verifies they're in `admin_profiles`
4. Server action calls `revalidatePath('/gold-calculator')` (and any related pages)
5. Next request regenerates the static HTML using the new data

For instant updates during development, set `revalidate = 0` or use `dynamic = 'force-dynamic'` on a page.

---

## Replacing mock data with live data

You don't have to do anything — once `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set, every query in `lib/queries/*` automatically switches to Supabase. The mock fallback only kicks in when the env vars are missing or the query returns an error.

If you want to **force** mock mode while developing, just leave the env vars unset.

---

## Security model

| Table                       | Public select          | Public insert          | Admin all |
| --------------------------- | ---------------------- | ---------------------- | --------- |
| `site_settings`, `services`, `items_we_buy`, `trust_cards`, `homepage_sections`, `faqs`, `blog_posts`, `calculator_rates`, `product_categories`, `products`, `product_images` | ✔ visible rows only | ✘                      | ✔         |
| `valuation_requests`, `valuation_request_images` | ✘ | ✔ (rate-limit recommended) | ✔ |
| `orders`, `order_items`     | ✘                      | ✔                      | ✔         |
| `stock_movements`           | ✘                      | ✘                      | ✔         |
| `admin_profiles`            | self only              | ✘                      | self only |

Storage:
- `public-media`, `product-images` → public read, admin write
- `valuation-uploads` → admin read only; uploads happen via server action using the service-role key

---

## Customising the brand

| Token            | Value                |
| ---------------- | -------------------- |
| Primary black    | `#050505` (`ink.950`) |
| Luxury black     | `#0B0B0B` (`ink.900`) |
| Charcoal         | `#141414`            |
| Deep gold        | `#B8860B`            |
| Metallic gold    | `#D4AF37`            |
| Bright gold      | `#FFD700`            |
| Antique gold     | `#A67C00`            |
| Soft gold tint   | `#F3D675`            |
| Warm grey        | `#B8B8B8`            |

All colours, gradient, glow shadows and typography tokens live in `tailwind.config.ts` and `app/globals.css`. Headings use Cormorant Garamond (display serif); body uses Inter.

---

## What's still left to wire up

Some admin editors (homepage sections, services, items-we-buy, FAQs, products save action) currently show the data and structure but the per-row save handlers are stubs. They're intentionally lightweight — the calculator-rates editor is the worked example showing the full pattern: server action with `requireAdmin()`, optimistic local state, `revalidatePath()` on save.

To replicate that pattern for another table:
1. Create `lib/actions/<table>.ts` mirroring `calculatorRates.ts`
2. Call it from the corresponding admin editor with `useTransition`
3. Add `revalidatePath('/the-public-route')` so the change appears

For Stripe checkout, add a payment-intent step inside `lib/actions/orders.ts` after the order row is inserted, return the client secret, and mount Stripe Elements on `/checkout`.

---

## Commands

```bash
npm run dev        # http://localhost:3000
npm run build      # production build
npm run start      # serve production build
npm run typecheck  # tsc --noEmit
npm run lint       # next lint
```

---

## Pre-launch checklist

Walk this list before pointing the domain at Vercel:

### Database (Supabase)
- [ ] Run `supabase/migrations/001_initial_schema.sql`
- [ ] Run `supabase/migrations/002_handbags_watches.sql`
- [ ] Run `supabase/migrations/003_calculator_margins.sql`
- [ ] Run `supabase/seed.sql` for default CMS content
- [ ] Create your admin user in **Auth → Users**, then promote: `insert into admin_profiles (id, email, role) select id, email, 'admin' from auth.users on conflict do nothing;`
- [ ] Confirm `valuation-uploads` bucket is **private**, others are **public**

### Environment variables (Vercel)
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` (server-only — never `NEXT_PUBLIC_`)
- [ ] `NEXT_PUBLIC_SITE_URL` (your final domain, e.g. `https://goldcharters.com`)
- [ ] `METAL_PRICE_API_KEY` (optional but enables the live ticker)

### SEO
- [ ] Submit `https://yourdomain.com/sitemap.xml` to <https://search.google.com/search-console>
- [ ] Submit the same to <https://www.bing.com/webmasters>
- [ ] Test structured data at <https://search.google.com/test/rich-results>
- [ ] Verify `https://yourdomain.com/robots.txt` looks correct
- [ ] Optimise logo to under 50KB (run through <https://tinypng.com>)
- [ ] Register the site as a Google Business Profile entry (Maps)

### Legal
- [ ] Get a UK solicitor to audit `/privacy`, `/terms`, `/cookies` (typically £200-500)
- [ ] Register with the ICO at <https://ico.org.uk/registration> (~£40-60/year, mandatory)
- [ ] Confirm HMRC high-value-dealer registration is in place if applicable
- [ ] Update the "Last updated" date once your solicitor signs off

### Production polish
- [ ] Replace placeholder hero images with real photos (compress to <500KB each)
- [ ] Set sensible calculator margins per row in `/admin/calculator-rates`
- [ ] Add real FAQs, customer-relevant items in `/admin/items-we-buy`
- [ ] Configure a contact email forwarder for `office@goldcharters.com`
- [ ] Set up SPF / DKIM / DMARC DNS records so transactional emails don't go to spam

### Monitoring
- [ ] Enable Vercel Analytics or add Plausible / Fathom (privacy-friendly, no cookie banner needed)
- [ ] Set Vercel Speed Insights (free for hobby tier)
- [ ] Consider Sentry for server-side error tracking

---

## License

This project is delivered to the project owner. Replace all imagery and content with your own before public launch — placeholder content is descriptive, not commercial.
