import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { Business } from '@/lib/types';
import BusinessDetailsClient from './BusinessDetailsClient';
import { Metadata } from 'next';
import {cache} from 'react';
import {getPublicBusinessSEO, getPublicBusinessJsonLd, isPublicApprovedBusiness} from '@/lib/seo/public-business';

export const revalidate = 600

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

// Same request-scoped RLS client for metadata and page, never shared across users.
const getBusinessDetails=cache(async (slugOrId: string) => {
  const supabase=await createClient();
  const columns='id,slug,name,category,description,address,phone,email,website_name,website_url,rating,reviews_count,image_url,latitude,longitude,status,created_at,owner_name,owner_id,logo_url,registration_number,is_registered,is_verified,verification_status,can_show_badge,working_hours,facilities,detailed_address,business_profile_content(services,gallery_paths)';
  const isUUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId);
  // Only validated UUIDs enter PostgREST OR syntax. Exact slug wins collisions.
  const query=supabase.from('businesses').select(columns);
  const {data,error}=await (isUUID?query.or('slug.eq.'+slugOrId+',id.eq.'+slugOrId).limit(2):query.eq('slug',slugOrId).limit(1));
  if(error)throw new Error('Business details temporarily unavailable');
  const row=data?.find(item=>item.slug===slugOrId)??data?.[0];
  if(!row)return null;
  const nested=row.business_profile_content;
  const profileContent=Array.isArray(nested)?nested[0]:nested;
  return {business:mapBusinessData(row),profileContent,supabase};
});

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
    is_verified: data.is_verified,
    verification_status: data.verification_status,
    can_show_badge: data.can_show_badge,
    working_hours: data.working_hours,
    facilities: data.facilities,
    detailed_address: data.detailed_address,
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const details = await getBusinessDetails(slug);
  const business = details?.business;

  if (!business) return {
    title: 'Business Not Found | SL Business Index',
    robots: {index:false,follow:false},
  };

  // If accessed via ID, redirect to slug for SEO
  if (business.slug && business.slug !== slug) {
    redirect(`/business/${business.slug}`);
  }

  // Unapproved/private owner previews must not be crawled or treated as
  // indexed business listings, even if an authenticated owner can view them.
  if (!isPublicApprovedBusiness(business)) {
    return {
      title: 'Business Preview | SL Business Index',
      robots: {index:false,follow:false,googleBot:{index:false,follow:false}},
    };
  }

  const seo = getPublicBusinessSEO(business);
  return {
    title: seo.title,
    description: seo.description,
    alternates: {canonical:seo.canonical},
    robots: {index:true,follow:true},
    openGraph: {
      type:'website',
      url:seo.canonical,
      title:seo.title,
      description:seo.description,
      siteName:'SL Business Index',
      ...(business.image_url&&/^https:\/\//i.test(business.image_url)?{images:[business.image_url]}:{}),
    },
  };
}

export default async function BusinessDetailPage({ params }: Props) {
  const { slug } = await params;
  const details = await getBusinessDetails(slug);
  const business = details?.business;

  if (!business) notFound();

  // If accessed via ID, redirect to slug for SEO
  if (business.slug && business.slug !== slug) {
    redirect(`/business/${business.slug}`);
  }

  const {supabase,profileContent}=details!;
  const galleryUrls = [...new Set<string>((profileContent?.gallery_paths || []).filter((path:unknown):path is string=>typeof path==='string'&&path.startsWith(String(business.id)+'/')))].map(path=>supabase.storage.from('business-gallery').getPublicUrl(path).data.publicUrl);
  const services = Array.isArray(profileContent?.services) ? profileContent.services.filter((service:unknown):service is string=>typeof service==='string'&&Boolean(service.trim())) : [];
  // Only publicly approved businesses may emit search-engine structured data.
  // No unverified self-claimed ratings, domains, geo or opening hours.
  const jsonLd = getPublicBusinessJsonLd(business);

  return (
    <>
      {jsonLd && <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />}
      <BusinessDetailsClient business={business} galleryUrls={galleryUrls} services={services} />
    </>
  );
}
