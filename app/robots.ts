import type { MetadataRoute } from 'next';
import {SLBI_PUBLIC_ORIGIN} from '@/lib/seo/public-business';

export default function robots():MetadataRoute.Robots{
  return {
    rules:[{
      userAgent:'*',
      allow:'/',
      // Crawl controls are NOT the access-control boundary; vendor/admin APIs
      // still require authentication + owner-scoped server checks and RLS.
      disallow:['/admin/','/vendor/','/api/','/auth/','/login','/signup'],
    }],
    sitemap:SLBI_PUBLIC_ORIGIN+'/sitemap.xml',
    host:SLBI_PUBLIC_ORIGIN,
  };
}
