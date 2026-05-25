import type { HomepageSection } from '@/types/database';

/**
 * Editorial "About Charters Gold" block. Content is now driven by the
 * homepage_sections row with section_key='brand_intro' (migration 019).
 * If the row is missing or unreachable, the hardcoded DEFAULT block below
 * keeps the page intact — preserving the SEO body-copy floor we built
 * this section for in the first place.
 *
 * The admin can split or merge paragraphs by adding/removing blank lines
 * in the body field. The render preserves whatever structure is saved.
 */
const DEFAULT_EYEBROW = 'About Charters Gold';
const DEFAULT_TITLE = 'A Private Valuation House for Gold & Jewellery';
const DEFAULT_BODY = `Charters Gold is an independent UK precious-metal buyer based in Egham, Surrey, specialising in the discreet valuation and purchase of gold, fine jewellery, luxury watches and designer handbags. Every piece is assessed in person by an experienced specialist — never weighed in a window or priced by an algorithm — so the offer you receive reflects what your gold and jewellery are genuinely worth on today's market.

Our approach is built around three principles: a fair price tied to the live spot gold price, total transparency about how that price is calculated, and same-day payment by bank transfer the moment you accept. Whether you are selling a single inherited ring, a collection of scrap gold, sovereigns, gold bars, a Rolex or Patek Philippe watch, or a pre-loved Hermès or Chanel handbag, the process is the same: upload photos and a few details, receive a written valuation within one working day, and choose whether to proceed.

We work by private appointment from our Surrey base and welcome clients from across London and the wider South-East who prefer a quiet, considered service over a busy high-street counter. Use the live gold calculator below for an instant guide price per gram across 9ct, 14ct, 18ct, 22ct and 24ct gold, then request a private valuation when you are ready for a firm offer.`;

function paragraphs(body: string): string[] {
  return body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

export function BrandIntro({ section }: { section?: HomepageSection }) {
  const title = section?.title ?? DEFAULT_TITLE;
  const subtitle = section?.subtitle ?? null;
  const body = section?.body ?? DEFAULT_BODY;

  return (
    <section className="relative border-b border-gold-metallic/15 py-6 lg:py-10">
      <div className="gc-container">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <h2 className="gc-heading">{title}</h2>
            {subtitle && (
              <p className="mt-3 text-sm uppercase tracking-luxe text-gold-tint">
                {subtitle}
              </p>
            )}
          </div>

          <div className="mt-7 space-y-5 text-[15px] leading-relaxed text-warmgrey">
            {paragraphs(body).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
