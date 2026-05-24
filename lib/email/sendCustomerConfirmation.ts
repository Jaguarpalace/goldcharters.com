import 'server-only';
import type { ValuationRequest } from '@/types/database';
import { getFromAddress, getResend, isEmailConfigured } from './client';
import { renderTemplate, type Variables } from './renderTemplate';
import { getEmailTemplateByKey } from '@/lib/queries/emailTemplates';
import { getSiteSettings } from '@/lib/queries/homepage';

const TEMPLATE_KEY = 'customer_request_confirmation';

const BRANCH_LABELS: Record<string, string> = {
  metal: 'gold / silver / platinum',
  jewellery: 'fine jewellery',
  watch: 'luxury watch',
  handbag: 'designer handbag',
};

/**
 * Send the branded confirmation email to the customer who just submitted a
 * valuation request. Uses the admin-editable CMS template.
 *
 * Fail-soft: every error is logged but never thrown — the customer's form
 * submission must always succeed regardless of email status.
 */
export async function sendCustomerConfirmation(
  request: ValuationRequest,
  photoCount = 0,
): Promise<{ ok: boolean; error?: string; skipped?: boolean }> {
  if (!isEmailConfigured()) {
    console.info('[email:customer-confirmation] skipped — email service not configured');
    return { ok: false, skipped: true };
  }
  if (!request.email) {
    return { ok: false, skipped: true };
  }

  const template = await getEmailTemplateByKey(TEMPLATE_KEY);
  if (!template || !template.enabled) {
    console.warn(`[email:customer-confirmation] template "${TEMPLATE_KEY}" missing or disabled`);
    return { ok: false, skipped: true };
  }

  const variables = await buildVariables(request, photoCount);
  const rendered = renderTemplate(template, variables);

  const resend = getResend();
  if (!resend) return { ok: false, skipped: true };

  const settings = await getSiteSettings();

  try {
    const { error } = await resend.emails.send({
      from: getFromAddress(),
      to: request.email,
      replyTo: settings.email,
      subject: rendered.subject,
      html: rendered.html,
    });
    if (error) {
      console.error('[email:customer-confirmation] send error', error);
      return { ok: false, error: error.message ?? 'unknown' };
    }
    return { ok: true };
  } catch (err) {
    console.error('[email:customer-confirmation] threw', err);
    return { ok: false, error: err instanceof Error ? err.message : 'unknown' };
  }
}

async function buildVariables(req: ValuationRequest, photoCount: number): Promise<Variables> {
  const settings = await getSiteSettings();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://chartersgold.co.uk';
  const firstName = htmlEscape(req.first_name);
  const fullName = htmlEscape(`${req.first_name} ${req.last_name}`.trim());
  const branchLabel = req.form_variant ? BRANCH_LABELS[req.form_variant] ?? 'piece' : 'piece';

  return {
    site_url: siteUrl,
    logo_url: `${siteUrl}/logo/charters_gold_true_transparent.png`,
    business_name: settings.business_name,
    business_phone: settings.phone,
    business_phone_digits: settings.phone.replace(/\D+/g, ''),
    business_email: settings.email,
    address: settings.address ?? '',
    first_name: firstName,
    full_name: fullName,
    branch_label: branchLabel,
    submitted_at: new Date(req.created_at).toLocaleString('en-GB', {
      dateStyle: 'long',
      timeStyle: 'short',
    }),
    customer_summary_table: buildCustomerSummaryTable(req, photoCount),
  };
}

function buildCustomerSummaryTable(req: ValuationRequest, photoCount: number): string {
  // Only the things the customer told us — no internal flags, no admin-only
  // metadata. Keeps the email focused on confirming what they sent.
  const rows: Array<[string, string]> = [];
  if (req.form_variant) {
    const label =
      BRANCH_LABELS[req.form_variant]?.replace(/\b\w/g, (c) => c.toUpperCase()) ?? '';
    if (label) rows.push(['Item type', label]);
  }
  if (req.metal_type) rows.push(['Metal', req.metal_type]);
  if (req.item_category) rows.push(['Category', req.item_category]);
  if (req.jewellery_type) rows.push(['Jewellery type', req.jewellery_type]);
  if (req.gemstone) rows.push(['Gemstone', req.gemstone]);
  if (req.brand) rows.push(['Brand', req.brand]);
  if (req.model) rows.push(['Model', req.model]);
  if (req.condition) rows.push(['Condition', req.condition]);
  if (req.box_papers) rows.push(['Box / papers', req.box_papers]);
  if (req.carat) rows.push(['Carat', req.carat]);
  if (req.weight_grams) rows.push(['Weight', `${req.weight_grams} g`]);
  rows.push([
    'Preferred contact',
    req.preferred_contact_method.charAt(0).toUpperCase() + req.preferred_contact_method.slice(1),
  ]);
  if (photoCount > 0) rows.push(['Photos shared', String(photoCount)]);

  if (rows.length === 0) {
    return `<p style="margin:0; color:#cfcfcf; font-size:14px;">We have your contact details on file.</p>`;
  }

  return `<table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="background:#050505; border:1px solid rgba(212,175,55,0.15); border-radius:8px;">
${rows
  .map(
    ([k, v], i) =>
      `<tr><td style="padding:10px 14px; color:#9a9a9a; font-size:11px; text-transform:uppercase; letter-spacing:0.1em; vertical-align:top; white-space:nowrap;${
        i < rows.length - 1 ? ' border-bottom:1px solid rgba(212,175,55,0.08);' : ''
      }">${htmlEscape(k)}</td><td style="padding:10px 14px; color:#f6f6f6; font-size:14px; vertical-align:top;${
        i < rows.length - 1 ? ' border-bottom:1px solid rgba(212,175,55,0.08);' : ''
      }">${htmlEscape(v)}</td></tr>`,
  )
  .join('')}
</table>`;
}

function htmlEscape(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
