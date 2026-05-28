import { getAdminSupabase, getServerSupabase } from '@/lib/supabase/server';
import { mockAppointmentEvents } from '@/lib/mock-data';
import { computeEvent, toSummary, type ComputedEvent, type EventSummary } from '@/lib/appointments/slots';
import type { AppointmentEvent } from '@/types/database';

function todayISODate(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Published, still-upcoming events for the public site.
 *
 * Mock data is returned ONLY when Supabase isn't configured (dev / preview).
 * On a configured-but-empty database we return [] rather than fabricating
 * pop-up locations that don't exist — a live customer must never be shown a
 * fake "we'll be in Bracknell".
 */
export async function getUpcomingEvents(): Promise<AppointmentEvent[]> {
  const supabase = getServerSupabase();
  if (!supabase) return mockAppointmentEvents();

  const { data, error } = await supabase
    .from('appointment_events')
    .select('*')
    .eq('is_published', true)
    .gte('ends_on', todayISODate())
    .order('display_order', { ascending: true })
    .order('starts_on', { ascending: true });

  if (error || !data) return [];
  return data as AppointmentEvent[];
}

/** Every event including unpublished + past — for the admin editor. */
export async function getAllEvents(): Promise<AppointmentEvent[]> {
  const supabase = getServerSupabase();
  if (!supabase) return mockAppointmentEvents();

  const { data, error } = await supabase
    .from('appointment_events')
    .select('*')
    .order('display_order', { ascending: true })
    .order('starts_on', { ascending: true });

  if (error || !data) return [];
  return data as AppointmentEvent[];
}

/**
 * Booked (non-cancelled) slot starts per event, keyed by event id.
 *
 * Read with the service-role client so the public availability calendar can
 * be computed server-side without exposing any customer PII or granting
 * public select on the appointments table. When the admin key isn't
 * configured (dev) every slot reads as available.
 */
export async function getBookedSlotSets(
  eventIds: string[],
): Promise<Map<string, Set<string>>> {
  const map = new Map<string, Set<string>>();
  if (eventIds.length === 0) return map;

  const admin = getAdminSupabase();
  if (!admin) return map;

  const { data, error } = await admin
    .from('appointments')
    .select('event_id, starts_at, status')
    .in('event_id', eventIds)
    .neq('status', 'cancelled');

  if (error || !data) return map;

  for (const row of data as Array<{ event_id: string; starts_at: string }>) {
    const iso = new Date(row.starts_at).toISOString();
    const set = map.get(row.event_id) ?? new Set<string>();
    set.add(iso);
    map.set(row.event_id, set);
  }
  return map;
}

/**
 * Upcoming events expanded into days + slots with live availability applied.
 * Events whose entire window is already in the past (no remaining slots) are
 * dropped; fully-booked-but-future events are kept so the UI can show them as
 * "fully booked".
 */
export async function getComputedEvents(): Promise<ComputedEvent[]> {
  const events = await getUpcomingEvents();
  if (events.length === 0) return [];

  const booked = await getBookedSlotSets(events.map((e) => e.id));
  const now = new Date();

  return events
    .map((e) => computeEvent(e, booked.get(e.id) ?? new Set<string>(), now))
    .filter((e) => e.days.length > 0);
}

/** Lightweight event summaries for the homepage cards. */
export async function getEventSummaries(): Promise<EventSummary[]> {
  const computed = await getComputedEvents();
  return computed.map(toSummary);
}
