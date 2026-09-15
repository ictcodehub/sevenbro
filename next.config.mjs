import withPWAInit from "next-pwa"

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  // Runtime caching — shell + pages (+ optional data API)
  runtimeCaching: [
    {
      // App shell & static assets: cache-first
      urlPattern: /^https?.*\.(?:png|jpg|jpeg|svg|gif|webp|ico|woff2?|css|js)$/,
      handler: "CacheFirst",
      options: {
        cacheName: "static-assets",
        expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
      },
    },
    {
      // Page navigations: network-first, fall back to cache (offline)
      urlPattern: ({ request }) => request.mode === "navigate",
      handler: "NetworkFirst",
      options: {
        cacheName: "pages",
        networkTimeoutSeconds: 4,
        expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 7 },
      },
    },
    // Example: your data API — network-first (fresh data with offline fallback).
    // Point urlPattern at your backend domain, or delete this rule.
    // {
    //   urlPattern: /^https:\/\/api\.example\.com\/.*/i,
    //   handler: "NetworkFirst",
    //   options: {
    //     cacheName: "api-data",
    //     networkTimeoutSeconds: 5,
    //     expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
    //   },
    // },
  ],
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
}

export default withPWA(nextConfig)
