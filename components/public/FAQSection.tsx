'use client';

import { useMemo, useState } from 'react';
import type { Faq, FaqCategory } from '@/types/database';
import { FAQ_CATEGORY_LABELS, groupFaqsByCategory } from '@/lib/format';

export function FAQSection({ faqs, asH1 = false }: { faqs: Faq[]; asH1?: boolean }) {
  const grouped = useMemo(() => groupFaqsByCategory(faqs), [faqs]);
  const categories = (Object.keys(grouped) as FaqCategory[]).filter((c) => grouped[c].length > 0);
  const [activeCategory, setActiveCategory] = useState<FaqCategory>(categories[0] ?? 'selling_gold');
  const [openId, setOpenId] = useState<string | null>(null);

  const HeadingTag = asH1 ? 'h1' : 'h2';
  const headingClass = asH1 ? 'gc-heading-xl mt-4' : 'gc-heading mt-3';

  return (
    <section className="relative py-6 lg:py-10">
      <div className="gc-container">
        <div className="mx-auto max-w-3xl text-center">
          <span className="gc-eyebrow">Frequently Asked</span>
          <HeadingTag className={headingClass}>Answers, Considered & Direct</HeadingTag>
        </div>

        <div className="mt-10 flex flex-wrap justify-center gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={
                'rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-luxe transition ' +
                (activeCategory === cat
                  ? 'bg-gold-gradient text-ink-950 shadow-[0_0_14px_rgba(212,175,55,0.4)]'
                  : 'border border-gold-metallic/30 text-warmgrey hover:text-gold-bright')
              }
            >
              {FAQ_CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        <div className="mx-auto mt-10 max-w-3xl space-y-3">
          {grouped[activeCategory].map((faq) => {
            const open = openId === faq.id;
            return (
              <div key={faq.id} className="gc-card overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : faq.id)}
                  className="flex w-full items-center justify-between gap-6 px-6 py-5 text-left"
                  aria-expanded={open}
                >
                  <span className="font-medium text-white">{faq.question}</span>
                  <span
                    aria-hidden
                    className={
                      'inline-flex h-7 w-7 flex-none items-center justify-center rounded-full border border-gold-metallic/40 text-gold-metallic transition ' +
                      (open ? 'rotate-45 text-gold-bright' : '')
                    }
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6">
                      <path d="M6 2v8M2 6h8" />
                    </svg>
                  </span>
                </button>
                {open && (
                  <div className="border-t border-gold-metallic/15 px-6 py-5 text-sm text-warmgrey">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
