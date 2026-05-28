import type { Metadata } from 'next';
import Link from 'next/link';
import { CancelClient } from './CancelClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: { absolute: 'Cancel appointment · Charters Gold' },
  robots: { index: false, follow: false },
};

export default function CancelAppointmentPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const token = typeof searchParams.token === 'string' ? searchParams.token : '';

  return (
    <section className="py-12 lg:py-20">
      <div className="gc-container">
        <div className="mx-auto max-w-xl gc-card gc-card-gold-edge p-8 sm:p-10">
          {token ? (
            <CancelClient token={token} />
          ) : (
            <div className="text-center">
              <h1 className="font-display text-2xl font-semibold text-white">Invalid cancellation link</h1>
              <p className="mx-auto mt-3 max-w-md text-sm text-warmgrey">
                This link is missing its reference. Please use the link from your confirmation email, or
                contact us and we’ll sort it out.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link href="/contact" className="gc-btn-primary">Contact us</Link>
                <Link href="/book" className="gc-btn-ghost">Book an appointment</Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
