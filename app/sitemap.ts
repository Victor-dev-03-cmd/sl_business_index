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

  // Fetch all categories
  const { data: categories } = await supabase
    .from('categories')
    .select('name, updated_at')
    .order('name', { ascending: true });

  const businessEntries: MetadataRoute.Sitemap = (businesses || []).map((business) => ({
    url: `${baseUrl}/business/${business.slug || business.id}`,
    lastModified: business.updated_at || new Date().toISOString(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  const categoryEntries: MetadataRoute.Sitemap = (categories || []).map(category => ({
    url: `${baseUrl}/category/${slugify(category.name)}`,
    lastModified: category.updated_at || new Date().toISOString(),
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  // Generate unique cities from businesses
  const uniqueCities = Array.from(new Set((businesses || [])
    .map(b => b.city)
    .filter(Boolean)));

  const cityEntries: MetadataRoute.Sitemap = uniqueCities.map(city => ({
    url: `${baseUrl}/city/${slugify(city!)}`,
    lastModified: new Date().toISOString(),
    changeFrequency: 'weekly',
    priority: 0.6,
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
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/register-business`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/testimonials`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/terms-of-service`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/privacy-policy`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/pricing-plans`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/faq`,
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
