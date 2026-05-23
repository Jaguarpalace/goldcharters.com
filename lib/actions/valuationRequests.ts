'use server';

import { revalidatePath } from 'next/cache';
import { getAdminSupabase, getServerSupabase } from '@/lib/supabase/server';
import { isSupabaseAdminConfigured } from '@/lib/supabase/env';
import type {
  FormVariant,
  PreferredContactMethod,
  ValuationItemType,
} from '@/types/database';

// Allowed values per branch — server validates against these, regardless of
// what the client sends.
const ALLOWED_VARIANTS = new Set<FormVariant>(['metal', 'jewellery', 'watch', 'handbag']);

const ALLOWED_ITEM_TYPES = new Set<string>([
  'gold',
  'jewellery',
  'diamond_ring',
  'scrap_gold',
  'gold_coins',
  'gold_bars',
  'branded_jewellery',
  'handbags',
  'watches',
  'other',
]);

const ALLOWED_CONTACT = new Set<string>(['phone', 'email', 'whatsapp']);
const ALLOWED_METAL = new Set<string>(['Gold', 'Silver', 'Platinum']);
const ALLOWED_ITEM_FORM = new Set<string>(['Coins', 'Bullion', 'Scrap', 'Jewellery', 'Other']);
const ALLOWED_JEWELLERY_TYPE = new Set<string>([
  'Ring',
  'Necklace',
  'Bracelet',
  'Earrings',
  'Pendant',
  'Other',
]);
const ALLOWED_GEMSTONE = new Set<string>(['Diamond', 'Sapphire', 'Ruby', 'Emerald', 'Other', 'None']);
const ALLOWED_BOX_PAPERS = new Set<string>(['All', 'Box only', 'Papers only', 'Some', 'Neither']);
const ALLOWED_CONDITION = new Set<string>(['Excellent', 'Good', 'Fair', 'Worn']);

const MAX_PHOTO_BYTES = 12 * 1024 * 1024;
const MAX_PHOTOS = 12;
const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

export type ValuationSubmitResult =
  | { ok: true; requestId: string; persisted: boolean }
  | { ok: false; error: string };

function text(v: FormDataEntryValue | null, max = 500): string {
  if (typeof v !== 'string') return '';
  return v.trim().slice(0, max);
}

function optional(v: FormDataEntryValue | null, max = 500): string | null {
  const s = text(v, max);
  return s || null;
}

function optionalFromSet(v: FormDataEntryValue | null, allowed: Set<string>): string | null {
  const s = text(v, 60);
  if (!s) return null;
  return allowed.has(s) ? s : null;
}

function optionalNumber(v: FormDataEntryValue | null): number | null {
  if (typeof v !== 'string' || !v.trim()) return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export async function submitValuationRequest(
  formData: FormData,
): Promise<ValuationSubmitResult> {
  // --- Always required ---
  const firstName = text(formData.get('first_name'), 80);
  const lastName = text(formData.get('last_name'), 80);
  const email = text(formData.get('email'), 160);
  const phone = text(formData.get('phone'), 40);
  const contactRaw = text(formData.get('preferred_contact_method'), 20);
  const consent = formData.get('consent') === 'on' || formData.get('consent') === 'true';

  // --- Branch identifier ---
  const variantRaw = text(formData.get('form_variant'), 20) as FormVariant;
  const variant: FormVariant = ALLOWED_VARIANTS.has(variantRaw) ? variantRaw : 'metal';

  // --- Branch-specific fields ---
  // Metal branch
  const metalType = optionalFromSet(formData.get('metal_type'), ALLOWED_METAL);
  const itemCategory = optionalFromSet(formData.get('item_category'), ALLOWED_ITEM_FORM);
  const carat = optional(formData.get('carat'), 40);
  // Jewellery branch
  const jewelleryType = optionalFromSet(formData.get('jewellery_type'), ALLOWED_JEWELLERY_TYPE);
  const gemstone = optionalFromSet(formData.get('gemstone'), ALLOWED_GEMSTONE);
  // Watch & handbag branches
  const brand = optional(formData.get('brand'), 80);
  const model = optional(formData.get('model'), 120);
  const condition = optionalFromSet(formData.get('condition'), ALLOWED_CONDITION);
  const boxPapers = optionalFromSet(formData.get('box_papers'), ALLOWED_BOX_PAPERS);

  // Free text / numbers — used by any branch
  const description = optional(formData.get('description'), 2000);
  const estimatedValue = optionalNumber(formData.get('estimated_value'));
  const weight = optionalNumber(formData.get('weight_grams'));

  // Legacy enum — preserved so older reporting / admin views keep working.
  const itemTypeRaw = text(formData.get('item_type'), 40) || 'other';
  const itemType: ValuationItemType = (
    ALLOWED_ITEM_TYPES.has(itemTypeRaw) ? itemTypeRaw : 'other'
  ) as ValuationItemType;

  // --- Validation ---
  if (!firstName || !lastName) return { ok: false, error: 'Please provide your name.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { ok: false, error: 'Please provide a valid email address.' };
  if (!phone) return { ok: false, error: 'Please provide a phone number.' };
  if (!ALLOWED_CONTACT.has(contactRaw))
    return { ok: false, error: 'Please select a preferred contact method.' };
  if (!consent) return { ok: false, error: 'Please confirm consent to be contacted.' };

  // Each branch has at least one required identifying field
  switch (variant) {
    case 'metal':
      if (!metalType) return { ok: false, error: 'Please choose a metal.' };
      if (!itemCategory) return { ok: false, error: 'Please choose an item type.' };
      break;
    case 'jewellery':
      if (!jewelleryType)
        return { ok: false, error: 'Please choose the type of jewellery.' };
      break;
    case 'watch':
      if (!brand) return { ok: false, error: 'Please choose a watch brand.' };
      break;
    case 'handbag':
      if (!brand) return { ok: false, error: 'Please choose a handbag brand.' };
      break;
  }

  // --- Photo validation ---
  const photos = formData
    .getAll('photos')
    .filter((p): p is File => p instanceof File && p.size > 0);
  if (photos.length > MAX_PHOTOS)
    return { ok: false, error: `Please upload no more than ${MAX_PHOTOS} photos.` };
  for (const photo of photos) {
    if (photo.size > MAX_PHOTO_BYTES)
      return { ok: false, error: `Each photo must be under 12MB.` };
    if (photo.type && !ALLOWED_MIME.has(photo.type))
      return { ok: false, error: `Unsupported image type: ${photo.type}` };
  }

  // --- Dev fallback when Supabase isn't configured yet ---
  if (!isSupabaseAdminConfigured()) {
    const mockId = `mock-${Date.now()}`;
    console.info('[valuation:mock-mode]', {
      requestId: mockId,
      variant,
      firstName,
      metalType,
      brand,
      jewelleryType,
      photoCount: photos.length,
    });
    return { ok: true, requestId: mockId, persisted: false };
  }

  const admin = getAdminSupabase();
  if (!admin) return { ok: false, error: 'Server is not configured to accept submissions.' };

  const { data: request, error: insertError } = await admin
    .from('valuation_requests')
    .insert({
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      item_type: itemType,
      form_variant: variant,
      metal_type: metalType,
      item_category: itemCategory,
      jewellery_type: jewelleryType,
      gemstone,
      brand,
      model,
      condition,
      box_papers: boxPapers,
      estimated_value: estimatedValue,
      weight_grams: weight,
      carat,
      description,
      preferred_contact_method: contactRaw as PreferredContactMethod,
      consent_accepted: true,
      status: 'new',
    })
    .select('id')
    .single();

  if (insertError || !request) {
    console.error('[valuation:insert]', insertError);
    return { ok: false, error: 'Could not save your request. Please try again.' };
  }

  // Upload photos to the private bucket and store signed URLs
  const uploadedImageRows: Array<{
    valuation_request_id: string;
    image_url: string;
    file_name: string;
    display_order: number;
  }> = [];

  for (const [index, photo] of photos.entries()) {
    const safeName = photo.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${request.id}/${Date.now()}-${index}-${safeName}`;
    const arrayBuffer = await photo.arrayBuffer();
    const { error: uploadError } = await admin.storage
      .from('valuation-uploads')
      .upload(path, arrayBuffer, {
        contentType: photo.type || 'image/jpeg',
        cacheControl: '3600',
      });
    if (uploadError) {
      console.error('[valuation:upload]', uploadError);
      continue;
    }
    const { data: signed } = await admin.storage
      .from('valuation-uploads')
      .createSignedUrl(path, 60 * 60 * 24 * 7);
    uploadedImageRows.push({
      valuation_request_id: request.id,
      image_url: signed?.signedUrl ?? path,
      file_name: photo.name,
      display_order: index + 1,
    });
  }

  if (uploadedImageRows.length > 0) {
    const { error: imgError } = await admin
      .from('valuation_request_images')
      .insert(uploadedImageRows);
    if (imgError) console.error('[valuation:images]', imgError);
  }

  revalidatePath('/admin/valuation-requests');
  return { ok: true, requestId: request.id, persisted: true };
}

export async function listValuationRequests() {
  const supabase = getServerSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('valuation_requests')
    .select('*, valuation_request_images(*)')
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return data;
}
