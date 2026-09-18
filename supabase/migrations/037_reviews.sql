-- 037: customer reviews managed in the admin
--
-- Genuine customer reviews (copied word for word from Google, or given to
-- us directly) are stored here and shown as cards on the homepage, the sell
-- pages, the matching location page and the /reviews page. Site settings
-- gain the Google rating summary so "4.9 from 15 reviews" is edited in one
-- place and always links to the full list on Google.
--
-- Safe to run more than once. Until it is applied the public site simply
-- shows no reviews and /admin/reviews explains what to run.

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  -- First name and initial unless the customer agreed to their full name.
  author_name text not null,
  rating int not null default 5 check (rating between 1 and 5),
  -- The customer's own words, never edited.
  body text not null,
  review_date date not null default current_date,
  source text not null default 'google' check (source in ('google', 'direct', 'other')),
  -- Optional link to the review itself or to the profile it sits on.
  source_url text,
  -- Optional /locations/<slug>; a tagged review also shows on that town's page.
  town_slug text,
  -- Featured reviews are the ones shown on the homepage and sell pages.
  featured boolean not null default false,
  published boolean not null default true,
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reviews_public_idx
  on public.reviews (published, featured, display_order, review_date desc);
create index if not exists reviews_town_idx on public.reviews (town_slug) where town_slug is not null;

drop trigger if exists trg_touch_reviews on public.reviews;
create trigger trg_touch_reviews before update on public.reviews
  for each row execute function public.tg_touch_updated_at();

alter table public.reviews enable row level security;
drop policy if exists reviews_read on public.reviews;
drop policy if exists reviews_write on public.reviews;
create policy reviews_read on public.reviews for select using (published or public.is_admin());
create policy reviews_write on public.reviews for all using (public.is_admin()) with check (public.is_admin());

-- The true overall rating as shown on the Google Business Profile. Shown next
-- to the cards so a selection of reviews is never presented as the whole picture.
alter table public.site_settings
  add column if not exists google_rating numeric(2,1),
  add column if not exists google_review_count int,
  add column if not exists google_reviews_url text,
  add column if not exists google_write_review_url text;
