-- Bank details for bank-transfer payments.
--
-- When paying a seller by bank transfer the admin now records the seller's
-- sort code and account number alongside the payment, so the transfer can
-- be made (and evidenced) from the same screen. Only relevant when
-- payment_method = 'bank_transfer'; both stay null otherwise.
--
-- Safe to re-run.

alter table public.valuation_requests
  add column if not exists payment_sort_code text,
  add column if not exists payment_account_number text;
