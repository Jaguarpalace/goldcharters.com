'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { CalculatorRate } from '@/types/database';
import { formatGBP } from '@/lib/format';

type Weights = Record<string, string>;

type CalculatedRow = {
  rate: CalculatorRate;
  raw: string;
  weight: number;
  itemPrice: number;
};

export function GoldCalculator({
  rates,
  asH1 = false,
}: {
  rates: CalculatorRate[];
  asH1?: boolean;
}) {
  const [weights, setWeights] = useState<Weights>({});

  const rows = useMemo<CalculatedRow[]>(
    () =>
      rates.map((rate) => {
        const raw = weights[rate.id] ?? '';
        const weight = parseFloat(raw);
        const valid = Number.isFinite(weight) && weight > 0;
        const itemPrice = valid ? weight * rate.price_per_gram : 0;
        return { rate, raw, weight: valid ? weight : 0, itemPrice };
      }),
    [rates, weights],
  );

  const total = rows.reduce((sum, r) => sum + r.itemPrice, 0);

  // Split rows roughly in half so the calculator renders side-by-side on
  // wider screens instead of one long single column.
  const half = Math.ceil(rows.length / 2);
  const leftRows = rows.slice(0, half);
  const rightRows = rows.slice(half);

  const onChangeWeight = (id: string, value: string) =>
    setWeights((w) => ({ ...w, [id]: value }));

  return (
    <section className="relative py-6 lg:py-10" id="gold-calculator">
      <div className="gc-container">
        {/* Header strip: title left, total card right */}
        <div className="grid gap-6 md:grid-cols-[1.4fr,1fr] md:items-end md:gap-8">
          <div>
            <span className="gc-eyebrow">Sell Your Gold Calculator</span>
            {asH1 ? (
              <h1 className="gc-heading-xl mt-4">Gold Calculator</h1>
            ) : (
              <h2 className="gc-heading mt-3">Gold Calculator</h2>
            )}
            <p className="gc-subhead mt-3 max-w-xl">
              Enter your item weights in grams to receive an instant guide price. Rates are managed by our
              specialists and reflect current market conditions.
            </p>
          </div>

          <div className="gc-card gc-card-gold-edge p-5">
            <p className="text-[10px] font-semibold uppercase tracking-luxe text-gold-metallic">
              Estimated Total
            </p>
            <p className="mt-1 font-display text-3xl font-semibold text-white sm:text-4xl">
              {formatGBP(total)}
            </p>
            <p className="mt-1 text-[11px] text-warmgrey">Guide price · Subject to inspection</p>
            <Link
              href="/sell-gold#valuation-form"
              className="gc-btn-primary mt-4 inline-flex"
            >
              Request Full Valuation
            </Link>
          </div>
        </div>

        {/*
          Calculator — single column on mobile, two columns on desktop.

          Layout note: the previous version rendered two side-by-side
          sub-columns, each with its own header. On mobile they stacked,
          which meant the header text "Type & Carat / Weight / Item Price"
          appeared twice — once at the top of each stacked column. Here we
          render the header exactly once on mobile and once per column on
          desktop, by toggling visibility with Tailwind responsive classes.

          Row counts are balanced to within 1 (7 vs 6 for 13 rates) so the
          two desktop columns end at roughly the same vertical line.
        */}
        <div className="mt-6 gc-card gc-card-gold-edge overflow-hidden">
          {/* MOBILE: single column with one header */}
          <div className="lg:hidden">
            <RateHeader />
            <div className="divide-y divide-gold-metallic/10">
              {rows.map((row) => (
                <RateRow key={row.rate.id} row={row} onChangeWeight={onChangeWeight} />
              ))}
            </div>
          </div>

          {/* DESKTOP: two balanced columns, each with its own header */}
          <div className="hidden lg:grid lg:grid-cols-2 lg:divide-x lg:divide-gold-metallic/15">
            <div>
              <RateHeader />
              <div className="divide-y divide-gold-metallic/10">
                {leftRows.map((row) => (
                  <RateRow key={`l-${row.rate.id}`} row={row} onChangeWeight={onChangeWeight} />
                ))}
              </div>
            </div>
            <div>
              <RateHeader />
              <div className="divide-y divide-gold-metallic/10">
                {rightRows.map((row) => (
                  <RateRow key={`r-${row.rate.id}`} row={row} onChangeWeight={onChangeWeight} />
                ))}
              </div>
            </div>
          </div>

          {/* Grand total bar spanning the whole calculator */}
          <div className="flex items-center justify-between gap-4 border-t border-gold-metallic/20 bg-ink-900/80 px-4 py-3">
            <span className="text-[11px] font-semibold uppercase tracking-luxe text-gold-tint">
              Estimated Grand Total
            </span>
            <span className="font-display text-lg font-semibold text-gold-bright">
              {formatGBP(total)}
            </span>
          </div>
        </div>

        <p className="mt-4 text-[11px] leading-relaxed text-warmgrey/80">
          Calculator prices are guide prices only and subject to inspection, market movement, purity
          verification and item condition.
        </p>
      </div>
    </section>
  );
}

function RateHeader() {
  return (
    <div className="grid grid-cols-[1.4fr,1fr,1fr] gap-3 bg-ink-900/80 px-4 py-2 text-[10px] uppercase tracking-luxe text-gold-tint">
      <div>Type &amp; Carat</div>
      <div>Weight (g)</div>
      <div className="text-right">Item Price</div>
    </div>
  );
}

function RateRow({
  row,
  onChangeWeight,
}: {
  row: CalculatedRow;
  onChangeWeight: (id: string, value: string) => void;
}) {
  const { rate, raw, itemPrice } = row;
  return (
    <div className="grid grid-cols-[1.4fr,1fr,1fr] items-center gap-3 px-4 py-2.5 hover:bg-ink-900/40">
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-white">
          {rate.metal_type} {rate.carat_label}
        </div>
        <div className="text-[10px] text-warmgrey">
          {rate.purity_percentage}% · {formatGBP(rate.price_per_gram)}/g
        </div>
      </div>
      <input
        type="number"
        inputMode="decimal"
        step="0.01"
        min="0"
        placeholder="0.00"
        value={raw}
        onChange={(e) => onChangeWeight(rate.id, e.target.value)}
        className="w-full rounded-md border border-gold-metallic/25 bg-ink-950/80 px-2.5 py-1.5 text-sm text-white placeholder:text-warmgrey/50 focus:border-gold-metallic focus:outline-none focus:ring-2 focus:ring-gold-metallic/30"
        aria-label={`Weight in grams for ${rate.metal_type} ${rate.carat_label}`}
      />
      <div className="text-right text-sm font-medium text-gold-tint">
        {itemPrice > 0 ? formatGBP(itemPrice) : '£0.00'}
      </div>
    </div>
  );
}
