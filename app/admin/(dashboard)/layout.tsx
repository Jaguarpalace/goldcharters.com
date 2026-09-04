import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { getMfaState, mfaSatisfied } from '@/lib/auth/mfa';
import { getAdminRole, ROLE_LABELS } from '@/lib/auth/adminRole';
import { BUY_ENABLED } from '@/lib/features';
import { countOutstandingRequests } from '@/lib/actions/valuationRequests';
import { countUpcomingAppointments } from '@/lib/actions/appointments';
import { ThemeToggle, type AdminTheme } from './ThemeToggle';
import { AdminBrand } from './AdminBrand';
import { AdminShell } from './AdminShell';
import { IdleLogout } from './IdleLogout';
import { SignOutButton } from './SignOutButton';
import { NavSections } from './NavSections';
import { SearchPalette } from './SearchPalette';

type NavItem = {
  href: string;
  label: string;
  /** When true, the item is greyed out and labelled "Inactive" if BUY_ENABLED is false. */
  shopOnly?: boolean;
  /** Visible to Manager-tier users. Everything else is Full Admin only. */
  manager?: boolean;
};

const OVERVIEW: NavItem = { href: '/admin', label: 'Overview', manager: true };

/** Collapsible sidebar groups, ordered by how often each is needed. */
const NAV_SECTIONS: Array<{ key: string; title: string; items: NavItem[] }> = [
  {
    key: 'trading',
    title: 'Trading',
    items: [
      { href: '/admin/walk-in', label: 'New Walk-in Purchase', manager: true },
      { href: '/admin/valuation-requests', label: 'Valuation Requests', manager: true },
      { href: '/admin/appointments', label: 'Appointments', manager: true },
      { href: '/admin/events', label: 'Pop-Up Locations' },
      { href: '/admin/customers', label: 'Customers', manager: true },
      { href: '/admin/holdings', label: 'Holdings', manager: true },
      { href: '/admin/finance', label: 'Finance' },
    ],
  },
  {
    key: 'pricing',
    title: 'Pricing',
    items: [
      { href: '/admin/calculator-rates', label: 'Calculator Rates' },
      { href: '/admin/price-dashboard', label: 'Live Spot Prices' },
    ],
  },
  {
    key: 'website',
    title: 'Website',
    items: [
      { href: '/admin/homepage', label: 'Homepage' },
      { href: '/admin/services', label: 'Services' },
      { href: '/admin/items-we-buy', label: 'Items We Buy' },
      { href: '/admin/faqs', label: 'FAQs' },
      { href: '/admin/blog', label: 'Blog' },
      { href: '/admin/media', label: 'Media Library' },
      { href: '/admin/seo', label: 'Page SEO' },
      { href: '/admin/legal', label: 'Legal Pages' },
      { href: '/admin/contact', label: 'Contact Details' },
    ],
  },
  {
    key: 'shop',
    title: 'Shop',
    items: [
      { href: '/admin/products', label: 'Products', shopOnly: true },
      { href: '/admin/categories', label: 'Categories', shopOnly: true },
      { href: '/admin/stock', label: 'Stock Movements', shopOnly: true },
      { href: '/admin/orders', label: 'Orders', shopOnly: true },
    ],
  },
  {
    key: 'system',
    title: 'System',
    items: [
      { href: '/admin/email-templates', label: 'Email Templates' },
      { href: '/admin/notifications', label: 'Notifications' },
      { href: '/admin/users', label: 'Team' },
      { href: '/admin/audit-log', label: 'Audit Log' },
      { href: '/admin/trash', label: 'Trash' },
      { href: '/admin/security', label: 'Security', manager: true },
      { href: '/admin/settings', label: 'Settings' },
    ],
  },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let userEmail: string | null = null;
  let role: 'admin' | 'editor' = 'admin';

  if (isSupabaseConfigured()) {
    const supabase = getServerSupabase();
    if (supabase) {
      const { data } = await supabase.auth.getUser();
      if (!data.user) redirect('/admin/login');
      // Two-factor is mandatory: accounts with no authenticator are sent to
      // set one up before they can use the admin at all; enrolled accounts
      // must have passed the code step on this session.
      const mfa = await getMfaState(supabase);
      if (!mfa.indeterminate && !mfa.enrolled) redirect('/admin/setup-2fa');
      if (!mfaSatisfied(mfa)) redirect('/admin/login?mfa=1');
      userEmail = data.user.email ?? null;
      role = (await getAdminRole()) ?? 'editor';
    }
  }
  const [outstandingCount, appointmentCount] = isSupabaseConfigured()
    ? await Promise.all([countOutstandingRequests(), countUpcomingAppointments()])
    : [0, 0];

  // Managers get a sidebar of just their tools - no error walls.
  const forRole = (items: NavItem[]) =>
    role === 'admin' ? items : items.filter((item) => item.manager);
  const navSections = NAV_SECTIONS.map((section) => ({
    key: section.key,
    title: section.title,
    items: forRole(section.items).map((item) => ({
      href: item.href,
      label: item.label,
      inactive: Boolean(item.shopOnly && !BUY_ENABLED),
      badgeCount:
        item.href === '/admin/valuation-requests'
          ? outstandingCount
          : item.href === '/admin/appointments'
            ? appointmentCount
            : 0,
      badgeTitle:
        item.href === '/admin/valuation-requests'
          ? `${outstandingCount} outstanding request${outstandingCount === 1 ? '' : 's'}`
          : item.href === '/admin/appointments'
            ? `${appointmentCount} upcoming appointment${appointmentCount === 1 ? '' : 's'}`
            : undefined,
    })),
  })).filter((section) => section.items.length > 0);

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
        <NavSections
          overview={{ href: OVERVIEW.href, label: OVERVIEW.label }}
          sections={navSections}
          flat={role !== 'admin'}
        />
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
          <strong>Preview mode.</strong> Edits won’t persist - the live database isn’t connected
          on this environment.
        </div>
      )}

      {userEmail && (
        <div className="mt-6 rounded-lg border border-gold-metallic/15 bg-ink-950 p-3 text-xs text-warmgrey">
          Signed in as <span className="text-gold-tint">{userEmail}</span>
          <span className="mt-1 block text-[10px] uppercase tracking-luxe text-gold-metallic">
            {ROLE_LABELS[role]}
          </span>
          <SignOutButton />
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
      <IdleLogout />
      <AdminShell sidebar={sidebar}>{children}</AdminShell>
    </div>
  );
}
