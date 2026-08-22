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
      { src: '/favicon/lion-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: '/favicon/lion-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
