import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { Business } from '@/lib/types';
import BusinessDetailsClient from './BusinessDetailsClient';
import { Metadata } from 'next';

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

/**
 * Robust business details fetcher that handles:
 * 1. Exact slug match
 * 2. ID match (with UUID/Numeric validation)
 */
async function getBusinessDetails(slugOrId: string): Promise<Business | null> {
  const supabase = await createClient();
  
  // 1. First attempt: Fetch by slug
  const { data: slugData } = await supabase
    .from('businesses')
    .select('*')
    .eq('slug', slugOrId)
    .single();

  if (slugData) return mapBusinessData(slugData);

  // 2. Second attempt: Fallback to ID
  // Validate if input is a valid UUID or Integer to prevent Postgres casting errors
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId);
  const isNumeric = /^\d+$/.test(slugOrId);

  if (isUUID || isNumeric) {
    const { data: idData } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', slugOrId)
      .single();
    
    if (idData) return mapBusinessData(idData);
  }

  return null;
}

function mapBusinessData(data: any): Business {
  return {
    id: data.id,
    slug: data.slug,
    name: data.name,
    category: data.category,
    description: data.description,
    address: data.address,
    phone: data.phone,
    email: data.email,
    website_name: data.website_name,
    website_url: data.website_url,
    rating: data.rating,
    reviews_count: data.reviews_count,
    image_url: data.image_url,
    latitude: data.latitude,
    longitude: data.longitude,
    status: data.status,
    created_at: data.created_at,
    owner_name: data.owner_name,
    owner_id: data.owner_id,
    logo_url: data.logo_url,
    registration_number: data.registration_number,
    is_registered: data.is_registered,
    working_hours: data.working_hours,
    facilities: data.facilities,
    detailed_address: data.detailed_address,
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const business = await getBusinessDetails(slug);

  if (!business) return { title: 'Business Not Found' };

  // If accessed via ID, redirect to slug for SEO
  if (business.slug && business.slug !== slug) {
    redirect(`/business/${business.slug}`);
  }

  const city = business.address ? business.address.split(',').pop().trim() : 'Sri Lanka';

  return {
    title: business.name,
    description: `Contact ${business.name} in ${city}. ${business.description.substring(0, 150)}...`,
    openGraph: {
      title: `${business.name} | ${business.category}`,
      description: business.description,
      images: business.image_url ? [business.image_url] : [],
    },
  };
}

export default async function BusinessDetailPage({ params }: Props) {
  const { slug } = await params;
  const business = await getBusinessDetails(slug);

  if (!business) notFound();

  // If accessed via ID, redirect to slug for SEO
  if (business.slug && business.slug !== slug) {
    redirect(`/business/${business.slug}`);
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: business.name,
    image: business.image_url,
    description: business.description,
    '@id': `https://slbusinessindex.com/business/${business.slug || business.id}`,
    url: `https://slbusinessindex.com/business/${business.slug || business.id}`,
    telephone: business.phone,
    address: {
      '@type': 'PostalAddress',
      streetAddress: business.address || '',
      addressLocality: business.address ? business.address.split(',').pop().trim() : 'Sri Lanka',
      addressCountry: 'LK',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: business.latitude,
      longitude: business.longitude,
    },
    aggregateRating: (business.reviews_count || 0) > 0 ? {
      '@type': 'AggregateRating',
      ratingValue: business.rating || 0,
      reviewCount: business.reviews_count || 0,
    } : undefined,
    category: business.category,
    priceRange: '$$',
    openingHoursSpecification: business.working_hours ? Object.entries(business.working_hours).map(([day, hours]: [string, any]) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: day,
      opens: hours.open || '09:00',
      closes: hours.close || '17:00',
    })) : undefined,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <BusinessDetailsClient business={business} />
    </>
  );
}
