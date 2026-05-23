import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin · Charters Gold',
  robots: { index: false, follow: false },
};

// This thin layout only sets metadata. The (dashboard) route group wraps the
// chrome and auth gate so /admin/login can render without those.
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="bg-ink-950 text-white">{children}</div>;
}
