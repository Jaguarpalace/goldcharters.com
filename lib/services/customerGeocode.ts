import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { geocodePostcode, normalisePostcode } from './geocode';

/**
 * Look up one customer's postcode and store the coordinates on their row.
 * Best-effort by design: called after a customer is saved, and a postcodes.io
 * hiccup must never fail the save. Skips the lookup when the stored
 * coordinates already belong to this postcode.
 */
export async function geocodeCustomerBestEffort(
  admin: SupabaseClient,
  customerId: string,
  postcode: string | null | undefined,
): Promise<void> {
  try {
    const key = normalisePostcode(postcode);
    if (!key) {
      await admin
        .from('customers')
        .update({ latitude: null, longitude: null, geocoded_at: null, geocode_postcode: null })
        .eq('id', customerId);
      return;
    }
    const { data: current } = await admin
      .from('customers')
      .select('geocode_postcode, latitude')
      .eq('id', customerId)
      .maybeSingle<{ geocode_postcode: string | null; latitude: number | null }>();
    if (current?.geocode_postcode === key && current.latitude != null) return;

    const point = await geocodePostcode(key);
    await admin
      .from('customers')
      .update({
        latitude: point?.lat ?? null,
        longitude: point?.lng ?? null,
        geocoded_at: new Date().toISOString(),
        geocode_postcode: key,
      })
      .eq('id', customerId);
  } catch (err) {
    console.error('[customers:geocode]', err);
  }
}
