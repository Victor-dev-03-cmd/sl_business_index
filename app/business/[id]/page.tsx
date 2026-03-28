import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { Business } from '@/lib/types';
import BusinessDetailsClient from './BusinessDetailsClient';
import { Metadata } from 'next';

type Props = {
  params: Promise<{
    id: string;
  }>;
};

async function getBusinessDetails(id: string): Promise<Business | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    console.error('Error fetching business details:', error);
    return null;
  }
  
  const business: Business = {
    id: data.id,
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

  return business;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const business = await getBusinessDetails(id);

  if (!business) {
    return {
      title: 'Business Not Found',
    };
  }

  // Extract city from address if possible, otherwise use a default
  const city = business.address.split(',').pop()?.trim() || 'Sri Lanka';

  return {
    title: business.name,
    description: `Contact ${business.name} in ${city}. Category: ${business.category}. ${business.description?.substring(0, 150)}...`,
    openGraph: {
      title: `${business.name} | ${business.category} in ${city}`,
      description: business.description || `Discover ${business.name} on SL Business Index.`,
      images: business.image_url ? [business.image_url] : [],
    },
  };
}

export default async function BusinessDetailPage({ params }: Props) {
  const { id } = await params;
  const business = await getBusinessDetails(id);

  if (!business) {
    notFound();
  }

  // JSON-LD LocalBusiness Schema
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: business.name,
    image: business.image_url,
    '@id': `https://slbusinessindex.com/business/${business.id}`,
    url: `https://slbusinessindex.com/business/${business.id}`,
    telephone: business.phone,
    address: {
      '@type': 'PostalAddress',
      streetAddress: business.address,
      addressLocality: business.address.split(',').pop()?.trim() || 'Sri Lanka',
      addressCountry: 'LK',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: business.latitude,
      longitude: business.longitude,
    },
    openingHoursSpecification: business.working_hours ? Object.entries(business.working_hours).map(([day, hours]) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: day,
      opens: (hours as any).open,
      closes: (hours as any).close,
    })) : [],
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

