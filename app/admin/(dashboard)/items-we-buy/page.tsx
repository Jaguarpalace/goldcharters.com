import { getItemsWeBuy } from '@/lib/queries/items';
import { ItemsEditor } from './ItemsEditor';

export const dynamic = 'force-dynamic';

export default async function AdminItemsWeBuyPage() {
  // Admin sees hidden items too so they can re-enable them.
  const items = await getItemsWeBuy({ includeHidden: true });
  return (
    <div className="space-y-8">
      <header>
        <span className="text-xs uppercase tracking-luxe text-gold-metallic">CMS</span>
        <h1 className="font-display text-2xl text-white mt-2">Items We Buy</h1>
        <p className="mt-2 text-sm text-warmgrey">
          The list shown on the homepage and sell pages. Add, edit, reorder, hide. Changes reflect on the
          public site within a couple of minutes.
        </p>
      </header>

      <ItemsEditor initial={items} />
    </div>
  );
}
