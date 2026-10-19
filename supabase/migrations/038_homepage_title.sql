-- 038: homepage title says what we do
--
-- Search Console (Sep to Oct 2026): the homepage is shown for "sell gold"
-- style searches but its title never said "sell gold", so it sat around
-- position 34 for them. The new title matches the town pages ("Sell Gold &
-- Jewellery in X - Paid in Seconds") and keeps the brand, which is the
-- most-clicked search of all.
--
-- Only rows still carrying the original title are touched, so anything the
-- admin has already edited in Admin > SEO or Settings is left alone.
-- Safe to run more than once.

update public.page_seo
set title = 'Sell Gold & Jewellery - Paid in Seconds | Charters Gold'
where slug = '/'
  and title = 'Charters Gold · Private UK Gold & Jewellery Specialists';

update public.site_settings
set seo_title = 'Sell Gold & Jewellery - Paid in Seconds | Charters Gold'
where seo_title = 'Charters Gold · Private UK Gold & Jewellery Specialists';
