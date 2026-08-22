import type { Metadata, Viewport } from 'next';
import { Manrope } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';
import { getSiteSettings } from '@/lib/queries/homepage';
import { Header } from '@/components/public/Header';
import { Footer } from '@/components/public/Footer';
import { CookieConsent } from '@/components/public/CookieConsent';
import { WhatsAppButton } from '@/components/public/WhatsAppButton';
import { RecoveryRedirect } from '@/components/public/RecoveryRedirect';
import { JsonLd } from '@/lib/seo/JsonLd';
import {
  localBusinessSchema,
  organizationSchema,
  SITE_URL,
  websiteSchema,
} from '@/lib/seo/structuredData';

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-manrope',
  display: 'swap',
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: settings.seo_title,
      template: `%s · ${settings.business_name}`,
    },
    description: settings.seo_description,
    applicationName: settings.business_name,
    authors: [{ name: settings.business_name }],
    keywords: [
      // Core UK terms
      'sell gold UK',
      'gold buyer UK',
      'cash for gold UK',
      'gold valuation UK',
      'scrap gold buyer UK',
      // Local long-tail (high intent, lower competition) — office in Ascot,
      // serving the wider Berkshire/Surrey border and the towns we cover.
      'gold buyer Ascot',
      'sell gold Ascot',
      'gold valuation Ascot',
      'gold buyer Berkshire',
      'sell gold Berkshire',
      'gold buyer Windsor',
      'sell gold Windsor',
      'gold buyer Sunningdale',
      'gold buyer Surrey',
      'sell gold Surrey',
      'gold valuation Surrey',
      'sell gold Egham',
      'Hatton Garden alternative',
      // Specific items
      'sell diamond ring UK',
      'sell diamond ring for cash',
      'sell engagement ring UK',
      'sell antique jewellery UK',
      'sell inherited jewellery UK',
      'sell broken gold UK',
      'sell gold coins UK',
      'sell sovereigns UK',
      'sell gold bars UK',
      // Watches & handbags
      'sell luxury watch UK',
      'sell Rolex UK',
      'sell Patek Philippe UK',
      'sell designer handbag UK',
      'sell Hermes bag UK',
      'sell Chanel bag UK',
      // Brand modifiers
      'private valuation house',
      'discreet gold buyer',
      'same-day payment gold buyer',
      'gold calculator UK',
      'gold price per gram UK',
    ],
    // No layout-level canonical: it would cascade to every page that doesn't
    // declare its own and mark them as duplicates of the homepage. Each
    // indexable page sets its canonical via buildPageMetadata or locally.
    openGraph: {
      type: 'website',
      url: SITE_URL,
      siteName: settings.business_name,
      title: settings.seo_title,
      description: settings.seo_description,
      locale: 'en_GB',
      images: [
        {
          url: '/og-card.png',
          width: 1200,
          height: 630,
          alt: settings.business_name,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: settings.seo_title,
      description: settings.seo_description,
      images: ['/og-card.png'],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
      },
    },
    icons: {
      icon: [
        { url: '/favicon/lion.ico', sizes: 'any' },
        { url: '/favicon/lion-16x16.png', type: 'image/png', sizes: '16x16' },
        { url: '/favicon/lion-32x32.png', type: 'image/png', sizes: '32x32' },
        { url: '/favicon/lion-192x192.png', type: 'image/png', sizes: '192x192' },
        { url: '/favicon/lion-512x512.png', type: 'image/png', sizes: '512x512' },
      ],
      shortcut: '/favicon/lion.ico',
      apple: '/favicon/lion-apple-touch-180x180.png',
    },
    category: 'business',
  };
}

export const viewport: Viewport = {
  themeColor: '#050505',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSiteSettings();

  return (
    <html lang="en-GB" className={manrope.variable}>
      <body className="font-sans">
        <JsonLd
          data={[
            organizationSchema(settings),
            websiteSchema(settings),
            localBusinessSchema(settings),
          ]}
        />
        {/* Live gold ticker removed from the public header - keeps the
            chrome calmer and stops shoppers reading numbers when we'd
            rather they request a private valuation. Live spot data still
            powers the calculator and lives in /admin/price-dashboard. */}
        <Header settings={settings} />
        <main className="min-h-screen gc-bg-noise">{children}</main>
        <Footer settings={settings} />
        <WhatsAppButton whatsapp={settings.whatsapp} />
        <CookieConsent />
        <RecoveryRedirect />
        <Analytics />
      </body>
    </html>
  );
}
