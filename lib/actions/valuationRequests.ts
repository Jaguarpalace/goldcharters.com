'use server';

import { revalidatePath } from 'next/cache';
import { getAdminSupabase, getServerSupabase } from '@/lib/supabase/server';
import { isSupabaseAdminConfigured } from '@/lib/supabase/env';
import { requireAdminContext } from './_helpers';
import { sendNewRequestNotification } from '@/lib/email/sendNewRequestNotification';
import { sendCustomerConfirmation } from '@/lib/email/sendCustomerConfirmation';
import { getMetalSpots } from '@/lib/services/metalPrice';
import { purityToPercent } from '@/lib/schemas/valuationFormOptions';
import type {
  FormVariant,
  PaymentMethod,
  PreferredContactMethod,
  ValuationItemType,
  ValuationRequest,
  ValuationRequestImage,
  ValuationRequestStatus,
} from '@/types/database';
import { PAYMENT_METHODS } from '@/types/database';
import {
  ALLOWED_BOX_PAPERS,
  ALLOWED_CONDITIONS,
  ALLOWED_GEMSTONES,
  ALLOWED_ITEM_FORMS,
  ALLOWED_JEWELLERY_TYPES,
  ALLOWED_METALS,
  ALLOWED_PURITIES,
} from '@/lib/schemas/valuationFormOptions';

// Form variants, item types and contact methods are independent of the
// public-form option lists (they're branch identifiers / DB enum mirrors),
// so they stay defined here.
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
  const metalType = optionalFromSet(formData.get('metal_type'), ALLOWED_METALS);
  const itemCategory = optionalFromSet(formData.get('item_category'), ALLOWED_ITEM_FORMS);
  const carat = optional(formData.get('carat'), 40);
  // Jewellery branch
  const jewelleryType = optionalFromSet(formData.get('jewellery_type'), ALLOWED_JEWELLERY_TYPES);
  const gemstone = optionalFromSet(formData.get('gemstone'), ALLOWED_GEMSTONES);
  // Watch & handbag branches
  const brand = optional(formData.get('brand'), 80);
  const model = optional(formData.get('model'), 120);
  const condition = optionalFromSet(formData.get('condition'), ALLOWED_CONDITIONS);
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
    // Pull the full row back so we have everything we need for the email.
    .select('*')
    .single<ValuationRequest>();

  if (insertError || !request) {
    console.error('[valuation:insert]', insertError);
    return { ok: false, error: 'Could not save your request. Please try again.' };
  }

  // Auto-link / auto-create the KYC customer record. Every public form
  // submission becomes a customer in the directory keyed by email — so the
  // 'History' and 'Holdings' tabs on /admin/customers/[id] light up
  // automatically and the admin never has to manually create the row.
  //
  // Insert is best-effort: if the customer already exists (unique email)
  // we leave the existing record untouched so a manually-cleaned name or
  // address isn't overwritten. Errors are logged but never block the
  // valuation submission — the request is what matters to the seller.
  await ensureCustomerForRequest(admin, {
    first_name: firstName,
    last_name: lastName,
    email,
    phone,
  });

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

  // Fire the two transactional emails in parallel:
  //   1. Internal alert to the team
  //   2. Branded confirmation back to the customer
  // Both senders are fail-soft and never throw, so the customer's submission
  // always succeeds even if email delivery is having a bad day.
  await Promise.all([
    sendNewRequestNotification(request, uploadedImageRows.length),
    sendCustomerConfirmation(request, uploadedImageRows.length),
  ]);

  revalidatePath('/admin/valuation-requests');
  return { ok: true, requestId: request.id, persisted: true };
}

/**
 * Insert a customer record for a freshly-submitted valuation request when
 * none yet exists. Existing rows are left untouched so admin edits stick.
 *
 * Implemented as best-effort: any error is logged and swallowed — the
 * valuation submission must not fail because of a KYC bookkeeping hiccup.
 */
async function ensureCustomerForRequest(
  admin: NonNullable<ReturnType<typeof getAdminSupabase>>,
  input: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  },
): Promise<void> {
  try {
    const email = input.email.trim().toLowerCase();
    const { data: existing } = await admin
      .from('customers')
      .select('id')
      .ilike('email', email)
      .maybeSingle();
    if (existing) return; // already in the directory; nothing to do

    const { error } = await admin.from('customers').insert({
      first_name: input.first_name,
      last_name: input.last_name,
      email,
      phone: input.phone || null,
    });
    if (error) {
      // Unique-constraint races can briefly produce 23505 — harmless, the
      // other side already created the row.
      if (error.code !== '23505') {
        console.error('[valuation:customer-autocreate]', error);
      }
    }
  } catch (e) {
    console.error('[valuation:customer-autocreate]', e);
  }
}

/**
 * Per-row "next action" hints. The list endpoint derives these once with a
 * small handful of batched queries so the admin board can render
 * 'Add to holdings', 'Missing KYC' etc. badges without fetching anything
 * extra per row.
 */
export type RequestNextActions = {
  /** Matched customer record (by email, case-insensitive). Null when the
   *  customer hasn't been created yet — should be rare now that submission
   *  auto-links, but historical data without a customer row is possible. */
  customer: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
  /** Stock-ledger row already created from this valuation, if any. Drives
   *  the "Add to holdings" prompt when status=bought and this is null. */
  stock_item: {
    id: string;
    stock_number: string;
    status: 'held' | 'sold' | 'written_off';
  } | null;
  /** True when the customer has at least one ID-type document AND at least
   *  one proof of address on file. */
  kyc_complete: boolean;
};

export type ValuationRequestRow = ValuationRequest & {
  valuation_request_images?: ValuationRequestImage[];
  next_actions: RequestNextActions;
};

const ID_DOC_TYPES = new Set(['id', 'passport', 'driving_licence']);

export async function listValuationRequests(): Promise<ValuationRequestRow[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('valuation_requests')
    .select('*, valuation_request_images(*)')
    .order('created_at', { ascending: false });

  if (error || !data || data.length === 0) return [];

  const rows = data as Array<ValuationRequest & { valuation_request_images?: ValuationRequestImage[] }>;

  // ----- Batch the three enrichment queries in parallel --------------------
  const emails = Array.from(
    new Set(rows.map((r) => r.email.trim().toLowerCase()).filter(Boolean)),
  );
  const requestIds = rows.map((r) => r.id);

  const [customersRes, stockItemsRes] = await Promise.all([
    emails.length > 0
      ? supabase
          .from('customers')
          .select('id, first_name, last_name, email')
          .in('email', emails)
      : Promise.resolve({ data: [] as Array<{
          id: string;
          first_name: string;
          last_name: string;
          email: string;
        }> }),
    requestIds.length > 0
      ? supabase
          .from('stock_items')
          .select('id, stock_number, status, valuation_request_id')
          .in('valuation_request_id', requestIds)
      : Promise.resolve({ data: [] as Array<{
          id: string;
          stock_number: string;
          status: 'held' | 'sold' | 'written_off';
          valuation_request_id: string | null;
        }> }),
  ]);

  const customers = (customersRes.data ?? []) as Array<{
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  }>;
  const stockItems = (stockItemsRes.data ?? []) as Array<{
    id: string;
    stock_number: string;
    status: 'held' | 'sold' | 'written_off';
    valuation_request_id: string | null;
  }>;

  // KYC documents — only worth fetching if we found matching customers.
  const customerIds = customers.map((c) => c.id);
  const docsRes =
    customerIds.length > 0
      ? await supabase
          .from('customer_documents')
          .select('customer_id, doc_type')
          .in('customer_id', customerIds)
      : { data: [] };
  const docs = (docsRes.data ?? []) as Array<{
    customer_id: string;
    doc_type: string;
  }>;

  // ----- Build lookup maps -------------------------------------------------
  const customerByEmail = new Map<string, (typeof customers)[number]>();
  for (const c of customers) {
    customerByEmail.set(c.email.trim().toLowerCase(), c);
  }
  const stockItemByRequest = new Map<string, (typeof stockItems)[number]>();
  for (const s of stockItems) {
    if (s.valuation_request_id) stockItemByRequest.set(s.valuation_request_id, s);
  }
  const kycByCustomer = new Map<string, boolean>();
  for (const cid of customerIds) {
    const own = docs.filter((d) => d.customer_id === cid);
    const hasId = own.some((d) => ID_DOC_TYPES.has(d.doc_type));
    const hasPoa = own.some((d) => d.doc_type === 'proof_of_address');
    kycByCustomer.set(cid, hasId && hasPoa);
  }

  // ----- Attach to rows ----------------------------------------------------
  return rows.map((row) => {
    const customer = customerByEmail.get(row.email.trim().toLowerCase()) ?? null;
    const stockItem = stockItemByRequest.get(row.id) ?? null;
    const kycComplete = customer ? kycByCustomer.get(customer.id) === true : false;

    return {
      ...row,
      next_actions: {
        customer: customer
          ? {
              id: customer.id,
              first_name: customer.first_name,
              last_name: customer.last_name,
            }
          : null,
        stock_item: stockItem
          ? {
              id: stockItem.id,
              stock_number: stockItem.stock_number,
              status: stockItem.status,
            }
          : null,
        kyc_complete: kycComplete,
      },
    } as ValuationRequestRow;
  });
}

/** Count of requests still needing action — drives the sidebar badge. */
export async function countOutstandingRequests(): Promise<number> {
  const supabase = getServerSupabase();
  if (!supabase) return 0;

  const { count, error } = await supabase
    .from('valuation_requests')
    .select('id', { count: 'exact', head: true })
    .not('status', 'in', '("bought","completed","rejected")');

  if (error) {
    console.error('[valuation:count-outstanding]', error);
    return 0;
  }
  return count ?? 0;
}

const VALID_STATUSES = new Set<string>([
  'new',
  'contacted',
  'valued',
  'offer_sent',
  'booked',
  'bought',
  'completed',
  'rejected',
]);

export async function updateValuationStatus(
  id: string,
  status: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!VALID_STATUSES.has(status)) {
    return { ok: false, error: 'Invalid status.' };
  }
  if (!isSupabaseAdminConfigured()) {
    return { ok: false, error: 'Supabase not configured.' };
  }
  const admin = getAdminSupabase();
  if (!admin) return { ok: false, error: 'Server error.' };

  // Confirm the caller is an admin via their session.
  const session = getServerSupabase();
  if (session) {
    const { data: { user } } = await session.auth.getUser();
    if (!user) return { ok: false, error: 'Not authenticated.' };
    const { data: profile } = await session
      .from('admin_profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();
    if (!profile) return { ok: false, error: 'Not authorised.' };
  }

  const { error } = await admin
    .from('valuation_requests')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('[valuation:update-status]', error);
    return { ok: false, error: error.message };
  }

  revalidatePath('/admin/valuation-requests');
  revalidatePath('/admin');
  return { ok: true };
}

/* --------------------------------------------------------- Walk-in flow */

export type WalkInPurchaseInput = {
  // Seller
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  postcode?: string | null;

  // Item (metal branch — handbags/watches not yet supported in this wizard)
  metal_type: string;
  carat?: string | null;
  weight_grams?: number | null;
  description?: string | null;
  condition?: string | null;

  // Payment
  payment_amount_gbp: number;
  payment_method?: PaymentMethod | null;
  payment_reference?: string | null;
};

/**
 * Single-shot action for in-person walk-in purchases. Creates (or links) a
 * customer record, a valuation_request already at status='bought' with the
 * payment captured, and a stock_items row imported from it — so the same
 * Print button and Holdings dashboard the website flow uses keep working
 * unchanged. Returns the new valuation request id for the caller to
 * redirect to the printable document.
 */
export async function createWalkInPurchase(
  input: WalkInPurchaseInput,
): Promise<
  | { ok: true; data: { valuation_request_id: string; stock_item_id: string | null } }
  | { ok: false; error: string }
> {
  const ctx = await requireAdminContext();
  if ('error' in ctx) return { ok: false, error: ctx.error };

  // --- Validation -----------------------------------------------------
  const first = (input.first_name ?? '').trim();
  const last = (input.last_name ?? '').trim();
  const email = (input.email ?? '').trim().toLowerCase();
  const phone = (input.phone ?? '').trim();
  if (!first || !last) return { ok: false, error: 'Seller name is required.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { ok: false, error: 'Seller email looks invalid.' };
  if (!phone) return { ok: false, error: 'Seller phone is required.' };
  if (!input.metal_type) return { ok: false, error: 'Pick a metal type.' };
  if (!Number.isFinite(input.payment_amount_gbp) || input.payment_amount_gbp < 0)
    return { ok: false, error: 'Amount paid is required and must be ≥ 0.' };

  // --- Step 1: upsert customer ---------------------------------------
  const customerPatch = {
    first_name: first,
    last_name: last,
    email,
    phone,
    address_line1: input.address_line1?.trim() || null,
    address_line2: input.address_line2?.trim() || null,
    city: input.city?.trim() || null,
    postcode: input.postcode?.trim() || null,
  };
  const { data: existingCustomer } = await ctx.admin
    .from('customers')
    .select('id')
    .ilike('email', email)
    .maybeSingle();
  let customerId: string | null = (existingCustomer as { id: string } | null)?.id ?? null;
  if (!customerId) {
    const { data: newCustomer, error: cErr } = await ctx.admin
      .from('customers')
      .insert(customerPatch)
      .select('id')
      .single();
    if (cErr) {
      // 23505 means another tab raced us — re-fetch and continue.
      if (cErr.code === '23505') {
        const { data: again } = await ctx.admin
          .from('customers')
          .select('id')
          .ilike('email', email)
          .maybeSingle();
        customerId = (again as { id: string } | null)?.id ?? null;
      } else {
        console.error('[walkin:customer]', cErr);
        return { ok: false, error: cErr.message };
      }
    } else {
      customerId = (newCustomer as { id: string }).id;
    }
  }

  // --- Step 2: insert valuation_request already at status='bought' ---
  const nowIso = new Date().toISOString();
  const { data: vr, error: vrErr } = await ctx.admin
    .from('valuation_requests')
    .insert({
      first_name: first,
      last_name: last,
      email,
      phone,
      preferred_contact_method: 'phone' as PreferredContactMethod,
      consent_accepted: true,
      form_variant: 'metal' as FormVariant,
      item_type: 'gold' as ValuationItemType,
      metal_type: input.metal_type,
      carat: input.carat?.trim() || null,
      weight_grams: input.weight_grams ?? null,
      condition: input.condition?.trim() || null,
      description: input.description?.trim() || null,
      status: 'bought',
      payment_amount: input.payment_amount_gbp,
      payment_method: input.payment_method ?? 'cash',
      payment_reference: input.payment_reference?.trim() || null,
      paid_at: nowIso,
    })
    .select('id')
    .single();
  if (vrErr || !vr) {
    console.error('[walkin:request]', vrErr);
    return { ok: false, error: vrErr?.message ?? 'Could not save the purchase.' };
  }
  const valuationRequestId = (vr as { id: string }).id;

  // --- Step 3: best-effort stock_items row ---------------------------
  // We don't use createStockItemFromValuation here because that function
  // re-derives values from the request row we just inserted — direct insert
  // with the data already in hand is faster and avoids a re-fetch.
  const spots = await getMetalSpots();
  const spot =
    input.metal_type === 'Gold'
      ? spots.gold?.per_gram_gbp
      : input.metal_type === 'Silver'
      ? spots.silver?.per_gram_gbp
      : input.metal_type === 'Platinum'
      ? spots.platinum?.per_gram_gbp
      : null;
  const purityPct = purityToPercent(input.carat ?? null);
  const { data: stock, error: stockErr } = await ctx.admin
    .from('stock_items')
    .insert({
      valuation_request_id: valuationRequestId,
      customer_id: customerId,
      item_type: 'gold',
      description: input.description?.trim() || null,
      metal_type: input.metal_type,
      carat: input.carat?.trim() || null,
      purity_percentage: purityPct,
      weight_grams: input.weight_grams ?? null,
      acquired_at: nowIso,
      acquired_paid_gbp: input.payment_amount_gbp,
      acquired_spot_gbp_per_g: spot ?? null,
    })
    .select('id')
    .single();
  if (stockErr) {
    // The valuation request is in place; the admin can click "Add to
    // holdings" on the board if this side failed. Don't block the response.
    console.error('[walkin:stock]', stockErr);
  }

  revalidatePath('/admin/valuation-requests');
  revalidatePath('/admin/customers');
  revalidatePath('/admin/holdings');

  return {
    ok: true,
    data: {
      valuation_request_id: valuationRequestId,
      stock_item_id: (stock as { id: string } | null)?.id ?? null,
    },
  };
}

/** Save internal notes for a request. Notes are admin-only; never sent to the customer. */
export async function updateValuationNotes(
  id: string,
  notes: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await requireAdminContext();
  if ('error' in ctx) return { ok: false, error: ctx.error };

  const trimmed = notes.slice(0, 5000); // hard cap to keep DB sane
  const { error } = await ctx.admin
    .from('valuation_requests')
    .update({ notes: trimmed || null, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('[valuation:update-notes]', error);
    return { ok: false, error: error.message };
  }

  revalidatePath('/admin/valuation-requests');
  return { ok: true };
}

export type PaymentInput = {
  amount: number | null;
  method: PaymentMethod | null;
  reference: string | null;
  paidAt: string | null; // ISO date string or null
};

/** Save payment details against a request. Used once a piece is bought. */
export async function updateValuationPayment(
  id: string,
  input: PaymentInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await requireAdminContext();
  if ('error' in ctx) return { ok: false, error: ctx.error };

  if (input.amount !== null && (!Number.isFinite(input.amount) || input.amount < 0)) {
    return { ok: false, error: 'Payment amount must be a positive number.' };
  }
  if (input.method !== null && !PAYMENT_METHODS.includes(input.method)) {
    return { ok: false, error: 'Unknown payment method.' };
  }

  const { error } = await ctx.admin
    .from('valuation_requests')
    .update({
      payment_amount: input.amount,
      payment_method: input.method,
      payment_reference: input.reference?.slice(0, 200) ?? null,
      paid_at: input.paidAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    console.error('[valuation:update-payment]', error);
    return { ok: false, error: error.message };
  }

  revalidatePath('/admin/valuation-requests');
  revalidatePath('/admin');
  return { ok: true };
}

/**
 * Permanently delete a valuation request, its image rows (CASCADE) and any
 * uploaded photos in the private `valuation-uploads` storage bucket.
 * Intended for cleaning up test submissions or removing data on customer
 * request. There is no undo.
 */
export async function deleteValuationRequest(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await requireAdminContext();
  if ('error' in ctx) return { ok: false, error: ctx.error };

  // Look up the image paths first so we can remove the storage objects.
  // valuation_request_images has CASCADE on delete, so the rows themselves
  // will go automatically when we drop the parent row — but the storage
  // bucket has no FK to anything, so we must do that ourselves.
  const { data: images } = await ctx.admin
    .from('valuation_request_images')
    .select('image_url')
    .eq('valuation_request_id', id);

  if (images && images.length > 0) {
    const paths = (images as { image_url: string }[])
      .map((row) => extractStoragePath(row.image_url, 'valuation-uploads'))
      .filter((p): p is string => Boolean(p));
    if (paths.length > 0) {
      const { error } = await ctx.admin.storage
        .from('valuation-uploads')
        .remove(paths);
      // Log but don't fail — orphan storage objects are recoverable, an
      // orphan DB row is not.
      if (error) console.error('[valuation:delete-storage]', error);
    }
  }

  const { error } = await ctx.admin
    .from('valuation_requests')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[valuation:delete]', error);
    return { ok: false, error: error.message };
  }

  revalidatePath('/admin/valuation-requests');
  revalidatePath('/admin');
  return { ok: true };
}

/** Permanently delete many valuation requests at once. */
export async function bulkDeleteValuationRequests(
  ids: string[],
): Promise<{ ok: true; deleted: number } | { ok: false; error: string }> {
  const ctx = await requireAdminContext();
  if ('error' in ctx) return { ok: false, error: ctx.error };

  if (!Array.isArray(ids) || ids.length === 0) return { ok: true, deleted: 0 };
  if (ids.length > 500) return { ok: false, error: 'Too many records selected.' };

  // Storage cleanup first (same approach as single delete).
  const { data: images } = await ctx.admin
    .from('valuation_request_images')
    .select('image_url')
    .in('valuation_request_id', ids);

  if (images && images.length > 0) {
    const paths = (images as { image_url: string }[])
      .map((row) => extractStoragePath(row.image_url, 'valuation-uploads'))
      .filter((p): p is string => Boolean(p));
    if (paths.length > 0) {
      const { error } = await ctx.admin.storage
        .from('valuation-uploads')
        .remove(paths);
      if (error) console.error('[valuation:bulk-delete-storage]', error);
    }
  }

  const { error, data } = await ctx.admin
    .from('valuation_requests')
    .delete()
    .in('id', ids)
    .select('id');

  if (error) {
    console.error('[valuation:bulk-delete]', error);
    return { ok: false, error: error.message };
  }

  revalidatePath('/admin/valuation-requests');
  revalidatePath('/admin');
  return { ok: true, deleted: data?.length ?? ids.length };
}

/** Pull the storage object path out of either a Supabase public URL or a
 *  signed URL. Returns null if the URL doesn't look like one we recognise. */
function extractStoragePath(url: string, bucket: string): string | null {
  // Signed URLs look like: .../storage/v1/object/sign/<bucket>/<path>?token=...
  // Public URLs look like: .../storage/v1/object/public/<bucket>/<path>
  const match = url.match(
    new RegExp(`/storage/v1/object/(?:public|sign)/${bucket}/([^?]+)`),
  );
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

/** Set the same status on many requests at once. */
export async function bulkUpdateValuationStatus(
  ids: string[],
  status: ValuationRequestStatus,
): Promise<{ ok: true; updated: number } | { ok: false; error: string }> {
  const ctx = await requireAdminContext();
  if ('error' in ctx) return { ok: false, error: ctx.error };

  if (!VALID_STATUSES.has(status)) return { ok: false, error: 'Invalid status.' };
  if (!Array.isArray(ids) || ids.length === 0) return { ok: true, updated: 0 };
  if (ids.length > 500) return { ok: false, error: 'Too many records selected.' };

  const { error, data } = await ctx.admin
    .from('valuation_requests')
    .update({ status, updated_at: new Date().toISOString() })
    .in('id', ids)
    .select('id');

  if (error) {
    console.error('[valuation:bulk-status]', error);
    return { ok: false, error: error.message };
  }

  revalidatePath('/admin/valuation-requests');
  revalidatePath('/admin');
  return { ok: true, updated: data?.length ?? ids.length };
}
