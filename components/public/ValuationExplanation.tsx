import type { HomepageSection } from '@/types/database';

type Extra = { criteria?: string[] };

export function ValuationExplanation({ section }: { section?: HomepageSection }) {
  if (!section) return null;
  const extra = (section.extra ?? {}) as Extra;
  const criteria = extra.criteria ?? [];

  return (
    <section className="relative border-y border-gold-metallic/15 py-6 lg:py-10">
      <div className="gc-container">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr,1.1fr] lg:gap-12">
          <div>
            <h2 className="gc-heading">{section.title}</h2>
            {section.subtitle && (
              <p className="mt-3 text-sm uppercase tracking-luxe text-gold-tint">{section.subtitle}</p>
            )}
            <p className="gc-subhead mt-6 max-w-xl">{section.body}</p>
          </div>

          <div className="gc-card gc-card-gold-edge p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-luxe text-gold-metallic">
              Factors We Consider
            </p>
            {/* Flowing pills instead of a 2-column grid. An odd number of
                criteria (e.g. 9) used to leave a single orphan card on the
                last row; pills wrap naturally and always look balanced. */}
            <ul className="mt-5 flex flex-wrap gap-2">
              {criteria.map((item) => (
                <li
                  key={item}
                  className="inline-flex items-center gap-2 rounded-full border border-gold-metallic/20 bg-ink-900/60 px-3.5 py-1.5 text-[13px] text-white transition hover:border-gold-metallic/50 hover:bg-ink-800/60"
                >
                  <span
                    aria-hidden
                    className="h-1.5 w-1.5 rounded-full"
                    style={{
                      background: 'linear-gradient(135deg, #FFD700, #B8860B)',
                      boxShadow: '0 0 5px rgba(212,175,55,0.55)',
                    }}
                  />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
