import { getAdminSupabase } from '@/lib/supabase/server';
import { isSupabaseAdminConfigured } from '@/lib/supabase/env';
import { classifySource, labelPage, type AttributionFields, type EnquirySource } from '@/lib/attribution/classify';

/**
 * Enquiry analytics for /admin/analytics, built from the attribution
 * columns on valuation_requests and appointments (migration 036). No
 * external service involved: this is the site's own record of which page
 * and which source produced each enquiry.
 */

export type EnquiryRow = AttributionFields & {
  id: string;
  kind: 'valuation' | 'booking';
  created_at: string;
  name: string;
  status: string;
  form_variant: string | null;
  source: EnquirySource;
  page_label: string;
  landing_label: string;
};

export type Bucket = { label: string; count: number; share: number };

export type EnquiryAnalytics = {
  days: number;
  total: number;
  valuations: number;
  bookings: number;
  attributed: number;
  bySource: Bucket[];
  byPage: Bucket[];
  byLanding: Bucket[];
  byCampaign: Bucket[];
  byDay: Array<{ day: string; count: number }>;
  recent: EnquiryRow[];
  available: boolean;
};

const ATTR = 'landing_page, source_page, referrer, utm_source, utm_medium, utm_campaign, utm_term, gclid';

function bucket(rows: EnquiryRow[], key: (r: EnquiryRow) => string | null | undefined, limit = 12): Bucket[] {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const k = key(r) || 'Unknown';
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const total = rows.length || 1;
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, count]) => ({ label, count, share: Math.round((count / total) * 100) }));
}

export async function getEnquiryAnalytics(days = 30): Promise<EnquiryAnalytics> {
  const empty: EnquiryAnalytics = {
    days, total: 0, valuations: 0, bookings: 0, attributed: 0,
    bySource: [], byPage: [], byLanding: [], byCampaign: [], byDay: [], recent: [], available: false,
  };
  if (!isSupabaseAdminConfigured()) return empty;
  const admin = getAdminSupabase();
  if (!admin) return empty;

  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const [vr, ap] = await Promise.all([
    admin
      .from('valuation_requests')
      .select(`id, created_at, first_name, last_name, status, form_variant, ${ATTR}`)
      .gte('created_at', since)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(2000),
    admin
      .from('appointments')
      .select(`id, created_at, first_name, last_name, status, ${ATTR}`)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(2000),
  ]);

  // Before migration 036 the attribution columns do not exist and PostgREST
  // returns an error; treat that as "no data yet" rather than a crash.
  if (vr.error && ap.error) return { ...empty, available: false };

  type Raw = AttributionFields & { id: string; created_at: string; first_name: string; last_name: string; status: string; form_variant?: string | null };
  const toRow = (r: Raw, kind: EnquiryRow['kind']): EnquiryRow => ({
    ...r,
    kind,
    name: `${r.first_name} ${r.last_name}`.trim(),
    form_variant: r.form_variant ?? null,
    source: classifySource(r),
    page_label: labelPage(r.source_page),
    landing_label: labelPage(r.landing_page),
  });
  const rows: EnquiryRow[] = [
    ...(((vr.data ?? []) as Raw[]).map((r) => toRow(r, 'valuation'))),
    ...(((ap.data ?? []) as Raw[]).map((r) => toRow(r, 'booking'))),
  ].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

  const byDayMap = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
    byDayMap.set(d, 0);
  }
  for (const r of rows) {
    const d = r.created_at.slice(0, 10);
    if (byDayMap.has(d)) byDayMap.set(d, (byDayMap.get(d) ?? 0) + 1);
  }

  return {
    days,
    total: rows.length,
    valuations: rows.filter((r) => r.kind === 'valuation').length,
    bookings: rows.filter((r) => r.kind === 'booking').length,
    attributed: rows.filter((r) => r.source_page || r.landing_page).length,
    bySource: bucket(rows, (r) => r.source),
    byPage: bucket(rows, (r) => (r.source_page ? r.page_label : null)),
    byLanding: bucket(rows, (r) => (r.landing_page ? r.landing_label : null)),
    byCampaign: bucket(rows, (r) => r.utm_campaign || (r.gclid ? 'Google Ads (no campaign tag)' : null), 8),
    byDay: [...byDayMap.entries()].map(([day, count]) => ({ day, count })),
    recent: rows.slice(0, 25),
    available: true,
  };
}
