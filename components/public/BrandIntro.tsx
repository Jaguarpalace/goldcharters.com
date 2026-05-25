/**
 * Editorial introduction shown on the homepage between the hero and the
 * service cards. Pure prose, not driven by the CMS, so the page always
 * carries enough body copy for SEO crawlers (which count <p> elements
 * and total word count) regardless of how the admin has filled in the
 * homepage_sections table.
 */
export function BrandIntro() {
  return (
    <section className="relative border-b border-gold-metallic/15 py-6 lg:py-10">
      <div className="gc-container">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <span className="gc-eyebrow">About Charters Gold</span>
            <h2 className="gc-heading mt-3">A Private Valuation House for Gold &amp; Jewellery</h2>
          </div>

          <div className="mt-7 space-y-5 text-[15px] leading-relaxed text-warmgrey">
            <p>
              Charters Gold is an independent UK precious-metal buyer based in Egham, Surrey,
              specialising in the discreet valuation and purchase of gold, fine jewellery, luxury
              watches and designer handbags. Every piece is assessed in person by an experienced
              specialist — never weighed in a window or priced by an algorithm — so the offer you
              receive reflects what your gold and jewellery are genuinely worth on today's market.
            </p>

            <p>
              Our approach is built around three principles: a fair price tied to the live spot
              gold price, total transparency about how that price is calculated, and same-day
              payment by bank transfer the moment you accept. Whether you are selling a single
              inherited ring, a collection of scrap gold, sovereigns, gold bars, a Rolex or
              Patek Philippe watch, or a pre-loved Hermès or Chanel handbag, the process is the
              same: upload photos and a few details, receive a written valuation within one
              working day, and choose whether to proceed.
            </p>

            <p>
              We have served private clients across Surrey, London and the wider South-East for
              over a decade and routinely act as the trusted alternative to Hatton Garden for
              sellers who prefer a quieter, appointment-led service. Use the live gold calculator
              below for an instant guide price per gram across 9ct, 14ct, 18ct, 22ct and 24ct
              gold, then request a private valuation when you are ready for a firm offer.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
