import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAdminSupabase } from '@/lib/supabase/server';
import { isSupabaseAdminConfigured } from '@/lib/supabase/env';
import type { Customer, PurchaseItem, ValuationRequest } from '@/types/database';
import { WalkInForm, type ExistingPurchase } from '../../../walk-in/WalkInForm';

export const dynamic = 'force-dynamic';

/**
 * Purchase form for an existing valuation request - the screen the Bought
 * stage opens. Same form as a walk-in, pre-filled with the seller, the
 * request's headline item and any lines already itemised on the board.
 * Saving marks the request Bought, captures the payment, writes the lines
 * and holdings, and opens the printable purchase document.
 */
export default async function CompletePurchasePage({ params }: { params: { id: string } }) {
  if (!isSupabaseAdminConfigured()) notFound();
  const admin = getAdminSupabase();
  if (!admin) notFound();

  const { data: request } = await admin
    .from('valuation_requests')
    .select('*')
    .eq('id', params.id)
    .is('deleted_at', null)
    .maybeSingle<ValuationRequest>();
  if (!request) notFound();

  const [{ data: itemRows }, { data: customer }, { count: stockCount }] = await Promise.all([
    admin
      .from('purchase_items')
      .select('*')
      .eq('valuation_request_id', request.id)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true }),
    request.email
      ? admin
          .from('customers')
          .select('*')
          .ilike('email', request.email)
          .is('deleted_at', null)
          .maybeSingle<Customer>()
      : Promise.resolve({ data: null as Customer | null }),
    admin
      .from('stock_items')
      .select('id', { count: 'exact', head: true })
      .eq('valuation_request_id', request.id)
      .is('deleted_at', null),
  ]);

  const items = (itemRows ?? []) as PurchaseItem[];
  const num = (n: number | null | undefined) => (n === null || n === undefined ? '' : String(n));

  // Lines already itemised on the board come through as they are; otherwise
  // the request's headline fields seed a single first line to be completed.
  const lines: ExistingPurchase['lines'] =
    items.length > 0
      ? items.map((it) => ({
          description: it.description ?? '',
          metal_type: it.metal_type ?? 'Gold',
          carat: it.carat ?? '',
          weight_grams: num(it.weight_grams),
          rate_gbp_per_g: num(it.rate_gbp_per_g),
          hallmark: it.hallmark ?? '',
          price_gbp: num(it.price_gbp),
        }))
      : [
          {
            description: request.description?.trim() || '',
            metal_type: request.metal_type ?? 'Gold',
            carat: request.carat ?? '',
            weight_grams: num(request.weight_grams),
            rate_gbp_per_g: '',
            hallmark: '',
            price_gbp: num(request.payment_amount),
          },
        ];

  const existing: ExistingPurchase = {
    requestId: request.id,
    customerId: customer?.id ?? null,
    seller: {
      first_name: request.first_name,
      last_name: request.last_name,
      email: request.email,
      phone: request.phone ?? customer?.phone ?? '',
      address_line1: customer?.address_line1 ?? '',
      address_line2: customer?.address_line2 ?? '',
      city: customer?.city ?? '',
      postcode: customer?.postcode ?? '',
    },
    lines,
    payment: {
      method: request.payment_method ?? null,
      reference: request.payment_reference ?? '',
      sort_code: request.payment_sort_code ?? '',
      account_number: request.payment_account_number ?? '',
    },
    holdingsExist: (stockCount ?? 0) > 0,
  };

  const reference = request.id.slice(0, 8).toUpperCase();
  const name = `${request.first_name} ${request.last_name}`.trim();

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-luxe text-gold-metallic">
            <Link href={`/admin/valuation-requests?open=${request.id}`} className="hover:text-gold-bright">
              ← Valuation requests
            </Link>
            <span className="text-warmgrey/50">/</span>
            <span className="font-mono">{reference}</span>
          </div>
          <h1 className="mt-1 font-display text-2xl text-white">Complete purchase for {name}</h1>
          <p className="mt-1 max-w-2xl text-xs text-warmgrey">
            Check the seller&rsquo;s details, list each piece bought with its weight and rate, and
            record the payment. Saving marks this request Bought, adds each line to the holdings
            ledger and opens the printable purchase document.
            {request.status === 'bought' && ' This request is already marked Bought; saving updates it in place.'}
          </p>
        </div>
        <div className="text-right">
          <Link
            href={`/admin/valuation-requests/${request.id}/print`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded-md border border-gold-metallic/40 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-luxe text-gold-tint transition hover:bg-gold-metallic/15 hover:text-gold-bright"
          >
            Print current document
          </Link>
          <p className="mt-1 max-w-[260px] text-[10px] text-warmgrey/70">
            Prints whatever is saved now. Save the form first for the lines and payment to appear.
          </p>
        </div>
      </header>

      <WalkInForm existing={existing} />
    </div>
  );
}
