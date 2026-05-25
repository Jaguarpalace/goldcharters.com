import { notFound, redirect } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import {
  getSiteSettings,
} from '@/lib/queries/homepage';
import {
  PAYMENT_METHOD_LABELS,
  type PaymentMethod,
  type ValuationRequest,
} from '@/types/database';
import { PrintActions } from './PrintActions';

export const dynamic = 'force-dynamic';

/**
 * Standalone, print-ready Purchase Confirmation & Seller's Disclaimer.
 * Outside the (dashboard) route group, so the admin sidebar and chrome
 * never appear — what you see is exactly what the printer renders.
 */
export default async function PurchasePrintPage({
  params,
}: {
  params: { id: string };
}) {
  if (!isSupabaseConfigured()) {
    // Hard fail in preview — printable docs require real data.
    notFound();
  }

  const supabase = getServerSupabase();
  if (!supabase) notFound();

  // Auth gate (the dashboard layout handles this for /admin/* but we're
  // outside that group here, so we re-check ourselves).
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    redirect(`/admin/login?next=/admin/valuation-requests/${params.id}/print`);
  }

  const [vrResult, settings] = await Promise.all([
    supabase
      .from('valuation_requests')
      .select('*')
      .eq('id', params.id)
      .maybeSingle<ValuationRequest>(),
    getSiteSettings(),
  ]);

  const request = vrResult.data;
  if (!request) notFound();

  // Try to find a matching customer for richer printed address details.
  let customerAddress: string | null = null;
  if (request.email) {
    const { data: customer } = await supabase
      .from('customers')
      .select('address_line1, address_line2, city, postcode, country')
      .ilike('email', request.email)
      .maybeSingle();
    if (customer) {
      customerAddress = [
        customer.address_line1,
        customer.address_line2,
        customer.city,
        customer.postcode,
        customer.country,
      ]
        .filter(Boolean)
        .join(', ');
    }
  }

  const fullName = `${request.first_name} ${request.last_name}`.trim();
  const issuedAt = request.paid_at ?? request.updated_at ?? new Date().toISOString();
  const issuedDate = new Date(issuedAt).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="print-page">
      {/* Embedded styles — scoped here so they don't leak into the rest of
          the admin. Print rules hide the action bar and force light theme. */}
      <style>{`
        @page { size: A4; margin: 18mm 16mm; }
        .print-page {
          background: #ffffff;
          color: #111111;
          font-family: 'Manrope', system-ui, sans-serif;
          font-size: 12px;
          line-height: 1.5;
          min-height: 100vh;
        }
        .print-sheet { max-width: 720px; margin: 0 auto; padding: 32px 24px 64px; }
        .print-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; border-bottom: 2px solid #b8860b; padding-bottom: 16px; }
        .print-logo { width: 96px; height: 96px; object-fit: contain; }
        .print-brand { text-align: right; }
        .print-brand h1 { font-size: 18px; font-weight: 700; color: #b8860b; letter-spacing: 0.12em; text-transform: uppercase; margin: 0; }
        .print-brand p { margin: 4px 0 0; font-size: 11px; color: #555; }
        .print-doc-title { font-size: 22px; font-weight: 700; margin: 28px 0 4px; }
        .print-doc-sub { font-size: 12px; color: #555; margin: 0 0 24px; }
        .print-section { margin-top: 22px; }
        .print-section h2 { font-size: 11px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: #b8860b; border-bottom: 1px solid #e6dcc1; padding-bottom: 4px; margin: 0 0 10px; }
        .print-grid { display: grid; grid-template-columns: 1fr 1fr; column-gap: 24px; row-gap: 8px; }
        .print-field { display: flex; flex-direction: column; }
        .print-field span { font-size: 9px; text-transform: uppercase; letter-spacing: 0.16em; color: #999; }
        .print-field strong { font-size: 13px; font-weight: 600; color: #111; }
        .print-disclaimer { white-space: pre-wrap; font-size: 11.5px; color: #1a1a1a; }
        .print-signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 36px; margin-top: 36px; }
        .print-sig-block { border-top: 1px solid #111; padding-top: 8px; }
        .print-sig-block .label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.16em; color: #777; }
        .print-sig-block .name { font-size: 12px; font-weight: 600; margin-top: 4px; }
        .print-sig-line { display: inline-block; width: 100%; min-height: 28px; }
        .print-foot { margin-top: 36px; padding-top: 12px; border-top: 1px solid #e6dcc1; font-size: 10px; color: #777; text-align: center; }

        /* Action bar — visible on screen, hidden in print */
        .print-actions { position: sticky; top: 0; z-index: 10; display: flex; justify-content: flex-end; gap: 12px; background: #f6f3eb; border-bottom: 1px solid #e6dcc1; padding: 10px 24px; }
        @media print {
          .print-actions { display: none !important; }
          .print-page { background: #ffffff !important; }
        }
      `}</style>

      <PrintActions />

      <div className="print-sheet">
        <header className="print-header">
          <img
            src={settings.logo_url ?? '/logo/charters_gold_true_transparent.png'}
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

        <h1 className="print-doc-title">Purchase Confirmation &amp; Seller's Disclaimer</h1>
        <p className="print-doc-sub">
          Reference: <strong>{request.id.slice(0, 8).toUpperCase()}</strong> · Issued {issuedDate}
        </p>

        {/* ----------------------------- Seller --------------------------- */}
        <section className="print-section">
          <h2>Seller</h2>
          <div className="print-grid">
            <div className="print-field">
              <span>Full name</span>
              <strong>{fullName || '—'}</strong>
            </div>
            <div className="print-field">
              <span>Email</span>
              <strong>{request.email || '—'}</strong>
            </div>
            <div className="print-field">
              <span>Phone</span>
              <strong>{request.phone || '—'}</strong>
            </div>
            <div className="print-field">
              <span>Address</span>
              <strong>{customerAddress || '—'}</strong>
            </div>
          </div>
        </section>

        {/* ------------------------------ Item ---------------------------- */}
        <section className="print-section">
          <h2>Item purchased</h2>
          <div className="print-grid">
            {renderField('Branch', request.form_variant)}
            {renderField('Item type', request.item_type?.replace(/_/g, ' '))}
            {renderField('Metal', request.metal_type)}
            {renderField('Carat', request.carat)}
            {renderField('Form', request.item_category)}
            {renderField('Type', request.jewellery_type)}
            {renderField('Gemstone', request.gemstone)}
            {renderField('Brand', request.brand)}
            {renderField('Model', request.model)}
            {renderField('Condition', request.condition)}
            {renderField('Box / papers', request.box_papers)}
            {renderField(
              'Weight',
              request.weight_grams != null ? `${request.weight_grams} g` : null,
            )}
          </div>
          {request.description && (
            <div className="print-field" style={{ marginTop: 12 }}>
              <span>Description</span>
              <strong>{request.description}</strong>
            </div>
          )}
        </section>

        {/* ------------------------------ Payment ------------------------- */}
        <section className="print-section">
          <h2>Payment</h2>
          <div className="print-grid">
            <div className="print-field">
              <span>Amount paid</span>
              <strong>
                {request.payment_amount != null
                  ? `£${Number(request.payment_amount).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : '—'}
              </strong>
            </div>
            <div className="print-field">
              <span>Method</span>
              <strong>
                {request.payment_method
                  ? PAYMENT_METHOD_LABELS[request.payment_method as PaymentMethod]
                  : '—'}
              </strong>
            </div>
            {request.payment_reference && (
              <div className="print-field">
                <span>Reference</span>
                <strong>{request.payment_reference}</strong>
              </div>
            )}
            {request.paid_at && (
              <div className="print-field">
                <span>Paid on</span>
                <strong>
                  {new Date(request.paid_at).toLocaleString('en-GB')}
                </strong>
              </div>
            )}
          </div>
        </section>

        {/* ---------------------------- Disclaimer ------------------------ */}
        <section className="print-section">
          <h2>Seller's disclaimer</h2>
          <div className="print-disclaimer">
            {settings.purchase_disclaimer_text?.trim() ||
              'Disclaimer text has not been set. Add one in Admin → Settings → Purchase Disclaimer before printing this document.'}
          </div>
        </section>

        {/* ---------------------------- Signatures ------------------------ */}
        <section className="print-signatures">
          <div className="print-sig-block">
            <span className="print-sig-line" />
            <div className="label">Seller signature &amp; date</div>
            <div className="name">{fullName || ' '}</div>
          </div>
          <div className="print-sig-block">
            <span className="print-sig-line" />
            <div className="label">Authorised by &amp; date</div>
            <div className="name">{settings.business_name}</div>
          </div>
        </section>

        <p className="print-foot">
          This document is a record of a private cash sale between the parties named above and is
          retained by {settings.business_name} in accordance with UK anti-money-laundering
          requirements.
        </p>
      </div>
    </div>
  );
}

function renderField(label: string, value: string | null | undefined) {
  if (!value) return null;
  return (
    <div className="print-field">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
