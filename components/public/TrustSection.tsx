import type { TrustCard } from '@/types/database';

export function TrustSection({ cards }: { cards: TrustCard[] }) {
  return (
    <section className="relative py-6 lg:py-10">
      <div className="gc-container">
        <div className="mx-auto max-w-3xl text-center">
          <span className="gc-eyebrow">Why Clients Trust Us</span>
          <h2 className="gc-heading mt-3">A Service Built on Discretion</h2>
        </div>
        <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {cards.map((card) => (
            <li key={card.id} className="gc-card flex items-start gap-4 p-5">
              <span
                aria-hidden
                className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-full"
                style={{
                  background: 'linear-gradient(135deg, #A67C00, #D4AF37, #FFD700, #B8860B)',
                  boxShadow: '0 0 12px rgba(212,175,55,0.5)',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#050505" strokeWidth="2">
                  <path d="M2 7.5L5 10.5L11 4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <p className="text-sm font-medium text-white">{card.title}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
