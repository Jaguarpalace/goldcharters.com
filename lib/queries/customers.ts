import { getServerSupabase } from '@/lib/supabase/server';
import type { Customer, CustomerDocument, ValuationRequest } from '@/types/database';

/** All active (non-trashed) customers, newest first. */
export async function listCustomers(): Promise<Customer[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data as Customer[];
}

/** Single customer by id. Returns null when the row is soft-deleted. */
export async function getCustomer(id: string): Promise<Customer | null> {
  const supabase = getServerSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();
  if (error || !data) return null;
  return data as Customer;
}

/** Soft-deleted customers — surfaced on /admin/trash for review or restore. */
export async function listDeletedCustomers(): Promise<Customer[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false });
  if (error || !data) return [];
  return data as Customer[];
}

/** All documents attached to a customer, newest upload first. */
export async function getCustomerDocuments(customerId: string): Promise<CustomerDocument[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('customer_documents')
    .select('*')
    .eq('customer_id', customerId)
    .order('uploaded_at', { ascending: false });
  if (error || !data) return [];
  return data as CustomerDocument[];
}

/**
 * Valuation requests previously submitted by this email address.
 * Match is case-insensitive so submissions made before the customer record
 * existed still appear in the History tab. Soft-deleted requests are hidden.
 */
export async function getCustomerHistory(email: string): Promise<ValuationRequest[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('valuation_requests')
    .select('*')
    .ilike('email', email)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data as ValuationRequest[];
}
