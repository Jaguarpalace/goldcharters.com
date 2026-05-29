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

/**
 * Calculator block — defaults to the full multi-metal table used on /sell-gold
 * and /gold-calculator. When `metal` is supplied (e.g. "Silver"), the rates
 * array is filtered to that metal only, the heading switches to
 * "<Metal> Calculator", the section anchor + CTA route are derived from
 * the metal slug, and the "Request Full Valuation" button points at the
 * matching /sell-<slug> page. This lets us reuse one battle-tested
 * component for every dedicated metal page instead of cloning it.
 */
export function GoldCalculator({
  rates,
  asH1 = false,
  metal,
}: {
  rates: CalculatorRate[];
  asH1?: boolean;
  metal?: CalculatorRate['metal_type'];
}) {
  const [weights, setWeights] = useState<Weights>({});
  const filteredRates = metal ? rates.filter((r) => r.metal_type === metal) : rates;
  const metalSlug = metal ? metal.toLowerCase() : 'gold';
  const heading = metal ? `${metal} Calculator` : 'Gold Calculator';
  const sectionId = `${metalSlug}-calculator`;
  const ctaHref = `/sell-${metalSlug}#valuation-form`;
  // Subhead phrasing adapts to single-metal mode so we don't claim
  // "live gold prices" on a silver page.
  const subhead = metal
    ? `Enter your ${metal.toLowerCase()} item weights in grams to receive an instant guide price. Rates reflect live ${metal.toLowerCase()} spot prices.`
    : 'Enter your item weights in grams to receive an instant guide price. Rates are managed by our specialists and reflect current market conditions.';

  const rows = useMemo<CalculatedRow[]>(
    () =>
      filteredRates.map((rate) => {
        const raw = weights[rate.id] ?? '';
        const weight = parseFloat(raw);
        const valid = Number.isFinite(weight) && weight > 0;
        const itemPrice = valid ? weight * rate.price_per_gram : 0;
        return { rate, raw, weight: valid ? weight : 0, itemPrice };
      }),
    [filteredRates, weights],
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
    <section className="relative py-6 lg:py-10" id={sectionId}>
      <div className="gc-container">
        {/* Header: title + subhead only. The Estimated Total / "Request Full
            Valuation" block now slots into the calculator card itself as the
            last row of the right column (or the last item in the mobile
            single column), so the previously-empty bottom-right gap of the
            calculator becomes useful surface and the running total sits
            visually next to the rate rows that drive it. */}
        <div>
          {asH1 ? (
            <h1 className="gc-heading-xl">{heading}</h1>
          ) : (
            <h2 className="gc-heading">{heading}</h2>
          )}
          <p className="gc-subhead mt-3 max-w-2xl">{subhead}</p>
        </div>

        {/*
          Calculator - single column on mobile, two columns on desktop.

          Layout note: the previous version rendered two side-by-side
          sub-columns, each with its own header. On mobile they stacked,
          which meant the header text "Type & Carat / Weight / Item Price"
          appeared twice - once at the top of each stacked column. Here we
          render the header exactly once on mobile and once per column on
          desktop, by toggling visibility with Tailwind responsive classes.

          Row counts are balanced to within 1 (7 vs 6 for 13 rates) so the
          two desktop columns end at roughly the same vertical line - the
          TotalRow added at the bottom of the right column closes that 1-row
          gap, leaving both columns visually aligned at the bottom.
        */}
        <div className="mt-6 gc-card gc-card-gold-edge overflow-hidden">
          {/* MOBILE: single column with one header. TotalRow sits at the very
              bottom so the running total + Request Full Valuation CTA are
              the last thing the user sees as they scroll the list. */}
          <div className="lg:hidden">
            <RateHeader />
            <div className="divide-y divide-gold-metallic/10">
              {rows.map((row) => (
                <RateRow key={row.rate.id} row={row} onChangeWeight={onChangeWeight} />
              ))}
              <TotalRow total={total} ctaHref={ctaHref} />
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
                <TotalRow total={total} ctaHref={ctaHref} />
              </div>
            </div>
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

/**
 * Sits at the bottom of the right column on desktop (and at the very end of
 * the single column on mobile).
 *
 * Responsive layout strategy:
 *   - Desktop (lg+): a 3-column grid matching RateRow so the label, the CTA
 *     and the running total line up with "Type & Carat / Weight / Item
 *     Price" — the cell visually reads as the calculator's "total row".
 *   - Mobile: a stacked two-row layout. Top row is the label + hint, bottom
 *     row is the CTA on the left and the total on the right. Cramming all
 *     three cells onto one row on a phone-width screen broke the label
 *     into 5 wrapped lines and overlapped the CTA, so we explicitly stack
 *     instead of inheriting the grid.
 */
function TotalRow({ total, ctaHref }: { total: number; ctaHref: string }) {
  return (
    <div className="bg-ink-900/60 px-4 py-3 lg:grid lg:grid-cols-[1.4fr,1fr,1fr] lg:items-center lg:gap-3 lg:py-2.5">
      <div className="min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-luxe text-gold-tint">
          Estimated Total
        </div>
        <div className="text-[10px] text-warmgrey">Guide price · Subject to inspection</div>
      </div>
      {/* On mobile this wrapper is a flex row (CTA + total). On desktop the
          `lg:contents` makes the wrapper transparent so its two children
          participate as columns 2 and 3 of the outer grid directly. */}
      <div className="mt-3 flex items-center justify-between gap-3 lg:contents lg:mt-0">
        <Link
          href={ctaHref}
          className="gc-btn-primary inline-flex items-center justify-center whitespace-nowrap !px-3 !py-1.5 text-[11px] lg:w-full"
        >
          Request Valuation
        </Link>
        <div className="font-display text-lg font-semibold text-gold-bright lg:text-right">
          {formatGBP(total)}
        </div>
      </div>
    </div>
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
