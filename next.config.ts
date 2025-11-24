import type { NextConfig } from "next";
// Sentry (optional) – will be enabled if SENTRY_DSN is present. We avoid wrapping if not set to keep build lean.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { withSentryConfig } = (() => {
  try { return require('@sentry/nextjs'); } catch { return { withSentryConfig: (c: any) => c }; }
})();

// Enable bundle analyzer when ANALYZE=true
// Using require here is compatible with Next config loading
// eslint-disable-next-line @typescript-eslint/no-var-requires
const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  /* Add config customizations here if needed */
  reactStrictMode: true,
  poweredByHeader: false,
  // eslint config in next.config is deprecated in Next 16; keep linting in CI instead
  webpack: (config) => {
    // Some libs optionally require pino-pretty in browser bundle; alias to false to avoid module not found
    config.resolve = config.resolve || {} as any;
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      'pino-pretty': false,
      // Suppress optional MetaMask SDK React Native async-storage dependency in web build
      '@react-native-async-storage/async-storage': false,
      '@metamask/sdk': false,
    } as any;
    return config;
  },
  images: {
    // Allow broad remote images for now (tighten with explicit host list in production)
    remotePatterns: [ { protocol: 'https', hostname: '**' } ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [360, 414, 640, 768, 1024, 1280, 1536, 1920],
    imageSizes: [16, 24, 32, 48, 64, 96, 128, 256],
  },
  // Allow LAN dev origin to suppress cross-origin dev warning
  allowedDevOrigins: [ 'http://localhost:3000', 'http://192.168.56.1:3000' ],
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'same-origin' },
          {
            key: 'Permissions-Policy',
            value:
              'accelerometer=(), ambient-light-sensor=(), autoplay=(), battery=(), camera=(), display-capture=(), document-domain=(), encrypted-media=(), fullscreen=(self), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), midi=(), payment=(), picture-in-picture=(), speaker-selection=(), usb=(), vibrate=(), vr=()'
          },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        ],
      },
      // Long-lived immutable caching for build-time static assets (fingerprinted).
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }
        ]
      },
      // Public assets (can be replaced; use shorter max-age + stale-while-revalidate)
      {
        source: '/public/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' }
        ]
      },
      // Image optimization caching guidance (the Next.js image optimizer sets headers; this is for any manual image routes)
      {
        source: '/images/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=2592000' }
        ]
      }
    ];
  },
  // Removed invalid experimental.turbo flag (Next.js 16 uses Turbopack by default; opt-out removed).
};

const baseConfig = withBundleAnalyzer(nextConfig);
export default withSentryConfig
  ? withSentryConfig(
      baseConfig,
      // sentryWebpackPluginOptions
      {
        silent: true,
        org: process.env.SENTRY_ORG || 'example',
        project: process.env.SENTRY_PROJECT || 'blockfreelancer',
      },
      // sentryNextOptions
      {
        hideSourceMaps: true,
        disableServerWebpackPlugin: !process.env.SENTRY_DSN,
        disableClientWebpackPlugin: !process.env.SENTRY_DSN,
      }
    )
  : baseConfig;
