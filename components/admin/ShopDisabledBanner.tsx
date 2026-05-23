/**
 * Shown at the top of any admin page that manages shop-related data
 * (products, categories, stock movements, orders) when BUY_ENABLED is false.
 *
 * The page itself still renders so you can review existing data — the
 * banner just makes it explicit that nothing here is live to customers.
 */
export function ShopDisabledBanner() {
  return (
    <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-200">
      <span
        aria-hidden
        className="mt-0.5 inline-flex h-5 w-5 flex-none items-center justify-center rounded-full bg-amber-500/20 text-[11px] font-semibold text-amber-300"
      >
        !
      </span>
      <div>
        <p className="font-medium">Shop is currently disabled site-wide.</p>
        <p className="mt-0.5 text-amber-200/80">
          The public shop, basket and checkout pages redirect home, and this tool is not affecting any
          live customer experience. To re-enable, set{' '}
          <code className="rounded bg-amber-500/10 px-1 py-0.5 text-amber-100">BUY_ENABLED = true</code>{' '}
          in <code className="text-amber-100">lib/features.ts</code> and redeploy.
        </p>
      </div>
    </div>
  );
}
