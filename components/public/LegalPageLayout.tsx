import type { ReactNode } from 'react';

type LegalPageLayoutProps = {
  eyebrow: string;
  title: string;
  lastUpdated: string;
  intro?: string;
  /**
   * Optional HTML override for the body, sourced from the admin
   * (legal_pages.body_html). When present, replaces the JSX `children`.
   * Rendered with dangerouslySetInnerHTML — the table is admin-write-only,
   * the public site only reads it, so there's no untrusted-input path
   * here.
   */
  bodyHtml?: string | null;
  children: ReactNode;
};

/**
 * Shared shell for /privacy, /terms and /cookies.
 * Provides the dark hero, max-width prose column and consistent typography
 * so all three legal pages look like they came from the same legal team.
 */
export function LegalPageLayout({
  eyebrow,
  title,
  lastUpdated,
  intro,
  bodyHtml,
  children,
}: LegalPageLayoutProps) {
  const useOverride = typeof bodyHtml === 'string' && bodyHtml.trim().length > 0;
  return (
    <>
      <section className="relative overflow-hidden border-b border-gold-metallic/15">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink-950 via-ink-900 to-ink-950" />
        {/* Hero header: centered same-width column as the body prose below so
            the two sections feel aligned, with tighter vertical padding so the
            page doesn't open with a wall of empty black. */}
        <div className="gc-container relative py-7 lg:py-10">
          <div className="mx-auto max-w-3xl">
            <span className="gc-eyebrow">{eyebrow}</span>
            <h1 className="gc-heading-xl mt-2">{title}</h1>
            <p className="mt-3 text-xs uppercase tracking-luxe text-gold-tint">
              Last updated: {lastUpdated}
            </p>
            {intro && <p className="gc-subhead mt-4">{intro}</p>}
          </div>
        </div>
      </section>

      <section className="py-6 lg:py-8">
        <div className="gc-container">
          <article className="mx-auto max-w-3xl text-sm leading-relaxed text-warmgrey legal-prose">
            {useOverride ? (
              <div dangerouslySetInnerHTML={{ __html: bodyHtml as string }} />
            ) : (
              children
            )}
          </article>
        </div>
      </section>

      <style>{`
        .legal-prose h2 {
          font-family: var(--font-display);
          font-size: 1.35rem;
          font-weight: 600;
          color: #ffffff;
          letter-spacing: -0.01em;
          margin-top: 2.25rem;
          margin-bottom: 0.75rem;
        }
        .legal-prose h2:first-child { margin-top: 0; }
        .legal-prose h3 {
          font-family: var(--font-display);
          font-size: 1.05rem;
          font-weight: 600;
          color: #f3d675;
          margin-top: 1.5rem;
          margin-bottom: 0.5rem;
        }
        .legal-prose p {
          margin-bottom: 0.85rem;
        }
        .legal-prose ul,
        .legal-prose ol {
          margin: 0.5rem 0 1rem 1.5rem;
          padding: 0;
        }
        .legal-prose li {
          margin-bottom: 0.4rem;
          padding-left: 0.25rem;
        }
        .legal-prose ul li { list-style-type: disc; }
        .legal-prose ol li { list-style-type: decimal; }
        .legal-prose strong { color: #ffffff; font-weight: 600; }
        .legal-prose a { color: #d4af37; text-decoration: underline; text-underline-offset: 3px; }
        .legal-prose a:hover { color: #ffd700; }
        .legal-prose hr {
          border: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(212,175,55,0.4), transparent);
          margin: 2.5rem 0;
        }
      `}</style>
    </>
  );
}
