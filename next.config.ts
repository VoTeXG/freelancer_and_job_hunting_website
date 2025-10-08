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
  eslint: {
    // Keep lint in CI via separate step; don’t fail production builds due to lint errors
    ignoreDuringBuilds: true,
  },
  webpack: (config) => {
    // Some libs optionally require pino-pretty in browser bundle; alias to false to avoid module not found
    config.resolve = config.resolve || {} as any;
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      'pino-pretty': false,
    } as any;
    return config;
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
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
    ];
  },
  sentry: {
    hideSourceMaps: true,
    disableServerWebpackPlugin: !process.env.SENTRY_DSN,
    disableClientWebpackPlugin: !process.env.SENTRY_DSN,
  }
};

const baseConfig = withBundleAnalyzer(nextConfig);
export default withSentryConfig ? withSentryConfig(baseConfig, {
  silent: true,
  org: process.env.SENTRY_ORG || 'example',
  project: process.env.SENTRY_PROJECT || 'blockfreelancer'
}) : baseConfig;
