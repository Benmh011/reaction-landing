import type { MetadataRoute } from 'next';

const BASE_URL = 'https://reaction.org.uk';

/**
 * Sitemap is served automatically at /sitemap.xml.
 *
 * Includes only pages we want Google to index. Excludes:
 *  - /auth/*  (private)
 *  - /portal  (authenticated)
 *  - /admin/* (private)
 *  - /api/*   (not user-facing)
 *  - /unsubscribe (utility page, also has noindex meta)
 *
 * When /insights goes live, add the index page and each article slug here.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    {
      url: BASE_URL,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/demo`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
  ];
}
