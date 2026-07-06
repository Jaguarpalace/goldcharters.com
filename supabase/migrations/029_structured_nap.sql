-- Structured NAP (Name / Address / Phone) fields on site_settings.
--
-- Until now the business address was hardcoded in lib/seo/structuredData.ts
-- (JSON-LD PostalAddress + GeoCoordinates) and duplicated as a free-text
-- string in site_settings.address. A physical relocation meant a code
-- change. These columns make /admin/settings the single source of truth:
--
--   address_street     "Index House, St George's Lane"
--   address_locality   "Ascot"
--   address_region     "Berkshire"
--   address_postcode   "SL5 7ET"
--   address_latitude / address_longitude   for the schema.org geo block
--
-- The legacy free-text `address` column is kept — the save action now
-- composes it from the structured fields, so the footer, contact page,
-- legal pages and email templates all stay consistent automatically.
--
-- Safe to re-run.

alter table public.site_settings
  add column if not exists address_street text,
  add column if not exists address_locality text,
  add column if not exists address_region text,
  add column if not exists address_postcode text,
  add column if not exists address_latitude double precision,
  add column if not exists address_longitude double precision;

-- Seed the current (Ascot) address into existing rows that haven't been
-- populated yet. Idempotent — re-running won't overwrite admin edits.
update public.site_settings
set
  address_street    = coalesce(address_street,    'Index House, St George''s Lane'),
  address_locality  = coalesce(address_locality,  'Ascot'),
  address_region    = coalesce(address_region,    'Berkshire'),
  address_postcode  = coalesce(address_postcode,  'SL5 7ET'),
  address_latitude  = coalesce(address_latitude,  51.4084),
  address_longitude = coalesce(address_longitude, -0.6726),
  -- First run only (address_street on the right-hand side is the PRE-update
  -- value, so this fires exactly once): replace whatever free-text address
  -- was in place with the composed canonical string. On re-runs, and after
  -- any admin save, the existing value is preserved.
  address = case
    when address_street is null
      then 'Index House, St George''s Lane, Ascot, Berkshire, SL5 7ET'
    else address
  end;
