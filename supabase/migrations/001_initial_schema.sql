-- Charters Gold — Initial schema
-- Tables, RLS policies, and storage buckets for the CMS, sell journey and shop.
--
-- How to run:
--   1. Create a Supabase project (https://supabase.com)
--   2. Project → SQL Editor → New query → paste this file → Run
--   3. Project → Storage → ensure buckets exist (created at the bottom of this file)
--   4. Project → Authentication → invite the first admin user
--   5. After login, run the snippet at the very bottom to assign that user the 'admin' role

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Helper enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type product_status as enum ('draft','active','hidden','reserved','sold','out_of_stock');
exception when duplicate_object then null; end $$;

do $$ begin
  create type valuation_status as enum ('new','contacted','valued','offer_sent','completed','rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type valuation_item_type as enum (
    'gold','jewellery','diamond_ring','scrap_gold','gold_coins','gold_bars','branded_jewellery','other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type preferred_contact as enum ('phone','email','whatsapp');
exception when duplicate_object then null; end $$;

do $$ begin
  create type stock_movement_type as enum (
    'stock_added','stock_adjusted','reserved','sold','returned','hidden','damaged','manual_adjustment'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_status as enum ('unpaid','pending','paid','refunded','failed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type order_status as enum (
    'pending','paid','processing','dispatched','completed','cancelled','refunded'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type admin_role as enum ('admin','editor');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Admin profiles — used by RLS to gate write access.
-- A row in this table = a user with admin privileges.
-- ---------------------------------------------------------------------------
create table if not exists public.admin_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role admin_role not null default 'admin',
  created_at timestamptz not null default now()
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.admin_profiles where id = auth.uid());
$$;

alter table public.admin_profiles enable row level security;
drop policy if exists admin_profiles_self_select on public.admin_profiles;
create policy admin_profiles_self_select on public.admin_profiles
  for select using (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- CMS tables
-- ---------------------------------------------------------------------------
create table if not exists public.site_settings (
  id uuid primary key default gen_random_uuid(),
  business_name text not null default 'Charters Gold',
  logo_url text,
  phone text not null default '',
  email text not null default '',
  whatsapp text,
  address text,
  opening_hours text,
  top_bar_message text,
  top_bar_review_text text,
  top_bar_trust_text text,
  top_bar_payment_text text,
  footer_description text,
  footer_disclaimer text,
  social_links jsonb,
  seo_title text not null default 'Charters Gold',
  seo_description text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.homepage_sections (
  id uuid primary key default gen_random_uuid(),
  section_key text not null unique,
  title text,
  subtitle text,
  body text,
  cta_label text,
  cta_href text,
  image_url text,
  extra jsonb,
  display_order int not null default 0,
  visible boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  short_description text not null,
  long_description text,
  icon_key text,
  cta_label text,
  cta_href text,
  pathway text not null default 'sell' check (pathway in ('sell','buy','general')),
  display_order int not null default 0,
  visible boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.items_we_buy (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  image_url text,
  display_order int not null default 0,
  visible boolean not null default true
);

create table if not exists public.trust_cards (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null default '',
  icon_key text,
  display_order int not null default 0,
  visible boolean not null default true
);

create table if not exists public.faqs (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in (
    'selling_gold','selling_jewellery','calculator','buying_jewellery','delivery','stock_orders'
  )),
  question text not null,
  answer text not null,
  display_order int not null default 0,
  visible boolean not null default true
);

create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  excerpt text,
  content text not null default '',
  featured_image_url text,
  category text,
  published boolean not null default false,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.uploaded_images (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  alt_text text,
  bucket text not null default 'public-media',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Sell / valuation
-- ---------------------------------------------------------------------------
create table if not exists public.calculator_rates (
  id uuid primary key default gen_random_uuid(),
  metal_type text not null check (metal_type in ('Gold','Silver','Platinum','Palladium')),
  carat_label text not null,
  purity_percentage numeric(5,2) not null,
  price_per_gram numeric(10,4) not null default 0,
  display_order int not null default 0,
  visible boolean not null default true,
  admin_notes text,
  updated_at timestamptz not null default now()
);

create table if not exists public.valuation_requests (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text not null,
  item_type valuation_item_type not null,
  estimated_value numeric(12,2),
  weight_grams numeric(10,3),
  carat text,
  description text,
  preferred_contact_method preferred_contact not null default 'phone',
  consent_accepted boolean not null default false,
  status valuation_status not null default 'new',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.valuation_request_images (
  id uuid primary key default gen_random_uuid(),
  valuation_request_id uuid not null references public.valuation_requests(id) on delete cascade,
  image_url text not null,
  file_name text,
  display_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Shop / products / orders
-- ---------------------------------------------------------------------------
create table if not exists public.product_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  display_order int not null default 0,
  visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text,
  category_id uuid references public.product_categories(id) on delete set null,
  sku text,
  metal_type text,
  carat text,
  weight_grams numeric(10,3),
  gemstones text,
  brand text,
  condition text,
  certificate_info text,
  box_included boolean default false,
  cost_price numeric(12,2),
  retail_price numeric(12,2) not null default 0,
  sale_price numeric(12,2),
  quantity int not null default 1,
  status product_status not null default 'draft',
  featured boolean not null default false,
  visible boolean not null default true,
  main_image_url text,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  acquired_at timestamptz,
  sold_at timestamptz
);

create index if not exists products_status_idx on public.products(status) where visible;
create index if not exists products_category_idx on public.products(category_id);
create index if not exists products_featured_idx on public.products(featured) where visible;

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  image_url text not null,
  alt_text text,
  display_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  movement_type stock_movement_type not null,
  quantity_change int not null default 0,
  reason text,
  notes text,
  created_by text,
  created_at timestamptz not null default now()
);

create table if not exists public.basket_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  session_token text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.basket_items (
  id uuid primary key default gen_random_uuid(),
  basket_session_id uuid not null references public.basket_sessions(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity int not null default 1,
  unit_price numeric(12,2) not null,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  billing_address text not null,
  delivery_address text not null,
  delivery_method text not null default 'Tracked & Signed (UK)',
  subtotal numeric(12,2) not null default 0,
  delivery_fee numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  payment_status payment_status not null default 'unpaid',
  order_status order_status not null default 'pending',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_title text not null,
  product_sku text,
  quantity int not null default 1,
  unit_price numeric(12,2) not null,
  total_price numeric(12,2) not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Auto-update updated_at columns
-- ---------------------------------------------------------------------------
create or replace function public.tg_touch_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$ declare t text;
begin
  for t in select unnest(array[
    'site_settings','homepage_sections','services','calculator_rates',
    'valuation_requests','product_categories','products','orders','blog_posts'
  ]) loop
    execute format('drop trigger if exists trg_touch_%I on public.%I', t, t);
    execute format(
      'create trigger trg_touch_%I before update on public.%I for each row execute function public.tg_touch_updated_at()',
      t, t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- Strategy:
--   - Public CMS tables (services, items_we_buy, faqs, trust_cards, homepage_sections,
--     site_settings, calculator_rates, product_categories, products, product_images,
--     blog_posts): readable to everyone for visible/published rows; writable only by admins.
--   - Sensitive tables (valuation_requests, valuation_request_images, orders, order_items,
--     stock_movements, baskets): public can INSERT (to submit a request / place an order)
--     but cannot SELECT/UPDATE — only admins can read or modify.
--   - admin_profiles: self-select only.
-- ---------------------------------------------------------------------------

-- Helper to apply the same "public read visible / admin write" pattern.
-- Run separately for each table because Postgres can't macro this cleanly.

-- site_settings
alter table public.site_settings enable row level security;
drop policy if exists site_settings_read on public.site_settings;
drop policy if exists site_settings_write on public.site_settings;
create policy site_settings_read on public.site_settings for select using (true);
create policy site_settings_write on public.site_settings for all using (public.is_admin()) with check (public.is_admin());

-- homepage_sections
alter table public.homepage_sections enable row level security;
drop policy if exists hp_read on public.homepage_sections;
drop policy if exists hp_write on public.homepage_sections;
create policy hp_read on public.homepage_sections for select using (visible or public.is_admin());
create policy hp_write on public.homepage_sections for all using (public.is_admin()) with check (public.is_admin());

-- services
alter table public.services enable row level security;
drop policy if exists svc_read on public.services;
drop policy if exists svc_write on public.services;
create policy svc_read on public.services for select using (visible or public.is_admin());
create policy svc_write on public.services for all using (public.is_admin()) with check (public.is_admin());

-- items_we_buy
alter table public.items_we_buy enable row level security;
drop policy if exists iwb_read on public.items_we_buy;
drop policy if exists iwb_write on public.items_we_buy;
create policy iwb_read on public.items_we_buy for select using (visible or public.is_admin());
create policy iwb_write on public.items_we_buy for all using (public.is_admin()) with check (public.is_admin());

-- trust_cards
alter table public.trust_cards enable row level security;
drop policy if exists tc_read on public.trust_cards;
drop policy if exists tc_write on public.trust_cards;
create policy tc_read on public.trust_cards for select using (visible or public.is_admin());
create policy tc_write on public.trust_cards for all using (public.is_admin()) with check (public.is_admin());

-- faqs
alter table public.faqs enable row level security;
drop policy if exists faqs_read on public.faqs;
drop policy if exists faqs_write on public.faqs;
create policy faqs_read on public.faqs for select using (visible or public.is_admin());
create policy faqs_write on public.faqs for all using (public.is_admin()) with check (public.is_admin());

-- blog_posts
alter table public.blog_posts enable row level security;
drop policy if exists blog_read on public.blog_posts;
drop policy if exists blog_write on public.blog_posts;
create policy blog_read on public.blog_posts for select using (published or public.is_admin());
create policy blog_write on public.blog_posts for all using (public.is_admin()) with check (public.is_admin());

-- uploaded_images
alter table public.uploaded_images enable row level security;
drop policy if exists images_read on public.uploaded_images;
drop policy if exists images_write on public.uploaded_images;
create policy images_read on public.uploaded_images for select using (true);
create policy images_write on public.uploaded_images for all using (public.is_admin()) with check (public.is_admin());

-- calculator_rates
alter table public.calculator_rates enable row level security;
drop policy if exists cr_read on public.calculator_rates;
drop policy if exists cr_write on public.calculator_rates;
create policy cr_read on public.calculator_rates for select using (visible or public.is_admin());
create policy cr_write on public.calculator_rates for all using (public.is_admin()) with check (public.is_admin());

-- product_categories
alter table public.product_categories enable row level security;
drop policy if exists pc_read on public.product_categories;
drop policy if exists pc_write on public.product_categories;
create policy pc_read on public.product_categories for select using (visible or public.is_admin());
create policy pc_write on public.product_categories for all using (public.is_admin()) with check (public.is_admin());

-- products
alter table public.products enable row level security;
drop policy if exists products_read on public.products;
drop policy if exists products_write on public.products;
create policy products_read on public.products for select using (
  (visible and status in ('active','reserved','sold','out_of_stock')) or public.is_admin()
);
create policy products_write on public.products for all using (public.is_admin()) with check (public.is_admin());

-- product_images
alter table public.product_images enable row level security;
drop policy if exists pi_read on public.product_images;
drop policy if exists pi_write on public.product_images;
create policy pi_read on public.product_images for select using (
  exists (
    select 1 from public.products p
    where p.id = product_images.product_id
      and (p.visible or public.is_admin())
  )
);
create policy pi_write on public.product_images for all using (public.is_admin()) with check (public.is_admin());

-- valuation_requests — PUBLIC CAN INSERT ONLY
alter table public.valuation_requests enable row level security;
drop policy if exists vr_insert on public.valuation_requests;
drop policy if exists vr_select on public.valuation_requests;
drop policy if exists vr_write on public.valuation_requests;
create policy vr_insert on public.valuation_requests for insert with check (true);
create policy vr_select on public.valuation_requests for select using (public.is_admin());
create policy vr_write on public.valuation_requests for update using (public.is_admin()) with check (public.is_admin());

-- valuation_request_images — PUBLIC CAN INSERT ONLY (via server action with service role)
alter table public.valuation_request_images enable row level security;
drop policy if exists vri_insert on public.valuation_request_images;
drop policy if exists vri_select on public.valuation_request_images;
create policy vri_insert on public.valuation_request_images for insert with check (true);
create policy vri_select on public.valuation_request_images for select using (public.is_admin());

-- orders — public can INSERT; only admin reads/updates
alter table public.orders enable row level security;
drop policy if exists orders_insert on public.orders;
drop policy if exists orders_select on public.orders;
drop policy if exists orders_write on public.orders;
create policy orders_insert on public.orders for insert with check (true);
create policy orders_select on public.orders for select using (public.is_admin());
create policy orders_write on public.orders for update using (public.is_admin()) with check (public.is_admin());

-- order_items
alter table public.order_items enable row level security;
drop policy if exists oi_insert on public.order_items;
drop policy if exists oi_select on public.order_items;
create policy oi_insert on public.order_items for insert with check (true);
create policy oi_select on public.order_items for select using (public.is_admin());

-- stock_movements — admin only
alter table public.stock_movements enable row level security;
drop policy if exists sm_all on public.stock_movements;
create policy sm_all on public.stock_movements for all using (public.is_admin()) with check (public.is_admin());

-- basket tables — currently used client-side via localStorage in the prototype.
-- These policies allow logged-in users to manage their own basket if you later
-- decide to persist server-side baskets per user.
alter table public.basket_sessions enable row level security;
drop policy if exists bs_owner on public.basket_sessions;
create policy bs_owner on public.basket_sessions for all using (
  auth.uid() = user_id or public.is_admin()
) with check (auth.uid() = user_id or public.is_admin());

alter table public.basket_items enable row level security;
drop policy if exists bi_owner on public.basket_items;
create policy bi_owner on public.basket_items for all using (
  exists (select 1 from public.basket_sessions bs where bs.id = basket_items.basket_session_id and (bs.user_id = auth.uid() or public.is_admin()))
) with check (true);

-- ---------------------------------------------------------------------------
-- Storage buckets
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public) values
  ('public-media', 'public-media', true),
  ('product-images', 'product-images', true),
  ('valuation-uploads', 'valuation-uploads', false)
on conflict (id) do nothing;

-- Storage policies
-- public-media: anyone can read; admins can write
drop policy if exists public_media_read on storage.objects;
create policy public_media_read on storage.objects for select using (bucket_id = 'public-media');
drop policy if exists public_media_write on storage.objects;
create policy public_media_write on storage.objects for insert
  with check (bucket_id = 'public-media' and public.is_admin());
drop policy if exists public_media_update on storage.objects;
create policy public_media_update on storage.objects for update using (bucket_id = 'public-media' and public.is_admin());
drop policy if exists public_media_delete on storage.objects;
create policy public_media_delete on storage.objects for delete using (bucket_id = 'public-media' and public.is_admin());

-- product-images: anyone can read; admins can write
drop policy if exists product_images_read on storage.objects;
create policy product_images_read on storage.objects for select using (bucket_id = 'product-images');
drop policy if exists product_images_write on storage.objects;
create policy product_images_write on storage.objects for insert
  with check (bucket_id = 'product-images' and public.is_admin());
drop policy if exists product_images_update on storage.objects;
create policy product_images_update on storage.objects for update using (bucket_id = 'product-images' and public.is_admin());
drop policy if exists product_images_delete on storage.objects;
create policy product_images_delete on storage.objects for delete using (bucket_id = 'product-images' and public.is_admin());

-- valuation-uploads: private — uploads happen via the server action with the service-role key.
-- Browser users CANNOT read this bucket. Admins can view via signed URLs.
drop policy if exists valuation_uploads_admin_select on storage.objects;
create policy valuation_uploads_admin_select on storage.objects for select
  using (bucket_id = 'valuation-uploads' and public.is_admin());
drop policy if exists valuation_uploads_admin_write on storage.objects;
create policy valuation_uploads_admin_write on storage.objects for insert
  with check (bucket_id = 'valuation-uploads' and public.is_admin());

-- ---------------------------------------------------------------------------
-- AFTER FIRST LOGIN — assign yourself the admin role.
-- Run this in the SQL editor AFTER you've signed up via Authentication → Users.
-- Replace the email below with yours.
-- ---------------------------------------------------------------------------
-- insert into public.admin_profiles (id, email, role)
-- select id, email, 'admin' from auth.users where email = 'you@example.com';
