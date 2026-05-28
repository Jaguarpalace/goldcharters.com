-- Photos attached to an appointment booking (up to 5 per booking).
--
-- Mirrors valuation_request_images: customers can upload photos of the items
-- they'll bring, so the team can prepare before the appointment. Files live in
-- the existing private `valuation-uploads` storage bucket under an
-- `appointments/<id>/` prefix; this table stores the storage PATH (not a signed
-- URL), and the admin board signs them on read so links never expire.
--
-- Safe to re-run.

create table if not exists public.appointment_images (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  -- Storage path within the `valuation-uploads` bucket. Signed on read.
  image_url text not null,
  file_name text,
  display_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists appointment_images_appt_idx
  on public.appointment_images (appointment_id);

-- RLS: public can insert (booking happens via the service-role client anyway),
-- only admins can read.
alter table public.appointment_images enable row level security;
drop policy if exists ai_insert on public.appointment_images;
drop policy if exists ai_select on public.appointment_images;
create policy ai_insert on public.appointment_images
  for insert with check (true);
create policy ai_select on public.appointment_images
  for select using (public.is_admin());
