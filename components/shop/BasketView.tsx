'use client';

import Link from 'next/link';
import { useCart } from '@/lib/cart/cartStore';
import { formatGBP } from '@/lib/format';

export function BasketView() {
  const items = useCart((s) => s.items);
  const remove = useCart((s) => s.remove);
  const updateQuantity = useCart((s) => s.updateQuantity);
  const hydrated = useCart((s) => s.hydrated);

  if (!hydrated) {
    return (
      <div className="gc-card p-10 text-center text-sm text-warmgrey">Loading your basket…</div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="gc-card gc-card-gold-edge p-10 text-center">
        <h2 className="font-display text-3xl text-white">Your basket is empty</h2>
        <p className="mt-3 text-sm text-warmgrey">
          Browse our curated collection of gold and jewellery pieces.
        </p>
        <Link href="/shop" className="gc-btn-primary mt-6 inline-flex">
          View Collection
        </Link>
      </div>
    );
  }

  const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const deliveryFee = subtotal >= 500 ? 0 : 25;
  const total = subtotal + deliveryFee;

  return (
    <div className="grid gap-8 lg:grid-cols-[1.6fr,1fr]">
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.productId} className="gc-card flex gap-4 p-4">
            <div className="aspect-square h-24 w-24 flex-none overflow-hidden rounded-lg bg-ink-800">
              {item.imageUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover" />
              ) : (
                <div
                  className="h-full w-full"
                  style={{
                    background:
                      'linear-gradient(135deg, #141414, #1f1700 60%, #2a1f00), radial-gradient(50% 40% at 50% 30%, rgba(255,215,0,0.25), transparent 60%)',
                  }}
                />
              )}
            </div>
            <div className="flex flex-1 flex-col justify-between">
              <div>
                <Link
                  href={`/shop/${item.slug}`}
                  className="font-display text-lg text-white hover:text-gold-bright"
                >
                  {item.title}
                </Link>
                {item.sku && (
                  <p className="mt-0.5 text-xs text-warmgrey">SKU {item.sku}</p>
                )}
              </div>
              <div className="flex items-center justify-between gap-4">
                {item.maxQuantity > 1 ? (
                  <div className="inline-flex items-center rounded-full border border-gold-metallic/30">
                    <QtyButton
                      onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                      ariaLabel="Decrease"
                    >
                      −
                    </QtyButton>
                    <span className="px-3 text-sm font-medium text-white">{item.quantity}</span>
                    <QtyButton
                      onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                      disabled={item.quantity >= item.maxQuantity}
                      ariaLabel="Increase"
                    >
                      +
                    </QtyButton>
                  </div>
                ) : (
                  <span className="gc-pill">Unique piece · qty 1</span>
                )}

                <div className="flex items-center gap-4">
                  <span className="font-display text-lg text-gold-tint">
                    {formatGBP(item.unitPrice * item.quantity)}
                  </span>
                  <button
                    type="button"
                    onClick={() => remove(item.productId)}
                    className="text-xs uppercase tracking-luxe text-warmgrey hover:text-amber-300"
                    aria-label={`Remove ${item.title}`}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <aside className="gc-card gc-card-gold-edge h-fit p-6 sm:p-8">
        <h2 className="font-display text-2xl text-white">Order Summary</h2>
        <dl className="mt-6 space-y-3 text-sm">
          <SummaryRow label="Subtotal" value={formatGBP(subtotal)} />
          <SummaryRow
            label="Delivery (Tracked & Signed)"
            value={deliveryFee === 0 ? 'Complimentary' : formatGBP(deliveryFee)}
          />
        </dl>
        <div className="my-5 gc-divider" />
        <div className="flex items-baseline justify-between">
          <span className="text-xs uppercase tracking-luxe text-gold-tint">Total</span>
          <span className="font-display text-3xl text-white">{formatGBP(total)}</span>
        </div>
        <Link href="/checkout" className="gc-btn-primary mt-6 w-full">
          Proceed to Checkout
        </Link>
        <p className="mt-3 text-xs text-warmgrey">
          Pieces are dispatched fully insured. Unique items are held briefly while you complete checkout.
        </p>
      </aside>
    </div>
  );
}

function QtyButton({
  children,
  onClick,
  disabled,
  ariaLabel,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className="h-9 w-9 text-gold-metallic hover:text-gold-bright disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-warmgrey">
      <dt>{label}</dt>
      <dd className="text-white">{value}</dd>
    </div>
  );
}
