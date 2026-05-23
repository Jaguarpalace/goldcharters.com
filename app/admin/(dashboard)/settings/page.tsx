import { getSiteSettings } from '@/lib/queries/homepage';
import { SettingsEditor } from './SettingsEditor';

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  const settings = await getSiteSettings();
  return (
    <div className="space-y-8">
      <header>
        <span className="text-xs uppercase tracking-luxe text-gold-metallic">CMS</span>
        <h1 className="font-display text-4xl text-white mt-2">Site Settings</h1>
        <p className="mt-2 max-w-2xl text-sm text-warmgrey">
          One screen for everything that appears across the whole site — brand, contact, top bar, footer, SEO.
        </p>
      </header>

      <SettingsEditor initial={settings} />
    </div>
  );
}
