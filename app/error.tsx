'use client';

import { useEffect } from 'react';
import Link from 'next/link';

/**
 * Shown instead of Next's bare "Application error: a client-side exception
 * has occurred" when something throws on a public page. Customers were
 * seeing that message when a photo upload was too large for one request;
 * this gives them a way to reach us instead of a dead end.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[page-error]', error);
  }, [error]);

  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink-950 via-ink-900 to-ink-950" />
      <div className="gc-container relative grid place-items-center py-20 text-center lg:py-28">
        <span className="gc-eyebrow">Something went wrong</span>
        <h1 className="gc-heading-xl mt-4">That did not go through</h1>
        <p className="gc-subhead mt-5 max-w-xl">
          Sorry, something broke on our side. If you were sending photos, try again with fewer
          or smaller photos, or send them to us on WhatsApp and we will reply the same day.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button type="button" onClick={reset} className="gc-btn-primary">
            Try again
          </button>
          <a
            href="https://wa.me/447951999999?text=Hi%20Charters%20Gold%2C%20the%20website%20form%20did%20not%20go%20through.%20Here%20are%20my%20photos."
            target="_blank"
            rel="noopener noreferrer"
            className="gc-btn-secondary"
          >
            Send on WhatsApp
          </a>
        </div>

        <p className="mt-8 text-sm text-warmgrey">
          Or ring us on{' '}
          <a href="tel:07951999999" className="text-gold-tint underline">
            07951 999 999
          </a>
          , seven days a week by appointment.
        </p>
        <p className="mt-10">
          <Link href="/" className="text-sm text-warmgrey underline hover:text-gold-bright">
            Back to the homepage
          </Link>
        </p>
      </div>
    </section>
  );
}
