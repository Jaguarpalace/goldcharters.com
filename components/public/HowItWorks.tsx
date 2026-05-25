'use client';

import { useState } from 'react';
import { BUY_ENABLED } from '@/lib/features';
import type { HomepageSection } from '@/types/database';

/**
 * "How It Works" three-step process. Steps are now driven by two CMS rows:
 *   - section_key='how_it_works_sell'  (selling-side steps)
 *   - section_key='how_it_works_buy'   (buying-side steps, BUY_ENABLED only)
 *
 * Each row stores its 3 steps inside `extra.steps` as an array of
 * { title, body } objects. Hardcoded DEFAULT_SELL_STEPS / DEFAULT_BUY_STEPS
 * keep the page intact if the row is absent or shape-drifted.
 */
type Step = { title: string; body: string };

const DEFAULT_SELL_STEPS: readonly Step[] = [
  {
    title: 'Upload Details or Visit Us',
    body: 'Tell us what you have, use the calculator, upload photos, or arrange a private valuation.',
  },
  {
    title: 'Receive Your Valuation',
    body: 'Our specialists assess your items professionally and explain your offer clearly.',
  },
  {
    title: 'Get Paid',
    body: 'Accept your offer and receive fast payment by bank transfer or cash where available.',
  },
];

const DEFAULT_BUY_STEPS: readonly Step[] = [
  {
    title: 'Browse The Collection',
    body: 'Explore selected jewellery and gold pieces available to purchase.',
  },
  {
    title: 'Add To Basket',
    body: 'View product details, check stock and add your chosen item to the basket.',
  },
  {
    title: 'Checkout Securely',
    body: 'Complete your order through a secure checkout flow.',
  },
];

function readSteps(extra: HomepageSection['extra']): Step[] | null {
  if (!extra || typeof extra !== 'object') return null;
  const raw = (extra as Record<string, unknown>).steps;
  if (!Array.isArray(raw)) return null;
  const parsed = raw
    .filter((s): s is Record<string, unknown> => !!s && typeof s === 'object')
    .map((s): Step | null => {
      const title = typeof s.title === 'string' ? s.title : null;
      const body = typeof s.body === 'string' ? s.body : null;
      if (!title || !body) return null;
      return { title, body };
    })
    .filter((s): s is Step => s !== null);
  return parsed.length > 0 ? parsed : null;
}

export function HowItWorks({
  asH1 = false,
  sellSection,
  buySection,
}: {
  asH1?: boolean;
  sellSection?: HomepageSection;
  buySection?: HomepageSection;
}) {
  const [tab, setTab] = useState<'sell' | 'buy'>('sell');
  const sellSteps =
    (sellSection ? readSteps(sellSection.extra) : null) ?? [...DEFAULT_SELL_STEPS];
  const buySteps =
    (buySection ? readSteps(buySection.extra) : null) ?? [...DEFAULT_BUY_STEPS];
  const steps = tab === 'sell' ? sellSteps : buySteps;
  // Heading + eyebrow + optional body subhead all come from whichever side
  // is showing — keeps the admin's labels in sync with the visible tab.
  const sourceSection = tab === 'sell' ? sellSection : buySection;
  const eyebrow = sourceSection?.subtitle ?? 'How It Works';
  const heading = sourceSection?.title ?? 'A Considered, Step-by-Step Process';
  const subhead = sourceSection?.body ?? null;
  const HeadingTag = asH1 ? 'h1' : 'h2';
  const headingClass = asH1 ? 'gc-heading-xl mt-4' : 'gc-heading mt-3';

  return (
    <section className="relative border-y border-gold-metallic/15 py-6 lg:py-10">
      <div className="gc-container">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <div className="max-w-2xl">
            <span className="gc-eyebrow">{eyebrow}</span>
            <HeadingTag className={headingClass}>{heading}</HeadingTag>
            {subhead && <p className="gc-subhead mt-3">{subhead}</p>}
          </div>
          {BUY_ENABLED && (
            <div className="inline-flex rounded-full border border-gold-metallic/30 bg-ink-900/80 p-1">
              <TabButton active={tab === 'sell'} onClick={() => setTab('sell')}>
                Selling To Us
              </TabButton>
              <TabButton active={tab === 'buy'} onClick={() => setTab('buy')}>
                Buying From Us
              </TabButton>
            </div>
          )}
        </div>

        <ol className="mt-6 grid grid-cols-1 gap-3 sm:mt-8 sm:grid-cols-3 sm:gap-4 lg:gap-5">
          {steps.map((step, i) => (
            <li key={step.title} className="gc-card gc-card-gold-edge p-5 sm:p-7">
              <div className="flex items-center gap-3 text-gold-metallic">
                <span
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold text-ink-950 sm:h-9 sm:w-9"
                  style={{
                    background: 'linear-gradient(135deg, #FFD700, #D4AF37 60%, #B8860B)',
                    boxShadow: '0 0 14px rgba(212,175,55,0.5)',
                  }}
                >
                  {i + 1}
                </span>
                <span className="text-xs font-medium uppercase tracking-luxe">Step {i + 1}</span>
              </div>
              <h3 className="mt-3 font-display text-xl text-white sm:mt-4 sm:text-2xl">{step.title}</h3>
              <p className="mt-2 text-sm text-warmgrey sm:mt-3">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-luxe transition ' +
        (active
          ? 'bg-gold-gradient text-ink-950 shadow-[0_0_16px_rgba(212,175,55,0.4)]'
          : 'text-warmgrey hover:text-gold-tint')
      }
    >
      {children}
    </button>
  );
}
