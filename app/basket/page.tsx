import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { BasketView } from '@/components/shop/BasketView';
import { BUY_ENABLED } from '@/lib/features';

export const metadata: Metadata = {
  title: 'Basket',
  robots: BUY_ENABLED ? undefined : { index: false, follow: false },
};

export default function BasketPage() {
  if (!BUY_ENABLED) redirect('/');
  return (
    <section className="py-8 lg:py-16">
      <div className="gc-container">
        <span className="gc-eyebrow">Your Basket</span>
        <h1 className="gc-heading mt-3">Items Held For You</h1>
        <div className="mt-10">
          <BasketView />
        </div>
      </div>
    </section>
  );
}
