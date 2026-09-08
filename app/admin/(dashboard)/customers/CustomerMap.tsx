'use client';

import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Map as LeafletMap } from 'leaflet';
import type { CustomerMapPoint } from '@/lib/queries/customers';
import { geocodeCustomers } from '@/lib/actions/customers';

const gbp = (n: number) =>
  `£${n.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

/** Marker diameter in px: grows with the square root of what we paid, so a
 *  £4,000 seller is clearly bigger than a £400 one without dwarfing the map. */
function markerSize(totalPaid: number): number {
  const base = 12;
  const grown = base + Math.sqrt(Math.max(0, totalPaid)) / 3.5;
  return Math.round(Math.min(44, Math.max(base, grown)));
}

/** Great-circle distance in miles. */
function milesBetween(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** "SL5 7ET" -> "SL5"; the area the postcode belongs to. */
function outwardCode(postcode: string | null): string | null {
  if (!postcode) return null;
  const p = postcode.trim().toUpperCase().replace(/\s+/g, '');
  if (p.length < 5) return p || null;
  return p.slice(0, p.length - 3);
}

export function CustomerMap({
  points,
  shop,
}: {
  points: CustomerMapPoint[];
  /** The shop's own coordinates, for the distance figures and the home pin. */
  shop: { lat: number; lng: number; label: string };
}) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  const mapped = useMemo(
    () => points.filter((p) => p.latitude != null && p.longitude != null),
    [points],
  );
  const unmapped = useMemo(
    () => points.filter((p) => p.latitude == null || p.longitude == null),
    [points],
  );

  const stats = useMemo(() => {
    const areas = new Map<string, { customers: number; total: number }>();
    let distanceSum = 0;
    for (const p of mapped) {
      const area = outwardCode(p.postcode);
      if (area) {
        const cur = areas.get(area) ?? { customers: 0, total: 0 };
        cur.customers += 1;
        cur.total += p.total_paid_gbp;
        areas.set(area, cur);
      }
      distanceSum += milesBetween(shop.lat, shop.lng, p.latitude!, p.longitude!);
    }
    const topAreas = [...areas.entries()]
      .sort((a, b) => b[1].customers - a[1].customers || b[1].total - a[1].total)
      .slice(0, 5);
    const totalPaid = mapped.reduce((s, p) => s + p.total_paid_gbp, 0);
    return {
      topAreas,
      avgDistance: mapped.length ? distanceSum / mapped.length : 0,
      totalPaid,
    };
  }, [mapped, shop.lat, shop.lng]);

  // Leaflet touches `window` at import time, so it is loaded inside the
  // effect rather than at the top of the module.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import('leaflet')).default;
      if (cancelled || !containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, {
        zoomControl: true,
        attributionControl: true,
        scrollWheelZoom: true,
      });
      mapRef.current = map;

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(map);

      // Home pin: the shop.
      L.marker([shop.lat, shop.lng], {
        icon: L.divIcon({
          className: '',
          html: `<div class="gc-home-pin" title="${shop.label}"></div>`,
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        }),
        zIndexOffset: 1000,
      })
        .addTo(map)
        .bindTooltip(shop.label, { direction: 'top', offset: [0, -10], className: 'gc-tip' });

      const bounds = L.latLngBounds([[shop.lat, shop.lng]]);
      // Biggest last so small pins stay clickable on top of large ones.
      const ordered = [...mapped].sort((a, b) => b.total_paid_gbp - a.total_paid_gbp);
      for (const p of ordered) {
        const size = markerSize(p.total_paid_gbp);
        const marker = L.marker([p.latitude!, p.longitude!], {
          icon: L.divIcon({
            className: '',
            html: `<div class="gc-pin" style="width:${size}px;height:${size}px"></div>`,
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2],
          }),
        }).addTo(map);
        const miles = milesBetween(shop.lat, shop.lng, p.latitude!, p.longitude!);
        marker.bindTooltip(
          `<strong>${escapeHtml(p.name)}</strong><br>${escapeHtml(
            [p.postcode, p.city].filter(Boolean).join(' · '),
          )}<br>${p.purchases} purchase${p.purchases === 1 ? '' : 's'} · ${gbp(p.total_paid_gbp)} paid<br><span class="gc-tip-muted">${miles.toFixed(1)} miles from ${escapeHtml(shop.label)}</span>`,
          { direction: 'top', offset: [0, -size / 2 - 2], className: 'gc-tip' },
        );
        marker.on('click', () => router.push(`/admin/customers/${p.id}`));
        bounds.extend([p.latitude!, p.longitude!]);
      }

      if (mapped.length > 0) map.fitBounds(bounds.pad(0.2), { maxZoom: 12 });
      else map.setView([shop.lat, shop.lng], 9);
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [mapped, shop.lat, shop.lng, shop.label, router]);

  const runGeocode = () => {
    setFeedback(null);
    startTransition(async () => {
      const result = await geocodeCustomers();
      if (result.ok && result.data) {
        const { geocoded, unresolved, checked } = result.data;
        setFeedback(
          geocoded === 0 && unresolved === 0
            ? `All ${checked} customers with a postcode are already on the map.`
            : `Located ${geocoded} customer${geocoded === 1 ? '' : 's'}${unresolved ? `, ${unresolved} postcode${unresolved === 1 ? '' : 's'} not recognised` : ''}.`,
        );
        router.refresh();
      } else if (!result.ok) {
        setFeedback(result.error);
      }
    });
  };

  const needsGeocode = unmapped.filter((p) => p.postcode).length;

  return (
    <div className="space-y-4">
      <style dangerouslySetInnerHTML={{ __html: MAP_CSS }} />

      {/* ------------------------------------------------ At a glance */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="On the map" value={String(mapped.length)} sub={`${unmapped.length} without a location`} />
        <Stat label="Paid to mapped customers" value={gbp(stats.totalPaid)} />
        <Stat label="Average distance" value={`${stats.avgDistance.toFixed(1)} mi`} sub={`from ${shop.label}`} />
        <div className="rounded-lg border border-gold-metallic/15 bg-ink-900/40 p-4">
          <div className="text-[10px] font-semibold uppercase tracking-luxe text-gold-tint">Top areas</div>
          {stats.topAreas.length === 0 ? (
            <p className="mt-2 text-[12px] text-warmgrey">No postcodes yet.</p>
          ) : (
            <ul className="mt-2 space-y-0.5 text-[12px]">
              {stats.topAreas.map(([area, s]) => (
                <li key={area} className="flex items-center justify-between gap-2">
                  <span className="font-mono text-white">{area}</span>
                  <span className="text-warmgrey">
                    {s.customers} · {gbp(s.total)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ------------------------------------------------ Map */}
      <div className="overflow-hidden rounded-lg border border-gold-metallic/20">
        <div ref={containerRef} className="h-[560px] w-full bg-ink-950" aria-label="Customer map" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11px] text-warmgrey">
          Each point is a customer at their postcode; bigger points are customers we have paid
          more to. Hover for details, click to open the profile.
          <span className="ml-2 inline-flex items-center gap-1 align-middle">
            <span className="gc-legend-pin" /> customer
            <span className="gc-legend-home ml-3" /> {shop.label}
          </span>
        </p>
        <div className="flex items-center gap-3">
          {feedback && <p className="text-[11px] text-gold-tint">{feedback}</p>}
          <button
            type="button"
            onClick={runGeocode}
            disabled={pending}
            className="rounded-md border border-gold-metallic/40 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-luxe text-gold-tint hover:bg-gold-metallic/15 hover:text-gold-bright disabled:opacity-50"
          >
            {pending ? 'Locating…' : needsGeocode > 0 ? `Locate ${needsGeocode} missing` : 'Re-check locations'}
          </button>
        </div>
      </div>

      {/* ------------------------------------------------ Unmapped */}
      {unmapped.length > 0 && (
        <details className="rounded-lg border border-gold-metallic/15 bg-ink-900/40 p-4">
          <summary className="cursor-pointer text-[10px] font-semibold uppercase tracking-luxe text-gold-tint">
            {unmapped.length} customer{unmapped.length === 1 ? '' : 's'} not on the map
          </summary>
          <ul className="mt-2 divide-y divide-gold-metallic/10 text-[12px]">
            {unmapped.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-1.5">
                <Link href={`/admin/customers/${p.id}`} className="text-white hover:text-gold-bright">
                  {p.name}
                </Link>
                <span className="text-warmgrey">
                  {p.postcode ? `${p.postcode} - not recognised` : 'no postcode on file'}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-gold-metallic/15 bg-ink-900/40 p-4">
      <div className="text-[10px] font-semibold uppercase tracking-luxe text-gold-tint">{label}</div>
      <div className="mt-2 font-display text-xl text-white">{value}</div>
      {sub && <div className="mt-1 text-[11px] text-warmgrey">{sub}</div>}
    </div>
  );
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

/* Half black, half gold: the brand mark as a pin. The gold ring keeps small
   pins visible against the dark basemap. */
const MAP_CSS = `
  .gc-pin {
    border-radius: 9999px;
    background: linear-gradient(90deg, #0a0a0a 50%, #d4af37 50%);
    border: 1.5px solid #f3cc0f;
    box-shadow: 0 0 0 1px rgba(0,0,0,0.6), 0 0 10px rgba(212,175,55,0.45);
    cursor: pointer;
    transition: transform 120ms ease;
  }
  .gc-pin:hover { transform: scale(1.15); }
  .gc-home-pin {
    width: 18px; height: 18px; border-radius: 9999px;
    background: #f3cc0f;
    border: 3px solid #0a0a0a;
    box-shadow: 0 0 0 2px #f3cc0f, 0 0 14px rgba(243,204,15,0.8);
  }
  .gc-legend-pin {
    display: inline-block; width: 12px; height: 12px; border-radius: 9999px;
    background: linear-gradient(90deg, #0a0a0a 50%, #d4af37 50%);
    border: 1.5px solid #f3cc0f;
  }
  .gc-legend-home {
    display: inline-block; width: 12px; height: 12px; border-radius: 9999px;
    background: #f3cc0f; border: 2px solid #0a0a0a; box-shadow: 0 0 0 1.5px #f3cc0f;
  }
  .leaflet-container { background: #0b0a07; font-family: inherit; }
  .gc-tip {
    background: #14120c; color: #f5efdc; border: 1px solid rgba(212,175,55,0.5);
    border-radius: 6px; padding: 6px 9px; font-size: 12px; line-height: 1.4;
    box-shadow: 0 8px 24px rgba(0,0,0,0.6);
  }
  .gc-tip::before { border-top-color: rgba(212,175,55,0.5); }
  .gc-tip-muted { color: #b8b8b8; font-size: 11px; }
  .leaflet-control-zoom a {
    background: #14120c !important; color: #d4af37 !important;
    border-color: rgba(212,175,55,0.35) !important;
  }
  .leaflet-control-attribution {
    background: rgba(10,10,10,0.75) !important; color: #8c8471 !important; font-size: 10px;
  }
  .leaflet-control-attribution a { color: #b8a15a !important; }
`;
