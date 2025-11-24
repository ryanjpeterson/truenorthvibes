import { MetadataRoute } from 'next';
import { getPostSlugs, getCategories } from '@/lib/strapi';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = 'https://vibes.ryanjpeterson.dev'; 

  // 1. Static Routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
  ];

  // 2. Fetch dynamic data
  const [posts, categories] = await Promise.all([
    getPostSlugs(),
    getCategories(),
  ]);

  // 3. Generate Post URLs
  const postRoutes: MetadataRoute.Sitemap = posts.map((post: { slug: string; updatedAt: string }) => ({
    url: `${siteUrl}/blog/${post.slug}`,
    lastModified: new Date(post.updatedAt),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  // 4. Generate Category URLs (Query Params)
  const categoryRoutes: MetadataRoute.Sitemap = categories.map((cat: { name: string }) => ({
    url: `${siteUrl}/?category=${encodeURIComponent(cat.name)}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  return [...staticRoutes, ...postRoutes, ...categoryRoutes];
}