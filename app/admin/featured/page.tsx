'use client';

import React, { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Search, 
  Star,
  ToggleLeft,
  ToggleRight,
  Building2,
  CheckCircle,
  XCircle
} from 'lucide-react';
import Image from 'next/image';

interface Business {
  id: string;
  name: string;
  logo_url: string;
  category: string;
  is_featured: boolean;
  status: string;
}

export default function AdminFeaturedPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  const { data: businesses = [], isLoading: loading } = useQuery({
    queryKey: ['admin-approved-businesses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('businesses')
        .select('id, name, logo_url, category, is_featured, status')
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Business[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const toggleFeaturedMutation = useMutation({
    mutationFn: async ({ businessId, currentStatus }: { businessId: string, currentStatus: boolean }) => {
      const { error } = await supabase
        .from('businesses')
        .update({ is_featured: !currentStatus })
        .eq('id', businessId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-approved-businesses'] });
    },
    onError: (err: any) => {
      alert(`Error updating status: ${err.message}`);
    }
  });

  const handleToggleFeatured = (businessId: string, currentStatus: boolean) => {
    toggleFeaturedMutation.mutate({ businessId, currentStatus });
  };

  const filteredBusinesses = useMemo(() => {
    return businesses.filter(b => 
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.category.toLowerCase().includes(search.toLowerCase())
    );
  }, [businesses, search]);

  return (
    <div className="min-h-full bg-gray-50/30 transition-colors">
      <main className="max-w-[1600px] mx-auto px-6 md:px-12 py-10 space-y-12">
        
        <div className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-2xl text-gray-900 tracking-tight">Featured Listings Management</h1>
            <p className="text-base text-gray-500 mt-2">Select which businesses appear on the home page.</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-[6px] shadow-sm border border-gray-100 mb-12">
          <div className="relative w-full md:w-96 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 transition-colors" />
            <input 
              type="text" 
              placeholder="Search by name or category..." 
              className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-[6px] text-sm focus:outline-none focus:ring-1 focus:border-brand-blue/10 focus:border-brand-blue focus:bg-white transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-white rounded-[6px] border border-gray-300 shadow-xl overflow-hidden relative">
          {loading ? (
            <div className="p-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 border-b border-gray-200">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded-md" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-24 rounded-full" />
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-200 border-b border-gray-300">
                    <th className="px-6 py-4 text-xs text-gray-800 uppercase tracking-wider">Business</th>
                    <th className="px-6 py-4 text-xs text-gray-800 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-4 text-xs text-gray-800 uppercase tracking-wider text-center">Featured Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredBusinesses.map((business) => (
                    <tr key={business.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 relative rounded-[3px] bg-gray-50 border border-gray-200 overflow-hidden flex-shrink-0 flex items-center justify-center shadow-sm">
                            {business.logo_url ? (
                              <Image src={business.logo_url} alt={business.name} fill className="object-cover" />
                            ) : (
                              <Building2 className="h-6 w-6 text-gray-300" strokeWidth={1.5} />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-brand-blue truncate">{business.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 bg-blue-50 text-brand-dark border border-blue-100 rounded-full">
                          {business.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleToggleFeatured(business.id, business.is_featured)}
                          disabled={toggleFeaturedMutation.isPending && toggleFeaturedMutation.variables?.businessId === business.id}
                          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all w-36 justify-center mx-auto disabled:opacity-50
                            ${business.is_featured 
                              ? 'bg-green-100 text-green-800 hover:bg-green-200 border border-green-200' 
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                            }`
                          }
                        >
                          {business.is_featured ? <CheckCircle size={16} /> : <XCircle size={16} />}
                          {business.is_featured ? 'Featured' : 'Not Featured'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
