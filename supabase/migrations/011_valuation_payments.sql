-- Payment-tracking columns on valuation_requests.
--
-- Captures the final figure paid out for a piece once we've bought it:
--   payment_amount    – the figure paid to the customer in GBP
--   payment_method    – cash / bank_transfer / cheque / card / other
--   payment_reference – bank reference, cheque number, etc.
--   paid_at           – when the payment cleared
--
-- All four are nullable; only filled in once the request reaches a
-- payment-relevant status (typically 'bought').
--
-- Safe to re-run.
-- Run in Supabase → SQL Editor.

alter table public.valuation_requests
  add column if not exists payment_amount numeric(10,2),
  add column if not exists payment_method text,
  add column if not exists payment_reference text,
  add column if not exists paid_at timestamptz;

-- Constrain payment_method to the supported set (null allowed).
alter table public.valuation_requests
  drop constraint if exists valuation_requests_payment_method_check;
alter table public.valuation_requests
  add constraint valuation_requests_payment_method_check
    check (
      payment_method is null
      or payment_method in ('cash', 'bank_transfer', 'cheque', 'card', 'other')
    );

-- Reporting: index paid_at so "what did we buy this month" stays fast.
create index if not exists valuation_requests_paid_at_idx
  on public.valuation_requests (paid_at desc)
  where paid_at is not null;
