'use server';

import { revalidatePath } from 'next/cache';
import { requireAdminContext, requireAdminRole, type SaveResult } from './_helpers';
import {
  CUSTOMER_DOCUMENT_TYPES,
  type Customer,
  type CustomerDocument,
  type CustomerDocumentType,
} from '@/types/database';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_DOC_BYTES = 15 * 1024 * 1024; // 15MB — passports as PDFs can be chunky.
const ALLOWED_DOC_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/pdf',
]);

type UpsertCustomer = {
  id?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  postcode?: string | null;
  country?: string | null;
  notes?: string | null;
};

function clean(v: string | null | undefined, max = 200): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  if (!t) return null;
  return t.slice(0, max);
}

function refresh(id?: string) {
  revalidatePath('/admin/customers');
  if (id) revalidatePath(`/admin/customers/${id}`);
}

/* ---------------------------------------------------------------- Customer */

export async function upsertCustomer(input: UpsertCustomer): Promise<SaveResult<Customer>> {
  const ctx = await requireAdminContext();
  if ('error' in ctx) return { ok: false, error: ctx.error };

  const first = clean(input.first_name, 80);
  const last = clean(input.last_name, 80);
  const email = clean(input.email, 200)?.toLowerCase() ?? '';

  if (!first) return { ok: false, error: 'First name is required.' };
  if (!last) return { ok: false, error: 'Last name is required.' };
  if (!EMAIL_RE.test(email)) {
    return { ok: false, error: 'Please enter a valid email address.' };
  }

  const row = {
    first_name: first,
    last_name: last,
    email,
    phone: clean(input.phone, 40),
    address_line1: clean(input.address_line1, 200),
    address_line2: clean(input.address_line2, 200),
    city: clean(input.city, 100),
    postcode: clean(input.postcode, 20),
    country: clean(input.country, 80),
    notes: clean(input.notes, 4000),
  };

  const query = input.id
    ? ctx.admin.from('customers').update(row).eq('id', input.id).select('*').single()
    : ctx.admin.from('customers').insert(row).select('*').single();

  const { data, error } = await query;
  if (error) {
    console.error('[customers:upsert]', error);
    if (error.code === '23505' || error.message.includes('duplicate key')) {
      return { ok: false, error: `A customer with email "${email}" already exists.` };
    }
    return { ok: false, error: error.message };
  }

  const customer = data as Customer;
  refresh(customer.id);
  return { ok: true, data: customer };
}

/**
 * Soft-delete a customer. The row stays in the table with deleted_at
 * stamped, so the admin can restore from /admin/trash. KYC documents
 * are preserved — they're only purged on a hard delete.
 */
export async function deleteCustomer(id: string): Promise<SaveResult> {
  const ctx = await requireAdminContext();
  if ('error' in ctx) return { ok: false, error: ctx.error };

  const { error } = await ctx.admin
    .from('customers')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .is('deleted_at', null);
  if (error) {
    console.error('[customers:soft-delete]', error);
    return { ok: false, error: error.message };
  }

  refresh();
  return { ok: true };
}

/** Restore a soft-deleted customer. Idempotent. */
export async function restoreCustomer(id: string): Promise<SaveResult> {
  const ctx = await requireAdminContext();
  if ('error' in ctx) return { ok: false, error: ctx.error };

  const { error } = await ctx.admin
    .from('customers')
    .update({ deleted_at: null })
    .eq('id', id);
  if (error) {
    console.error('[customers:restore]', error);
    return { ok: false, error: error.message };
  }

  refresh();
  return { ok: true };
}

/**
 * Permanently delete a customer. Removes KYC documents from storage too —
 * irreversible. Only callable on rows that are already soft-deleted, to
 * force a two-step "trash then purge" workflow.
 */
export async function purgeCustomer(id: string): Promise<SaveResult> {
  const ctx = await requireAdminRole();
  if ('error' in ctx) return { ok: false, error: ctx.error, code: ctx.code };

  // Refuse to purge anything that isn't in the trash already.
  const { data: row } = await ctx.admin
    .from('customers')
    .select('id, deleted_at')
    .eq('id', id)
    .maybeSingle();
  if (!row) return { ok: true }; // already gone
  if ((row as { deleted_at: string | null }).deleted_at === null) {
    return {
      ok: false,
      error: 'Move the customer to trash first before permanent delete.',
    };
  }

  // Storage objects aren't deleted by the FK cascade — fetch paths so we
  // can clean them up after the row goes.
  const { data: docs } = await ctx.admin
    .from('customer_documents')
    .select('storage_path')
    .eq('customer_id', id);

  const { error } = await ctx.admin.from('customers').delete().eq('id', id);
  if (error) {
    console.error('[customers:purge]', error);
    return { ok: false, error: error.message };
  }

  if (docs && docs.length > 0) {
    const paths = (docs as { storage_path: string }[]).map((d) => d.storage_path);
    await ctx.admin.storage.from('kyc-documents').remove(paths).catch(() => {});
  }

  refresh();
  return { ok: true };
}

/* ---------------------------------------------------------------- Documents */

export async function uploadCustomerDocument(
  formData: FormData,
): Promise<SaveResult<CustomerDocument>> {
  const ctx = await requireAdminContext();
  if ('error' in ctx) return { ok: false, error: ctx.error };

  const customerId = clean(formData.get('customer_id') as string | null, 64);
  const docTypeRaw = clean(formData.get('doc_type') as string | null, 40) as
    | CustomerDocumentType
    | null;
  const file = formData.get('file');

  if (!customerId) return { ok: false, error: 'Missing customer.' };
  if (!docTypeRaw || !CUSTOMER_DOCUMENT_TYPES.includes(docTypeRaw)) {
    return { ok: false, error: 'Pick a document type.' };
  }
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: 'No file selected.' };
  }
  if (file.size > MAX_DOC_BYTES) {
    return { ok: false, error: 'File is over 15MB.' };
  }
  if (!ALLOWED_DOC_MIME.has(file.type)) {
    return {
      ok: false,
      error: `Unsupported file type (${file.type || 'unknown'}). Use PDF, JPG, PNG, WEBP or HEIC.`,
    };
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin';
  const safeBase = file.name
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 60);
  const path = `${customerId}/${Date.now()}-${docTypeRaw}-${safeBase}.${ext}`;

  const buffer = await file.arrayBuffer();
  const { error: uploadError } = await ctx.admin.storage
    .from('kyc-documents')
    .upload(path, buffer, {
      contentType: file.type,
      cacheControl: 'no-store',
      upsert: false,
    });

  if (uploadError) {
    console.error('[customers:doc-upload]', uploadError);
    return { ok: false, error: uploadError.message };
  }

  const { data: row, error: insertError } = await ctx.admin
    .from('customer_documents')
    .insert({
      customer_id: customerId,
      doc_type: docTypeRaw,
      storage_path: path,
      file_name: file.name.slice(0, 200),
      mime_type: file.type,
      size_bytes: file.size,
      uploaded_by: ctx.userId,
    })
    .select('*')
    .single<CustomerDocument>();

  if (insertError || !row) {
    // Roll back the storage upload so we don't leave orphans.
    await ctx.admin.storage.from('kyc-documents').remove([path]).catch(() => {});
    console.error('[customers:doc-catalogue]', insertError);
    return { ok: false, error: insertError?.message ?? 'Could not save document record.' };
  }

  refresh(customerId);
  return { ok: true, data: row };
}

export async function deleteCustomerDocument(id: string): Promise<SaveResult> {
  const ctx = await requireAdminRole();
  if ('error' in ctx) return { ok: false, error: ctx.error, code: ctx.code };

  const { data: row, error: readError } = await ctx.admin
    .from('customer_documents')
    .select('id, customer_id, storage_path')
    .eq('id', id)
    .maybeSingle();
  if (readError || !row) {
    return { ok: false, error: readError?.message ?? 'Not found.' };
  }

  const { storage_path, customer_id } = row as {
    storage_path: string;
    customer_id: string;
  };

  await ctx.admin.storage.from('kyc-documents').remove([storage_path]).catch(() => {});

  const { error: deleteError } = await ctx.admin
    .from('customer_documents')
    .delete()
    .eq('id', id);
  if (deleteError) {
    console.error('[customers:doc-delete]', deleteError);
    return { ok: false, error: deleteError.message };
  }

  refresh(customer_id);
  return { ok: true };
}

/**
 * Mint a short-lived signed URL so the admin can view / download a KYC
 * document. The URL is valid for 60 seconds — long enough for the browser to
 * load it, short enough that a leaked URL is near-useless.
 */
export async function getCustomerDocumentSignedUrl(
  id: string,
): Promise<SaveResult<{ url: string }>> {
  const ctx = await requireAdminContext();
  if ('error' in ctx) return { ok: false, error: ctx.error };

  const { data: row } = await ctx.admin
    .from('customer_documents')
    .select('storage_path')
    .eq('id', id)
    .maybeSingle();
  if (!row) return { ok: false, error: 'Document not found.' };

  const { storage_path } = row as { storage_path: string };
  const { data, error } = await ctx.admin.storage
    .from('kyc-documents')
    .createSignedUrl(storage_path, 60);
  if (error || !data) {
    console.error('[customers:doc-sign]', error);
    return { ok: false, error: error?.message ?? 'Could not create download link.' };
  }
  return { ok: true, data: { url: data.signedUrl } };
}
