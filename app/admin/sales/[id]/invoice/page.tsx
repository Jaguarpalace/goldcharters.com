import { notFound, redirect } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { getMfaState, mfaSatisfied } from '@/lib/auth/mfa';
import { getSiteSettings } from '@/lib/queries/homepage';
import { getSale } from '@/lib/queries/sales';
import { formatBuyerAddress, formatDateGB } from '@/lib/format';
import { PrintShell } from '@/app/admin/valuation-requests/[id]/print/PrintShell';

export const dynamic = 'force-dynamic';

const money = (n: number) =>
  `£${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Print-ready sales invoice. Lives outside the (dashboard) route group so
 * no sidebar or chrome appears - what is on screen is what prints. Same
 * shell and themes as the Purchase Confirmation.
 */
export default async function SalesInvoicePage({ params }: { params: { id: string } }) {
  if (!isSupabaseConfigured()) notFound();
  const supabase = getServerSupabase();
  if (!supabase) notFound();

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect(`/admin/login?next=/admin/sales/${params.id}/invoice`);
  const mfa = await getMfaState(supabase);
  if (!mfa.indeterminate && !mfa.enrolled) redirect('/admin/setup-2fa');
  if (!mfaSatisfied(mfa)) redirect(`/admin/login?mfa=1&next=/admin/sales/${params.id}/invoice`);

  const [sale, settings] = await Promise.all([getSale(params.id), getSiteSettings()]);
  if (!sale) notFound();

  const buyer = sale.buyer_snapshot ?? sale.buyer ?? null;
  const issued = formatDateGB(sale.sold_at, 'long');

  return (
    <PrintShell>
      <div className="print-sheet">
        <header className="print-header">
          <img
            src={settings.logo_url ?? '/logo/charters_gold_logo.png'}
            alt={settings.business_name}
            className="print-logo"
          />
          <div className="print-brand">
            <h1>{settings.business_name}</h1>
            {settings.address && <p>{settings.address}</p>}
            <p>
              {settings.phone}
              {settings.email && <> · {settings.email}</>}
            </p>
          </div>
        </header>

        <h1 className="print-doc-title">
          {sale.voided_at ? 'Invoice (voided)' : 'Sales Invoice'}
        </h1>
        <p className="print-doc-sub">
          Invoice number: <strong>{sale.invoice_number}</strong> · Date {issued}
          {sale.voided_at && (
            <>
              {' '}
              · Voided {formatDateGB(sale.voided_at)}
            </>
          )}
        </p>

        <section className="print-section">
          <h2>Invoice to</h2>
          <div className="print-grid">
            <div className="print-field">
              <span>{buyer?.kind === 'individual' ? 'Name' : 'Business name'}</span>
              <strong>{buyer?.name ?? '—'}</strong>
            </div>
            {buyer?.contact_name && (
              <div className="print-field">
                <span>Contact</span>
                <strong>{buyer.contact_name}</strong>
              </div>
            )}
            <div className="print-field">
              <span>Address</span>
              <strong>{formatBuyerAddress(buyer) || '—'}</strong>
            </div>
            <div className="print-field">
              <span>Phone</span>
              <strong>{buyer?.phone ?? '—'}</strong>
            </div>
            <div className="print-field">
              <span>Email</span>
              <strong>{buyer?.email ?? '—'}</strong>
            </div>
            {buyer?.company_number && (
              <div className="print-field">
                <span>Company number</span>
                <strong>{buyer.company_number}</strong>
              </div>
            )}
            {buyer?.vat_number && (
              <div className="print-field">
                <span>Buyer VAT number</span>
                <strong>{buyer.vat_number}</strong>
              </div>
            )}
          </div>
        </section>

        <section className="print-section">
          <h2>Items sold</h2>
          <table className="print-items">
            <thead>
              <tr>
                <th style={{ width: '13%' }}>Stock code</th>
                <th>Description</th>
                <th style={{ width: '14%' }}>Metal / carat</th>
                <th style={{ width: '9%' }} className="num">Weight</th>
                <th style={{ width: '6%' }} className="num">Qty</th>
                <th style={{ width: '12%' }} className="num">Unit price</th>
                <th style={{ width: '12%' }} className="num">Amount</th>
              </tr>
            </thead>
            <tbody>
              {sale.items.map((i) => (
                <tr key={i.id}>
                  <td style={{ fontFamily: 'ui-monospace, monospace' }}>{i.stock_number}</td>
                  <td>{i.description}</td>
                  <td>{[i.metal_type, i.carat].filter(Boolean).join(' ') || '—'}</td>
                  <td className="num">{i.weight_grams != null ? `${Number(i.weight_grams)} g` : '—'}</td>
                  <td className="num">{i.quantity}</td>
                  <td className="num">{money(Number(i.unit_price_gbp))}</td>
                  <td className="num">{money(Number(i.line_total_gbp))}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={6} style={{ fontWeight: 400 }}>Subtotal</td>
                <td className="num" style={{ fontWeight: 400 }}>{money(Number(sale.subtotal_gbp))}</td>
              </tr>
              <tr>
                <td colSpan={6} style={{ fontWeight: 400, borderTop: 'none', paddingTop: 2 }}>
                  VAT {Number(sale.vat_rate)}%
                </td>
                <td className="num" style={{ fontWeight: 400, borderTop: 'none', paddingTop: 2 }}>
                  {money(Number(sale.vat_gbp))}
                </td>
              </tr>
              <tr>
                <td colSpan={6} style={{ borderTop: 'none', paddingTop: 2 }}>Total amount due</td>
                <td className="num" style={{ borderTop: 'none', paddingTop: 2 }}>
                  {money(Number(sale.total_gbp))}
                </td>
              </tr>
            </tfoot>
          </table>
        </section>

        {sale.notes && (
          <section className="print-section">
            <h2>Notes</h2>
            <div className="print-disclaimer" style={{ fontSize: 10.5 }}>{sale.notes}</div>
          </section>
        )}

        <p className="print-foot">
          Issued by {settings.business_name}
          {settings.address ? `, ${settings.address}` : ''}. VAT is charged at 0% on the goods
          listed above. Goods remain the property of {settings.business_name} until paid in full.
        </p>
      </div>
    </PrintShell>
  );
}
