import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { BUY_ENABLED } from '@/lib/features';
import { Logo } from '@/components/public/Logo';
import { countOutstandingRequests } from '@/lib/actions/valuationRequests';

type NavItem = {
  href: string;
  label: string;
  /** When true, the item is greyed out and labelled "Inactive" if BUY_ENABLED is false. */
  shopOnly?: boolean;
};

const NAV: NavItem[] = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/homepage', label: 'Homepage' },
  { href: '/admin/services', label: 'Services' },
  { href: '/admin/items-we-buy', label: 'Items We Buy' },
  { href: '/admin/calculator-rates', label: 'Calculator Rates' },
  { href: '/admin/price-dashboard', label: 'Live Spot Prices' },
  { href: '/admin/products', label: 'Products', shopOnly: true },
  { href: '/admin/categories', label: 'Categories', shopOnly: true },
  { href: '/admin/stock', label: 'Stock Movements', shopOnly: true },
  { href: '/admin/orders', label: 'Orders', shopOnly: true },
  { href: '/admin/valuation-requests', label: 'Valuation Requests' },
  { href: '/admin/faqs', label: 'FAQs' },
  { href: '/admin/contact', label: 'Contact Details' },
  { href: '/admin/media', label: 'Media Library' },
  { href: '/admin/blog', label: 'Blog' },
  { href: '/admin/email-templates', label: 'Email Templates' },
  { href: '/admin/settings', label: 'Settings' },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let userEmail: string | null = null;

  if (isSupabaseConfigured()) {
    const supabase = getServerSupabase();
    if (supabase) {
      const { data } = await supabase.auth.getUser();
      if (!data.user) redirect('/admin/login');
      userEmail = data.user.email ?? null;
    }
  }

  const outstandingCount = isSupabaseConfigured() ? await countOutstandingRequests() : 0;

  return (
    <div className="grid min-h-screen lg:grid-cols-[260px,1fr]">
      <aside className="border-r border-gold-metallic/15 bg-ink-900/80 p-6">
        <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
          <Logo businessName="Charters Gold" size="default" href="/admin" />
          <p className="mt-3 text-[10px] font-semibold uppercase tracking-luxe text-gold-metallic">
            Admin Console
          </p>
        </div>

        <nav className="mt-8">
          <ul className="space-y-1 text-sm">
            {NAV.map((item) => {
              const inactive = item.shopOnly && !BUY_ENABLED;
              const showOutstandingBadge =
                item.href === '/admin/valuation-requests' && outstandingCount > 0;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    title={inactive ? 'Shop is disabled — click to view paused tools' : undefined}
                    className={
                      inactive
                        ? 'flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-warmgrey/40 hover:bg-ink-800 hover:text-warmgrey/70'
                        : 'flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-warmgrey hover:bg-ink-800 hover:text-gold-bright'
                    }
                  >
                    <span>{item.label}</span>
                    {inactive && (
                      <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-luxe text-amber-300">
                        Off
                      </span>
                    )}
                    {showOutstandingBadge && (
                      <span
                        className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[10px] font-semibold text-ink-950"
                        style={{
                          background: 'linear-gradient(135deg, #FFD700, #B8860B)',
                          boxShadow: '0 0 8px rgba(212,175,55,0.55)',
                        }}
                        title={`${outstandingCount} outstanding request${outstandingCount === 1 ? '' : 's'}`}
                      >
                        {outstandingCount}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {!BUY_ENABLED && (
          <div className="mt-6 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-[11px] leading-relaxed text-amber-200/90">
            <p className="font-semibold text-amber-200">Shop disabled</p>
            <p className="mt-1 text-amber-200/70">
              The website does not sell items. Greyed-out tools are kept for when the shop is re-enabled.
            </p>
          </div>
        )}

        {!isSupabaseConfigured() && (
          <div className="mt-6 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
            <strong>Preview mode.</strong> Edits won’t persist — the live database isn’t connected
            on this environment.
          </div>
        )}

        {userEmail && (
          <div className="mt-6 rounded-lg border border-gold-metallic/15 bg-ink-950 p-3 text-xs text-warmgrey">
            Signed in as <span className="text-gold-tint">{userEmail}</span>
          </div>
        )}

        <Link
          href="/"
          className="mt-6 block text-xs uppercase tracking-luxe text-gold-metallic hover:text-gold-bright"
        >
          ← Back to public site
        </Link>
      </aside>

      <div className="p-8">{children}</div>
    </div>
  );
}
