-- Multi-stage valuation pipeline.
--
-- Adds two new statuses so admin can track requests through the full
-- buying funnel:
--   new → contacted → valued (or offer_sent) → booked → bought
--   (or rejected at any stage)
--
-- "Outstanding" means anything that isn't 'bought' or 'rejected'.
--
-- IMPORTANT: Postgres won't let you ALTER TYPE and USE the new value in the
-- same transaction. Run this file as TWO separate queries in Supabase SQL
-- Editor — the section above the divider first, then the section below it.

-- =========================================================================
-- Query 1 — run on its own and let it commit
-- =========================================================================
alter type valuation_status add value if not exists 'booked';
alter type valuation_status add value if not exists 'bought';

-- =========================================================================
-- Query 2 — paste and run separately, AFTER Query 1 has committed
-- =========================================================================
-- create index if not exists valuation_requests_outstanding_idx
--   on public.valuation_requests (status)
--   where status not in ('bought', 'completed', 'rejected');
