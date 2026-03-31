import { MetadataRoute } from 'next';
import { createClient } from '@/lib/supabase/server';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();
  const baseUrl = 'https://slbusinessindex.com';

  // Helper to slugify names
  const slugify = (name: string) => {
    return name
      .toLowerCase()
      .trim()
      .replace(/ & /g, '-')
      .replace(/ /g, '-')
      .replace(/,/g, '')
      .replace(/[^\w-]+/g, '');
  };

  // Fetch all approved businesses
  const { data: businesses } = await supabase
    .from('businesses')
    .select('id, slug, updated_at, category, city')
    .eq('status', 'approved');

  const businessEntries: MetadataRoute.Sitemap = (businesses || []).map((business) => ({
    url: `${baseUrl}/business/${business.slug || business.id}`,
    lastModified: business.updated_at || new Date().toISOString(),
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  // Generate unique categories
  const uniqueCategories = Array.from(new Set((businesses || [])
    .map(b => b.category)
    .filter(Boolean)));

  const categoryEntries: MetadataRoute.Sitemap = uniqueCategories.map(category => ({
    url: `${baseUrl}/category/${slugify(category)}`,
    lastModified: new Date().toISOString(),
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  // Generate unique cities
  const uniqueCities = Array.from(new Set((businesses || [])
    .map(b => b.city)
    .filter(Boolean)));

  const cityEntries: MetadataRoute.Sitemap = uniqueCities.map(city => ({
    url: `${baseUrl}/city/${slugify(city)}`,
    lastModified: new Date().toISOString(),
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date().toISOString(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'yearly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/terms-of-service`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'yearly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/privacy-policy`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'yearly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/pricing-plans`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/faq`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'monthly',
      priority: 0.8,
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
  ];

  return [
    ...staticPages,
    ...categoryEntries,
    ...cityEntries,
    ...businessEntries,
  ];
}
