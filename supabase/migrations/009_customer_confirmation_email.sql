-- Adds the customer-facing confirmation email template and tidies up the
-- wording on the existing internal-alert template.
--
-- Safe to re-run — the insert is guarded by ON CONFLICT (key) DO NOTHING and
-- the update only touches the name/description metadata.
-- Run in Supabase → SQL Editor.

-- Refresh the internal alert template's catalogue copy. Leaves the editable
-- subject/html_body untouched so any in-admin edits are preserved.
update public.email_templates
set
  name = 'New valuation request — internal alert',
  description = 'Internal notification delivered to the team the moment a customer submits a valuation request.'
where key = 'new_request_admin';

insert into public.email_templates (key, name, description, subject, html_body, available_variables)
values (
  'customer_request_confirmation',
  'Valuation request — customer confirmation',
  'Branded confirmation email sent to the customer the moment they submit a valuation request.',
  'We’ve received your valuation request — {{business_name}}',
  $TEMPLATE$<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Your valuation request — {{business_name}}</title>
</head>
<body style="margin:0; padding:0; background:#050505; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#050505; padding:24px 12px;">
  <tr>
    <td align="center">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px; background:#0b0b0b; border:1px solid rgba(212,175,55,0.25); border-radius:12px; overflow:hidden;">
        <tr>
          <td style="padding:36px 24px 26px; border-bottom:1px solid rgba(212,175,55,0.15); text-align:center; background:#000000;">
            <img src="{{logo_url}}" alt="{{business_name}}" width="120" height="120" style="display:block; margin:0 auto; border:0;" />
            <p style="margin:14px 0 0; color:#d4af37; font-size:10px; letter-spacing:0.22em; text-transform:uppercase; font-weight:600;">{{business_name}}</p>
            <h1 style="margin:14px 0 0; color:#ffffff; font-family:Georgia, serif; font-size:26px; line-height:1.2;">Thank you, {{first_name}}.</h1>
            <p style="margin:10px 0 0; color:#cfcfcf; font-size:14px;">Your valuation request is safely with us.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 28px 0; color:#cfcfcf; font-size:14px; line-height:1.7;">
            <p style="margin:0;">A specialist from our team will personally review your {{branch_label}} submission and respond within one business day using your preferred contact method.</p>
            <p style="margin:18px 0 0; color:#9a9a9a; font-size:12px; text-transform:uppercase; letter-spacing:0.18em;">What happens next</p>
          </td>
        </tr>
        <tr>
          <td style="padding:14px 28px 0;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
              <tr>
                <td style="width:40px; padding:8px 14px 8px 0; vertical-align:top;">
                  <span style="display:inline-block; width:28px; height:28px; line-height:28px; border-radius:50%; background:linear-gradient(135deg,#A67C00,#D4AF37); color:#050505; text-align:center; font-weight:700; font-size:13px;">1</span>
                </td>
                <td style="padding:8px 0; color:#cfcfcf; font-size:14px; line-height:1.6;">
                  <strong style="color:#ffffff;">Review.</strong> Our valuation team examines your photographs and supporting details.
                </td>
              </tr>
              <tr>
                <td style="padding:8px 14px 8px 0; vertical-align:top;">
                  <span style="display:inline-block; width:28px; height:28px; line-height:28px; border-radius:50%; background:linear-gradient(135deg,#A67C00,#D4AF37); color:#050505; text-align:center; font-weight:700; font-size:13px;">2</span>
                </td>
                <td style="padding:8px 0; color:#cfcfcf; font-size:14px; line-height:1.6;">
                  <strong style="color:#ffffff;">Indicative offer.</strong> We come back to you with a guide valuation and any clarifying questions.
                </td>
              </tr>
              <tr>
                <td style="padding:8px 14px 8px 0; vertical-align:top;">
                  <span style="display:inline-block; width:28px; height:28px; line-height:28px; border-radius:50%; background:linear-gradient(135deg,#A67C00,#D4AF37); color:#050505; text-align:center; font-weight:700; font-size:13px;">3</span>
                </td>
                <td style="padding:8px 0; color:#cfcfcf; font-size:14px; line-height:1.6;">
                  <strong style="color:#ffffff;">Final offer &amp; payment.</strong> Once you’re happy, we confirm in person and arrange same-day payment.
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 28px 0;">
            <p style="margin:0 0 10px; color:#9a9a9a; font-size:10px; text-transform:uppercase; letter-spacing:0.18em;">Your submission</p>
            {{customer_summary_table}}
          </td>
        </tr>
        <tr>
          <td style="padding:28px 28px 4px; text-align:center;">
            <p style="margin:0; color:#9a9a9a; font-size:12px;">Need to reach us sooner?</p>
            <p style="margin:10px 0 0; font-size:14px;">
              <a href="tel:{{business_phone_digits}}" style="color:#d4af37; text-decoration:none; font-weight:600;">{{business_phone}}</a>
              <span style="color:#5a5a5a;"> · </span>
              <a href="mailto:{{business_email}}" style="color:#d4af37; text-decoration:none; font-weight:600;">{{business_email}}</a>
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 28px; background:#050505; border-top:1px solid rgba(212,175,55,0.15); text-align:center;">
            <p style="margin:0; color:#7a7a7a; font-size:11px; line-height:1.7;">
              {{business_name}}<br />
              {{address}}
            </p>
            <p style="margin:14px 0 0; color:#5a5a5a; font-size:10px; line-height:1.6;">
              You’re receiving this confirmation because you submitted a valuation request at <a href="{{site_url}}" style="color:#9a9a9a; text-decoration:underline;">{{site_url}}</a> on {{submitted_at}}.
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>$TEMPLATE$,
  jsonb_build_array(
    jsonb_build_object('key', 'first_name', 'label', 'Customer first name', 'example', 'Sarah'),
    jsonb_build_object('key', 'full_name', 'label', 'Customer full name', 'example', 'Sarah Smith'),
    jsonb_build_object('key', 'branch_label', 'label', 'What they’re selling', 'example', 'Luxury Watch'),
    jsonb_build_object('key', 'submitted_at', 'label', 'Submission timestamp', 'example', '24 May 2026, 14:32'),
    jsonb_build_object('key', 'customer_summary_table', 'label', 'Auto-built summary of their submission', 'example', '(rendered HTML)'),
    jsonb_build_object('key', 'business_name', 'label', 'Business name', 'example', 'Charters Gold'),
    jsonb_build_object('key', 'business_phone', 'label', 'Business phone (formatted)', 'example', '0800 047 2348'),
    jsonb_build_object('key', 'business_phone_digits', 'label', 'Business phone (digits only)', 'example', '08000472348'),
    jsonb_build_object('key', 'business_email', 'label', 'Business email', 'example', 'office@chartersgold.co.uk'),
    jsonb_build_object('key', 'address', 'label', 'Business address', 'example', 'Avalon House, Egham…'),
    jsonb_build_object('key', 'logo_url', 'label', 'Brand logo URL', 'example', 'https://chartersgold.co.uk/logo/charters-gold.png'),
    jsonb_build_object('key', 'site_url', 'label', 'Public site URL', 'example', 'https://chartersgold.co.uk')
  )
)
on conflict (key) do nothing;
