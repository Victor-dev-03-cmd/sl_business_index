import { MetadataRoute } from 'next';
import { createClient } from '@/lib/supabase/server';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();
  const baseUrl = 'https://slbusinessindex.com';

  // Fetch all approved businesses
  const { data: businesses } = await supabase
    .from('businesses')
    .select('id, slug, updated_at')
    .eq('status', 'approved');

  const businessEntries: MetadataRoute.Sitemap = (businesses || []).map((business) => ({
    url: `${baseUrl}/business/${business.slug || business.id}`,
    lastModified: business.updated_at || new Date().toISOString(),
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date().toISOString(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/signup`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    ...businessEntries,
  ];
}
