'use client';

import { useEffect, useRef, useState } from 'react';

export type TrendPoint = { date: string; value: number };

const yearOf = (iso: string) => iso.slice(0, 4);
const monthYear = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });

/**
 * A plain trend line for the gold price over several years. No price axis,
 * no daily change figure: the shape is the message. Inline SVG whose viewBox
 * follows the container width so the labels stay readable on a phone.
 */
export function GoldTrendChart({ points }: { points: TrendPoint[] }) {
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

  // Thin to roughly one point per week so the path stays light.
  const step = Math.max(1, Math.floor(points.length / 260));
  const data = points.filter((_, i) => i % step === 0 || i === points.length - 1);
  if (data.length < 2) return null;

  const first = data[0];
  const last = data[data.length - 1];
  const high = data.reduce((a, p) => (p.value > a.value ? p : a), data[0]);
  const low = data.reduce((a, p) => (p.value < a.value ? p : a), data[0]);

  const height = 240;
  const narrow = width < 480;
  const pad = { top: 16, right: 12, bottom: 28, left: 12 };
  const innerW = Math.max(width - pad.left - pad.right, 40);
  const innerH = height - pad.top - pad.bottom;
  const span = Math.max(high.value - low.value, 1);
  const yMin = low.value - span * 0.08;
  const yMax = high.value + span * 0.08;

  const x = (i: number) => pad.left + (i / (data.length - 1)) * innerW;
  const y = (v: number) => pad.top + innerH - ((v - yMin) / (yMax - yMin)) * innerH;

  const line = data
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`)
    .join(' ');
  const area = `${line} L${x(data.length - 1).toFixed(1)},${(pad.top + innerH).toFixed(1)} L${x(0).toFixed(1)},${(pad.top + innerH).toFixed(1)} Z`;

  // One label per year boundary (first day of each new year in the data).
  const yearIdx: number[] = [];
  data.forEach((p, i) => {
    if (i > 0 && yearOf(p.date) !== yearOf(data[i - 1].date)) yearIdx.push(i);
  });
  // Label the first point too, but only when the next year line is far
  // enough away that the two labels would not overlap.
  if (yearIdx.length === 0 || yearIdx[0] > data.length * 0.12) yearIdx.unshift(0);
  const labels = narrow ? yearIdx.filter((_, i) => i % 2 === 0) : yearIdx;

  const years = Math.max(1, Math.round((Date.parse(last.date) - Date.parse(first.date)) / (365.25 * 86400000)));
  const rise = (last.value / first.value - 1) * 100;

  return (
    <div ref={wrap} className="w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        role="img"
        aria-label={`The gold price over the last ${years} years, from ${monthYear(first.date)} to ${monthYear(last.date)}, up ${Math.round(rise)}%`}
        className="block overflow-visible"
      >
        <defs>
          <linearGradient id="gc-trend-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F3CC0F" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#F3CC0F" stopOpacity="0" />
          </linearGradient>
        </defs>

        {labels.map((i) => (
          <g key={i}>
            <line
              x1={x(i)}
              x2={x(i)}
              y1={pad.top}
              y2={pad.top + innerH}
              stroke="rgba(243,204,15,0.12)"
              strokeWidth="1"
            />
            <text x={x(i) + 4} y={height - 8} fontSize="11" fill="#B8B8B8">
              {yearOf(data[i].date)}
            </text>
          </g>
        ))}

        <path d={area} fill="url(#gc-trend-fill)" />
        <path d={line} fill="none" stroke="#F3CC0F" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={x(data.length - 1)} cy={y(last.value)} r="4.5" fill="#F3CC0F" stroke="#0B0B0B" strokeWidth="2" />
        <text
          x={x(data.length - 1) + 2}
          y={y(last.value) + 20}
          textAnchor="end"
          fontSize="11"
          fontWeight="600"
          fill="#F3CC0F"
        >
          {monthYear(last.date)}
        </text>
      </svg>
    </div>
  );
}
