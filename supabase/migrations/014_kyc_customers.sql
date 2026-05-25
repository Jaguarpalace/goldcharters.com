-- KYC (Know Your Customer) — customer directory + verification documents.
--
-- Adds two tables:
--   * customers — one row per real-world person we've bought from / valued for.
--     Email is unique (lower-cased) so the same address always maps to the
--     same customer record.
--   * customer_documents — verification artefacts (ID, passport, driving
--     licence, proof of address). Files live in a private storage bucket;
--     this table is just metadata + the storage path.
--
-- Also creates a private storage bucket 'kyc-documents' that is NOT publicly
-- readable. Admins access documents via short-lived signed URLs created by
-- the server action.
--
-- Safe to re-run.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type customer_document_type as enum (
    'id', 'passport', 'driving_licence', 'proof_of_address', 'other'
  );
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- customers
-- ---------------------------------------------------------------------------
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text,
  -- Structured address fields — line1/postcode are the load-bearing ones for
  -- KYC proof-of-address. The others are kept for completeness.
  address_line1 text,
  address_line2 text,
  city text,
  postcode text,
  country text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Basic email format guard at the DB layer so junk can't sneak in via SQL.
alter table public.customers
  drop constraint if exists customers_email_format;
alter table public.customers
  add constraint customers_email_format
    check (email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$');

-- One customer per email, regardless of case. Same key the valuation form
-- uses for matching, so the History tab joins cleanly.
create unique index if not exists customers_email_unique
  on public.customers (lower(email));

-- Useful for the index page's search box.
create index if not exists customers_name_idx
  on public.customers (lower(last_name), lower(first_name));

alter table public.customers enable row level security;
drop policy if exists customers_admin_all on public.customers;
create policy customers_admin_all on public.customers
  for all using (public.is_admin()) with check (public.is_admin());

drop trigger if exists trg_touch_customers on public.customers;
create trigger trg_touch_customers
  before update on public.customers
  for each row execute function public.tg_touch_updated_at();

-- ---------------------------------------------------------------------------
-- customer_documents
-- ---------------------------------------------------------------------------
create table if not exists public.customer_documents (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  doc_type customer_document_type not null,
  -- Path inside the kyc-documents bucket, e.g. '<customer_id>/<timestamp>-passport.pdf'.
  -- Storing the path (not a URL) lets us issue fresh signed URLs on demand
  -- and rotate the bucket without rewriting every row.
  storage_path text not null,
  file_name text,
  mime_type text,
  size_bytes integer,
  uploaded_by uuid references auth.users(id) on delete set null,
  uploaded_at timestamptz not null default now()
);

create index if not exists customer_documents_customer_idx
  on public.customer_documents (customer_id, uploaded_at desc);

alter table public.customer_documents enable row level security;
drop policy if exists customer_documents_admin_all on public.customer_documents;
create policy customer_documents_admin_all on public.customer_documents
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Private storage bucket for KYC documents
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public) values
  ('kyc-documents', 'kyc-documents', false)
on conflict (id) do nothing;

-- Admin-only — browser users cannot read or write. Uploads happen via the
-- server action using the service-role key; downloads happen via short-lived
-- signed URLs minted by the same action.
drop policy if exists kyc_documents_admin_select on storage.objects;
create policy kyc_documents_admin_select on storage.objects for select
  using (bucket_id = 'kyc-documents' and public.is_admin());
drop policy if exists kyc_documents_admin_write on storage.objects;
create policy kyc_documents_admin_write on storage.objects for insert
  with check (bucket_id = 'kyc-documents' and public.is_admin());
drop policy if exists kyc_documents_admin_update on storage.objects;
create policy kyc_documents_admin_update on storage.objects for update
  using (bucket_id = 'kyc-documents' and public.is_admin());
drop policy if exists kyc_documents_admin_delete on storage.objects;
create policy kyc_documents_admin_delete on storage.objects for delete
  using (bucket_id = 'kyc-documents' and public.is_admin());
