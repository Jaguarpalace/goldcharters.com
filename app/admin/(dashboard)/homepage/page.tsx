import { getHomepageSections } from '@/lib/queries/homepage';
import { HomepageEditor } from './HomepageEditor';

export const dynamic = 'force-dynamic';

export default async function HomepageCMSPage() {
  const sections = await getHomepageSections();

  return (
    <div className="space-y-8">
      <header>
        <span className="text-xs uppercase tracking-luxe text-gold-metallic">CMS</span>
        <h1 className="font-display text-4xl text-white mt-2">Homepage Editor</h1>
        <p className="mt-2 max-w-2xl text-sm text-warmgrey">
          Edit every public homepage section — hero, sell, jewellery, valuation explainer. Changes save to
          Supabase and refresh the live site within a couple of minutes (or instantly on hard refresh).
        </p>
      </header>

      <HomepageEditor initial={sections} />
    </div>
  );
}
