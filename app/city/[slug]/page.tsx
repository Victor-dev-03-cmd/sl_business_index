import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { Star, MapPin, Building2, ShieldCheck, ChevronRight, Navigation } from 'lucide-react';
import VerifiedBadge from '@/app/components/VerifiedBadge';

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

// Helper to slugify names (matching sitemap logic)
const slugify = (name: string) => {
  return name
    .toLowerCase()
    .trim()
    .replace(/ & /g, '-')
    .replace(/ /g, '-')
    .replace(/,/g, '')
    .replace(/[^\w-]+/g, '');
};

async function getCityData(slug: string) {
  const supabase = await createClient();
  
  // Fetch unique cities from businesses table
  const { data: businesses } = await supabase
    .from('businesses')
    .select('city')
    .eq('status', 'approved');
  
  const uniqueCities = Array.from(new Set((businesses || []).map(b => b.city).filter(Boolean)));
  const cityName = uniqueCities.find(c => slugify(c) === slug);
  
  if (!cityName) return null;
  return { name: cityName };
}

async function getBusinessesByCity(cityName: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('businesses')
    .select('*')
    .eq('city', cityName)
    .eq('status', 'approved')
    .order('rating', { ascending: false })
    .limit(50);
    
  return data || [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const city = await getCityData(slug);

  if (!city) return { title: 'City Not Found' };

  return {
    title: `Best Businesses in ${city.name}, Sri Lanka | SLBI - SL Business Index`,
    description: `Discover top-rated businesses in ${city.name}, Sri Lanka. SLBI (SL Business Index) provides a verified list of local services and shops in ${city.name} to help you connect with the best.`,
    keywords: [city.name, 'Sri Lanka', 'SLBI', 'SL Business', 'Businesses in Sri Lanka', 'Verified Businesses', `Shops in ${city.name}`],
  };
}

export default async function CityPage({ params }: Props) {
  const { slug } = await params;
  const city = await getCityData(slug);

  if (!city) notFound();

  const businesses = await getBusinessesByCity(city.name);

  return (
    <div className="min-h-[100dvh] bg-gray-50/50">
      <header className="bg-brand-dark py-16 px-6 border-b border-gray-300">
        <div className="max-w-7xl mx-auto">
          <nav className="flex items-center gap-2 text-brand-sand text-xs uppercase tracking-widest mb-6">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <ChevronRight size={12} />
            <span>Cities</span>
            <ChevronRight size={12} />
            <span className="text-white">{city.name}</span>
          </nav>
          <h1 className="text-4xl md:text-5xl text-white mb-4 tracking-tight">
            Best Businesses in {city.name}
          </h1>
          <p className="text-brand-sand max-w-2xl leading-relaxed">
            Explore {businesses.length} verified businesses in {city.name}, Sri Lanka. 
            SLBI (SL Business Index) helps you connect with top-rated local services, shops, and professional experts in your area.
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-16">
        <div className="flex items-center justify-between mb-10">
          <h2 className="text-2xl font-normal text-gray-900 flex items-center gap-3">
            <Navigation size={24} className="text-brand-blue" />
            Top Businesses in {city.name}
          </h2>
          <div className="text-sm text-gray-400 font-bold uppercase tracking-widest">
            {businesses.length} Total Results
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {businesses.map((business) => (
            <Link 
              key={business.id} 
              href={`/business/${business.slug || business.id}`}
              className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-xl transition-all group flex flex-col"
            >
              <div className="aspect-video bg-gray-100 relative overflow-hidden">
                {business.image_url ? (
                  <Image src={business.image_url} alt={business.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <Building2 size={48} strokeWidth={1} />
                  </div>
                )}
                {business.is_verified && (
                  <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-2 py-1 rounded shadow-sm flex items-center gap-1.5 border border-blue-100">
                    <ShieldCheck size={14} className="text-blue-500" />
                    <span className="text-[10px] font-bold text-blue-600 uppercase">Verified</span>
                  </div>
                )}
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-brand-blue uppercase tracking-widest">{business.category}</p>
                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-brand-blue transition-colors line-clamp-1">
                      {business.name}
                    </h3>
                  </div>
                  {business.can_show_badge && <VerifiedBadge size={14} />}
                </div>
                
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex items-center gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        size={12} 
                        className={i < (business.rating || 0) ? "text-amber-400 fill-amber-400" : "text-gray-200"} 
                      />
                    ))}
                  </div>
                  <span className="text-xs text-gray-400 font-bold">({business.reviews_count || 0})</span>
                </div>

                <p className="text-sm text-gray-500 line-clamp-2 mb-6 flex-1">
                  {business.description || `Verified business located in ${city.name}, Sri Lanka.`}
                </p>

                <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-xs font-medium">
                  <div className="flex items-center gap-1.5 text-gray-400">
                    <MapPin size={14} className="text-brand-blue" />
                    <span className="line-clamp-1">{business.address || city.name}</span>
                  </div>
                  <div className="text-brand-blue flex items-center gap-1">
                    View Details <ChevronRight size={14} />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {businesses.length === 0 && (
          <div className="text-center py-20 bg-white border border-dashed border-gray-300 rounded-xl">
            <MapPin size={48} className="mx-auto text-gray-200 mb-4" strokeWidth={1} />
            <h3 className="text-lg font-medium text-gray-900">No businesses found in {city.name}</h3>
            <p className="text-gray-400 mt-2">We are currently expanding our directory to this area.</p>
            <Link href="/" className="inline-block mt-8 text-brand-blue hover:underline">
              Back to Home
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
