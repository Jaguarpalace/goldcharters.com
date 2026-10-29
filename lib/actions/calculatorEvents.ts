'use server';

import { headers } from 'next/headers';
import { getAdminSupabase } from '@/lib/supabase/server';
import { isSupabaseAdminConfigured } from '@/lib/supabase/env';

/**
 * Records one use of the public calculator (migration 040). Called from the
 * calculator component after the visitor stops typing, and again when they
 * press "Request Valuation". Never throws and never returns an error to the
 * page: analytics must not be able to break the calculator.
 */

export type CalculatorItem = {
  metal: string;
  carat: string;
  purity: number;
  weight: number;
  price_per_gram: number;
  item_price: number;
};

export type CalculatorEventInput = {
  event: 'calc' | 'cta';
  session_id?: string | null;
  page?: string | null;
  items: CalculatorItem[];
  total: number;
  viewport_w?: number | null;
  landing_page?: string | null;
  referrer?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_term?: string | null;
  gclid?: string | null;
};

const str = (v: unknown, max: number): string | null =>
  typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null;
const num = (v: unknown, max = 1e7): number | null =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= max ? Number(v.toFixed(4)) : null;

export async function recordCalculatorEvent(input: CalculatorEventInput): Promise<void> {
  try {
    if (!isSupabaseAdminConfigured()) return;
    const admin = getAdminSupabase();
    if (!admin) return;
    if (input.event !== 'calc' && input.event !== 'cta') return;

    const items: CalculatorItem[] = (Array.isArray(input.items) ? input.items : [])
      .slice(0, 20)
      .map((it) => ({
        metal: str(it?.metal, 40) ?? '',
        carat: str(it?.carat, 40) ?? '',
        purity: num(it?.purity, 100) ?? 0,
        weight: num(it?.weight, 100000) ?? 0,
        price_per_gram: num(it?.price_per_gram, 100000) ?? 0,
        item_price: num(it?.item_price) ?? 0,
      }))
      .filter((it) => it.weight > 0);
    if (items.length === 0 && input.event === 'calc') return;

    // The heaviest line becomes the row's headline carat, so the admin can
    // bucket by carat without unpacking the JSON.
    const lead = items.reduce<CalculatorItem | null>((a, it) => (!a || it.item_price > a.item_price ? it : a), null);

    const ua = headers().get('user-agent') ?? '';
    const device = /Mobi|Android|iPhone|iPad/i.test(ua) ? 'mobile' : ua ? 'desktop' : null;

    await admin.from('calculator_events').insert({
      event: input.event,
      session_id: str(input.session_id, 64),
      page: str(input.page, 300),
      metal: lead?.metal ?? null,
      carat_label: lead?.carat ?? null,
      purity: lead?.purity ?? null,
      weight_g: items.reduce((s, it) => s + it.weight, 0) || null,
      price_per_gram: lead?.price_per_gram ?? null,
      item_price: lead?.item_price ?? null,
      total_estimate: num(input.total),
      rows_filled: items.length,
      items,
      device,
      viewport_w: typeof input.viewport_w === 'number' ? Math.round(input.viewport_w) : null,
      landing_page: str(input.landing_page, 300),
      referrer: str(input.referrer, 500),
      utm_source: str(input.utm_source, 120),
      utm_medium: str(input.utm_medium, 120),
      utm_campaign: str(input.utm_campaign, 120),
      utm_term: str(input.utm_term, 120),
      gclid: str(input.gclid, 200),
    });
  } catch (e) {
    console.error('[calculatorEvents] record failed', e);
  }
}
