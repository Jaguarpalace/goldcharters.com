-- Two new CMS-editable customer emails wired to the valuation status
-- pipeline.
--
--   * customer_offer_sent  — fires when status moves to 'offer_sent'.
--     The polished "your valuation is ready" email the customer sees.
--   * customer_request_rejected — fires when status moves to 'rejected'.
--     A polite refusal so the customer has a written record.
--
-- Both templates live alongside the existing customer_request_confirmation
-- and new_request_admin templates and are edited from /admin/email-templates
-- in exactly the same way.
--
-- Safe to re-run.

insert into public.email_templates
  (key, name, description, subject, html_body, available_variables)
values
  (
    'customer_offer_sent',
    'Valuation ready — sent to customer',
    'Fires when an admin moves a valuation request to ''Offer sent''. The customer receives this branded email confirming a written valuation is on its way.',
    'Your valuation from {{business_name}}',
    $TEMPLATE$<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Your valuation</title>
</head>
<body style="margin:0; padding:0; background:#050505; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#050505; padding:24px 12px;">
  <tr><td align="center">
    <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px; background:#0b0b0b; border:1px solid rgba(212,175,55,0.25); border-radius:12px; overflow:hidden;">
      <tr><td style="padding:32px 24px 20px; border-bottom:1px solid rgba(212,175,55,0.15); text-align:center; background:#000000;">
        <img src="{{logo_url}}" alt="{{business_name}}" width="96" height="96" style="display:block; margin:0 auto; border:0;" />
        <p style="margin:14px 0 0; color:#d4af37; font-size:10px; letter-spacing:0.22em; text-transform:uppercase; font-weight:600;">Private Valuation</p>
        <h1 style="margin:10px 0 0; color:#ffffff; font-family:Georgia, serif; font-size:24px; line-height:1.2;">Your valuation is ready</h1>
      </td></tr>

      <tr><td style="padding:24px;">
        <p style="margin:0 0 14px; color:#f6f6f6; font-size:15px; line-height:1.6;">Dear {{first_name}},</p>
        <p style="margin:0 0 14px; color:#cfcfcf; font-size:14px; line-height:1.7;">Thank you for sending us your {{branch_label}}. Our specialists have completed their assessment and a written valuation is on its way to you separately, with the figure we are pleased to offer.</p>
        <p style="margin:0 0 14px; color:#cfcfcf; font-size:14px; line-height:1.7;">Offers are valid for 24 hours from the moment we send them. If anything in the valuation is unclear, or you would like us to talk you through how we arrived at the figure, please reply to this email or call us on <a href="tel:{{business_phone_digits}}" style="color:#d4af37; text-decoration:none;">{{business_phone}}</a>.</p>
        <p style="margin:0; color:#cfcfcf; font-size:14px; line-height:1.7;">We look forward to hearing from you.</p>
      </td></tr>

      <tr><td style="padding:0 24px 24px;">
        <p style="margin:0; color:#9a9a9a; font-size:12px; line-height:1.6;">
          <strong style="color:#f6f6f6;">{{business_name}}</strong><br />
          {{address}}<br />
          <a href="tel:{{business_phone_digits}}" style="color:#d4af37; text-decoration:none;">{{business_phone}}</a> · <a href="mailto:{{business_email}}" style="color:#d4af37; text-decoration:none;">{{business_email}}</a>
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>$TEMPLATE$,
    jsonb_build_array(
      jsonb_build_object('key', 'first_name',          'label', 'Customer first name', 'example', 'Sarah'),
      jsonb_build_object('key', 'full_name',           'label', 'Customer full name',  'example', 'Sarah Smith'),
      jsonb_build_object('key', 'branch_label',        'label', 'What they sent',       'example', 'fine jewellery'),
      jsonb_build_object('key', 'business_name',       'label', 'Business name',        'example', 'Charters Gold'),
      jsonb_build_object('key', 'business_phone',      'label', 'Business phone',       'example', '0800 047 2348'),
      jsonb_build_object('key', 'business_phone_digits','label', 'Business phone digits','example', '08000472348'),
      jsonb_build_object('key', 'business_email',      'label', 'Business email',       'example', 'office@chartersgold.co.uk'),
      jsonb_build_object('key', 'address',             'label', 'Business address',     'example', 'Avalon House, Egham, Surrey'),
      jsonb_build_object('key', 'logo_url',            'label', 'Brand logo URL',       'example', 'https://chartersgold.co.uk/logo/charters_gold_true_transparent.png')
    )
  ),
  (
    'customer_request_rejected',
    'Request declined — sent to customer',
    'Fires when an admin moves a valuation request to ''Rejected''. A polite written refusal so the customer has a clear record.',
    'About your valuation request — {{business_name}}',
    $TEMPLATE$<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>About your valuation request</title>
</head>
<body style="margin:0; padding:0; background:#050505; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#050505; padding:24px 12px;">
  <tr><td align="center">
    <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px; background:#0b0b0b; border:1px solid rgba(212,175,55,0.25); border-radius:12px; overflow:hidden;">
      <tr><td style="padding:32px 24px 20px; border-bottom:1px solid rgba(212,175,55,0.15); text-align:center; background:#000000;">
        <img src="{{logo_url}}" alt="{{business_name}}" width="96" height="96" style="display:block; margin:0 auto; border:0;" />
        <p style="margin:14px 0 0; color:#d4af37; font-size:10px; letter-spacing:0.22em; text-transform:uppercase; font-weight:600;">Private Valuation</p>
        <h1 style="margin:10px 0 0; color:#ffffff; font-family:Georgia, serif; font-size:24px; line-height:1.2;">Thank you for considering us</h1>
      </td></tr>

      <tr><td style="padding:24px;">
        <p style="margin:0 0 14px; color:#f6f6f6; font-size:15px; line-height:1.6;">Dear {{first_name}},</p>
        <p style="margin:0 0 14px; color:#cfcfcf; font-size:14px; line-height:1.7;">Thank you for sending us your {{branch_label}}. After careful review, we are unable to make an offer on this occasion — pieces of this nature fall outside what we currently buy, or do not meet our internal grading criteria.</p>
        <p style="margin:0 0 14px; color:#cfcfcf; font-size:14px; line-height:1.7;">We appreciate the time you took to share the details. If your piece changes (for example with documentation or a service history), or you have other items you would like assessed, please feel welcome to submit a fresh request.</p>
        <p style="margin:0; color:#cfcfcf; font-size:14px; line-height:1.7;">With kind regards,<br />The {{business_name}} team</p>
      </td></tr>

      <tr><td style="padding:0 24px 24px;">
        <p style="margin:0; color:#9a9a9a; font-size:12px; line-height:1.6;">
          <strong style="color:#f6f6f6;">{{business_name}}</strong><br />
          {{address}}<br />
          <a href="tel:{{business_phone_digits}}" style="color:#d4af37; text-decoration:none;">{{business_phone}}</a> · <a href="mailto:{{business_email}}" style="color:#d4af37; text-decoration:none;">{{business_email}}</a>
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>$TEMPLATE$,
    jsonb_build_array(
      jsonb_build_object('key', 'first_name',          'label', 'Customer first name', 'example', 'Sarah'),
      jsonb_build_object('key', 'full_name',           'label', 'Customer full name',  'example', 'Sarah Smith'),
      jsonb_build_object('key', 'branch_label',        'label', 'What they sent',       'example', 'fine jewellery'),
      jsonb_build_object('key', 'business_name',       'label', 'Business name',        'example', 'Charters Gold'),
      jsonb_build_object('key', 'business_phone',      'label', 'Business phone',       'example', '0800 047 2348'),
      jsonb_build_object('key', 'business_phone_digits','label', 'Business phone digits','example', '08000472348'),
      jsonb_build_object('key', 'business_email',      'label', 'Business email',       'example', 'office@chartersgold.co.uk'),
      jsonb_build_object('key', 'address',             'label', 'Business address',     'example', 'Avalon House, Egham, Surrey'),
      jsonb_build_object('key', 'logo_url',            'label', 'Brand logo URL',       'example', 'https://chartersgold.co.uk/logo/charters_gold_true_transparent.png')
    )
  )
on conflict (key) do nothing;
