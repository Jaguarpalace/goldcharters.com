-- Customer map: cached coordinates per customer.
--
-- The Customers page gains a Map tab plotting every customer with a
-- postcode. Coordinates come from postcodes.io (postcode-unit centroid,
-- roughly a street, not a house) and are stored here so the map never
-- geocodes on load. geocode_postcode remembers which postcode the
-- coordinates belong to, so an edited postcode is picked up by the next
-- "Geocode missing" run (or the save action) without a manual reset.
--
-- Safe to re-run.

alter table public.customers
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists geocoded_at timestamptz,
  add column if not exists geocode_postcode text;
