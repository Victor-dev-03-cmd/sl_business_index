'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { 
    MapPin, 
    Star, 
    Phone, 
    Search, 
    Filter, 
    ChevronRight, 
    Navigation,
    Building2,
    Loader2,
    ShieldCheck
} from 'lucide-react';
import Image from 'next/image';

const MapboxMap = dynamic(() => import('@/components/MapboxMap'), { 
    ssr: false, 
    loading: () => <div className="h-96 md:h-full w-full bg-gray-100 animate-pulse rounded-lg flex items-center justify-center text-gray-400">Loading Map...</div>
});

interface BusinessSearchResult {
    id: string;
    name: string;
    category: string;
    description: string;
    address: string;
    phone: string;
    email: string;
    website_name: string;
    website_url: string;
    rating: number;
    reviews_count: number;
    image_url: string;
    logo_url: string;
    is_verified: boolean;
    distance_meters: number;
    latitude: number;
    longitude: number;
}

function SearchResults() {
    const searchParams = useSearchParams();
    const query = searchParams.get('q') || '';
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const locationName = searchParams.get('location') || 'Nearby';

    const [businesses, setBusinesses] = useState<BusinessSearchResult[]>([]);
    const [loading, setLoading] = useState(true);

    // Default to Colombo if no coordinates
    const userLat = lat ? parseFloat(lat) : 6.9271;
    const userLng = lng ? parseFloat(lng) : 79.8612;

    useEffect(() => {
        fetchBusinesses();
    }, [query, userLat, userLng]);

    const fetchBusinesses = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.rpc('get_nearby_businesses', {
                user_lat: userLat,
                user_lng: userLng,
                search_query: query,
                dist_limit: 10000 // 10km
            });

            if (error) throw error;
            setBusinesses(data || []);
        } catch (error) {
            console.error('Error fetching businesses:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-gray-50/50 min-h-screen">
            <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 h-[calc(100vh-80px)] overflow-hidden">
                
                {/* Search Results List */}
                <div className="lg:col-span-5 xl:col-span-4 bg-white border-r border-gray-200 flex flex-col h-full overflow-hidden shadow-2xl z-10">
                    
                    {/* Results Header */}
                    <div className="p-6 border-b border-gray-100 bg-white sticky top-0 z-20">
                        <div className="flex items-center justify-between mb-4">
                            <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                                {businesses.length} Results
                                {query && <span className="text-brand-blue font-normal ml-2">for "{query}"</span>}
                            </h1>
                            <button className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors">
                                <Filter size={18} />
                            </button>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 px-3 py-2 rounded-full border border-gray-100">
                            <MapPin size={14} className="text-brand-blue" />
                            <span className="truncate">{locationName}</span>
                            <span className="text-xs text-gray-300 ml-auto flex items-center gap-1">
                                <Navigation size={10} /> {userLat.toFixed(2)}, {userLng.toFixed(2)}
                            </span>
                        </div>
                    </div>

                    {/* Scrollable Results List */}
                    <div className="flex-1 overflow-y-auto divide-y divide-gray-100 bg-white">
                        {loading ? (
                            <div className="p-12 text-center">
                                <Loader2 className="animate-spin mx-auto text-brand-dark mb-4" size={32} />
                                <p className="text-gray-500 font-medium">Searching businesses...</p>
                            </div>
                        ) : businesses.length === 0 ? (
                            <div className="p-16 text-center">
                                <Search className="mx-auto h-12 w-12 text-gray-200 mb-4" strokeWidth={1} />
                                <h3 className="text-lg font-bold text-gray-900 mb-1">No businesses found</h3>
                                <p className="text-gray-500 text-sm">Try broadening your search or location.</p>
                            </div>
                        ) : (
                            businesses.map(business => (
                                <Link 
                                    key={business.id} 
                                    href={`/business/${business.id}`}
                                    className="block p-6 hover:bg-gray-50 transition-all border-l-4 border-transparent hover:border-brand-blue group"
                                >
                                    <div className="flex gap-5">
                                        <div className="h-24 w-24 rounded-[4px] bg-gray-50 border border-gray-200 overflow-hidden flex-shrink-0 relative shadow-sm group-hover:shadow-md transition-shadow">
                                            {business.logo_url ? (
                                                <Image src={business.logo_url} alt={business.name} fill className="object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-blue-300">
                                                    <Building2 size={32} strokeWidth={1.5} />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <p className="text-[10px] font-bold text-brand-blue uppercase tracking-widest">{business.category}</p>
                                                    {business.is_verified && (
                                                        <ShieldCheck size={12} className="text-blue-500" />
                                                    )}
                                                </div>
                                                {business.distance_meters && (
                                                    <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-500 font-bold uppercase tracking-tight">
                                                        {(business.distance_meters / 1000).toFixed(1)} km
                                                    </span>
                                                )}
                                            </div>
                                            <h2 className="text-lg font-bold text-gray-900 group-hover:text-brand-dark transition-colors line-clamp-1">{business.name}</h2>
                                            
                                            <div className="flex items-center gap-1.5 mt-1">
                                                <div className="flex items-center gap-0.5">
                                                    {[...Array(5)].map((_, i) => (
                                                        <Star 
                                                            key={i} 
                                                            size={10} 
                                                            className={i < (business.rating || 0) ? "text-amber-400 fill-amber-400" : "text-gray-300"} 
                                                        />
                                                    ))}
                                                </div>
                                                <span className="text-[10px] text-gray-400 font-bold">({business.reviews_count || 0})</span>
                                            </div>

                                            <p className="text-xs text-gray-500 mt-3 flex items-center gap-1.5 line-clamp-1">
                                                <MapPin size={12} className="text-gray-300" /> {business.address}
                                            </p>
                                        </div>
                                        <div className="self-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <ChevronRight className="text-brand-blue" />
                                        </div>
                                    </div>
                                </Link>
                            ))
                        )}
                    </div>
                </div>

                {/* Map View */}
                <div className="lg:col-span-7 xl:col-span-8 h-full bg-gray-100 relative shadow-inner">
                    <MapboxMap
                        userLat={userLat}
                        userLng={userLng}
                        businesses={businesses}
                        zoom={13}
                        height="100%"
                    />
                </div>
            </div>
        </div>
    );
}

// Wrap in Suspense because useSearchParams is used
export default function SearchPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="text-center">
                    <Loader2 className="animate-spin mx-auto text-brand-dark mb-4" size={48} />
                    <p className="text-gray-500 text-lg font-normal">Loading Search Center...</p>
                </div>
            </div>
        }>
            <SearchResults />
        </Suspense>
    );
}
