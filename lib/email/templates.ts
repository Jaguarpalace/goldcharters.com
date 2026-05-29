import type { FormVariant, ValuationRequest } from '@/types/database';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://chartersgold.co.uk';
const ADMIN_URL = `${SITE_URL}/admin/valuation-requests`;

const VARIANT_LABEL: Record<FormVariant, string> = {
  metal: 'Gold / Silver / Platinum',
  jewellery: 'Fine Jewellery',
  watch: 'Luxury Watch',
  handbag: 'Designer Handbag',
};

/**
 * Build a short, scannable subject line so an admin can triage from the
 * inbox preview without opening the email.
 */
export function newRequestSubject(req: ValuationRequest): string {
  const name = `${req.first_name} ${req.last_name}`.trim();
  const what =
    req.brand ||
    req.metal_type ||
    req.jewellery_type ||
    req.item_category ||
    (req.form_variant ? VARIANT_LABEL[req.form_variant] : 'Valuation');
  return `New ${what} valuation request - ${name}`;
}

/**
 * Renders the new-request admin notification as a self-contained HTML email.
 * All styles inline because most email clients strip <style> blocks.
 */
export function newRequestHtml(req: ValuationRequest, photoCount = 0): string {
  const name = escape(`${req.first_name} ${req.last_name}`.trim());
  const variant = req.form_variant ? VARIANT_LABEL[req.form_variant] : '—';

  const rows: Array<[string, string]> = [
    ['Branch', variant],
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

  const detailsTable = rows
    .map(
      ([k, v]) => `
      <tr>
        <td style="padding:6px 12px 6px 0; color:#9a9a9a; font-size:12px; text-transform:uppercase; letter-spacing:0.08em; vertical-align:top; white-space:nowrap;">${escape(k)}</td>
        <td style="padding:6px 0; color:#f6f6f6; font-size:14px; vertical-align:top;">${escape(v)}</td>
      </tr>`,
    )
    .join('');

  const descriptionBlock = req.description
    ? `
      <h3 style="margin:24px 0 8px; font-family:Georgia, serif; font-size:14px; color:#d4af37; text-transform:uppercase; letter-spacing:0.12em;">Customer notes</h3>
      <p style="margin:0; color:#cfcfcf; line-height:1.6; font-size:14px; white-space:pre-wrap;">${escape(req.description)}</p>
    `
    : '';

  const submittedAt = new Date(req.created_at).toLocaleString('en-GB', {
    dateStyle: 'long',
    timeStyle: 'short',
  });

  return `<!DOCTYPE html>
<html lang="en-GB">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>New valuation request</title>
</head>
<body style="margin:0; padding:0; background:#050505; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#050505; padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px; background:#0b0b0b; border:1px solid rgba(212,175,55,0.25); border-radius:12px; overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="padding:24px; border-bottom:1px solid rgba(212,175,55,0.15); text-align:center;">
              <p style="margin:0; color:#d4af37; font-size:10px; letter-spacing:0.22em; text-transform:uppercase; font-weight:600;">Charters Gold · Admin Alert</p>
              <h1 style="margin:10px 0 0; color:#ffffff; font-family:Georgia, serif; font-size:22px; line-height:1.2;">New valuation request</h1>
              <p style="margin:6px 0 0; color:#9a9a9a; font-size:12px;">${escape(submittedAt)}</p>
            </td>
          </tr>

          <!-- Customer -->
          <tr>
            <td style="padding:20px 24px 0;">
              <h2 style="margin:0; color:#ffffff; font-family:Georgia, serif; font-size:18px;">${name}</h2>
              <p style="margin:6px 0 0; font-size:14px;">
                <a href="mailto:${escape(req.email)}" style="color:#d4af37; text-decoration:none;">${escape(req.email)}</a>
                <span style="color:#5a5a5a;"> · </span>
                <a href="tel:${escape(req.phone.replace(/\s+/g, ''))}" style="color:#d4af37; text-decoration:none;">${escape(req.phone)}</a>
              </p>
            </td>
          </tr>

          <!-- Details table -->
          <tr>
            <td style="padding:14px 24px 0;">
              <table role="presentation" cellspacing="0" cellpadding="0" width="100%">
                ${detailsTable}
              </table>
              ${descriptionBlock}
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding:24px; text-align:center;">
              <a href="${ADMIN_URL}" style="display:inline-block; padding:12px 22px; background:linear-gradient(135deg,#A67C00,#D4AF37 35%,#FFD700 55%,#D4AF37 75%,#B8860B); color:#050505; font-weight:600; text-decoration:none; border-radius:999px; font-size:13px; letter-spacing:0.04em;">View full request in admin →</a>
              <p style="margin:14px 0 0; color:#7a7a7a; font-size:11px;">Or paste: ${ADMIN_URL}</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:18px 24px; background:#050505; border-top:1px solid rgba(212,175,55,0.15); text-align:center;">
              <p style="margin:0; color:#5a5a5a; font-size:11px; letter-spacing:0.06em;">
                You're receiving this because your email is set as <code style="color:#9a9a9a;">ADMIN_NOTIFICATION_EMAIL</code> in Vercel.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Minimal HTML escape — protects against any user-supplied content. */
function escape(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
