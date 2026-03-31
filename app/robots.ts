import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/vendor/', '/api/'],
      },
      {
        userAgent: ['GPTBot', 'CCBot', 'Google-Other', 'ClaudeBot', 'PerplexityBot'],
        allow: '/',
      }
    ],
    sitemap: 'https://slbusinessindex.com/sitemap.xml',
  };
}
