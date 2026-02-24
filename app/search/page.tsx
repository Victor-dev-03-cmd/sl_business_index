'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';

const MapboxMap = dynamic(() => import('@/components/MapboxMap'), { 
    ssr: false, 
    loading: () => <div className="h-96 md:h-full w-full bg-gray-100 animate-pulse rounded-lg flex items-center justify-center text-gray-400">Loading Map...</div>
});

function SearchResults() {
    const searchParams = useSearchParams();
    const location = searchParams.get('location');
    const query = searchParams.get('q');

    // Dummy position for the map center. You'd fetch this based on the location.
    const position = { lat: 6.9271, lng: 79.8612 }; // Colombo

    return (
        <div className="container mx-auto py-8 px-4">
            <h1 className="text-3xl font-bold mb-4">
                Search Results for <span className="text-primary">"{query}"</span> in <span className="text-primary">{location}</span>
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Search Results List */}
                <div className="md:col-span-2">
                    <div className="space-y-4">
                        {/* This is where you would map over your search results */}
                        {[1, 2, 3].map(item => (
                            <div key={item} className="p-4 border rounded-lg shadow-sm">
                                <h2 className="text-xl font-semibold">Business Name {item}</h2>
                                <p className="text-gray-600">Business address or description...</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Map View */}
                <div className="h-96 md:h-full w-full">
                    <MapboxMap
                        userLat={position.lat}
                        userLng={position.lng}
                        zoom={12}
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
        <Suspense fallback={<div>Loading search results...</div>}>
            <SearchResults />
        </Suspense>
    );
}
