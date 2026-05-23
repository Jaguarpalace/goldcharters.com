'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useCart } from '@/lib/cart/cartStore';
import { placeOrder } from '@/lib/actions/orders';
import { formatGBP } from '@/lib/format';

export function CheckoutForm() {
  const items = useCart((s) => s.items);
  const clear = useCart((s) => s.clear);
  const hydrated = useCart((s) => s.hydrated);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ id: string; persisted: boolean } | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!hydrated) {
    return <div className="gc-card p-10 text-center text-sm text-warmgrey">Loading…</div>;
  }

  if (!success && items.length === 0) {
    return (
      <div className="gc-card gc-card-gold-edge p-10 text-center">
        <h2 className="font-display text-3xl text-white">Your basket is empty</h2>
        <p className="mt-3 text-sm text-warmgrey">Add a piece to your basket to continue.</p>
        <Link href="/shop" className="gc-btn-primary mt-6 inline-flex">
          View Collection
        </Link>
      </div>
    );
  }

  const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const deliveryFee = subtotal >= 500 ? 0 : 25;
  const total = subtotal + deliveryFee;

  if (success) {
    return (
      <div className="gc-card gc-card-gold-edge p-10 text-center">
        <h2 className="font-display text-3xl text-white">Thank you for your order</h2>
        <p className="mt-3 text-sm text-warmgrey">
          A confirmation has been sent to your inbox and our team will be in touch shortly to arrange
          secure payment and dispatch.
        </p>
        <p className="mt-2 text-xs text-warmgrey/70">
          Order reference: <span className="font-mono text-gold-tint">{success.id}</span>
          {!success.persisted && ' · Demo mode'}
        </p>
        <Link href="/shop" className="gc-btn-secondary mt-6 inline-flex">
          Continue browsing
        </Link>
      </div>
    );
  }

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setServerError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await placeOrder(formData, items);
      if (result.ok) {
        clear();
        setSuccess({ id: result.orderId, persisted: result.persisted });
      } else {
        setServerError(result.error);
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="grid gap-8 lg:grid-cols-[1.5fr,1fr]">
      <div className="space-y-7">
        <section className="gc-card gc-card-gold-edge p-7 sm:p-9">
          <h2 className="font-display text-2xl text-white">Your Details</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <Field label="Full name" name="customer_name" required />
            <Field label="Phone" name="customer_phone" type="tel" required />
            <Field label="Email" name="customer_email" type="email" required className="sm:col-span-2" />
          </div>
        </section>

        <section className="gc-card gc-card-gold-edge p-7 sm:p-9">
          <h2 className="font-display text-2xl text-white">Delivery & Billing</h2>
          <div className="mt-6 grid gap-5">
            <TextArea label="Billing address" name="billing_address" rows={3} required />
            <TextArea
              label="Delivery address (leave blank to use billing)"
              name="delivery_address"
              rows={3}
            />
            <div>
              <label className="gc-label">Delivery method</label>
              <select name="delivery_method" defaultValue="Tracked & Signed (UK)" className="gc-input">
                <option className="bg-ink-950">Tracked & Signed (UK)</option>
                <option className="bg-ink-950">Special Delivery (UK Next Day)</option>
                <option className="bg-ink-950">Collection in person (by appointment)</option>
              </select>
            </div>
            <TextArea label="Order notes (optional)" name="notes" rows={3} />
          </div>
        </section>

        <section className="gc-card gc-card-gold-edge p-7 sm:p-9">
          <h2 className="font-display text-2xl text-white">Payment</h2>
          <p className="mt-3 text-sm text-warmgrey">
            Once your order is confirmed, we will email you a secure payment link from our card processor.
            Stripe integration can be enabled in production by adding payment intent generation in the
            order server action.
          </p>
          <div className="mt-4 rounded-xl border border-gold-metallic/20 bg-ink-900/60 px-4 py-3 text-xs text-warmgrey">
            Stripe placeholder — server action structure is ready for{' '}
            <code className="text-gold-tint">stripe.paymentIntents.create</code> integration.
          </div>
        </section>

        {serverError && (
          <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
            {serverError}
          </p>
        )}
      </div>

      <aside className="gc-card gc-card-gold-edge h-fit p-7 sm:p-8">
        <h2 className="font-display text-2xl text-white">Your Order</h2>
        <ul className="mt-5 space-y-3 text-sm">
          {items.map((item) => (
            <li key={item.productId} className="flex items-start justify-between gap-3">
              <div>
                <p className="text-white">{item.title}</p>
                <p className="text-xs text-warmgrey">
                  Qty {item.quantity} {item.sku ? `· ${item.sku}` : ''}
                </p>
              </div>
              <span className="font-medium text-gold-tint">
                {formatGBP(item.unitPrice * item.quantity)}
              </span>
            </li>
          ))}
        </ul>
        <div className="my-5 gc-divider" />
        <dl className="space-y-2 text-sm text-warmgrey">
          <Row label="Subtotal" value={formatGBP(subtotal)} />
          <Row
            label="Delivery"
            value={deliveryFee === 0 ? 'Complimentary' : formatGBP(deliveryFee)}
          />
        </dl>
        <div className="mt-5 flex items-baseline justify-between">
          <span className="text-xs uppercase tracking-luxe text-gold-tint">Total</span>
          <span className="font-display text-3xl text-white">{formatGBP(total)}</span>
        </div>
        <button type="submit" disabled={isPending} className="gc-btn-primary mt-6 w-full">
          {isPending ? 'Placing order…' : 'Proceed to Secure Payment'}
        </button>
        <p className="mt-3 text-[11px] leading-relaxed text-warmgrey/70">
          By placing your order you agree to our terms. Unique items are reserved while your payment is
          confirmed.
        </p>
      </aside>
    </form>
  );
}

function Field({
  label,
  name,
  type = 'text',
  required,
  className = '',
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="gc-label" htmlFor={name}>
        {label}
      </label>
      <input id={name} name={name} type={type} required={required} className="gc-input" />
    </div>
  );
}

function TextArea({
  label,
  name,
  rows = 3,
  required,
}: {
  label: string;
  name: string;
  rows?: number;
  required?: boolean;
}) {
  return (
    <div>
      <label className="gc-label" htmlFor={name}>
        {label}
      </label>
      <textarea id={name} name={name} rows={rows} required={required} className="gc-input" />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt>{label}</dt>
      <dd className="text-white">{value}</dd>
    </div>
  );
}
