import type { Metadata } from 'next';
import { getFaqs } from '@/lib/queries/faqs';
import { FAQSection } from '@/components/public/FAQSection';
import { JsonLd } from '@/lib/seo/JsonLd';
import { faqPageSchema } from '@/lib/seo/structuredData';
import { buildPageMetadata } from '@/lib/queries/pageSeo';

export const revalidate = 120;

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata('/faqs');
}

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
