import type { EmailTemplate } from '@/types/database';
import { getSiteSettings } from '@/lib/queries/homepage';

export type Variables = Record<string, string>;

/**
 * Render a template — substitute every `{{key}}` with the matching variable.
 *
 * Variables are pre-rendered HTML where appropriate (e.g. `details_table`).
 * Anything user-supplied must already be HTML-escaped by the caller.
 *
 * Unknown variables render as `{{unknown_key}}` so the admin sees them in
 * the live preview and can fix typos — better than silent omission.
 */
export function renderTemplate(
  template: Pick<EmailTemplate, 'subject' | 'html_body'>,
  variables: Variables,
): { subject: string; html: string } {
  return {
    subject: interpolate(template.subject, variables),
    html: interpolate(template.html_body, variables),
  };
}

function interpolate(input: string, variables: Variables): string {
  return input.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(variables, key) ? variables[key] : match,
  );
}

/**
 * Sample data used when:
 *  - Admin previews a template
 *  - Admin clicks "Send test email"
 *
 * Pulls real values from site_settings where it makes sense (business name,
 * address, logo URL) so the preview reflects the live brand.
 */
export async function sampleVariablesFor(key: string): Promise<Variables> {
  const settings = await getSiteSettings();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://chartersgold.co.uk';

  const submittedAt = new Date().toLocaleString('en-GB', {
    dateStyle: 'long',
    timeStyle: 'short',
  });

  const common: Variables = {
    site_url: siteUrl,
    logo_url: `${siteUrl}/logo/charters-gold.webp`,
    business_name: settings.business_name,
    address: settings.address ?? '',
    business_phone: settings.phone,
    business_phone_digits: settings.phone.replace(/\D+/g, ''),
    business_email: settings.email,
    admin_url: `${siteUrl}/admin/valuation-requests`,
    submitted_at: submittedAt,
  };

  switch (key) {
    case 'new_request_admin':
      return {
        ...common,
        full_name: 'Sarah Smith (sample)',
        first_name: 'Sarah',
        last_name: 'Smith',
        email: 'sarah@example.com',
        phone: '07700 900123',
        phone_digits: '07700900123',
        branch_label: 'Luxury Watch',
        details_table: sampleDetailsTable(),
        description_block: sampleDescriptionBlock(),
      };
    case 'customer_request_confirmation':
      return {
        ...common,
        first_name: 'Sarah',
        full_name: 'Sarah Smith',
        branch_label: 'Luxury Watch',
        customer_summary_table: sampleCustomerSummaryTable(),
      };
    default:
      return common;
  }
}

function sampleDetailsTable(): string {
  const rows: Array<[string, string]> = [
    ['Branch', 'Luxury Watch'],
    ['Brand', 'Rolex'],
    ['Model', 'Submariner Date 116610LN'],
    ['Box / papers', 'All'],
    ['Preferred contact', 'phone'],
    ['Photos uploaded', '4'],
  ];
  return `<table role="presentation" cellspacing="0" cellpadding="0" width="100%">
${rows
  .map(
    ([k, v]) =>
      `<tr><td style="padding:6px 12px 6px 0; color:#9a9a9a; font-size:12px; text-transform:uppercase; letter-spacing:0.08em; vertical-align:top; white-space:nowrap;">${k}</td><td style="padding:6px 0; color:#f6f6f6; font-size:14px; vertical-align:top;">${v}</td></tr>`,
  )
  .join('')}
</table>`;
}

function sampleDescriptionBlock(): string {
  return `<h3 style="margin:24px 0 8px; font-family:Georgia, serif; font-size:14px; color:#d4af37; text-transform:uppercase; letter-spacing:0.12em;">Customer notes</h3>
<p style="margin:0; color:#cfcfcf; line-height:1.6; font-size:14px;">Inherited from my late father — comes with the original receipt from 2018 and full service history at Rolex. Looking for a fair offer.</p>`;
}

function sampleCustomerSummaryTable(): string {
  const rows: Array<[string, string]> = [
    ['Item type', 'Luxury Watch'],
    ['Brand', 'Rolex'],
    ['Model', 'Submariner Date 116610LN'],
    ['Box / papers', 'All'],
    ['Preferred contact', 'Phone'],
    ['Photos shared', '4'],
  ];
  return `<table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="background:#050505; border:1px solid rgba(212,175,55,0.15); border-radius:8px;">
${rows
  .map(
    ([k, v]) =>
      `<tr><td style="padding:10px 14px; color:#9a9a9a; font-size:11px; text-transform:uppercase; letter-spacing:0.1em; vertical-align:top; white-space:nowrap; border-bottom:1px solid rgba(212,175,55,0.08);">${k}</td><td style="padding:10px 14px; color:#f6f6f6; font-size:14px; vertical-align:top; border-bottom:1px solid rgba(212,175,55,0.08);">${v}</td></tr>`,
  )
  .join('')}
</table>`;
}
