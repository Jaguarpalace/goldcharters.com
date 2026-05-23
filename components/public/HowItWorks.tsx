'use client';

import { useState } from 'react';
import { BUY_ENABLED } from '@/lib/features';

type Step = { title: string; body: string };

const SELL_STEPS: Step[] = [
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

const BUY_STEPS: Step[] = [
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

export function HowItWorks({ asH1 = false }: { asH1?: boolean }) {
  const [tab, setTab] = useState<'sell' | 'buy'>('sell');
  const steps = tab === 'sell' ? SELL_STEPS : BUY_STEPS;
  const HeadingTag = asH1 ? 'h1' : 'h2';
  const headingClass = asH1 ? 'gc-heading-xl mt-4' : 'gc-heading mt-3';

  return (
    <section className="relative border-y border-gold-metallic/15 py-6 lg:py-10">
      <div className="gc-container">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <span className="gc-eyebrow">How It Works</span>
            <HeadingTag className={headingClass}>A Considered, Step-by-Step Process</HeadingTag>
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

        <ol className="mt-8 grid gap-4 sm:grid-cols-3 lg:gap-5">
          {steps.map((step, i) => (
            <li key={step.title} className="gc-card gc-card-gold-edge p-7">
              <div className="flex items-center gap-3 text-gold-metallic">
                <span
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-ink-950"
                  style={{
                    background: 'linear-gradient(135deg, #FFD700, #D4AF37 60%, #B8860B)',
                    boxShadow: '0 0 14px rgba(212,175,55,0.5)',
                  }}
                >
                  {i + 1}
                </span>
                <span className="text-xs font-medium uppercase tracking-luxe">Step {i + 1}</span>
              </div>
              <h3 className="font-display text-2xl text-white mt-4">{step.title}</h3>
              <p className="mt-3 text-sm text-warmgrey">{step.body}</p>
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
