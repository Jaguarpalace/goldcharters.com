import 'server-only';
import type { ValuationRequest } from '@/types/database';
import { getAdminRecipients, getFromAddress, getResend, isEmailConfigured } from './client';
import { renderTemplate, type Variables } from './renderTemplate';
import { getEmailTemplateByKey } from '@/lib/queries/emailTemplates';
import { getSiteSettings } from '@/lib/queries/homepage';

const TEMPLATE_KEY = 'new_request_admin';

const BRANCH_LABELS: Record<string, string> = {
  metal: 'Gold / Silver / Platinum',
  jewellery: 'Fine Jewellery',
  watch: 'Luxury Watch',
  handbag: 'Designer Handbag',
};

/**
 * Send the new-request notification using the admin-editable CMS template.
 *
 * Fail-soft: every error is logged but never thrown — the customer's form
 * submission must always succeed regardless of email status.
 */
export async function sendNewRequestNotification(
  request: ValuationRequest,
  photoCount = 0,
): Promise<{ ok: boolean; error?: string; skipped?: boolean }> {
  if (!isEmailConfigured()) {
    console.info('[email:new-request] skipped — RESEND_API_KEY not set');
    return { ok: false, skipped: true };
  }
  const recipients = getAdminRecipients();
  if (recipients.length === 0) {
    console.warn('[email:new-request] skipped — ADMIN_NOTIFICATION_EMAIL empty');
    return { ok: false, skipped: true };
  }

  const template = await getEmailTemplateByKey(TEMPLATE_KEY);
  if (!template || !template.enabled) {
    console.warn(`[email:new-request] template "${TEMPLATE_KEY}" missing or disabled`);
    return { ok: false, skipped: true };
  }

  const variables = await buildVariables(request, photoCount);
  const rendered = renderTemplate(template, variables);

  const resend = getResend();
  if (!resend) return { ok: false, skipped: true };

  try {
    const { error } = await resend.emails.send({
      from: getFromAddress(),
      to: recipients,
      replyTo: request.email,
      subject: rendered.subject,
      html: rendered.html,
    });
    if (error) {
      console.error('[email:new-request] resend error', error);
      return { ok: false, error: error.message ?? 'unknown' };
    }
    return { ok: true };
  } catch (err) {
    console.error('[email:new-request] threw', err);
    return { ok: false, error: err instanceof Error ? err.message : 'unknown' };
  }
}

async function buildVariables(req: ValuationRequest, photoCount: number): Promise<Variables> {
  const settings = await getSiteSettings();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://chartersgold.co.uk';

  return {
    site_url: siteUrl,
    logo_url: `${siteUrl}/logo/charters-gold.webp`,
    business_name: settings.business_name,
    address: settings.address ?? '',
    admin_url: `${siteUrl}/admin/valuation-requests`,
    full_name: htmlEscape(`${req.first_name} ${req.last_name}`.trim()),
    first_name: htmlEscape(req.first_name),
    last_name: htmlEscape(req.last_name),
    email: htmlEscape(req.email),
    phone: htmlEscape(req.phone),
    phone_digits: req.phone.replace(/\s+/g, ''),
    branch_label: req.form_variant ? BRANCH_LABELS[req.form_variant] ?? '—' : '—',
    submitted_at: new Date(req.created_at).toLocaleString('en-GB', {
      dateStyle: 'long',
      timeStyle: 'short',
    }),
    details_table: buildDetailsTable(req, photoCount),
    description_block: buildDescriptionBlock(req),
  };
}

function buildDetailsTable(req: ValuationRequest, photoCount: number): string {
  const rows: Array<[string, string]> = [
    ['Branch', req.form_variant ? BRANCH_LABELS[req.form_variant] ?? '—' : '—'],
    ...(req.metal_type ? [['Metal', req.metal_type] as [string, string]] : []),
    ...(req.item_category ? [['Form / Category', req.item_category] as [string, string]] : []),
    ...(req.jewellery_type ? [['Jewellery type', req.jewellery_type] as [string, string]] : []),
    ...(req.gemstone ? [['Gemstone', req.gemstone] as [string, string]] : []),
    ...(req.brand ? [['Brand', req.brand] as [string, string]] : []),
    ...(req.model ? [['Model', req.model] as [string, string]] : []),
    ...(req.condition ? [['Condition', req.condition] as [string, string]] : []),
    ...(req.box_papers ? [['Box / papers', req.box_papers] as [string, string]] : []),
    ...(req.carat ? [['Carat', req.carat] as [string, string]] : []),
    ...(req.weight_grams ? [['Weight (g)', String(req.weight_grams)] as [string, string]] : []),
    ...(req.estimated_value
      ? [['Customer estimated value (£)', String(req.estimated_value)] as [string, string]]
      : []),
    ['Preferred contact', req.preferred_contact_method],
    ['Photos uploaded', String(photoCount)],
  ];
  return `<table role="presentation" cellspacing="0" cellpadding="0" width="100%">
${rows
  .map(
    ([k, v]) =>
      `<tr><td style="padding:6px 12px 6px 0; color:#9a9a9a; font-size:12px; text-transform:uppercase; letter-spacing:0.08em; vertical-align:top; white-space:nowrap;">${htmlEscape(
        k,
      )}</td><td style="padding:6px 0; color:#f6f6f6; font-size:14px; vertical-align:top;">${htmlEscape(
        v,
      )}</td></tr>`,
  )
  .join('')}
</table>`;
}

function buildDescriptionBlock(req: ValuationRequest): string {
  if (!req.description) return '';
  return `<h3 style="margin:24px 0 8px; font-family:Georgia, serif; font-size:14px; color:#d4af37; text-transform:uppercase; letter-spacing:0.12em;">Customer notes</h3>
<p style="margin:0; color:#cfcfcf; line-height:1.6; font-size:14px; white-space:pre-wrap;">${htmlEscape(
    req.description,
  )}</p>`;
}

function htmlEscape(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
