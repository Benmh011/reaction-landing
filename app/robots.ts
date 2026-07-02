import type { MetadataRoute } from 'next';

const BASE_URL = 'https://reaction.org.uk';

/**
 * Robots.txt is served automatically at /robots.txt.
 *
 * - Allow public marketing pages
 * - Disallow authenticated, private, and utility routes
 * - Point crawlers at the sitemap
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/auth/',
          '/api/',
          '/unsubscribe',
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
