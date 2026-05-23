import type { MetadataRoute } from 'next';
import { getSiteSettings } from '@/lib/queries/homepage';

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const settings = await getSiteSettings();
  return {
    name: settings.business_name,
    short_name: settings.business_name,
    description: settings.seo_description,
    start_url: '/',
    display: 'standalone',
    background_color: '#050505',
    theme_color: '#050505',
    orientation: 'portrait-primary',
    icons: [
      { src: '/logo/charters-gold.webp', sizes: 'any', type: 'image/webp' },
    ],
  };
}
