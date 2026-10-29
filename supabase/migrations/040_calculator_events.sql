-- 040: calculator usage tracking
--
-- Every time a visitor enters a weight in the gold / silver calculator the
-- site records one row: what they weighed, what figure they saw, which page,
-- the device, and the same anonymous session mark the enquiry forms carry.
-- A second event type records the "Request Valuation" click from the
-- calculator. The session mark is also stored on valuation_requests and
-- appointments so the admin Analytics page can tell which enquiries used
-- the calculator first and what figure they saw.
--
-- No personal data: the session mark is a random id that lives in the
-- browser tab only (sessionStorage) and dies when the tab closes.
--
-- Safe to run more than once. Writes go through the service role only.

create table if not exists public.calculator_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  session_id text,
  event text not null check (event in ('calc', 'cta')),
  page text,
  metal text,
  carat_label text,
  purity numeric,
  weight_g numeric,
  price_per_gram numeric,
  item_price numeric,
  total_estimate numeric,
  rows_filled integer,
  items jsonb,
  device text,
  viewport_w integer,
  landing_page text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  gclid text
);

create index if not exists calculator_events_created_at_idx on public.calculator_events (created_at desc);
create index if not exists calculator_events_session_idx on public.calculator_events (session_id);

alter table public.calculator_events enable row level security;
-- No policies on purpose: anon and authenticated roles cannot read or write.
-- The site writes with the service role from a server action and the admin
-- reads with the service role.

alter table public.valuation_requests add column if not exists session_id text;
alter table public.appointments add column if not exists session_id text;
create index if not exists valuation_requests_session_idx on public.valuation_requests (session_id);
create index if not exists appointments_session_idx on public.appointments (session_id);
