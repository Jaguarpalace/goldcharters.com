/**
 * Single source of truth for every option list shown on the public valuation
 * form. Both the client form component AND the server-side validator import
 * from this module — keep them in sync forever.
 *
 * Each list is exported as a `readonly` const array so TypeScript can derive a
 * literal-type union. The matching `Set<...>` is also exported for cheap
 * O(1) server-side allow-list checks.
 *
 * When you add or rename an option:
 *   1. Edit the array here.
 *   2. Run the typecheck — the form component and the server action will
 *      reject mismatches automatically.
 *   3. If the option is persisted to the database, update the DB CHECK
 *      constraint in the most recent migration (or add a new one).
 */

/* ---------------------------------------------------------------- Metal */

export const METAL_OPTIONS = ['Gold', 'Silver', 'Platinum'] as const;
export type Metal = (typeof METAL_OPTIONS)[number];
export const ALLOWED_METALS = new Set<string>(METAL_OPTIONS);

/* ----------------------------------------------------- Item category */

export const ITEM_FORM_OPTIONS = [
  'Coins',
  'Bullion',
  'Scrap',
  'Jewellery',
  'Other',
] as const;
export type ItemForm = (typeof ITEM_FORM_OPTIONS)[number];
export const ALLOWED_ITEM_FORMS = new Set<string>(ITEM_FORM_OPTIONS);

/* ----------------------------------------------------- Jewellery type */

export const JEWELLERY_TYPE_OPTIONS = [
  'Ring',
  'Necklace',
  'Bracelet',
  'Earrings',
  'Pendant',
  'Other',
] as const;
export type JewelleryType = (typeof JEWELLERY_TYPE_OPTIONS)[number];
export const ALLOWED_JEWELLERY_TYPES = new Set<string>(JEWELLERY_TYPE_OPTIONS);

/* -------------------------------------------------------- Gemstone */

export const GEMSTONE_OPTIONS = [
  'Diamond',
  'Sapphire',
  'Ruby',
  'Emerald',
  'Other',
  'None',
] as const;
export type Gemstone = (typeof GEMSTONE_OPTIONS)[number];
export const ALLOWED_GEMSTONES = new Set<string>(GEMSTONE_OPTIONS);

/* -------------------------------------------------- Watch + handbag */

export const WATCH_BRANDS = [
  'Rolex',
  'Patek Philippe',
  'Audemars Piguet',
  'Omega',
  'Cartier',
  'IWC',
  'Jaeger-LeCoultre',
  'Other',
] as const;
export type WatchBrand = (typeof WATCH_BRANDS)[number];
export const ALLOWED_WATCH_BRANDS = new Set<string>(WATCH_BRANDS);

export const HANDBAG_BRANDS = [
  'Hermès',
  'Chanel',
  'Louis Vuitton',
  'Dior',
  'Gucci',
  'Prada',
  'Bottega Veneta',
  'Other',
] as const;
export type HandbagBrand = (typeof HANDBAG_BRANDS)[number];
export const ALLOWED_HANDBAG_BRANDS = new Set<string>(HANDBAG_BRANDS);

/* ---------------------------------------------------- Condition */

export const CONDITION_OPTIONS = ['Excellent', 'Good', 'Fair', 'Worn'] as const;
export type Condition = (typeof CONDITION_OPTIONS)[number];
export const ALLOWED_CONDITIONS = new Set<string>(CONDITION_OPTIONS);

/* ---------------------------------------------------- Box + papers
 *
 * Drift fixed in this refactor:
 *   - The public form has always shown 4 options (All / Box only / Papers
 *     only / Neither).
 *   - The previous server validator quietly allowed a fifth value ('Some')
 *     that the form never offered.
 *   - We collapse on the form's set as the truth. The migration that adds
 *     the DB CHECK backfills any orphan 'Some' rows to 'Box only' so the
 *     constraint cleanly holds.
 */

export const BOX_PAPERS_OPTIONS = [
  'All',
  'Box only',
  'Papers only',
  'Neither',
] as const;
export type BoxPapers = (typeof BOX_PAPERS_OPTIONS)[number];
export const ALLOWED_BOX_PAPERS = new Set<string>(BOX_PAPERS_OPTIONS);

/* ------------------------------------------------------- Purity */

/** Display option for a purity dropdown. The empty `value` means "not sure". */
export type PurityOption = { value: string; label: string };

export const GOLD_PURITY: readonly PurityOption[] = [
  { value: '', label: "I'm not sure" },
  { value: '9ct', label: '9ct (37.5%)' },
  { value: '10ct', label: '10ct (41.7%)' },
  { value: '14ct', label: '14ct (58.5%)' },
  { value: '18ct', label: '18ct (75.0%)' },
  { value: '20ct', label: '20ct (83.3%)' },
  { value: '21ct', label: '21ct (87.5%)' },
  { value: '22ct', label: '22ct (91.6%)' },
  { value: '24ct', label: '24ct (99.9%)' },
];

export const SILVER_PURITY: readonly PurityOption[] = [
  { value: '', label: "I'm not sure" },
  { value: '999 silver', label: 'Fine silver - 999 (99.9%)' },
  { value: '958 silver', label: 'Britannia - 958 (95.8%)' },
  { value: '925 silver', label: 'Sterling - 925 (92.5%)' },
  { value: '900 silver', label: 'Coin silver - 900 (90%)' },
];

export const PLATINUM_PURITY: readonly PurityOption[] = [
  { value: '', label: "I'm not sure" },
  { value: '950 platinum', label: '950 (95%)' },
  { value: '900 platinum', label: '900 (90%)' },
  { value: '850 platinum', label: '850 (85%)' },
];

/** Every purity value that the form can submit (excluding the empty "not sure"). */
export const ALL_PURITY_VALUES: readonly string[] = [
  ...GOLD_PURITY,
  ...SILVER_PURITY,
  ...PLATINUM_PURITY,
]
  .map((p) => p.value)
  .filter((v) => v.length > 0);

export const ALLOWED_PURITIES = new Set<string>(ALL_PURITY_VALUES);

export function purityOptionsFor(metal: string | null | undefined): readonly PurityOption[] {
  if (metal === 'Silver') return SILVER_PURITY;
  if (metal === 'Platinum') return PLATINUM_PURITY;
  return GOLD_PURITY;
}

export function purityLabelFor(metal: string | null | undefined): string {
  if (metal === 'Silver') return 'What silver fineness?';
  if (metal === 'Platinum') return 'What platinum fineness?';
  return 'What carat?';
}

export function purityHintFor(metal: string | null | undefined): string {
  if (metal === 'Silver') {
    return 'Silver purity is stamped as parts per 1,000. Common marks: 925 (Sterling) or 999 (fine).';
  }
  if (metal === 'Platinum') {
    return 'Platinum purity is stamped as parts per 1,000. 950 is the most common.';
  }
  return "Look for a hallmark stamp - 9, 14, 18, 22, 24 etc. Leave blank if you're not sure.";
}

/**
 * Convert a stored purity string (e.g. '22ct', '925 silver', '950 platinum')
 * to a percentage fraction 0–100. Returns null for empty or unrecognised
 * values. Used by the holdings ledger to compute live spot value.
 */
export function purityToPercent(carat: string | null | undefined): number | null {
  if (!carat) return null;
  const c = carat.toLowerCase().replace(/\s+/g, ' ').trim();
  // Gold carats
  const carats: Record<string, number> = {
    '9ct': 37.5,
    '10ct': 41.7,
    '14ct': 58.5,
    '18ct': 75.0,
    '20ct': 83.3,
    '21ct': 87.5,
    '22ct': 91.6,
    '24ct': 99.9,
  };
  for (const key in carats) {
    if (c.startsWith(key)) return carats[key];
  }
  // Silver fineness
  if (c.startsWith('999')) return 99.9;
  if (c.startsWith('958')) return 95.8;
  if (c.startsWith('925')) return 92.5;
  if (c.startsWith('900') && c.includes('silver')) return 90.0;
  // Platinum fineness
  if (c.startsWith('950')) return 95.0;
  if (c.startsWith('900') && c.includes('platinum')) return 90.0;
  if (c.startsWith('850')) return 85.0;
  return null;
}

/**
 * Normalise a free-text carat/purity entry into one of the exact values the
 * stock_items carat CHECK constraint accepts, or null when it can't be
 * mapped (null is always accepted). "24" -> "24ct", "925" on silver ->
 * "925 silver", "sterling" -> "925 silver", "750" on gold -> "18ct".
 * Keeps line-to-holdings imports from ever failing on carat wording.
 */
export function normaliseCaratForHoldings(
  metalRaw: string | null | undefined,
  caratRaw: string | null | undefined,
): string | null {
  if (!caratRaw) return null;
  const c = caratRaw.toLowerCase().replace(/\s+/g, '');
  const metal = (metalRaw ?? '').trim().toLowerCase();

  // Named silver standards
  if (c.includes('sterling')) return '925 silver';
  if (c.includes('britannia')) return '958 silver';

  const digits = c.match(/^(\d{1,3})(?:ct|kt|k|carat|karat)?(?:gold|silver|platinum|plat)?$/)?.[1];
  if (!digits) {
    // Already in canonical form? ("9ct", "925 silver", "950 platinum")
    const canon = caratRaw.trim().toLowerCase();
    const allowed = [
      '9ct', '10ct', '14ct', '18ct', '20ct', '21ct', '22ct', '24ct',
      '999 silver', '958 silver', '925 silver', '900 silver',
      '950 platinum', '900 platinum', '850 platinum',
    ];
    return allowed.includes(canon) ? canon : null;
  }
  const n = Number(digits);

  // Plain gold carats
  if ([9, 10, 14, 18, 20, 21, 22, 24].includes(n)) return `${n}ct`;

  // Three-digit fineness - disambiguate by metal where it matters
  if (metal === 'silver' || c.includes('silver')) {
    if ([999, 958, 925, 900].includes(n)) return `${n} silver`;
    return null;
  }
  if (metal === 'platinum' || c.includes('plat')) {
    if ([950, 900, 850].includes(n)) return `${n} platinum`;
    return null;
  }
  // Gold fineness marks
  const goldFineness: Record<number, string> = {
    375: '9ct', 417: '10ct', 585: '14ct', 750: '18ct',
    833: '20ct', 875: '21ct', 916: '22ct', 917: '22ct', 990: '24ct', 999: '24ct',
  };
  if (metal === 'gold' && goldFineness[n]) return goldFineness[n];
  // No metal hint: unique fineness values are still safe to map
  if (!metal && goldFineness[n] && ![999, 900].includes(n)) return goldFineness[n];
  if (!metal && [958, 925].includes(n)) return `${n} silver`;
  if (!metal && [950, 850].includes(n)) return `${n} platinum`;
  return null;
}

/** Normalise a free-text metal entry to the stock_items vocabulary, or null. */
export function normaliseMetalForHoldings(metalRaw: string | null | undefined): string | null {
  const m = (metalRaw ?? '').trim().toLowerCase();
  if (m.startsWith('gold')) return 'Gold';
  if (m.startsWith('silver')) return 'Silver';
  if (m.startsWith('plat')) return 'Platinum';
  if (m.startsWith('pall')) return 'Palladium';
  return null;
}
