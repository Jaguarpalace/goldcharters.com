import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { BUY_ENABLED } from '@/lib/features';
import { countOutstandingRequests } from '@/lib/actions/valuationRequests';
import { ThemeToggle, type AdminTheme } from './ThemeToggle';
import { AdminBrand } from './AdminBrand';
import { AdminShell } from './AdminShell';
import { NavLink } from './NavLink';
import { SearchPalette } from './SearchPalette';

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
  { href: '/admin/walk-in', label: 'New Walk-in Purchase' },
  { href: '/admin/valuation-requests', label: 'Valuation Requests' },
  { href: '/admin/customers', label: 'Customers' },
  { href: '/admin/holdings', label: 'Holdings' },
  { href: '/admin/faqs', label: 'FAQs' },
  { href: '/admin/contact', label: 'Contact Details' },
  { href: '/admin/media', label: 'Media Library' },
  { href: '/admin/blog', label: 'Blog' },
  { href: '/admin/seo', label: 'Page SEO' },
  { href: '/admin/legal', label: 'Legal Pages' },
  { href: '/admin/email-templates', label: 'Email Templates' },
  { href: '/admin/notifications', label: 'Notifications' },
  { href: '/admin/users', label: 'Team' },
  { href: '/admin/audit-log', label: 'Audit Log' },
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

  const cookieStore = cookies();
  const themeCookie = cookieStore.get('admin-theme')?.value;
  const theme: AdminTheme = themeCookie === 'light' ? 'light' : 'dark';

  // Sidebar content is built once on the server; AdminShell uses it both
  // for the desktop rail and the mobile drawer.
  const sidebar = (
    <>
      <div className="flex flex-col items-center text-center">
        <AdminBrand />
        <p className="mt-3 text-[10px] font-semibold uppercase tracking-luxe text-gold-metallic">
          Admin Console
        </p>
      </div>

      <div className="mt-6">
        <SearchPalette />
      </div>

      <nav className="mt-6" aria-label="Admin navigation">
        <ul className="space-y-1 text-sm">
          {NAV.map((item) => {
            const inactive = item.shopOnly && !BUY_ENABLED;
            const showOutstandingBadge =
              item.href === '/admin/valuation-requests' && outstandingCount > 0;
            return (
              <li key={item.href}>
                <NavLink
                  href={item.href}
                  label={item.label}
                  inactive={inactive}
                  inactiveTitle="Shop is disabled — click to view paused tools"
                  badge={
                    showOutstandingBadge ? (
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
                    ) : null
                  }
                />
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

      <div className="mt-6">
        <ThemeToggle current={theme} />
      </div>

      <Link
        href="/"
        className="mt-4 block text-xs uppercase tracking-luxe text-gold-metallic hover:text-gold-bright"
      >
        ← Back to public site
      </Link>
    </>
  );

  return (
    <div data-admin-theme={theme} className="admin-shell min-h-screen">
      <AdminShell sidebar={sidebar}>{children}</AdminShell>
    </div>
  );
}
