import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { Business } from '@/lib/types';
import BusinessDetailsClient from './BusinessDetailsClient';

type Props = {
  params: {
    id: string;
  };
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
  };

  return business;
}

export default async function BusinessDetailPage({ params }: Props) {
  const business = await getBusinessDetails(params.id);

  if (!business) {
    notFound();
  }

  return <BusinessDetailsClient business={business} />;
}
