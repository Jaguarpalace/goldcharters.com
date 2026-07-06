'use server';

import { revalidatePath } from 'next/cache';
import { optionalText, requireAdminRole, sanitiseText, type SaveResult } from './_helpers';
import { formatAddress } from '@/lib/seo/nap';

export async function updateSiteSettings(id: string, patch: Record<string, unknown>): Promise<SaveResult> {
  const ctx = await requireAdminRole();
  if ('error' in ctx) return { ok: false, error: ctx.error, code: ctx.code };

  const { error } = await ctx.admin
    .from('site_settings')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('[settings:update]', error);
    return { ok: false, error: error.message };
  }

  // Site settings appear in the layout — every page revalidates.
  revalidatePath('/', 'layout');
  revalidatePath('/admin/settings');
  revalidatePath('/admin/contact');
  return { ok: true };
}

/**
 * Parse a latitude/longitude form value. Returns a number when valid,
 * null when blank, or an error string describing the problem.
 */
function parseCoordinate(
  raw: FormDataEntryValue | null,
  label: string,
  min: number,
  max: number,
): number | null | { error: string } {
  const text = sanitiseText(raw, 40);
  if (!text) return null;
  const value = Number(text);
  if (!Number.isFinite(value)) return { error: `${label} must be a number (e.g. 51.4084).` };
  if (value < min || value > max) return { error: `${label} must be between ${min} and ${max}.` };
  return value;
}

export async function updateSiteSettingsFromForm(formData: FormData): Promise<SaveResult> {
  const id = sanitiseText(formData.get('id'), 64);
  if (!id) return { ok: false, error: 'Missing settings id.' };

  // ---- Structured NAP -----------------------------------------------------
  // The four text parts are required as a set: the JSON-LD PostalAddress and
  // the composed display string both depend on them. Validating here (not
  // just in the UI) keeps a malformed NAP out of the database entirely.
  const address_street = sanitiseText(formData.get('address_street'), 160);
  const address_locality = sanitiseText(formData.get('address_locality'), 80);
  const address_region = sanitiseText(formData.get('address_region'), 80);
  const address_postcode = sanitiseText(formData.get('address_postcode'), 12).toUpperCase();

  if (!address_street || !address_locality || !address_region || !address_postcode) {
    return {
      ok: false,
      error: 'Business address is incomplete — street, town, county and postcode are all required.',
    };
  }
  // Light UK postcode shape check (outward + inward). Deliberately loose —
  // it exists to catch obvious typos, not to be a full validator.
  if (!/^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/.test(address_postcode)) {
    return { ok: false, error: `"${address_postcode}" does not look like a UK postcode.` };
  }

  const address_latitude = parseCoordinate(formData.get('address_latitude'), 'Latitude', -90, 90);
  if (typeof address_latitude === 'object' && address_latitude !== null) {
    return { ok: false, error: address_latitude.error };
  }
  const address_longitude = parseCoordinate(formData.get('address_longitude'), 'Longitude', -180, 180);
  if (typeof address_longitude === 'object' && address_longitude !== null) {
    return { ok: false, error: address_longitude.error };
  }

  return updateSiteSettings(id, {
    business_name: sanitiseText(formData.get('business_name'), 120) || 'Charters Gold',
    logo_url: optionalText(formData.get('logo_url'), 500),
    phone: sanitiseText(formData.get('phone'), 40),
    email: sanitiseText(formData.get('email'), 160),
    whatsapp: optionalText(formData.get('whatsapp'), 40),
    // Single source of truth: the display string is always composed from the
    // structured parts, so the footer, contact page, legal pages and email
    // templates can never drift from the schema.org address.
    address: formatAddress({
      street: address_street,
      locality: address_locality,
      region: address_region,
      postcode: address_postcode,
    }),
    address_street,
    address_locality,
    address_region,
    address_postcode,
    address_latitude,
    address_longitude,
    opening_hours: optionalText(formData.get('opening_hours'), 200),
    top_bar_review_text: optionalText(formData.get('top_bar_review_text'), 120),
    top_bar_trust_text: optionalText(formData.get('top_bar_trust_text'), 120),
    top_bar_payment_text: optionalText(formData.get('top_bar_payment_text'), 120),
    footer_description: optionalText(formData.get('footer_description'), 800),
    footer_disclaimer: optionalText(formData.get('footer_disclaimer'), 800),
    seo_title: sanitiseText(formData.get('seo_title'), 160) || 'Charters Gold',
    seo_description: sanitiseText(formData.get('seo_description'), 300),
    purchase_disclaimer_text: optionalText(formData.get('purchase_disclaimer_text'), 8000),
  });
}
