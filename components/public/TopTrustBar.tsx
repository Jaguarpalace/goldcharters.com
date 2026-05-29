import type { SiteSettings } from '@/types/database';
import { LiveGoldTicker } from './LiveGoldTicker';

export function TopTrustBar({ settings }: { settings: SiteSettings }) {
  const items = [
    settings.top_bar_review_text,
    settings.top_bar_trust_text,
    settings.top_bar_payment_text,
  ].filter(Boolean) as string[];

  return (
    <div className="relative z-30 border-b border-gold-metallic/15 bg-ink-950">
      <div className="gc-container flex flex-col gap-1 py-2 text-[11px] uppercase tracking-luxe text-warmgrey sm:flex-row sm:items-center sm:justify-between">
        <ul className="flex flex-wrap items-center gap-x-6 gap-y-1">
          {items.map((item) => (
            <li key={item} className="flex items-center gap-2">
              <span aria-hidden className="inline-block h-1 w-1 rounded-full bg-gold-metallic" />
              <span>{item}</span>
            </li>
          ))}
          {/* Live gold price - renders nothing if the API key isn't configured */}
          <li className="flex items-center gap-2">
            <LiveGoldTicker />
          </li>
        </ul>
        <a
          href={`tel:${settings.phone.replace(/\s+/g, '')}`}
          className="font-medium text-gold-tint hover:text-gold-bright"
        >
          Call now: {settings.phone}
        </a>
      </div>
    </div>
  );
}
