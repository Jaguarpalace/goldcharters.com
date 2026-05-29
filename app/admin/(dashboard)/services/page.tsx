import { getServices } from '@/lib/queries/services';
import { ServicesEditor } from './ServicesEditor';

export const dynamic = 'force-dynamic';

export default async function AdminServicesPage() {
  // Admin sees hidden services too so they can re-enable them.
  const services = await getServices({ includeHidden: true });
  return (
    <div className="space-y-8">
      <header>
        <span className="text-xs uppercase tracking-luxe text-gold-metallic">CMS</span>
        <h1 className="font-display text-2xl text-white mt-2">Services</h1>
        <p className="mt-2 max-w-2xl text-sm text-warmgrey">
          Edit the service cards that appear on the homepage. Changes save to Supabase and refresh the
          public site within a couple of minutes.
        </p>
      </header>

      <ServicesEditor initial={services} />
    </div>
  );
}
