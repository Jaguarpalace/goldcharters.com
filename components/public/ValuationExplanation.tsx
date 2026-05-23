import type { HomepageSection } from '@/types/database';

type Extra = { criteria?: string[] };

export function ValuationExplanation({ section }: { section?: HomepageSection }) {
  if (!section) return null;
  const extra = (section.extra ?? {}) as Extra;
  const criteria = extra.criteria ?? [];

  return (
    <section className="relative border-y border-gold-metallic/15 py-6 lg:py-10">
      <div className="gc-container">
        <div className="grid gap-8 lg:grid-cols-[1fr,1.1fr] lg:gap-12">
          <div>
            <span className="gc-eyebrow">Transparent Valuations</span>
            <h2 className="gc-heading mt-3">{section.title}</h2>
            {section.subtitle && (
              <p className="mt-3 text-sm uppercase tracking-luxe text-gold-tint">{section.subtitle}</p>
            )}
            <p className="gc-subhead mt-6 max-w-xl">{section.body}</p>
          </div>

          <div className="gc-card gc-card-gold-edge p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-luxe text-gold-metallic">
              Factors We Consider
            </p>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {criteria.map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-3 rounded-xl border border-gold-metallic/15 bg-ink-900/60 px-4 py-3 text-sm text-white"
                >
                  <span
                    aria-hidden
                    className="h-2 w-2 rounded-full"
                    style={{
                      background: 'linear-gradient(135deg, #FFD700, #B8860B)',
                      boxShadow: '0 0 6px rgba(212,175,55,0.6)',
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
