import { getServerSupabase } from '@/lib/supabase/server';
import type { Customer, CustomerDocument, ValuationRequest } from '@/types/database';

/* --------------------------------------------------------------- Map data */

export type CustomerMapPoint = {
  id: string;
  name: string;
  email: string;
  postcode: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  /** Purchase agreements with a recorded payment, matched by email. */
  purchases: number;
  /** Total we have paid this customer, in GBP. */
  total_paid_gbp: number;
};

/**
 * Every active customer with the figures the map needs: coordinates (when
 * geocoded) and what we have bought from them. Spend comes from paid
 * valuation requests matched on email - the same join the History tab uses -
 * so it counts each purchase agreement once regardless of how the stock was
 * later split.
 */
export async function listCustomerMapPoints(): Promise<CustomerMapPoint[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];
  const [customersRes, paidRes] = await Promise.all([
    supabase
      .from('customers')
      .select('id, first_name, last_name, email, postcode, city, latitude, longitude')
      .is('deleted_at', null),
    supabase
      .from('valuation_requests')
      .select('email, payment_amount')
      .not('payment_amount', 'is', null)
      .is('deleted_at', null),
  ]);
  const spend = new Map<string, { count: number; total: number }>();
  for (const r of (paidRes.data ?? []) as Array<{ email: string; payment_amount: number }>) {
    const key = r.email.toLowerCase();
    const cur = spend.get(key) ?? { count: 0, total: 0 };
    cur.count += 1;
    cur.total += Number(r.payment_amount) || 0;
    spend.set(key, cur);
  }
  return ((customersRes.data ?? []) as Array<{
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    postcode: string | null;
    city: string | null;
    latitude: number | null;
    longitude: number | null;
  }>).map((c) => {
    const s = spend.get(c.email.toLowerCase()) ?? { count: 0, total: 0 };
    return {
      id: c.id,
      name: `${c.first_name} ${c.last_name}`.trim(),
      email: c.email,
      postcode: c.postcode,
      city: c.city,
      latitude: c.latitude,
      longitude: c.longitude,
      purchases: s.count,
      total_paid_gbp: Math.round(s.total * 100) / 100,
    };
  });
}

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
