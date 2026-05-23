import type { Metadata } from 'next';
import { getSiteSettings } from '@/lib/queries/homepage';
import { LegalPageLayout } from '@/components/public/LegalPageLayout';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Terms & Conditions',
  description:
    'The terms and conditions governing use of the Charters Gold website, valuation services and purchase transactions.',
  robots: { index: true, follow: true },
};

const LAST_UPDATED = '23 May 2026';

export default async function TermsPage() {
  const settings = await getSiteSettings();
  const businessName = settings.business_name;
  const email = settings.email;
  const phone = settings.phone;
  const address = settings.address ?? '';

  return (
    <LegalPageLayout
      eyebrow="Legal"
      title="Terms & Conditions"
      lastUpdated={LAST_UPDATED}
      intro={`These Terms & Conditions ("Terms") govern your use of the website at goldcharters.com (the "Site") and any transaction in which ${businessName} buys precious metals, jewellery, watches, handbags or related items from you. By using the Site or submitting items to us, you agree to be bound by these Terms.`}
    >
      <h2>1. Definitions</h2>
      <p>In these Terms, unless the context requires otherwise:</p>
      <ul>
        <li>
          <strong>"Company", "we", "us", "our"</strong> means {businessName}, trading from {address}.
        </li>
        <li>
          <strong>"Customer", "you", "your"</strong> means the natural person submitting items for
          valuation or otherwise using the Site.
        </li>
        <li>
          <strong>"Items"</strong> means any goods you submit for valuation, including gold, silver,
          platinum, palladium, jewellery, gemstones, coins, bars, watches, designer handbags and any
          associated documentation, boxes or certificates.
        </li>
        <li>
          <strong>"Calculator"</strong> means the gold price calculator made available on the Site
          for indicative guide pricing only.
        </li>
        <li>
          <strong>"Offer"</strong> means a final, written valuation issued by us after inspection of
          your Items.
        </li>
        <li>
          <strong>"Working Day"</strong> means a day other than a Saturday, Sunday or bank holiday
          in England.
        </li>
      </ul>

      <h2>2. Acceptance Of These Terms</h2>
      <p>
        By using any feature of the Site, submitting a valuation request, or sending Items to us,
        you confirm that you have read, understood and agree to be bound by these Terms in full. If
        you do not agree, you must not use our services.
      </p>

      <h2>3. Eligibility</h2>
      <p>You warrant and represent that:</p>
      <ul>
        <li>You are at least eighteen (18) years of age and have full legal capacity to contract;</li>
        <li>
          You are the sole legal owner of the Items, or you are duly authorised by the legal owner
          to dispose of them;
        </li>
        <li>The Items are free from any third-party rights, liens, charges, claims or encumbrances;</li>
        <li>
          The Items have been lawfully obtained, are not stolen, counterfeit, or the proceeds of any
          unlawful conduct;
        </li>
        <li>
          You will provide accurate, complete and current information at all times, including for
          identification and anti-money laundering ("AML") purposes.
        </li>
      </ul>
      <p>
        We reserve the right to refuse to deal with any person at our sole discretion and without
        having to give reasons.
      </p>

      <h2>4. The Calculator &amp; Guide Prices</h2>
      <p>
        The Calculator and any indicative figures displayed on the Site, in correspondence, on
        social media or in advertising are <strong>indicative guide prices only</strong>. They do
        not constitute an offer, a contract, a representation, a warranty or any commitment by us
        to purchase at the indicated price.
      </p>
      <p>
        Final Offers depend on physical inspection, testing, market conditions at the time of
        inspection, weight, purity, gemstone quality, brand provenance, condition, documentation
        and any other factor we consider relevant. Guide prices may differ materially from the
        final Offer.
      </p>

      <h2>5. Valuation Process</h2>
      <h3>5.1 Submission</h3>
      <p>
        You may submit Items by (i) requesting a private appointment, (ii) posting Items to us, or
        (iii) such other method as we agree in writing. By submitting Items, you confirm the
        warranties in clause 3 and agree to provide all information requested by us.
      </p>

      <h3>5.2 Postal Submissions — At Your Own Risk</h3>
      <p>
        Where you choose to post Items to us, you do so <strong>entirely at your own risk</strong>.
        You are solely responsible for ensuring adequate insurance, secure packaging and a tracked,
        signed-for delivery method.{' '}
        <strong>
          We accept no responsibility for loss, theft, damage or delay during transit prior to
          confirmed receipt by us.
        </strong>{' '}
        We strongly recommend Royal Mail Special Delivery or an equivalent insured courier service.
      </p>

      <h3>5.3 Inspection</h3>
      <p>
        Upon receipt, Items will be inspected, weighed, tested for purity (which may include
        non-destructive XRF, acid testing or other industry-standard methods), authenticated where
        applicable, and valued by our specialists. We reserve the right to engage independent
        third-party experts at our discretion.
      </p>

      <h3>5.4 Issuing The Offer</h3>
      <p>
        We will communicate the Offer to you by email, telephone or such other method as you have
        selected. Offers are <strong>valid for twenty-four (24) hours</strong> from the time of
        issue unless otherwise stated in writing. Offers not accepted within the validity period
        lapse automatically and we are under no obligation to extend or re-issue them.
      </p>

      <h2>6. Identity Verification &amp; Anti-Money Laundering</h2>
      <p>
        We are required by law to verify the identity of our customers in certain circumstances.
        You agree to provide valid government-issued photo identification, proof of address and any
        further information we reasonably require. If you fail or refuse to provide such
        information, we may, at our absolute discretion:
      </p>
      <ul>
        <li>Decline to issue an Offer;</li>
        <li>Decline to make payment;</li>
        <li>Retain the Items pending compliance;</li>
        <li>Report the matter to the National Crime Agency or other competent authority.</li>
      </ul>
      <p>
        Where we make a report under the Proceeds of Crime Act 2002 or related legislation, we are
        prohibited by law from notifying you of that report.
      </p>

      <h2>7. Acceptance Of Offer &amp; Payment</h2>
      <p>
        Acceptance of an Offer forms a binding contract for the sale of the Items to us at the
        Offer price. Upon acceptance, title and risk in the Items passes to us subject to receipt
        of cleared funds by you.
      </p>
      <p>
        Payment will be made by bank transfer to an account in your name, or by such other lawful
        method as agreed in writing. We do not pay third parties.{' '}
        <strong>Payment is typically released within one (1) Working Day</strong> of Offer
        acceptance and successful completion of identity verification, but timing is not guaranteed.
        We are not liable for any delays caused by banks, payment processors, identity providers or
        events beyond our reasonable control.
      </p>

      <h2>8. Decline Of Offer &amp; Returns</h2>
      <p>
        If you do not accept our Offer within the validity period, or if you actively decline it,
        we will return the Items to you, subject to the following:
      </p>
      <ul>
        <li>
          Return delivery will be by tracked, insured method at our cost up to a maximum declared
          value of £1,000. Where Items exceed this value, any additional insurance is at your cost
          and your discretion. By submitting Items above this value by post, you accept the limit
          of liability set out in this Policy.
        </li>
        <li>
          We may require completion of identity verification before returning Items, in line with
          our AML obligations.
        </li>
        <li>
          We reserve the right to charge reasonable administrative fees, testing costs and return
          shipping where Items were materially misdescribed by you or where we have incurred
          third-party expert costs.
        </li>
      </ul>

      <h2>9. Our Rights</h2>
      <p>We reserve the right, at our sole and absolute discretion:</p>
      <ul>
        <li>To decline to issue an Offer in respect of any Item, without giving reasons;</li>
        <li>To withdraw, amend or re-issue an Offer at any time prior to acceptance;</li>
        <li>To suspend or terminate access to the Site or our services without notice;</li>
        <li>
          To detain Items where we have reasonable cause to suspect they may be stolen, counterfeit
          or otherwise unlawful, and to report the matter to police, regulators or other
          authorities;
        </li>
        <li>To refuse cash payments above any threshold required by law or our internal policy.</li>
      </ul>

      <h2>10. Customer Warranties &amp; Indemnity</h2>
      <p>
        You warrant and represent that all statements made by you, all documents provided, and all
        Items submitted are true, complete, accurate and not misleading. You agree to{' '}
        <strong>indemnify and hold us harmless</strong> against any and all losses, costs (including
        legal costs on an indemnity basis), damages, claims, fines or liabilities suffered or
        incurred by us arising directly or indirectly from:
      </p>
      <ul>
        <li>Any breach by you of these Terms;</li>
        <li>Any inaccuracy, misrepresentation or omission in information you provide;</li>
        <li>Any third-party claim relating to the Items, including but not limited to title disputes;</li>
        <li>Any unlawful, fraudulent or negligent act or omission by you.</li>
      </ul>

      <h2>11. Limitation Of Liability</h2>
      <p>
        Nothing in these Terms excludes or limits our liability for: (i) death or personal injury
        caused by our negligence; (ii) fraud or fraudulent misrepresentation; or (iii) any other
        liability which cannot lawfully be excluded or limited.
      </p>
      <p>
        Subject to the foregoing, and to the maximum extent permitted by applicable law:
      </p>
      <ul>
        <li>
          <strong>
            Our total aggregate liability in contract, tort (including negligence), breach of
            statutory duty or otherwise arising under or in connection with these Terms and our
            services shall not exceed the greater of (i) the Offer price in respect of the relevant
            Items, or (ii) £1,000.
          </strong>
        </li>
        <li>
          We shall not be liable for any indirect, consequential, incidental, special or punitive
          loss or damage; loss of profits, loss of business, loss of revenue, loss of anticipated
          savings, loss of goodwill, loss of opportunity, loss of data or wasted management time,
          whether or not such loss was reasonably foreseeable.
        </li>
        <li>
          We are not liable for any loss or delay caused by events beyond our reasonable control,
          including but not limited to acts of God, war, terrorism, pandemics, government action,
          internet failure, postal disruption, courier failure, third-party service provider
          failure (including Supabase, Vercel, banks, payment processors), strikes, market
          fluctuations or extreme weather.
        </li>
        <li>
          We are not liable for the accuracy of any guide price displayed by the Calculator or any
          other indicative figure.
        </li>
        <li>
          We are not liable for any decision you take in reliance on content displayed on the Site,
          on social media, in advertising or in any communication with us prior to the issuance of
          a final written Offer.
        </li>
      </ul>

      <h2>12. Disclaimer Of Warranties</h2>
      <p>
        The Site, the Calculator, all content and all related services are provided{' '}
        <strong>"as is" and "as available"</strong>, without warranty of any kind, express or
        implied, including but not limited to warranties of merchantability, fitness for a
        particular purpose, non-infringement, accuracy, completeness or uninterrupted operation.
      </p>
      <p>
        We do not warrant that the Site will be free from errors, viruses, malicious code or that
        the Site or any of its content will be available continuously or in any particular
        location. You access and use the Site at your own risk.
      </p>

      <h2>13. Intellectual Property</h2>
      <p>
        All content on the Site (including text, logos, graphics, photographs, calculator design,
        layout, software and underlying code) is owned by us or our licensors and is protected by
        copyright, trade mark and other intellectual property laws. No licence is granted other
        than a personal, non-exclusive, non-transferable, revocable right to use the Site for its
        intended purpose. Any other use, including copying, distribution, scraping, automated data
        collection, framing or modification, is strictly prohibited.
      </p>

      <h2>14. Acceptable Use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Use the Site or our services for any unlawful, fraudulent or harmful purpose;</li>
        <li>Submit false, misleading or stolen Items;</li>
        <li>Use any robot, spider, scraper or automated means to access the Site;</li>
        <li>Attempt to gain unauthorised access to any part of the Site, the admin area, or systems;</li>
        <li>Interfere with or disrupt the Site or servers connected to the Site;</li>
        <li>
          Upload, send or transmit any virus, malware, harmful code or unlawful or offensive content.
        </li>
      </ul>

      <h2>15. Termination</h2>
      <p>
        We may terminate or suspend your access to the Site and our services immediately, without
        notice, for any breach of these Terms. Termination does not affect any rights or obligations
        of either party which accrued prior to termination.
      </p>

      <h2>16. Privacy &amp; Cookies</h2>
      <p>
        Our processing of personal data is described in our{' '}
        <a href="/privacy">Privacy Policy</a>. Our use of cookies is described in our{' '}
        <a href="/cookies">Cookie Policy</a>. Both are incorporated into these Terms by reference.
      </p>

      <h2>17. Notices</h2>
      <p>
        Any notice given under these Terms must be in writing and may be sent by email to{' '}
        <a href={`mailto:${email}`}>{email}</a> (in our case) or to the email address you provided
        (in your case). Notices sent by email are deemed delivered on the next Working Day after
        sending.
      </p>

      <h2>18. Third-Party Rights</h2>
      <p>
        A person who is not a party to these Terms has no rights under the Contracts (Rights of
        Third Parties) Act 1999 to enforce any term.
      </p>

      <h2>19. Severability</h2>
      <p>
        If any provision of these Terms is found to be unlawful, void or unenforceable, that
        provision shall be deemed severable from the remainder, which shall continue in full force
        and effect.
      </p>

      <h2>20. Entire Agreement</h2>
      <p>
        These Terms, together with our Privacy Policy and Cookie Policy, constitute the entire
        agreement between you and us in relation to your use of the Site and our services. They
        supersede all prior communications, negotiations or agreements (whether oral or written).
      </p>

      <h2>21. Variation</h2>
      <p>
        We may amend these Terms at any time by posting an updated version on the Site. The "Last
        updated" date will reflect the current version. Material changes will be highlighted. Your
        continued use of the Site or our services after such posting constitutes acceptance of the
        revised Terms.
      </p>

      <h2>22. Governing Law &amp; Jurisdiction</h2>
      <p>
        These Terms, and any dispute or claim (including non-contractual disputes or claims)
        arising out of or in connection with them or their subject matter or formation, shall be
        governed by and construed in accordance with the laws of <strong>England and Wales</strong>.
        The courts of <strong>England and Wales</strong> shall have exclusive jurisdiction to
        settle any such dispute or claim.
      </p>

      <h2>23. Contact</h2>
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
