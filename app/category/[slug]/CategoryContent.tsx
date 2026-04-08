'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building2, SlidersHorizontal } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import BusinessCard from '@/app/components/BusinessCard';
import SkeletonBusinessCard from '@/app/components/SkeletonBusinessCard';
import CategoryFilterSidebar from '@/app/components/CategoryFilterSidebar';
import Pagination from '@/app/components/Pagination';
import { SL_TOWNS } from '@/lib/towns';

interface CategoryContentProps {
  category: {
    id: string | null;
    name: string;
  };
  allCategories: any[];
}

const ITEMS_PER_PAGE = 12;

// Haversine formula to calculate distance in KM
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

export default function CategoryContent({ category, allCategories }: CategoryContentProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [filters, setFilters] = useState({
    rating: null as number | null,
    verifiedOnly: false,
    selectedTown: '',
    distance: 50, // Default 50km
  });

  // Get user location for distance filtering
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
      });
    }
  }, []);

  const townNames = useMemo(() => Array.from(new Set(SL_TOWNS.map(t => t.name))).sort(), []);

  const handleFilterChange = useCallback((newFilters: typeof filters) => {
    setFilters(newFilters);
    setCurrentPage(1);
  }, []);

  const { data, isLoading, isPlaceholderData } = useQuery({
    queryKey: ['businesses', category.name, currentPage, filters, userLocation],
    queryFn: async () => {
      let query = supabase
        .from('businesses')
        .select('*', { count: 'exact' })
        .eq('category', category.name)
        .eq('status', 'approved');

      if (filters.rating) {
        query = query.gte('rating', filters.rating);
      }

      if (filters.verifiedOnly) {
        query = query.eq('is_verified', true);
      }

      if (filters.selectedTown) {
        query = query.ilike('city', `%${filters.selectedTown}%`);
      }

      // Supabase PostGIS filtering for distance if we had it properly set up
      // For now, we fetch more and filter client-side if distance is applied
      // This is a trade-off for performance without a complex PostGIS setup here
      
      const { data: allData, count, error } = await query
        .order('rating', { ascending: false });

      if (error) throw error;

      let filteredResults = allData || [];

      // Client-side distance filtering
      if (userLocation && filters.distance < 50) {
        filteredResults = filteredResults.filter(business => {
          if (!business.latitude || !business.longitude) return false;
          const dist = getDistance(
            userLocation.lat, 
            userLocation.lon, 
            business.latitude, 
            business.longitude
          );
          return dist <= filters.distance;
        });
      }

      const totalCount = filteredResults.length;
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE;
      const paginatedResults = filteredResults.slice(from, to);

      return { businesses: paginatedResults, totalCount };
    },
    placeholderData: (previousData) => previousData,
  });

  const businesses = data.businesses || [];
  const totalCount = data.totalCount || 0;
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="flex flex-col lg:flex-row gap-10">
        <CategoryFilterSidebar 
          onFilterChange={handleFilterChange}
          isOpen={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          towns={townNames}
          allCategories={allCategories}
          currentCategory={category.name}
        />

        <div className="flex-1">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl text-gray-700">
                {category.name} Results
              </h2>
              <span className="px-3 py-1 bg-gray-200 text-gray-500 text-xs font-bold rounded">
                {totalCount} Total
              </span>
            </div>

            <button 
              onClick={() => setIsFilterOpen(true)}
              className="lg:hidden flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all"
            >
              <SlidersHorizontal size={16} />
              Filters
            </button>
          </div>

          {isLoading && !isPlaceholderData ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(8)].map((_, i) => (
                <SkeletonBusinessCard key={i} />
              ))}
            </div>
          ) : businesses.length > 0 ? (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                {businesses.map((business) => (
                  <BusinessCard key={business.id} business={business} />
                ))}
              </div>
              <Pagination 
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </>
          ) : (
            <div className="text-center py-24 bg-white border border-dashed border-gray-200 rounded-3xl">
              <Building2 size={64} className="mx-auto text-gray-100 mb-6" strokeWidth={1} />
              <h3 className="text-xl font-bold text-gray-900">No matches found</h3>
              <p className="text-gray-400 mt-2 max-w-xs mx-auto">
                Try adjusting your filters or check back later for new listings.
              </p>
              <button 
                onClick={() => handleFilterChange({ rating: null, verifiedOnly: false, selectedTown: '', distance: 50 })}
                className="mt-8 text-brand-blue font-bold hover:underline"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
