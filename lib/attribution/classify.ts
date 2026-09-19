/**
 * Turn raw attribution fields into a short, human source label.
 *
 * Pure function: used on the server (admin Analytics aggregates) and on the
 * client (event parameters). Order matters - a Google Ads click id wins
 * over a google.com referrer, and an explicit UTM wins over the referrer.
 */

export type AttributionFields = {
  landing_page?: string | null;
  source_page?: string | null;
  referrer?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_term?: string | null;
  gclid?: string | null;
};

export type EnquirySource =
  | 'Google Ads'
  | 'Google'
  | 'Bing'
  | 'Facebook'
  | 'Instagram'
  | 'TikTok'
  | 'Direct'
  | 'Email'
  | 'Phone'
  | 'Referral'
  | 'Unknown';

const HOST_MAP: Array<[RegExp, EnquirySource]> = [
  [/(^|\.)google\./i, 'Google'],
  [/(^|\.)bing\.com$/i, 'Bing'],
  [/(^|\.)duckduckgo\.com$/i, 'Referral'],
  [/(^|\.)facebook\.com$|(^|\.)fb\.com$|^l\.facebook\.com$|^lm\.facebook\.com$/i, 'Facebook'],
  [/(^|\.)instagram\.com$|^l\.instagram\.com$/i, 'Instagram'],
  [/(^|\.)tiktok\.com$/i, 'TikTok'],
];

function hostOf(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function classifySource(a: AttributionFields, siteHost = 'chartersgold.co.uk'): EnquirySource {
  if (a.gclid) return 'Google Ads';
  const src = (a.utm_source ?? '').toLowerCase();
  const med = (a.utm_medium ?? '').toLowerCase();
  if (src) {
    // Bookings typed in by staff after a phone call (createPhoneBooking).
    if (src === 'phone') return 'Phone';
    if (src.includes('google') && /cpc|ppc|paid|ads/.test(med)) return 'Google Ads';
    if (src.includes('google')) return 'Google';
    if (src.includes('bing')) return 'Bing';
    if (src.includes('facebook') || src === 'fb') return 'Facebook';
    if (src.includes('instagram') || src === 'ig') return 'Instagram';
    if (src.includes('tiktok')) return 'TikTok';
    if (med === 'email' || src.includes('mail')) return 'Email';
    return 'Referral';
  }
  const host = hostOf(a.referrer);
  if (!host) return a.referrer === undefined ? 'Unknown' : 'Direct';
  if (host === siteHost || host.endsWith('.' + siteHost) || host === 'localhost') return 'Direct';
  for (const [re, label] of HOST_MAP) if (re.test(host)) return label;
  return 'Referral';
}

/** "/locations/reading" -> "Reading page"; "/" -> "Homepage"; "/gold-calculator" -> "Gold calculator". */
export function labelPage(path: string | null | undefined): string {
  if (!path) return 'Unknown';
  const p = path.split('?')[0].split('#')[0];
  if (p === '/' || p === '') return 'Homepage';
  const m = p.match(/^\/locations\/([^/]+)/);
  if (m) {
    return (
      m[1]
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ') + ' page'
    );
  }
  const known: Record<string, string> = {
    '/gold-calculator': 'Gold calculator',
    '/sell-gold': 'Sell gold',
    '/sell-silver': 'Sell silver',
    '/sell-jewellery': 'Sell jewellery',
    '/sell-antique-jewellery': 'Sell antique jewellery',
    '/sell-watches': 'Sell watches',
    '/sell-handbags': 'Sell handbags',
    '/book': 'Booking page',
    '/contact': 'Contact',
    '/faqs': 'FAQs',
    '/how-it-works': 'How it works',
    '/locations': 'Areas we cover',
  };
  return known[p] ?? p;
}
