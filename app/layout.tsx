import type { Metadata, Viewport } from 'next';
import { Manrope } from 'next/font/google';
import './globals.css';
import { getSiteSettings } from '@/lib/queries/homepage';
import { Header } from '@/components/public/Header';
import { Footer } from '@/components/public/Footer';
import { LiveGoldTicker } from '@/components/public/LiveGoldTicker';
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
      // Local long-tail (high intent, lower competition)
      'gold buyer Surrey',
      'gold buyer Egham',
      'sell gold Egham',
      'sell gold Surrey',
      'gold valuation Surrey',
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
    alternates: { canonical: SITE_URL },
    openGraph: {
      type: 'website',
      url: SITE_URL,
      siteName: settings.business_name,
      title: settings.seo_title,
      description: settings.seo_description,
      locale: 'en_GB',
      images: [
        {
          url: '/logo/charters-gold.webp',
          width: 1200,
          height: 1200,
          alt: settings.business_name,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: settings.seo_title,
      description: settings.seo_description,
      images: ['/logo/charters-gold.webp'],
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
      icon: '/logo/charters-gold.webp',
      apple: '/logo/charters-gold.webp',
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
        {/* Trust bar removed — its content (live ticker, phone) is now inline
            inside the Header, in the same row as the logo. LiveGoldTicker is
            an async server component, passed in as a prop so the client-side
            Header can render it without itself becoming async. */}
        <Header settings={settings} liveTicker={<LiveGoldTicker />} />
        <main className="min-h-screen gc-bg-noise">{children}</main>
        <Footer settings={settings} />
      </body>
    </html>
  );
}
