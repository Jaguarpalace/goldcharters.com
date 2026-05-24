-- Replaces the redundant "{{business_name}}" tagline that sits directly
-- under the logo image in both email templates. The logo already prints
-- "Charters Gold" inside the image — repeating it as text below looks
-- redundant. Replaced with the brand line "Precious Metal Traders".
--
-- Surgical replacement: only the specific tagline <p> is touched; any
-- other edits to the HTML body are preserved.
--
-- Safe to re-run.
-- Run in Supabase → SQL Editor.

-- Customer confirmation: <p>{{business_name}}</p> just under the 120×120 logo
update public.email_templates
set html_body = replace(
  html_body,
  'font-weight:600;">{{business_name}}</p>',
  'font-weight:600;">Precious Metal Traders</p>'
)
where key = 'customer_request_confirmation';

-- Internal alert: <p>{{business_name}} · Admin Alert</p> under the 96×96 logo
update public.email_templates
set html_body = replace(
  html_body,
  'font-weight:600;">{{business_name}} · Admin Alert</p>',
  'font-weight:600;">Precious Metal Traders · Internal Alert</p>'
)
where key = 'new_request_admin';
