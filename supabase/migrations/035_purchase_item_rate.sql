-- Price per gram on purchase lines.
--
-- A purchase line was "5g of 9ct for £500". Rishi wants the agreement to
-- read "9ct · 5g · £100/g · £500": the rate we paid per gram is entered and
-- the line total follows from weight x rate. The rate is stored so the
-- printed document and later audits show it as agreed, not recomputed.
-- Nullable: non-metal lines (watches, handbags) are priced as a lump.
--
-- Safe to re-run.

alter table public.purchase_items
  add column if not exists rate_gbp_per_g numeric(12, 4)
    check (rate_gbp_per_g is null or rate_gbp_per_g >= 0);
