'use client';

import { useEffect, useRef, useState } from 'react';

export type ChartPoint = { date: string; price: number };

const gbp = (n: number) =>
  n.toLocaleString('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 2 });

const shortDate = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

const longDate = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

/**
 * The 30 / 90 day line of what we pay per gram for one carat. Plain inline
 * SVG, no chart library: the viewBox follows the container width so text
 * stays a readable size on a phone instead of shrinking with the drawing.
 * Server-renders at 640px wide, then resizes on the client.
 */
export function GoldPriceChart({
  points,
  carat,
  defaultRange = 90,
}: {
  points: ChartPoint[];
  carat: string;
  defaultRange?: 30 | 90;
}) {
  const [range, setRange] = useState<30 | 90>(defaultRange);
  const [width, setWidth] = useState(640);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = Math.round(entry.contentRect.width);
      if (w > 0) setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const since = new Date(Date.now() - range * 86400000).toISOString().slice(0, 10);
  const data = points.filter((p) => p.date >= since);

  if (data.length < 2) {
    return (
      <div ref={wrap} className="text-sm text-warmgrey">
        Price history will appear here once a few days have been recorded.
      </div>
    );
  }

  const first = data[0];
  const last = data[data.length - 1];
  const change = last.price - first.price;
  const changePct = (change / first.price) * 100;
  const high = data.reduce((a, p) => (p.price > a.price ? p : a), data[0]);
  const low = data.reduce((a, p) => (p.price < a.price ? p : a), data[0]);

  // Drawing area
  const height = 260;
  const narrow = width < 480;
  const pad = { top: 18, right: narrow ? 12 : 16, bottom: 30, left: narrow ? 48 : 60 };
  const innerW = Math.max(width - pad.left - pad.right, 40);
  const innerH = height - pad.top - pad.bottom;

  const minP = low.price;
  const maxP = high.price;
  const span = Math.max(maxP - minP, 0.5);
  const yMin = minP - span * 0.15;
  const yMax = maxP + span * 0.15;

  const x = (i: number) => pad.left + (i / (data.length - 1)) * innerW;
  const y = (p: number) => pad.top + innerH - ((p - yMin) / (yMax - yMin)) * innerH;

  const line = data.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.price).toFixed(1)}`).join(' ');
  const area = `${line} L${x(data.length - 1).toFixed(1)},${(pad.top + innerH).toFixed(1)} L${x(0).toFixed(1)},${(pad.top + innerH).toFixed(1)} Z`;

  const gridCount = 4;
  const grid = Array.from({ length: gridCount + 1 }, (_, i) => yMin + ((yMax - yMin) * i) / gridCount);

  const labelCount = narrow ? 3 : 5;
  const labelIdx = Array.from({ length: labelCount }, (_, i) =>
    Math.round((i * (data.length - 1)) / (labelCount - 1)),
  );

  const up = change >= 0;

  return (
    <div ref={wrap} className="w-full">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-luxe text-gold-metallic">
            {carat} gold, what we pay per gram
          </p>
          <p className="mt-1 font-display text-2xl font-semibold text-white sm:text-3xl">
            {gbp(last.price)}
            <span className="ml-2 text-sm font-normal text-warmgrey">today</span>
          </p>
          <p className="mt-1 text-sm text-warmgrey">
            <span className={up ? 'text-emerald-400' : 'text-rose-400'}>
              {up ? '+' : '-'}
              {gbp(Math.abs(change))} ({up ? '+' : '-'}
              {Math.abs(changePct).toFixed(1)}%)
            </span>{' '}
            since {shortDate(first.date)}
          </p>
        </div>
        <div
          role="group"
          aria-label="Chart range"
          className="inline-flex rounded-full border border-gold-metallic/30 bg-ink-900/60 p-0.5 text-xs font-semibold"
        >
          {([30, 90] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              aria-pressed={range === r}
              className={`rounded-full px-3 py-1.5 transition ${
                range === r ? 'bg-gold-metallic text-ink-950' : 'text-warmgrey hover:text-white'
              }`}
            >
              {r} days
            </button>
          ))}
        </div>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        role="img"
        aria-label={`${carat} gold price per gram we pay, last ${range} days: ${gbp(first.price)} on ${longDate(first.date)} to ${gbp(last.price)} on ${longDate(last.date)}`}
        className="mt-4 block overflow-visible"
      >
        <defs>
          <linearGradient id="gc-chart-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F3CC0F" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#F3CC0F" stopOpacity="0" />
          </linearGradient>
        </defs>

        {grid.map((v) => (
          <g key={v}>
            <line
              x1={pad.left}
              x2={width - pad.right}
              y1={y(v)}
              y2={y(v)}
              stroke="rgba(243,204,15,0.12)"
              strokeWidth="1"
            />
            <text
              x={pad.left - 8}
              y={y(v) + 4}
              textAnchor="end"
              fontSize="11"
              fill="#B8B8B8"
            >
              £{v.toFixed(narrow ? 1 : 2)}
            </text>
          </g>
        ))}

        <path d={area} fill="url(#gc-chart-fill)" />
        <path d={line} fill="none" stroke="#F3CC0F" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

        <circle cx={x(data.length - 1)} cy={y(last.price)} r="4.5" fill="#F3CC0F" stroke="#0B0B0B" strokeWidth="2" />

        {labelIdx.map((i) => (
          <text
            key={i}
            x={x(i)}
            y={height - 8}
            textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'}
            fontSize="11"
            fill="#B8B8B8"
          >
            {shortDate(data[i].date)}
          </text>
        ))}
      </svg>

      <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        {[
          { k: `${range}-day high`, v: `${gbp(high.price)} (${shortDate(high.date)})` },
          { k: `${range}-day low`, v: `${gbp(low.price)} (${shortDate(low.date)})` },
          { k: `${shortDate(first.date)}`, v: gbp(first.price) },
          { k: 'Today', v: gbp(last.price) },
        ].map(({ k, v }) => (
          <div key={k} className="rounded-xl border border-gold-metallic/15 bg-ink-900/50 px-3 py-2">
            <dt className="text-[11px] uppercase tracking-luxe text-warmgrey/80">{k}</dt>
            <dd className="mt-0.5 font-semibold text-white">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
