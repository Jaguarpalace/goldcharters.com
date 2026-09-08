import { notFound, redirect } from 'next/navigation';
import { randomUUID } from 'node:crypto';
import { getServerSupabase } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { getMfaState, mfaSatisfied } from '@/lib/auth/mfa';
import { getSiteSettings } from '@/lib/queries/homepage';
import { PrintShell } from '../../[id]/print/PrintShell';

export const dynamic = 'force-dynamic';

/** Empty item lines on the paper document. */
const ITEM_ROWS = 8;

/**
 * Blank Purchase Confirmation for pen-and-paper use at an off-site
 * valuation. Same layout as the printed document, every field left as a
 * line to write on, and a fresh reference already printed on it. Entering
 * that reference on the walk-in form afterwards saves the purchase under
 * the same reference, so the paper copy and the record always match.
 *
 * ?ref=1B345D09 reprints a document with a given reference.
 */
export default async function BlankPurchasePrintPage({
  searchParams,
}: {
  searchParams?: { ref?: string };
}) {
  if (!isSupabaseConfigured()) notFound();
  const supabase = getServerSupabase();
  if (!supabase) notFound();

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/admin/login?next=/admin/valuation-requests/blank/print');
  const mfa = await getMfaState(supabase);
  if (!mfa.indeterminate && !mfa.enrolled) redirect('/admin/setup-2fa');
  if (!mfaSatisfied(mfa)) redirect('/admin/login?mfa=1&next=/admin/valuation-requests/blank/print');

  const settings = await getSiteSettings();

  // The reference is the first 8 characters of a UUID, exactly as the saved
  // record's would be - the walk-in form rebuilds the id from it.
  const given = (searchParams?.ref ?? '').trim().toUpperCase();
  const reference = /^[0-9A-F]{8}$/.test(given)
    ? given
    : randomUUID().slice(0, 8).toUpperCase();

  return (
    <PrintShell>
      <style dangerouslySetInnerHTML={{ __html: BLANK_CSS }} />
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

        <h1 className="print-doc-title">Purchase Confirmation &amp; Seller's Disclaimer</h1>
        <p className="print-doc-sub">
          Reference: <strong>{reference}</strong> · Date{' '}
          <span className="blank-inline" style={{ width: 120 }} />
        </p>

        {/* ----------------------------- Seller --------------------------- */}
        <section className="print-section">
          <h2>Seller</h2>
          <div className="print-grid blank-grid">
            <BlankField label="Full name" />
            <BlankField label="Email" />
            <BlankField label="Phone" />
            <BlankField label="Date of birth" />
            <BlankField label="Address" wide tall />
            <BlankField label="ID seen (type and number)" wide />
          </div>
        </section>

        {/* ------------------------------ Items --------------------------- */}
        <section className="print-section">
          <h2>Items purchased</h2>
          <table className="print-items blank-items">
            <thead>
              <tr>
                <th style={{ width: '4%' }}>#</th>
                <th>Description</th>
                <th style={{ width: '16%' }}>Metal / carat</th>
                <th style={{ width: '11%' }} className="num">Weight (g)</th>
                <th style={{ width: '21%' }}>Hallmark / serial</th>
                <th style={{ width: '13%' }} className="num">Price</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: ITEM_ROWS }, (_, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td />
                  <td />
                  <td />
                  <td />
                  <td className="num">£</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={5}>Total</td>
                <td className="num">£</td>
              </tr>
            </tfoot>
          </table>
        </section>

        {/* ------------------------------ Payment ------------------------- */}
        <section className="print-section">
          <h2>Payment</h2>
          <div className="print-grid blank-grid">
            <BlankField label="Amount paid" prefix="£" />
            <div className="print-field">
              <span>Method</span>
              <strong className="blank-choices">
                <span>☐ Cash</span>
                <span>☐ Bank transfer</span>
                <span>☐ Cheque</span>
                <span>☐ Card</span>
                <span>☐ Other</span>
              </strong>
            </div>
            <div className="print-field">
              <span>Reference</span>
              <strong>{reference}</strong>
            </div>
            <BlankField label="Paid on (date / time)" />
            <BlankField label="Seller sort code" />
            <BlankField label="Seller account number" />
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
            <div className="name blank-line" />
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
          <br />
          <span className="blank-admin-note">
            Office use: enter this purchase in Admin → Walk-in Purchase using paper reference{' '}
            <strong>{reference}</strong>.
          </span>
        </p>
      </div>
    </PrintShell>
  );
}

function BlankField({
  label,
  wide,
  tall,
  prefix,
}: {
  label: string;
  wide?: boolean;
  tall?: boolean;
  prefix?: string;
}) {
  return (
    <div className={'print-field' + (wide ? ' blank-wide' : '')}>
      <span>{label}</span>
      <strong className={'blank-line' + (tall ? ' blank-tall' : '')}>{prefix ?? ''}</strong>
    </div>
  );
}

/* Writing lines for the paper version. Colours follow the two themes. */
const BLANK_CSS = `
  .blank-grid { row-gap: 10px; }
  .blank-wide { grid-column: 1 / -1; }
  .blank-line {
    display: block;
    min-height: 18px;
    border-bottom-width: 1px;
    border-bottom-style: solid;
    margin-top: 3px;
  }
  .blank-tall { min-height: 36px; }
  .blank-inline {
    display: inline-block;
    vertical-align: bottom;
    border-bottom-width: 1px;
    border-bottom-style: solid;
    min-height: 12px;
  }
  .blank-items td { height: 24px; }
  .blank-choices { display: flex; flex-wrap: wrap; gap: 4px 12px; font-weight: 500; }
  .blank-admin-note { display: block; margin-top: 4px; }
  .theme-classic .blank-line,
  .theme-classic .blank-inline { border-bottom-color: #999; }
  .theme-blackgold .blank-line,
  .theme-blackgold .blank-inline { border-bottom-color: rgba(212,175,55,0.5); }
`;
