import type { ItemWeBuy } from '@/types/database';

export function ItemsWeBuy({ items }: { items: ItemWeBuy[] }) {
  return (
    <section className="relative py-6 lg:py-10">
      <div className="gc-container">
        <div className="mx-auto max-w-3xl text-center">
          <span className="gc-eyebrow">What We Accept</span>
          <h2 className="gc-heading mt-3">Gold & Jewellery We Buy</h2>
          <p className="gc-subhead mt-4">
            A non-exhaustive list of the pieces our specialists value most frequently. If you have something
            unusual, please request a private valuation.
          </p>
        </div>

        <ul className="mt-8 grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 lg:gap-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="gc-card group flex items-center gap-3 p-4 transition-colors hover:bg-ink-800/60"
            >
              <span
                aria-hidden
                className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-lg"
                style={{
                  background: 'linear-gradient(135deg, rgba(212,175,55,0.18), rgba(255,215,0,0.08))',
                  boxShadow: 'inset 0 0 0 1px rgba(212,175,55,0.4)',
                }}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-gold-bright" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M4 9l8-4 8 4-8 4z" />
                  <path d="M4 9v8l8 4 8-4V9" />
                </svg>
              </span>
              <span className="text-sm font-medium text-white group-hover:text-gold-bright">
                {item.name}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
