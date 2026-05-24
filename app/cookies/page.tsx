import type { Metadata } from 'next';
import { getSiteSettings } from '@/lib/queries/homepage';
import { LegalPageLayout } from '@/components/public/LegalPageLayout';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Cookie Policy',
  description:
    'Information about the cookies and similar technologies used on the Charters Gold website.',
  robots: { index: true, follow: true },
};

const LAST_UPDATED = '23 May 2026';

export default async function CookiesPage() {
  const settings = await getSiteSettings();
  const businessName = settings.business_name;
  const email = settings.email;

  return (
    <LegalPageLayout
      eyebrow="Legal"
      title="Cookie Policy"
      lastUpdated={LAST_UPDATED}
      intro={`This Cookie Policy explains how ${businessName} uses cookies and similar technologies when you visit chartersgold.co.uk. It should be read together with our Privacy Policy and Terms & Conditions.`}
    >
      <h2>1. What Are Cookies?</h2>
      <p>
        Cookies are small text files placed on your device (computer, tablet or mobile) when you
        visit a website. They are widely used to make websites work efficiently, to provide
        functionality, to remember your preferences and to provide information to the website
        owner.
      </p>
      <p>
        We also use similar technologies such as local storage, session storage and pixel tags
        ("similar technologies"). References to "cookies" in this Policy include those technologies
        unless the context requires otherwise.
      </p>

      <h2>2. Categories Of Cookies We Use</h2>
      <h3>2.1 Strictly Necessary Cookies</h3>
      <p>
        These are essential for the Site to function. They do not require consent. They enable
        core functionality including authentication, security, basket persistence (where the shop
        is enabled) and load balancing. Without these cookies the Site cannot operate properly.
      </p>

      <h3>2.2 Functional Cookies</h3>
      <p>
        These remember preferences you set during your visit, such as your acknowledged region or
        cookie banner choice. They are set only after your consent or where strictly necessary for
        a feature you have requested.
      </p>

      <h3>2.3 Analytics Cookies</h3>
      <p>
        Where enabled, these help us understand how visitors use the Site so we can improve it (for
        example, which pages are most viewed, how long visitors spend on the Site, and which
        sources brought them here). Analytics cookies are set <strong>only with your consent</strong>.
      </p>

      <h3>2.4 Marketing Cookies</h3>
      <p>
        We do not currently use third-party marketing or advertising cookies on this Site. If this
        changes, this Policy will be updated and we will request your consent before any such
        cookies are set.
      </p>

      <h2>3. Specific Cookies &amp; Technologies</h2>
      <p>The principal technologies in use on this Site are:</p>
      <ul>
        <li>
          <strong>Supabase Auth session cookie</strong> (strictly necessary) — stores the
          authenticated admin session for our private staff dashboard. Set only when an
          administrator signs in.
        </li>
        <li>
          <strong>gc-cart-v1</strong> (functional, localStorage) — used by the shopping basket to
          remember items added by visitors. Set only when the shop is in use.
        </li>
        <li>
          <strong>Next.js framework cookies</strong> (strictly necessary) — used by our hosting
          framework to deliver the Site reliably and route requests correctly.
        </li>
      </ul>
      <p>
        We do not currently set Google Analytics, Facebook Pixel, advertising or remarketing
        cookies. We will update this Policy if any third-party measurement or advertising
        technologies are added.
      </p>

      <h2>4. Controlling Cookies</h2>
      <p>
        You can control and manage cookies in your browser settings. Most browsers allow you to
        view, delete and block cookies, including blocking cookies from particular sites. Detailed
        guidance for each major browser is available at:
      </p>
      <ul>
        <li>
          <a
            href="https://support.google.com/chrome/answer/95647"
            target="_blank"
            rel="noreferrer noopener"
          >
            Google Chrome
          </a>
        </li>
        <li>
          <a
            href="https://support.apple.com/en-gb/guide/safari/sfri11471/mac"
            target="_blank"
            rel="noreferrer noopener"
          >
            Apple Safari
          </a>
        </li>
        <li>
          <a
            href="https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer"
            target="_blank"
            rel="noreferrer noopener"
          >
            Mozilla Firefox
          </a>
        </li>
        <li>
          <a
            href="https://support.microsoft.com/en-us/windows/manage-cookies-in-microsoft-edge"
            target="_blank"
            rel="noreferrer noopener"
          >
            Microsoft Edge
          </a>
        </li>
      </ul>
      <p>
        Please note that disabling strictly necessary cookies will prevent parts of the Site from
        functioning correctly, including authentication, secure form submissions and shopping
        basket persistence.
      </p>

      <h2>5. Do-Not-Track Signals</h2>
      <p>
        We respect Do-Not-Track ("DNT") browser signals where it is technically practicable to do
        so. Because our default position is not to set non-essential cookies without consent, the
        practical effect of a DNT signal aligns with our standard processing.
      </p>

      <h2>6. International Visitors</h2>
      <p>
        Some of our service providers operate from outside the United Kingdom. Cookies and similar
        identifiers set by those providers may transfer technical data outside the United Kingdom.
        Such transfers are made under appropriate safeguards as described in our{' '}
        <a href="/privacy">Privacy Policy</a>.
      </p>

      <h2>7. Children</h2>
      <p>
        Our Site is intended for adults. We do not knowingly direct cookies or similar tracking
        technologies at children under the age of eighteen.
      </p>

      <h2>8. Changes To This Policy</h2>
      <p>
        We may update this Policy from time to time to reflect changes in technology, regulation
        or our use of cookies. The "Last updated" date at the top of this page indicates when the
        current version came into effect. Where material changes are made, we will request renewed
        consent if required by law.
      </p>

      <h2>9. Contact</h2>
      <p>
        Questions about this Policy or our use of cookies should be sent to{' '}
        <a href={`mailto:${email}`}>{email}</a>.
      </p>
    </LegalPageLayout>
  );
}
