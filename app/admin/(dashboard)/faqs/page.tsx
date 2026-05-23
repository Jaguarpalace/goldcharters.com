import { getFaqs } from '@/lib/queries/faqs';
import { FaqsEditor } from './FaqsEditor';

export const dynamic = 'force-dynamic';

export default async function AdminFaqsPage() {
  const faqs = await getFaqs();
  return (
    <div className="space-y-8">
      <header>
        <span className="text-xs uppercase tracking-luxe text-gold-metallic">CMS</span>
        <h1 className="font-display text-4xl text-white mt-2">FAQs</h1>
        <p className="mt-2 text-sm text-warmgrey">
          Manage frequently asked questions. Changes appear on the public site within a couple of minutes.
        </p>
      </header>

      <FaqsEditor initial={faqs} />
    </div>
  );
}
