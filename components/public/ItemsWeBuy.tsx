import type { ItemWeBuy } from '@/types/database';

/**
 * Categorise items by the keywords in their name so we can group them
 * under "Gold", "Fine Jewellery", "Designer Handbags" and "Luxury Watches"
 * headings — much cleaner than a flat grid of 30 identical cards.
 *
 * The DB column isn't constrained, so this is best-effort: anything we
 * can't classify falls through to Fine Jewellery (the catch-all category).
 */
type Category = 'gold' | 'jewellery' | 'handbags' | 'watches';

const CATEGORY_LABELS: Record<Category, string> = {
  gold: 'Gold',
  jewellery: 'Fine Jewellery',
  handbags: 'Designer Handbags',
  watches: 'Luxury Watches',
};

// Order in which the categories render down the page.
const CATEGORY_ORDER: Category[] = ['gold', 'jewellery', 'handbags', 'watches'];

const WATCH_KEYWORDS = [
  'watch',
  'rolex',
  'patek',
  'audemars',
  'omega',
  'cartier',
  'breitling',
  'panerai',
  'tag heuer',
  'iwc',
  'jaeger',
];
const HANDBAG_KEYWORDS = [
  'handbag',
  'hermès',
  'hermes',
  'chanel',
  'louis vuitton',
  'gucci',
  'prada',
  'dior',
  'fendi',
];
const GOLD_KEYWORDS = [
  'gold ',
  'scrap',
  'broken',
  'sovereign',
  'bullion',
  'gold bar',
];

function categorise(name: string): Category {
  const n = name.toLowerCase();
  if (WATCH_KEYWORDS.some((k) => n.includes(k))) return 'watches';
  if (HANDBAG_KEYWORDS.some((k) => n.includes(k))) return 'handbags';
  if (GOLD_KEYWORDS.some((k) => n.includes(k))) return 'gold';
  return 'jewellery';
}

export function ItemsWeBuy({ items }: { items: ItemWeBuy[] }) {
  // Group items by category, preserving the admin's display_order within each.
  const grouped = items.reduce<Record<Category, ItemWeBuy[]>>(
    (acc, item) => {
      const c = categorise(item.name);
      acc[c].push(item);
      return acc;
    },
    { gold: [], jewellery: [], handbags: [], watches: [] },
  );

  const visibleCategories = CATEGORY_ORDER.filter((c) => grouped[c].length > 0);

  return (
    <section className="relative py-6 lg:py-10">
      <div className="gc-container">
        <div className="mx-auto max-w-3xl text-center">
          <span className="gc-eyebrow">What We Accept</span>
          <h2 className="gc-heading mt-3">Gold &amp; Jewellery We Buy</h2>
          <p className="gc-subhead mt-3">
            A non-exhaustive list of the pieces our specialists value most frequently. If you have
            something unusual, please request a private valuation.
          </p>
        </div>

        {/* Stacked, centered category blocks. Each section is full-width so
            categories with 4 pills and categories with 10 pills both look
            balanced rather than left-aligned and ragged. */}
        <div className="mx-auto mt-8 max-w-5xl space-y-6">
          {visibleCategories.map((category, idx) => (
            <div key={category} className="text-center">
              <div className="mb-3 flex items-center justify-center gap-3">
                <span className="h-px w-8 bg-gradient-to-r from-transparent to-gold-metallic/50" aria-hidden />
                <h3 className="text-[10px] font-semibold uppercase tracking-luxe text-gold-metallic">
                  {CATEGORY_LABELS[category]}
                </h3>
                <span className="h-px w-8 bg-gradient-to-l from-transparent to-gold-metallic/50" aria-hidden />
              </div>
              <ul className="flex flex-wrap justify-center gap-1.5">
                {grouped[category].map((item) => (
                  <li key={item.id}>
                    <span className="inline-flex items-center rounded-full border border-gold-metallic/25 bg-ink-900/50 px-3.5 py-1 text-[12px] text-warmgrey transition hover:border-gold-metallic hover:bg-ink-800/70 hover:text-gold-bright">
                      {item.name}
                    </span>
                  </li>
                ))}
              </ul>
              {idx < visibleCategories.length - 1 && (
                <div className="mx-auto mt-6 h-px w-24 bg-gold-metallic/15" aria-hidden />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
