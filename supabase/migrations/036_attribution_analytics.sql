-- 036: enquiry attribution + analytics settings
--
-- Every valuation request and booking records where the visitor came from
-- (landing page, referrer, UTM tags, Google Ads click id) so the admin
-- Analytics page can show enquiries by source and by page without relying
-- on Google Analytics. Site settings gain the Google tag ids so the
-- (consent-gated) tag can be configured from the admin rather than code.
--
-- Safe to run more than once. Code spreads these columns only when a value
-- is present, so inserts keep working before this migration is applied.

alter table public.valuation_requests
  add column if not exists landing_page text,
  add column if not exists source_page text,
  add column if not exists referrer text,
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text,
  add column if not exists utm_term text,
  add column if not exists gclid text;

alter table public.appointments
  add column if not exists landing_page text,
  add column if not exists source_page text,
  add column if not exists referrer text,
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text,
  add column if not exists utm_term text,
  add column if not exists gclid text;

alter table public.site_settings
  add column if not exists ga_measurement_id text,
  add column if not exists google_ads_conversion_id text,
  add column if not exists google_ads_conversion_label text;

create index if not exists valuation_requests_created_at_idx on public.valuation_requests (created_at desc);
create index if not exists appointments_created_at_idx on public.appointments (created_at desc);
