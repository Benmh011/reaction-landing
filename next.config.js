/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // ── Trades PMS (/demos/trades-pms) ────────────────────────────────────
  // The app is the /trades-pms folder, read from disk by its route handlers.
  // These lines make sure Vercel ships that folder (and the print browser)
  // with the functions that read them.
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  outputFileTracingIncludes: {
    "/demos/trades-pms": ["./trades-pms/web/index.html"],
    "/api/trades-pms/asset": ["./trades-pms/src/**/*", "./trades-pms/web/**/*"],
    "/api/trades-pms/pdf": [
      "./trades-pms/src/assets/fonts/*",
      "./node_modules/@sparticuz/chromium/bin/**/*",
    ],
  },
  // The app's files are served to approved sign-ins only, through one route.
  // An article's address is /articles/<its address>; the page that shows it is
  // app/articles/read, given the address as ?slug=. Real pages are matched
  // before these, so /articles and /articles/read are never sent anywhere.
  async rewrites() {
    return [
      {
        source: "/demos/trades-pms/app/:path*",
        destination: "/api/trades-pms/asset?f=:path*",
      },
      {
        source: "/articles/:slug",
        destination: "/articles/read?slug=:slug",
      },
    ];
  },
};

module.exports = nextConfig;
