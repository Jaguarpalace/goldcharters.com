-- CMS-driven email templates.
--
-- Every transactional email the system sends (admin notifications, customer
-- auto-replies, status updates) is rendered from a row in this table.
-- Admins edit the subject and HTML body from /admin/email-templates and
-- changes go live on next send — no code deploy needed.
--
-- Run in Supabase → SQL Editor.

create table if not exists public.email_templates (
  id uuid primary key default gen_random_uuid(),
  -- Stable code identifier the sender uses to look up the template
  key text not null unique,
  -- Human label shown in the admin list
  name text not null,
  -- One-line explainer for the admin
  description text,
  -- Email subject line; supports {{variables}}
  subject text not null,
  -- Full HTML body; supports {{variables}}
  html_body text not null,
  -- Documentation of which variables this template can use, for the admin
  -- editor sidebar. Array of {key, label, example}.
  available_variables jsonb,
  -- Whether the template is active. Inactive templates fall back to the
  -- hardcoded default in code.
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

-- RLS: public can't see or edit. Admins via service-role client only.
alter table public.email_templates enable row level security;

drop policy if exists email_templates_admin_all on public.email_templates;
create policy email_templates_admin_all on public.email_templates
  for all using (public.is_admin()) with check (public.is_admin());

-- Auto-update updated_at on any change
drop trigger if exists trg_touch_email_templates on public.email_templates;
create trigger trg_touch_email_templates
  before update on public.email_templates
  for each row execute function public.tg_touch_updated_at();

-- Seed the default new-request admin notification template
insert into public.email_templates (key, name, description, subject, html_body, available_variables)
values (
  'new_request_admin',
  'New valuation request — admin notification',
  'Sent to admin recipients (ADMIN_NOTIFICATION_EMAIL env var) every time a customer submits a valuation request.',
  'New {{branch_label}} valuation request — {{full_name}}',
  $TEMPLATE$<!DOCTYPE html>
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
        <!-- Header with logo -->
        <tr>
          <td style="padding:32px 24px 20px; border-bottom:1px solid rgba(212,175,55,0.15); text-align:center; background:#000000;">
            <img src="{{logo_url}}" alt="{{business_name}}" width="96" height="96" style="display:block; margin:0 auto; border:0;" />
            <p style="margin:14px 0 0; color:#d4af37; font-size:10px; letter-spacing:0.22em; text-transform:uppercase; font-weight:600;">{{business_name}} · Admin Alert</p>
            <h1 style="margin:10px 0 0; color:#ffffff; font-family:Georgia, serif; font-size:22px; line-height:1.2;">New valuation request</h1>
            <p style="margin:6px 0 0; color:#9a9a9a; font-size:12px;">{{submitted_at}}</p>
          </td>
        </tr>

        <!-- Customer -->
        <tr>
          <td style="padding:20px 24px 0;">
            <h2 style="margin:0; color:#ffffff; font-family:Georgia, serif; font-size:18px;">{{full_name}}</h2>
            <p style="margin:6px 0 0; font-size:14px;">
              <a href="mailto:{{email}}" style="color:#d4af37; text-decoration:none;">{{email}}</a>
              <span style="color:#5a5a5a;"> · </span>
              <a href="tel:{{phone_digits}}" style="color:#d4af37; text-decoration:none;">{{phone}}</a>
            </p>
          </td>
        </tr>

        <!-- Details -->
        <tr>
          <td style="padding:14px 24px 0;">
            {{details_table}}
            {{description_block}}
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td style="padding:24px; text-align:center;">
            <a href="{{admin_url}}" style="display:inline-block; padding:12px 22px; background:linear-gradient(135deg,#A67C00,#D4AF37 35%,#FFD700 55%,#D4AF37 75%,#B8860B); color:#050505; font-weight:600; text-decoration:none; border-radius:999px; font-size:13px; letter-spacing:0.04em;">View full request →</a>
            <p style="margin:14px 0 0; color:#7a7a7a; font-size:11px;">{{admin_url}}</p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:18px 24px; background:#050505; border-top:1px solid rgba(212,175,55,0.15); text-align:center;">
            <p style="margin:0; color:#5a5a5a; font-size:11px; letter-spacing:0.06em;">
              {{business_name}} · {{address}}<br />
              Edit this email at <a href="{{site_url}}/admin/email-templates" style="color:#9a9a9a; text-decoration:underline;">admin/email-templates</a>
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
    jsonb_build_object('key', 'full_name', 'label', 'Customer full name', 'example', 'Sarah Smith'),
    jsonb_build_object('key', 'first_name', 'label', 'Customer first name', 'example', 'Sarah'),
    jsonb_build_object('key', 'email', 'label', 'Customer email', 'example', 'sarah@example.com'),
    jsonb_build_object('key', 'phone', 'label', 'Customer phone (formatted)', 'example', '07700 900123'),
    jsonb_build_object('key', 'phone_digits', 'label', 'Customer phone (digits only for tel: links)', 'example', '07700900123'),
    jsonb_build_object('key', 'branch_label', 'label', 'Form branch (Gold/Jewellery/Watch/Handbag)', 'example', 'Luxury Watch'),
    jsonb_build_object('key', 'submitted_at', 'label', 'Submission timestamp', 'example', '24 May 2026, 14:32'),
    jsonb_build_object('key', 'details_table', 'label', 'Auto-built HTML table of all submitted details', 'example', '(rendered HTML)'),
    jsonb_build_object('key', 'description_block', 'label', 'Customer description block (HTML, empty if no description)', 'example', '(rendered HTML)'),
    jsonb_build_object('key', 'admin_url', 'label', 'Link to the admin valuation requests page', 'example', 'https://chartersgold.co.uk/admin/valuation-requests'),
    jsonb_build_object('key', 'site_url', 'label', 'Public site URL', 'example', 'https://chartersgold.co.uk'),
    jsonb_build_object('key', 'logo_url', 'label', 'Brand logo URL (hosted publicly)', 'example', 'https://chartersgold.co.uk/logo/charters-gold.webp'),
    jsonb_build_object('key', 'business_name', 'label', 'Business name from site settings', 'example', 'Charters Gold'),
    jsonb_build_object('key', 'address', 'label', 'Business address from site settings', 'example', 'Avalon House, Egham…')
  )
)
on conflict (key) do nothing;
