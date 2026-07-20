import type { MetadataRoute } from "next";

const BASE_URL = "https://reaction.org.uk";

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
 * Add each new /insights article to the articles array below.
 */

const articles: Array<{ slug: string; publishedAt: string }> = [
  {
    slug: "tef-and-student-experience",
    publishedAt: "2026-05-12",
  },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/products`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/demo`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/insights`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];

  const articleRoutes: MetadataRoute.Sitemap = articles.map((article) => ({
    url: `${BASE_URL}/insights/${article.slug}`,
    lastModified: new Date(article.publishedAt),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [...staticRoutes, ...articleRoutes];
}
