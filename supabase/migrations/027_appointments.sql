-- Appointments & pop-up location events.
--
-- Two new tables power the "Book an appointment" / "Where to find us" feature:
--
--   appointment_events — a date-bounded place we will be (the Egham office or
--     a travelling pop-up, e.g. "Bracknell, first week of June"). Each event
--     defines the bookable window (date range + daily hours) and the slot
--     length, from which live availability is derived at read time.
--
--   appointments       — a single booked time-slot against an event, holding
--     the customer's contact details and chosen service.
--
-- Live availability = every slot the event window implies, minus the slots
-- already booked. The partial unique index below makes the database the final
-- word on double-booking: two concurrent submits for the same (event, slot)
-- can never both succeed, regardless of any application-level race.
--
-- Times are treated as UK wall-clock and stored as the corresponding instant.
-- Reuses the existing `preferred_contact` enum and `tg_touch_updated_at()`
-- trigger from migration 001.
--
-- Safe to re-run.

-- ---------------------------------------------------------------------------
-- Events (pop-up locations / showroom windows)
-- ---------------------------------------------------------------------------
create table if not exists public.appointment_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  city text not null,
  venue_name text,
  address text,
  -- Postcode + geocoded coordinates power the public "find your nearest
  -- location" search. Coordinates are derived from the postcode on save
  -- (postcodes.io); both stay null when no postcode is set or geocoding
  -- fails — the event is still fully bookable, just not distance-sortable.
  postcode text,
  latitude double precision,
  longitude double precision,
  description text,
  starts_on date not null,
  ends_on date not null,
  day_start_time time not null default '10:00',
  day_end_time time not null default '18:00',
  slot_minutes int not null default 30 check (slot_minutes between 5 and 480),
  -- null = available every day in the range; otherwise an array of weekday
  -- numbers (0 = Sunday … 6 = Saturday) the pop-up actually runs on.
  weekdays smallint[],
  is_published boolean not null default true,
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointment_events_dates_chk check (ends_on >= starts_on),
  constraint appointment_events_hours_chk check (day_end_time > day_start_time)
);

-- ---------------------------------------------------------------------------
-- Appointments (a booked slot)
-- ---------------------------------------------------------------------------
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.appointment_events(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text not null,
  service_type text,
  notes text,
  preferred_contact_method preferred_contact not null default 'phone',
  consent_accepted boolean not null default false,
  status text not null default 'booked'
    check (status in ('booked','confirmed','attended','cancelled','no_show')),
  -- Lets a customer cancel via a link in their confirmation email without
  -- needing an account. Opaque, single-purpose.
  cancel_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
-- Hot path: list bookings for an event in time order.
create index if not exists appointments_event_idx
  on public.appointments (event_id, starts_at);

-- Double-booking guard. Cancelled rows are excluded so a freed slot can be
-- rebooked. One live booking per (event, slot) — capacity is one private
-- appointment per slot.
create unique index if not exists appointments_unique_live_slot
  on public.appointments (event_id, starts_at)
  where status <> 'cancelled';

-- Token lookup for the public cancel flow.
create index if not exists appointments_cancel_token_idx
  on public.appointments (cancel_token);

-- Published, upcoming events list.
create index if not exists appointment_events_published_idx
  on public.appointment_events (starts_on)
  where is_published;

-- ---------------------------------------------------------------------------
-- updated_at triggers (reuse the shared touch function from migration 001)
-- ---------------------------------------------------------------------------
drop trigger if exists trg_touch_appointment_events on public.appointment_events;
create trigger trg_touch_appointment_events
  before update on public.appointment_events
  for each row execute function public.tg_touch_updated_at();

drop trigger if exists trg_touch_appointments on public.appointments;
create trigger trg_touch_appointments
  before update on public.appointments
  for each row execute function public.tg_touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
--   appointment_events — public reads published rows; admins read/write all.
--   appointments       — PUBLIC CAN INSERT ONLY (booking); admins read/write.
--     Availability is computed server-side with the service-role key so the
--     public never needs select access to other customers' bookings.
-- ---------------------------------------------------------------------------
alter table public.appointment_events enable row level security;
drop policy if exists ae_read on public.appointment_events;
drop policy if exists ae_write on public.appointment_events;
create policy ae_read on public.appointment_events
  for select using (is_published or public.is_admin());
create policy ae_write on public.appointment_events
  for all using (public.is_admin()) with check (public.is_admin());

alter table public.appointments enable row level security;
drop policy if exists ap_insert on public.appointments;
drop policy if exists ap_select on public.appointments;
drop policy if exists ap_write on public.appointments;
create policy ap_insert on public.appointments
  for insert with check (true);
create policy ap_select on public.appointments
  for select using (public.is_admin());
create policy ap_write on public.appointments
  for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists ap_delete on public.appointments;
create policy ap_delete on public.appointments
  for delete using (public.is_admin());
