import 'server-only';
import type { ValuationRequest } from '@/types/database';
import { getFromAddress, getResend, isEmailConfigured } from './client';
import { renderTemplate, type Variables } from './renderTemplate';
import { getEmailTemplateByKey } from '@/lib/queries/emailTemplates';
import { getSiteSettings } from '@/lib/queries/homepage';

const BRANCH_LABELS: Record<string, string> = {
  metal: 'gold / silver / platinum',
  jewellery: 'fine jewellery',
  watch: 'luxury watch',
  handbag: 'designer handbag',
};

/**
 * Customer-facing emails wired into the valuation status pipeline.
 * Today: 'offer_sent' triggers the polished "valuation ready" email, and
 * 'rejected' triggers the polite refusal. Both templates are CMS-editable
 * — see migration 024.
 *
 * The map is the single source of truth for which statuses send. Adding
 * a new template = adding a new entry here AND a new email_templates row.
 */
const STATUS_TEMPLATE_KEY: Partial<Record<string, string>> = {
  offer_sent: 'customer_offer_sent',
  rejected: 'customer_request_rejected',
};

/**
 * Fire the customer-facing email associated with a status transition.
 * Fail-soft: every error is logged but the status change itself always
 * succeeds even if email delivery hiccups.
 */
export async function sendStatusEmail(
  request: ValuationRequest,
  newStatus: string,
): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const templateKey = STATUS_TEMPLATE_KEY[newStatus];
  if (!templateKey) return { ok: true, skipped: true };

  if (!isEmailConfigured()) {
    console.info(`[email:${templateKey}] skipped — email service not configured`);
    return { ok: false, skipped: true };
  }
  if (!request.email) {
    return { ok: false, skipped: true };
  }

  const template = await getEmailTemplateByKey(templateKey);
  if (!template || !template.enabled) {
    console.warn(`[email:${templateKey}] template missing or disabled`);
    return { ok: false, skipped: true };
  }

  const settings = await getSiteSettings();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://chartersgold.co.uk';
  const branchLabel = request.form_variant
    ? BRANCH_LABELS[request.form_variant] ?? 'piece'
    : 'piece';

  const variables: Variables = {
    site_url: siteUrl,
    logo_url: `${siteUrl}/logo/charters_gold_true_transparent.png`,
    business_name: settings.business_name,
    business_phone: settings.phone,
    business_phone_digits: settings.phone.replace(/\D+/g, ''),
    business_email: settings.email,
    address: settings.address ?? '',
    first_name: htmlEscape(request.first_name),
    full_name: htmlEscape(`${request.first_name} ${request.last_name}`.trim()),
    branch_label: branchLabel,
  };

  const rendered = renderTemplate(template, variables);
  const resend = getResend();
  if (!resend) return { ok: false, skipped: true };

  try {
    const { error } = await resend.emails.send({
      from: getFromAddress(),
      to: request.email,
      replyTo: settings.email,
      subject: rendered.subject,
      html: rendered.html,
    });
    if (error) {
      console.error(`[email:${templateKey}] send error`, error);
      return { ok: false, error: error.message ?? 'unknown' };
    }
    return { ok: true };
  } catch (err) {
    console.error(`[email:${templateKey}] threw`, err);
    return { ok: false, error: err instanceof Error ? err.message : 'unknown' };
  }
}

function htmlEscape(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
