import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/vendor/', '/api/'],
    },
    sitemap: 'https://slbusinessindex.com/sitemap.xml',
  };
}
