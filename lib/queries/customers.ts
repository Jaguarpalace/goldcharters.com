import { getServerSupabase } from '@/lib/supabase/server';
import type { Customer, CustomerDocument, ValuationRequest } from '@/types/database';

/** All customers, newest first. Used by the admin index page. */
export async function listCustomers(): Promise<Customer[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data as Customer[];
}

/** Single customer by id. */
export async function getCustomer(id: string): Promise<Customer | null> {
  const supabase = getServerSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error || !data) return null;
  return data as Customer;
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
 * existed still appear in the History tab.
 */
export async function getCustomerHistory(email: string): Promise<ValuationRequest[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('valuation_requests')
    .select('*')
    .ilike('email', email)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data as ValuationRequest[];
}
