import type { Metadata } from 'next';
import { getSiteSettings } from '@/lib/queries/homepage';
import { LegalPageLayout } from '@/components/public/LegalPageLayout';
import { formatLegalDate, getLegalPage } from '@/lib/queries/legalPages';

export const revalidate = 86400; // legal pages change rarely - refresh daily

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'How Charters Gold collects, uses, stores and protects your personal data, under UK GDPR and the Data Protection Act 2018.',
  robots: { index: true, follow: true },
};

const DEFAULT_LAST_UPDATED = '23 May 2026';
const DEFAULT_EYEBROW = 'Legal';
const DEFAULT_TITLE = 'Privacy Policy';

export default async function PrivacyPage() {
  const [settings, legal] = await Promise.all([getSiteSettings(), getLegalPage('privacy')]);
  const businessName = settings.business_name;
  const email = settings.email;
  const phone = settings.phone;
  const address = settings.address ?? '';

  const lastUpdated = legal
    ? formatLegalDate(legal.last_reviewed_at, DEFAULT_LAST_UPDATED)
    : DEFAULT_LAST_UPDATED;
  const eyebrow = legal?.eyebrow ?? DEFAULT_EYEBROW;
  const title = legal?.title ?? DEFAULT_TITLE;
  const intro =
    legal?.intro ??
    `${businessName} ("we", "us", "our") is committed to protecting and respecting your privacy. This Privacy Policy explains how we collect, use, store, share and protect your personal data when you interact with our website, request a valuation, send items for inspection, or otherwise transact with us.`;

  return (
    <LegalPageLayout
      eyebrow={eyebrow}
      title={title}
      lastUpdated={lastUpdated}
      intro={intro}
      bodyHtml={legal?.body_html ?? null}
    >
      <h2>1. About This Policy</h2>
      <p>
        This Privacy Policy applies to all personal data we process about you in connection with our
        services. By using our website at <strong>chartersgold.co.uk</strong> (the "Site") or by
        submitting a valuation request, you acknowledge that you have read and understood this
        Policy. Where consent is required by law, we will request it separately.
      </p>
      <p>
        This Policy should be read alongside our{' '}
        <a href="/terms">Terms &amp; Conditions</a> and our{' '}
        <a href="/cookies">Cookie Policy</a>.
      </p>

      <h2>2. Data Controller</h2>
      <p>
        For the purposes of the UK General Data Protection Regulation ("UK GDPR") and the Data
        Protection Act 2018, the data controller is <strong>{businessName}</strong>, trading from{' '}
        {address}. Where required, we are or will be registered with the Information Commissioner's
        Office ("ICO").
      </p>
      <p>
        Any questions about this Policy or your personal data should be sent to{' '}
        <a href={`mailto:${email}`}>{email}</a> or by telephone to{' '}
        <a href={`tel:${phone}`}>{phone}</a>.
      </p>

      <h2>3. Personal Data We Collect</h2>
      <p>
        We only collect personal data that is necessary for the purposes set out in this Policy. The
        categories of data we collect include:
      </p>
      <h3>3.1 Information You Provide Directly</h3>
      <ul>
        <li>
          <strong>Identification:</strong> your full name, date of birth (where applicable for
          anti-money laundering compliance), residential address, copy of government-issued photo
          identification (such as passport or driving licence), and proof of address.
        </li>
        <li>
          <strong>Contact details:</strong> email address, telephone number, and (where provided)
          WhatsApp number.
        </li>
        <li>
          <strong>Transaction details:</strong> a description of the items you wish us to value,
          weights, carat, hallmarks, brand, condition, estimated value, photographs of the items and
          any supporting documents such as certificates, receipts, valuations or boxes.
        </li>
        <li>
          <strong>Bank details:</strong> for processing payment of an accepted offer (account
          holder name, sort code, account number).
        </li>
        <li>
          <strong>Communications:</strong> the content of any correspondence with us, including
          email, telephone notes, WhatsApp messages and in-person meeting notes.
        </li>
      </ul>

      <h3>3.2 Information We Collect Automatically</h3>
      <ul>
        <li>
          <strong>Technical data:</strong> IP address, browser type and version, time zone, device
          type, operating system and approximate location derived from IP.
        </li>
        <li>
          <strong>Usage data:</strong> pages visited, time on page, referring source, and similar
          analytical information.
        </li>
        <li>
          <strong>Cookies and similar technologies:</strong> see our{' '}
          <a href="/cookies">Cookie Policy</a> for full detail.
        </li>
      </ul>

      <h3>3.3 Information From Third Parties</h3>
      <p>
        We may receive identity verification results, sanctions and politically-exposed-person
        ("PEP") screening data, and credit-reference enquiry results from regulated third-party
        identity verification and anti-money laundering service providers.
      </p>

      <h2>4. Lawful Bases For Processing</h2>
      <p>
        Under the UK GDPR we rely on one or more of the following lawful bases when processing your
        personal data:
      </p>
      <ul>
        <li>
          <strong>Contract:</strong> processing necessary to take steps prior to entering into, and
          to perform, our contract with you (e.g. valuing your items, paying you).
        </li>
        <li>
          <strong>Legal obligation:</strong> processing required by UK anti-money laundering
          ("AML"), counter-terrorist financing, tax, and other legislation applicable to dealers in
          high-value goods.
        </li>
        <li>
          <strong>Legitimate interests:</strong> processing necessary for our legitimate interests
          of running and growing our business, preventing fraud, recovering debts, defending claims
          and maintaining the security of our systems, except where overridden by your rights.
        </li>
        <li>
          <strong>Consent:</strong> where you have expressly agreed (e.g. to marketing
          communications or non-essential cookies). You may withdraw consent at any time.
        </li>
      </ul>

      <h2>5. How We Use Your Personal Data</h2>
      <p>We use your personal data only for specific, lawful and proportionate purposes:</p>
      <ul>
        <li>To respond to your valuation enquiry and provide you with an offer.</li>
        <li>To inspect, test, authenticate, photograph and value items you submit.</li>
        <li>To verify your identity and conduct anti-money laundering due diligence.</li>
        <li>To pay you the agreed price upon acceptance of our offer.</li>
        <li>To return items where an offer is not accepted, subject to our Terms &amp; Conditions.</li>
        <li>To keep records as required by law and to defend ourselves against claims.</li>
        <li>To prevent, detect and investigate fraud, theft and other unlawful conduct.</li>
        <li>To improve our website, services and customer experience.</li>
        <li>To send service communications (e.g. confirmations, valuations, payment notifications).</li>
        <li>
          To send marketing communications, where you have opted in. You may unsubscribe at any
          time.
        </li>
      </ul>

      <h2>6. Anti-Money Laundering &amp; Regulatory Reporting</h2>
      <p>
        As a dealer in high-value goods, we are required under the Money Laundering, Terrorist
        Financing and Transfer of Funds (Information on the Payer) Regulations 2017 (as amended) to
        carry out customer due diligence in certain circumstances. This may include collecting and
        verifying your identification documents and source of funds or source of items.
      </p>
      <p>
        We are <strong>legally obliged</strong> to report any suspicious activity to the National
        Crime Agency ("NCA") and/or HM Revenue &amp; Customs ("HMRC"), and we are{' '}
        <strong>prohibited by law</strong> from notifying you of such a report ("tipping off"). We
        may also be required to disclose data to police, courts, regulators or other authorities
        with appropriate legal authority.
      </p>

      <h2>7. Who We Share Your Data With</h2>
      <p>We never sell your personal data. We share it only with parties listed below:</p>
      <ul>
        <li>
          <strong>Service providers:</strong> trusted suppliers we engage to provide services on our
          behalf, including secure hosting (Supabase, Vercel), email and communications providers,
          identity verification platforms, postal and courier carriers (e.g. Royal Mail Special
          Delivery, secure couriers), refining partners, payment processors, accountants and
          professional advisers. All such providers are bound by confidentiality and data
          processing agreements.
        </li>
        <li>
          <strong>Regulatory authorities and law enforcement:</strong> where required by law,
          including (but not limited to) the NCA, HMRC, ICO, police and the courts.
        </li>
        <li>
          <strong>Professional advisers:</strong> our solicitors, auditors and insurers, on a
          strictly need-to-know basis.
        </li>
        <li>
          <strong>Successors in title:</strong> if our business is reorganised, sold or transferred,
          your data may be transferred to the relevant acquirer or successor entity.
        </li>
      </ul>

      <h2>8. International Transfers</h2>
      <p>
        Some of our service providers are located outside the United Kingdom. Where this is the
        case, we ensure appropriate safeguards are in place, including:
      </p>
      <ul>
        <li>UK adequacy decisions where they exist;</li>
        <li>
          The UK International Data Transfer Agreement or the EU Standard Contractual Clauses with
          the UK Addendum;
        </li>
        <li>
          Where applicable, supplementary technical and organisational measures such as encryption
          in transit and at rest.
        </li>
      </ul>

      <h2>9. Data Retention</h2>
      <p>
        We retain personal data only for as long as necessary to fulfil the purposes for which it
        was collected, including any legal, accounting or reporting requirements. Indicative
        retention periods are:
      </p>
      <ul>
        <li>
          <strong>AML records:</strong> a minimum of <strong>five years</strong> after the end of
          the business relationship (statutory requirement).
        </li>
        <li>
          <strong>Transaction records:</strong> a minimum of <strong>six years</strong> for tax and
          accounting purposes.
        </li>
        <li>
          <strong>Enquiry data where no transaction completes:</strong> up to{' '}
          <strong>twenty-four months</strong> from last contact.
        </li>
        <li>
          <strong>Marketing data:</strong> until you withdraw consent or for a maximum of three
          years from your last interaction with us.
        </li>
        <li>
          <strong>CCTV and security footage (in-person visits):</strong> up to thirty days, unless
          retained for ongoing investigation.
        </li>
      </ul>
      <p>
        After applicable retention periods expire, data is securely deleted, anonymised or
        destroyed.
      </p>

      <h2>10. Security</h2>
      <p>
        We implement appropriate technical and organisational measures to protect your personal
        data against unauthorised or unlawful access, accidental loss, alteration or disclosure,
        including encryption in transit (TLS), encryption at rest, access controls, audit logs and
        secure storage. However, no transmission over the internet or method of electronic storage
        is one hundred per cent secure, and we cannot guarantee absolute security.
      </p>

      <h2>11. Your Rights</h2>
      <p>Under the UK GDPR you have the following rights, subject to certain conditions:</p>
      <ul>
        <li>
          <strong>Right of access:</strong> to obtain a copy of the personal data we hold about you.
        </li>
        <li>
          <strong>Right to rectification:</strong> to have inaccurate or incomplete data corrected.
        </li>
        <li>
          <strong>Right to erasure ("right to be forgotten"):</strong> to request deletion of your
          data, except where we are legally required to retain it.
        </li>
        <li>
          <strong>Right to restrict processing:</strong> to limit how we use your data.
        </li>
        <li>
          <strong>Right to data portability:</strong> to receive your data in a structured,
          commonly-used, machine-readable format.
        </li>
        <li>
          <strong>Right to object:</strong> to processing based on legitimate interests, or to
          direct marketing.
        </li>
        <li>
          <strong>Right to withdraw consent</strong> at any time, where processing is based on
          consent.
        </li>
        <li>
          <strong>Right not to be subject to automated decision-making</strong> that produces legal
          or similarly significant effects. We do not currently use such decision-making.
        </li>
      </ul>
      <p>
        To exercise any of these rights, contact us at{' '}
        <a href={`mailto:${email}`}>{email}</a>. We will respond within one calendar month. We may
        require proof of identity before processing certain requests.
      </p>

      <h2>12. Complaints</h2>
      <p>
        If you believe we have processed your personal data unlawfully, we encourage you to contact
        us first so we can address the issue. You also have the right to complain to the
        Information Commissioner's Office at{' '}
        <a href="https://ico.org.uk" target="_blank" rel="noreferrer noopener">
          ico.org.uk
        </a>{' '}
        or by telephone on 0303 123 1113.
      </p>

      <h2>13. Children</h2>
      <p>
        Our services are intended for adults aged eighteen (18) years or over. We do not knowingly
        collect personal data from children. If you become aware that a child has provided us with
        personal data, please contact us immediately so we can take appropriate action.
      </p>

      <h2>14. Third-Party Links</h2>
      <p>
        Our Site may contain links to third-party websites. We are not responsible for the privacy
        practices or content of those sites. We encourage you to read their privacy policies before
        sharing personal data.
      </p>

      <h2>15. Changes To This Policy</h2>
      <p>
        We may update this Policy from time to time. The "Last updated" date at the top of this
        page reflects when the current version came into effect. Material changes will be notified
        to you by email where you have provided one, or by prominent notice on the Site.
      </p>

      <h2>16. Contact</h2>
      <p>
        Questions, requests or complaints should be addressed to:
      </p>
      <p>
        <strong>{businessName}</strong>
        <br />
        {address}
        <br />
        Email: <a href={`mailto:${email}`}>{email}</a>
        <br />
        Telephone: <a href={`tel:${phone}`}>{phone}</a>
      </p>
    </LegalPageLayout>
  );
}
