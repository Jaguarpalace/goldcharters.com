import { NextResponse } from 'next/server';
import { getCalculatorRates } from '@/lib/queries/calculator';
import { recordGoldSnapshot } from '@/lib/queries/goldPriceHistory';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Daily snapshot of what we pay for gold, per carat (see vercel.json crons).
 * Vercel sends `Authorization: Bearer <CRON_SECRET>` when that env var is set;
 * the route refuses anything else in that case. Without the secret it still
 * runs, because the worst a stranger can do is record today's figure early.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: 'unauthorised' }, { status: 401 });
  }

  const rates = await getCalculatorRates();
  await recordGoldSnapshot(rates);
  return NextResponse.json({ ok: true, recorded_at: new Date().toISOString() });
}
