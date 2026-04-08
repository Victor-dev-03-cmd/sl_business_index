"use client";

import React, { useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Search,
  Star,
  Building2,
  CheckCircle2,
  XCircle,
  Filter,
  RefreshCw,
  Loader2,
  ExternalLink,
} from "lucide-react";
import Image from "next/image";

interface Business {
  id: string;
  slug?: string;
  name: string;
  logo_url: string;
  category: string;
  is_featured: boolean;
  status: string;
}

export default function AdminFeaturedPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: businesses = [], isLoading: loading, isFetching, refetch } = useQuery({
    queryKey: ["admin-approved-businesses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("businesses")
        .select(
          `
          id, slug, name, logo_url, category, status, is_featured,
          featured_listings (id)
        `,
        )
        .eq("status", "approved")
        .order("name", { ascending: true });

      if (error) throw error;

      return (data as (Business & { featured_listings?: { id: string }[] | { id: string } | null })[]).map((b) => {
        // Deriving is_featured: prioritize the join table entry, but fallback to the boolean column
        const hasFeaturedEntry = b.featured_listings 
          ? (Array.isArray(b.featured_listings) ? b.featured_listings.length > 0 : true)
          : false;
          
        return {
          id: b.id,
          slug: b.slug,
          name: b.name,
          logo_url: b.logo_url,
          category: b.category,
          status: b.status,
          is_featured: hasFeaturedEntry || b.is_featured === true,
        };
      }) as Business[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const toggleFeaturedMutation = useMutation({
    mutationFn: async ({
      businessId,
      isFeatured,
    }: {
      businessId: string;
      isFeatured: boolean;
    }) => {
      const willBeFeatured = !isFeatured;

      // 1. Update featured_listings table
      if (willBeFeatured) {
        const { error: insertError } = await supabase
          .from("featured_listings")
          .upsert({ business_id: businessId }, { onConflict: "business_id" });
        if (insertError) throw insertError;
      } else {
        const { error: deleteError } = await supabase
          .from("featured_listings")
          .delete()
          .eq("business_id", businessId);
        if (deleteError) throw deleteError;
      }

      // 2. Update businesses table boolean
      const { error: businessError } = await supabase
        .from("businesses")
        .update({ is_featured: willBeFeatured })
        .eq("id", businessId);
      if (businessError) throw businessError;

      return { businessId, willBeFeatured };
    },
    onMutate: async ({ businessId, isFeatured }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ["admin-approved-businesses"] });
      const previousBusinesses = queryClient.getQueryData<Business[]>(["admin-approved-businesses"]);

      if (previousBusinesses) {
        queryClient.setQueryData<Business[]>(["admin-approved-businesses"], 
          previousBusinesses.map(b => b.id === businessId ? { ...b, is_featured: !isFeatured } : b)
        );
      }

      return { previousBusinesses };
    },
    onSuccess: () => {
      toast.success("Featured status updated successfully");
    },
    onError: (err: Error, variables, context) => {
      // Rollback on error
      if (context.previousBusinesses) {
        queryClient.setQueryData(["admin-approved-businesses"], context.previousBusinesses);
      }
      toast.error(`Error updating status: ${err.message}`);
    },
    onSettled: () => {
      // Always refetch to stay in sync
      queryClient.invalidateQueries({ queryKey: ["admin-approved-businesses"] });
      queryClient.invalidateQueries({ queryKey: ["featured-businesses-home"] });
    },
  });

  const handleToggleFeatured = (businessId: string, isFeatured: boolean) => {
    toggleFeaturedMutation.mutate({ businessId, isFeatured });
  };

  const filteredBusinesses = useMemo(() => {
    return businesses.filter(
      (b) =>
        b.name.toLowerCase().includes(search.toLowerCase()) ||
        b.category.toLowerCase().includes(search.toLowerCase()),
    );
  }, [businesses, search]);

  const stats = useMemo(() => {
    return {
      total: businesses.length,
      featured: businesses.filter(b => b.is_featured).length
    };
  }, [businesses]);

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-8 bg-gray-50/30 min-h-[100dvh] font-sans">
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded border border-gray-300 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-full bg-brand-gold/5 transform skew-x-[-35deg] translate-x-32"></div>
        <div className="space-y-1 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-dark/5 rounded">
              <Star className="h-6 w-6 text-brand-gold fill-brand-gold" />
            </div>
            <h1 className="text-2xl tracking-tight text-brand-dark">Featured Management</h1>
          </div>
          <p className="text-gray-500 ">Promote top businesses to the homepage spotlight.</p>
        </div>
        
        <div className="flex items-center gap-4 relative z-10">
          <div className="flex gap-4">
            <div className="bg-gray-50 px-6 py-3 rounded border border-gray-100 flex flex-col items-center">
              <span className="text-[10px] text-gray-400 uppercase tracking-widest">Active</span>
              <span className="text-xl font-black text-brand-dark">{stats.total}</span>
            </div>
            <div className="bg-brand-gold/5 px-6 py-3 rounded border border-gray-100 flex flex-col items-center">
              <span className="text-[10px] text-brand-gold uppercase tracking-widest">Featured</span>
              <span className="text-xl font-black text-brand-gold">{stats.featured}</span>
            </div>
          </div>
          <button 
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-3 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-all text-gray-500 active:scale-95"
            title="Refresh Data"
          >
            <RefreshCw className={`h-5 w-5 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-6 rounded border border-gray-300 shadow-sm flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-brand-blue transition-colors" />
          <input
            type="text"
            placeholder="Search by business name, category or tag..."
            className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-300 rounded text-sm outline-none focus:ring-1 focus:ring-blue-500 focus:border-brand-blue transition-all "
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button className="flex items-center gap-2 px-6 py-3 bg-gray-50 border border-gray-300 rounded text-sm font-bold text-gray-600 hover:bg-gray-100 transition-all whitespace-nowrap">
            <Filter className="h-4 w-4" />
            Filters
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded border border-gray-300 shadow overflow-hidden">
        {loading && businesses.length === 0 ? (
          <div className="p-8 space-y-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex gap-6 items-center animate-pulse">
                <Skeleton className="h-16 w-16 rounded-xl" />
                <div className="flex-1 space-y-3">
                  <Skeleton className="h-5 w-1/3" />
                  <Skeleton className="h-4 w-1/4" />
                </div>
                <Skeleton className="h-10 w-32 rounded-full" />
              </div>
            ))}
          </div>
        ) : filteredBusinesses.length === 0 ? (
          <div className="text-center py-32">
            <div className="h-20 w-20 bg-gray-50 rounded flex items-center justify-center mx-auto mb-6">
              <Building2 className="text-gray-200 h-10 w-10" />
            </div>
            <p className="text-gray-400 font-black uppercase tracking-widest text-sm">No businesses found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-200 border-b border-gray-300">
                  <th className="px-8 py-5 text-[10px] font-black text-gray-800 uppercase tracking-widest">Business Detail</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-800 uppercase tracking-widest">Classification</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-800 uppercase tracking-widest">Engagement</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-800 uppercase tracking-widest text-center">Home Visibility</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredBusinesses.map((business) => (
                  <tr key={business.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-5">
                        <div className="h-14 w-14 relative rounded bg-white border border-gray-200 overflow-hidden flex-shrink-0 flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                          {business.logo_url ? (
                            <Image
                              src={business.logo_url}
                              alt={business.name}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <Building2 className="h-7 w-7 text-gray-200" strokeWidth={1.5} />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className=" text-brand-blue group-hover:text-brand-blue transition-colors tracking-tight truncate">
                            {business.name}
                          </p>
                          <a 
                            href={`/business/${business.slug || business.id}`} 
                            target="_blank" 
                            className="text-[10px] font-medium text-gray-400 hover:text-brand-blue transition-colors flex items-center gap-1 mt-1 uppercase"
                          >
                            View Public Profile <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 bg-brand-dark/5 text-brand-dark border border-brand-dark/10 rounded-lg">
                        {business.category}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                       <div className="flex items-center gap-2">
                         <div className="h-2 w-2 rounded-full bg-green-500"></div>
                         <span className="text-xs font-bold text-gray-600 uppercase tracking-tighter">Approved Vendor</span>
                       </div>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <button
                        onClick={() => handleToggleFeatured(business.id, business.is_featured)}
                        disabled={
                          toggleFeaturedMutation.isPending &&
                          toggleFeaturedMutation.variables.businessId === business.id
                        }
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all w-44 justify-center mx-auto disabled:opacity-50 active:scale-95
                          ${
                            business.is_featured
                              ? "bg-brand-gold text-white shadow-lg shadow-brand-gold/20 hover:bg-brand-gold-light"
                              : "bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                          }`}
                      >
                        {toggleFeaturedMutation.isPending && toggleFeaturedMutation.variables.businessId === business.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : business.is_featured ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <XCircle className="h-4 w-4" />
                        )}
                        {business.is_featured ? "Featured" : "No Spotlight"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
