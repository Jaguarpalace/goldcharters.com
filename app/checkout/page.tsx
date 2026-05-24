import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { CheckoutForm } from '@/components/shop/CheckoutForm';
import { BUY_ENABLED } from '@/lib/features';

export const metadata: Metadata = {
  title: 'Secure Checkout',
  robots: BUY_ENABLED ? undefined : { index: false, follow: false },
};

export default function CheckoutPage() {
  if (!BUY_ENABLED) redirect('/');
  return (
    <section className="py-8 lg:py-16">
      <div className="gc-container">
        <span className="gc-eyebrow">Secure Checkout</span>
        <h1 className="gc-heading mt-3">Complete Your Order</h1>
        <p className="gc-subhead mt-3 max-w-2xl">
          Your details are used only to fulfil your order. Unique pieces are reserved while we confirm
          payment.
        </p>
        <div className="mt-10">
          <CheckoutForm />
        </div>
      </div>
    </section>
  );
}
