import type { Metadata } from 'next';
import { getFaqs } from '@/lib/queries/faqs';
import { FAQSection } from '@/components/public/FAQSection';
import { JsonLd } from '@/lib/seo/JsonLd';
import { faqPageSchema, SITE_URL } from '@/lib/seo/structuredData';

export const revalidate = 120;

export const metadata: Metadata = {
  title: 'Frequently Asked Questions',
  description:
    'Answers to common questions about selling gold, jewellery, watches and handbags, our valuation process, ID requirements and payment timelines.',
  alternates: { canonical: `${SITE_URL}/faqs` },
  openGraph: { url: `${SITE_URL}/faqs` },
};

export default async function FaqsPage() {
  const faqs = await getFaqs();
  return (
    <>
      <JsonLd data={faqPageSchema(faqs)} />
      {/* FAQSection acts as the page hero — its title renders as <h1>. */}
      <FAQSection faqs={faqs} asH1 />
    </>
  );
}
