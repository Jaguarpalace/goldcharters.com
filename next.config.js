/** @type {import('next').NextConfig} */

// Production security headers. Sent on every response.
// Tweak Content-Security-Policy if you add new third-party scripts later.
const securityHeaders = [
  // HTTP Strict Transport Security — force HTTPS for 2 years
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  // Prevent clickjacking — site cannot be iframed by other domains
  { key: 'X-Frame-Options', value: 'DENY' },
  // Stop browsers from MIME-sniffing responses
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Limit referrer leakage on outbound clicks
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Restrict powerful browser APIs we don't use
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  // Speed up DNS lookups for outbound assets
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false, // hide "X-Powered-By: Next.js"
  compress: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '20mb',
    },
  },
  async headers() {
    return [
      {
        // Apply security headers to every route
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        // Cache the static logo aggressively — it rarely changes
        source: '/logo/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
