import { getItemsWeBuy } from '@/lib/queries/items';
import { ItemsEditor } from './ItemsEditor';

export const dynamic = 'force-dynamic';

export default async function AdminItemsWeBuyPage() {
  const items = await getItemsWeBuy();
  return (
    <div className="space-y-8">
      <header>
        <span className="text-xs uppercase tracking-luxe text-gold-metallic">CMS</span>
        <h1 className="font-display text-4xl text-white mt-2">Items We Buy</h1>
        <p className="mt-2 text-sm text-warmgrey">
          The list shown on the homepage and sell pages. Add, edit, reorder, hide. Changes reflect on the
          public site within a couple of minutes.
        </p>
      </header>

      <ItemsEditor initial={items} />
    </div>
  );
}
