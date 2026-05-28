'use server';

import { revalidatePath } from 'next/cache';
import { getAdminSupabase, getServerSupabase } from '@/lib/supabase/server';
import { isSupabaseAdminConfigured } from '@/lib/supabase/env';
import { requireAdminContext } from './_helpers';
import { mockAppointmentEvents } from '@/lib/mock-data';
import {
  APPOINTMENT_SERVICES,
  MIN_LEAD_MINUTES,
  formatSlotLong,
  isValidSlot,
  slotEnd,
} from '@/lib/appointments/slots';
import { sendBookingEmails } from '@/lib/email/sendBookingEmails';
import { getUpcomingEvents } from '@/lib/queries/appointments';
import { geocodePostcode } from '@/lib/services/geocode';
import { haversineMiles } from '@/lib/appointments/geo';
import {
  APPOINTMENT_STATUSES,
  type Appointment,
  type AppointmentEvent,
  type AppointmentImage,
  type AppointmentStatus,
  type PreferredContactMethod,
} from '@/types/database';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CONTACT_METHODS = new Set<PreferredContactMethod>(['phone', 'email', 'whatsapp']);
const SERVICE_SET = new Set<string>(APPOINTMENT_SERVICES);

// Customers may attach up to 5 photos of the items they'll bring.
const MAX_PHOTOS = 5;
const MAX_PHOTO_BYTES = 12 * 1024 * 1024;
const ALLOWED_PHOTO_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);
const APPOINTMENT_BUCKET = 'valuation-uploads';

function clean(v: unknown, max = 500): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

function cleanOpt(v: unknown, max = 2000): string | null {
  const s = clean(v, max);
  return s || null;
}

// ---------------------------------------------------------------------------
//  Public — booking
// ---------------------------------------------------------------------------

export type BookAppointmentInput = {
  eventId: string;
  startsAt: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  serviceType?: string | null;
  notes?: string | null;
  preferredContactMethod: string;
  consent: boolean;
  photos?: File[];
};

export type BookResult =
  | {
      ok: true;
      reference: string;
      persisted: boolean;
      when: string;
      cancelToken: string | null;
    }
  | { ok: false; error: string; code?: 'SLOT_TAKEN' | 'VALIDATION' | 'NOT_FOUND' };

/**
 * Fetch the event a booking targets. Only published events are bookable from
 * the public site. Uses the service-role client so availability/validation can
 * run without a signed-in user; falls back to mock events in dev.
 */
async function getEventForBooking(eventId: string): Promise<AppointmentEvent | null> {
  if (!isSupabaseAdminConfigured()) {
    return mockAppointmentEvents().find((e) => e.id === eventId) ?? null;
  }
  const admin = getAdminSupabase();
  if (!admin) return null;
  const { data } = await admin
    .from('appointment_events')
    .select('*')
    .eq('id', eventId)
    .eq('is_published', true)
    .maybeSingle();
  return (data as AppointmentEvent) ?? null;
}

export async function bookAppointment(input: BookAppointmentInput): Promise<BookResult> {
  const firstName = clean(input.firstName, 80);
  const lastName = clean(input.lastName, 80);
  const email = clean(input.email, 160).toLowerCase();
  const phone = clean(input.phone, 40);
  const contact = clean(input.preferredContactMethod, 20) as PreferredContactMethod;
  const serviceRaw = cleanOpt(input.serviceType, 80);
  // Constrain to the known service list; drop anything unexpected.
  const serviceType = serviceRaw && SERVICE_SET.has(serviceRaw) ? serviceRaw : null;
  const notes = cleanOpt(input.notes, 2000);
  const eventId = clean(input.eventId, 80);
  const startsAt = clean(input.startsAt, 40);

  // --- Validation ---
  if (!firstName || !lastName) return { ok: false, error: 'Please provide your name.', code: 'VALIDATION' };
  if (!EMAIL_RE.test(email)) return { ok: false, error: 'Please provide a valid email address.', code: 'VALIDATION' };
  if (!phone) return { ok: false, error: 'Please provide a phone number.', code: 'VALIDATION' };
  if (!CONTACT_METHODS.has(contact))
    return { ok: false, error: 'Please choose a preferred contact method.', code: 'VALIDATION' };
  if (!input.consent) return { ok: false, error: 'Please confirm consent to be contacted.', code: 'VALIDATION' };
  if (!eventId || !startsAt) return { ok: false, error: 'Please choose an appointment slot.', code: 'VALIDATION' };

  const event = await getEventForBooking(eventId);
  if (!event) return { ok: false, error: 'That location is no longer available.', code: 'NOT_FOUND' };

  if (!isValidSlot(event, startsAt))
    return { ok: false, error: "That time isn't available — please pick another slot.", code: 'VALIDATION' };

  const startMs = new Date(startsAt).getTime();
  if (Number.isNaN(startMs) || startMs < Date.now() + MIN_LEAD_MINUTES * 60_000)
    return { ok: false, error: 'That time has passed — please pick a later slot.', code: 'VALIDATION' };

  const when = formatSlotLong(startsAt);

  // --- Dev / preview fallback (no service-role key) ---
  if (!isSupabaseAdminConfigured()) {
    console.info('[appointment:mock-mode]', { eventId, startsAt, firstName });
    return { ok: true, reference: `mock-${Date.now().toString(36)}`, persisted: false, when, cancelToken: null };
  }

  const admin = getAdminSupabase();
  if (!admin) return { ok: false, error: 'Server is not configured to accept bookings.' };

  // Belt-and-braces availability check before insert (the partial unique index
  // is the real guarantee against a concurrent race).
  const { data: clash } = await admin
    .from('appointments')
    .select('id')
    .eq('event_id', eventId)
    .eq('starts_at', startsAt)
    .neq('status', 'cancelled')
    .maybeSingle();
  if (clash) return { ok: false, error: 'Sorry, that slot was just taken. Please choose another.', code: 'SLOT_TAKEN' };

  const { data: row, error } = await admin
    .from('appointments')
    .insert({
      event_id: eventId,
      starts_at: startsAt,
      ends_at: slotEnd(event, startsAt),
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      service_type: serviceType,
      notes,
      preferred_contact_method: contact,
      consent_accepted: true,
      status: 'booked',
    })
    .select('*')
    .single<Appointment>();

  if (error || !row) {
    // 23505 = our partial unique index caught a concurrent booking.
    if (error?.code === '23505') {
      return { ok: false, error: 'Sorry, that slot was just taken. Please choose another.', code: 'SLOT_TAKEN' };
    }
    console.error('[appointment:insert]', error);
    return { ok: false, error: 'Could not save your booking. Please try again.' };
  }

  // Upload any attached photos (best-effort — never fails the booking).
  const photoCount = await uploadAppointmentPhotos(admin, row.id, input.photos ?? []);

  await sendBookingEmails(row, event, photoCount);

  revalidatePath('/book');
  revalidatePath('/');
  revalidatePath('/admin/appointments');

  return { ok: true, reference: row.id.slice(0, 8), persisted: true, when, cancelToken: row.cancel_token };
}

/**
 * Upload booking photos to the private bucket and record their storage paths.
 * Returns the number stored. Best-effort: a failed upload is logged and skipped
 * so the booking itself is never blocked.
 */
async function uploadAppointmentPhotos(
  admin: NonNullable<ReturnType<typeof getAdminSupabase>>,
  appointmentId: string,
  photos: File[],
): Promise<number> {
  const valid = photos
    .filter((p): p is File => p instanceof File && p.size > 0)
    .slice(0, MAX_PHOTOS);
  if (valid.length === 0) return 0;

  const rows: Array<{
    appointment_id: string;
    image_url: string;
    file_name: string;
    display_order: number;
  }> = [];

  for (const [index, photo] of valid.entries()) {
    if (photo.size > MAX_PHOTO_BYTES) continue;
    if (photo.type && !ALLOWED_PHOTO_MIME.has(photo.type)) continue;
    const safeName = photo.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `appointments/${appointmentId}/${Date.now()}-${index}-${safeName}`;
    try {
      const buffer = await photo.arrayBuffer();
      const { error } = await admin.storage.from(APPOINTMENT_BUCKET).upload(path, buffer, {
        contentType: photo.type || 'image/jpeg',
        cacheControl: '3600',
      });
      if (error) {
        console.error('[appointment:photo-upload]', error);
        continue;
      }
      rows.push({
        appointment_id: appointmentId,
        image_url: path,
        file_name: photo.name,
        display_order: index + 1,
      });
    } catch (e) {
      console.error('[appointment:photo-upload]', e);
    }
  }

  if (rows.length > 0) {
    const { error } = await admin.from('appointment_images').insert(rows);
    if (error) console.error('[appointment:photo-rows]', error);
  }
  return rows.length;
}

// ---------------------------------------------------------------------------
//  Public — self-service cancel via token
// ---------------------------------------------------------------------------

export type CancelResult =
  | { ok: true; when: string; city: string }
  | { ok: false; error: string };

export async function cancelAppointmentByToken(token: string): Promise<CancelResult> {
  const t = clean(token, 80);
  if (!t) return { ok: false, error: 'Invalid cancellation link.' };

  if (!isSupabaseAdminConfigured()) {
    return { ok: false, error: 'Cancellations are not available in preview mode.' };
  }
  const admin = getAdminSupabase();
  if (!admin) return { ok: false, error: 'Server error.' };

  const { data: appt } = await admin
    .from('appointments')
    .select('id, starts_at, status, event_id')
    .eq('cancel_token', t)
    .maybeSingle<{ id: string; starts_at: string; status: AppointmentStatus; event_id: string }>();

  if (!appt) return { ok: false, error: 'We could not find that appointment — it may already be cancelled.' };

  let city = '';
  const { data: ev } = await admin
    .from('appointment_events')
    .select('city')
    .eq('id', appt.event_id)
    .maybeSingle<{ city: string }>();
  if (ev) city = ev.city;

  const when = formatSlotLong(appt.starts_at);
  if (appt.status === 'cancelled') return { ok: true, when, city };

  const { error } = await admin
    .from('appointments')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', appt.id);
  if (error) {
    console.error('[appointment:cancel-token]', error);
    return { ok: false, error: 'Could not cancel the appointment. Please call us instead.' };
  }

  revalidatePath('/book');
  revalidatePath('/admin/appointments');
  return { ok: true, when, city };
}

// ---------------------------------------------------------------------------
//  Admin — appointments board
// ---------------------------------------------------------------------------

export type AppointmentWithEvent = Appointment & {
  appointment_events: {
    title: string;
    city: string;
    venue_name: string | null;
  } | null;
  appointment_images?: AppointmentImage[];
};

export async function listAppointments(): Promise<AppointmentWithEvent[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('appointments')
    .select('*, appointment_events(title, city, venue_name), appointment_images(*)')
    .order('starts_at', { ascending: true });
  if (error || !data) return [];
  const rows = data as AppointmentWithEvent[];

  // Sign the private storage paths so the board can render thumbnails. Short
  // expiry, regenerated on every load, so links never go stale.
  const paths = rows.flatMap((r) => (r.appointment_images ?? []).map((i) => i.image_url));
  if (paths.length > 0) {
    const { data: signed } = await supabase.storage
      .from(APPOINTMENT_BUCKET)
      .createSignedUrls(paths, 60 * 60);
    const byPath = new Map<string, string>();
    for (const s of signed ?? []) {
      if (s.path && s.signedUrl) byPath.set(s.path, s.signedUrl);
    }
    for (const r of rows) {
      for (const img of r.appointment_images ?? []) {
        img.image_url = byPath.get(img.image_url) ?? img.image_url;
      }
    }
  }
  return rows;
}

/** Count of upcoming, not-yet-cancelled appointments — drives the nav badge. */
export async function countUpcomingAppointments(): Promise<number> {
  const supabase = getServerSupabase();
  if (!supabase) return 0;
  const { count, error } = await supabase
    .from('appointments')
    .select('id', { count: 'exact', head: true })
    .gte('starts_at', new Date().toISOString())
    .not('status', 'in', '("cancelled","no_show","attended")');
  if (error) return 0;
  return count ?? 0;
}

export async function updateAppointmentStatus(
  id: string,
  status: AppointmentStatus,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await requireAdminContext();
  if ('error' in ctx) return { ok: false, error: ctx.error };
  if (!APPOINTMENT_STATUSES.includes(status)) return { ok: false, error: 'Invalid status.' };

  const { error } = await ctx.admin
    .from('appointments')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) {
    console.error('[appointment:status]', error);
    return { ok: false, error: error.message };
  }
  revalidatePath('/admin/appointments');
  revalidatePath('/book');
  return { ok: true };
}

export async function deleteAppointment(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await requireAdminContext();
  if ('error' in ctx) return { ok: false, error: ctx.error };
  const { error } = await ctx.admin.from('appointments').delete().eq('id', id);
  if (error) {
    console.error('[appointment:delete]', error);
    return { ok: false, error: error.message };
  }
  revalidatePath('/admin/appointments');
  revalidatePath('/book');
  return { ok: true };
}

// ---------------------------------------------------------------------------
//  Admin — pop-up events CRUD
// ---------------------------------------------------------------------------

export type EventInput = {
  title: string;
  city: string;
  venue_name?: string | null;
  address?: string | null;
  postcode?: string | null;
  description?: string | null;
  starts_on: string;
  ends_on: string;
  day_start_time: string;
  day_end_time: string;
  slot_minutes: number;
  weekdays?: number[] | null;
  is_published: boolean;
  display_order: number;
};

export type EventSaveResult =
  | { ok: true; data: AppointmentEvent }
  | { ok: false; error: string };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}(:\d{2})?$/;

function validateEventInput(input: EventInput): string | null {
  if (!clean(input.title)) return 'Title is required.';
  if (!clean(input.city)) return 'City / location is required.';
  if (!DATE_RE.test(input.starts_on) || !DATE_RE.test(input.ends_on)) return 'Please provide valid dates.';
  if (input.ends_on < input.starts_on) return 'The end date must be on or after the start date.';
  if (!TIME_RE.test(input.day_start_time) || !TIME_RE.test(input.day_end_time))
    return 'Please provide valid opening and closing times.';
  if (input.day_end_time <= input.day_start_time) return 'Closing time must be after opening time.';
  if (!Number.isFinite(input.slot_minutes) || input.slot_minutes < 5 || input.slot_minutes > 480)
    return 'Slot length must be between 5 and 480 minutes.';
  return null;
}

function normaliseWeekdays(weekdays: number[] | null | undefined): number[] | null {
  if (!weekdays || weekdays.length === 0) return null;
  const valid = Array.from(new Set(weekdays.filter((d) => d >= 0 && d <= 6))).sort((a, b) => a - b);
  return valid.length === 7 || valid.length === 0 ? null : valid;
}

function eventPatch(input: EventInput) {
  return {
    title: clean(input.title, 120),
    city: clean(input.city, 120),
    venue_name: cleanOpt(input.venue_name, 160),
    address: cleanOpt(input.address, 300),
    postcode: cleanOpt(input.postcode, 12),
    description: cleanOpt(input.description, 2000),
    starts_on: input.starts_on,
    ends_on: input.ends_on,
    day_start_time: input.day_start_time.slice(0, 5),
    day_end_time: input.day_end_time.slice(0, 5),
    slot_minutes: Math.round(input.slot_minutes),
    weekdays: normaliseWeekdays(input.weekdays),
    is_published: Boolean(input.is_published),
    display_order: Number.isFinite(input.display_order) ? Math.round(input.display_order) : 0,
  };
}

/**
 * Build the row to persist, geocoding the postcode to lat/lng so the public
 * nearest-location search can rank it. Coordinates derive solely from the
 * current postcode: cleared when it's blank or can't be geocoded, so stale
 * coordinates never linger after a venue moves.
 */
async function buildEventRow(input: EventInput) {
  const base = eventPatch(input);
  let latitude: number | null = null;
  let longitude: number | null = null;
  if (base.postcode) {
    const geo = await geocodePostcode(base.postcode);
    if (geo) {
      latitude = geo.lat;
      longitude = geo.lng;
    }
  }
  return { ...base, latitude, longitude };
}

function revalidateEvents() {
  revalidatePath('/admin/events');
  revalidatePath('/book');
  revalidatePath('/');
}

export async function createEvent(input: EventInput): Promise<EventSaveResult> {
  const ctx = await requireAdminContext();
  if ('error' in ctx) return { ok: false, error: ctx.error };
  const invalid = validateEventInput(input);
  if (invalid) return { ok: false, error: invalid };

  const { data, error } = await ctx.admin
    .from('appointment_events')
    .insert(await buildEventRow(input))
    .select('*')
    .single<AppointmentEvent>();
  if (error || !data) {
    console.error('[event:create]', error);
    return { ok: false, error: error?.message ?? 'Could not create the event.' };
  }
  revalidateEvents();
  return { ok: true, data };
}

export async function updateEvent(id: string, input: EventInput): Promise<EventSaveResult> {
  const ctx = await requireAdminContext();
  if ('error' in ctx) return { ok: false, error: ctx.error };
  const invalid = validateEventInput(input);
  if (invalid) return { ok: false, error: invalid };

  const { data, error } = await ctx.admin
    .from('appointment_events')
    .update({ ...(await buildEventRow(input)), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single<AppointmentEvent>();
  if (error || !data) {
    console.error('[event:update]', error);
    return { ok: false, error: error?.message ?? 'Could not update the event.' };
  }
  revalidateEvents();
  return { ok: true, data };
}

export async function toggleEventPublished(
  id: string,
  isPublished: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await requireAdminContext();
  if ('error' in ctx) return { ok: false, error: ctx.error };
  const { error } = await ctx.admin
    .from('appointment_events')
    .update({ is_published: isPublished, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidateEvents();
  return { ok: true };
}

export async function deleteEvent(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await requireAdminContext();
  if ('error' in ctx) return { ok: false, error: ctx.error };
  const { error } = await ctx.admin.from('appointment_events').delete().eq('id', id);
  if (error) {
    console.error('[event:delete]', error);
    return { ok: false, error: error.message };
  }
  revalidateEvents();
  revalidatePath('/admin/appointments');
  return { ok: true };
}

// ---------------------------------------------------------------------------
//  Public — find your nearest location
// ---------------------------------------------------------------------------

export type NearestResult =
  | {
      ok: true;
      originLabel: string;
      results: Array<{ eventId: string; distanceMiles: number }>;
    }
  | { ok: false; error: string };

/**
 * Rank published upcoming events by distance from the visitor — either a UK
 * postcode (geocoded server-side) or browser geolocation coordinates. Returns
 * only events that have been geocoded; the client merges the distances into
 * its event list, reorders closest-first and auto-selects the nearest.
 */
export async function findNearestEvents(input: {
  postcode?: string | null;
  lat?: number | null;
  lng?: number | null;
}): Promise<NearestResult> {
  let origin: { lat: number; lng: number } | null = null;
  let originLabel = 'your location';

  if (
    typeof input.lat === 'number' &&
    typeof input.lng === 'number' &&
    Number.isFinite(input.lat) &&
    Number.isFinite(input.lng)
  ) {
    origin = { lat: input.lat, lng: input.lng };
  } else {
    const pc = clean(input.postcode ?? '', 12);
    if (!pc) return { ok: false, error: 'Please enter your postcode.' };
    origin = await geocodePostcode(pc);
    if (!origin) {
      return { ok: false, error: "We couldn't find that postcode — please check it and try again." };
    }
    originLabel = pc.toUpperCase();
  }

  const events = await getUpcomingEvents();
  const results = events
    .filter((e) => typeof e.latitude === 'number' && typeof e.longitude === 'number')
    .map((e) => ({
      eventId: e.id,
      distanceMiles: haversineMiles(origin as { lat: number; lng: number }, {
        lat: e.latitude as number,
        lng: e.longitude as number,
      }),
    }))
    .sort((a, b) => a.distanceMiles - b.distanceMiles);

  if (results.length === 0) {
    return { ok: false, error: 'No locations have a mapped address yet — please choose from the list below.' };
  }
  return { ok: true, originLabel, results };
}
