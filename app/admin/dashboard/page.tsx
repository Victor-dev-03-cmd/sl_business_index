'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  CheckCircle, 
  XCircle, 
  Search, 
  Building2, 
  Phone, 
  Mail, 
  MapPin,
  Eye,
  FileText,
  Clock,
  Briefcase,
  User,
  ExternalLink,
  ShieldCheck,
  Star
} from 'lucide-react';
import Image from 'next/image';
import { Business } from '@/lib/types';
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

export default function AdminDashboard() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [search, setSearch] = useState('');
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const router = useRouter();

  const checkAdmin = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = profile?.role?.toLowerCase();
    if (role !== 'admin' && role !== 'ceo') {
      router.push('/');
    }
  }, [router]);

  useEffect(() => {
    checkAdmin();
  }, [checkAdmin]);

  const { data: businesses = [], isLoading: loading } = useQuery({
    queryKey: ['admin-businesses', filter],
    queryFn: async () => {
      let query = supabase
        .from('businesses')
        .select('*')
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Business[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: featuredIds = [] } = useQuery({
    queryKey: ['admin-featured-ids'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('featured_listings')
        .select('business_id');
      
      if (error) throw error;
      return data.map(item => item.business_id);
    }
  });

  const toggleFeaturedMutation = useMutation({
    mutationFn: async ({ businessId, isFeatured }: { businessId: string | number, isFeatured: boolean }) => {
      console.log('Toggling featured for:', businessId, 'Current status:', isFeatured);
      if (isFeatured) {
        // Remove from featured
        const { error } = await supabase
          .from('featured_listings')
          .delete()
          .eq('business_id', businessId);
        if (error) {
          console.error('Delete error:', error);
          throw error;
        }
      } else {
        // Add to featured
        const { error } = await supabase
          .from('featured_listings')
          .insert({ business_id: businessId });
        if (error) {
          console.error('Insert error:', error);
          throw error;
        }
      }
    },
    onSuccess: () => {
      console.log('Toggle success, invalidating queries...');
      queryClient.invalidateQueries({ queryKey: ['admin-featured-ids'] });
      queryClient.invalidateQueries({ queryKey: ['featured-businesses-home'] });
      alert('Featured status updated successfully!');
    },
    onError: (err: any) => {
      console.error('Mutation error:', err);
      alert(`Failed to update: ${err.message || 'Unknown error'}`);
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, owner_id, status }: { id: string | number, owner_id: string, status: 'approved' | 'rejected' }) => {
      const { error } = await supabase
        .from('businesses')
        .update({ status })
        .eq('id', id);

      if (error) throw error;

      if (status === 'approved' && owner_id) {
        await supabase
          .from('profiles')
          .update({ role: 'vendor' })
          .eq('id', owner_id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-businesses'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });

  const { data: stats = { pending: 0, total: 0, pendingVerifications: 0 } } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const { data: bizData } = await supabase
        .from('businesses')
        .select('status');
      
      const { count: verifCount } = await supabase
        .from('verifications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      const total = bizData?.length || 0;
      const pendingCount = bizData?.filter(b => b.status === 'pending').length || 0;
      return { pending: pendingCount, total, pendingVerifications: verifCount || 0 };
    },
    staleTime: 5 * 60 * 1000,
  });

  const handleUpdateStatus = (id: string | number, owner_id: string, status: 'approved' | 'rejected') => {
    updateStatusMutation.mutate({ id, owner_id, status });
  };

  const filteredBusinesses = useMemo(() => {
    return businesses.filter(b => 
      b.name.toLowerCase().includes(search.toLowerCase()) || 
      (b.owner_name?.toLowerCase() || '').includes(search.toLowerCase())
    );
  }, [businesses, search]);

  return (
    <div className="min-h-full bg-gray-50/50 transition-colors">
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-2xl font-normal text-brand-dark">Overview</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your platform&apos;s businesses and requests.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-6 rounded-[6px] border border-gray-300 shadow-sm cursor-pointer hover:border-brand-blue transition-all" onClick={() => router.push('/admin/requests')}>
            <p className="text-xs font-normal text-gray-400 uppercase tracking-wider">Pending Approvals</p>
            {loading ? <Skeleton className="h-9 w-12 mt-2" /> : <h2 className="text-3xl font-medium text-brand-dark mt-2">{stats.pending}</h2>}
          </div>
          <div className="bg-white p-6 rounded-[6px] border border-gray-300 shadow-sm cursor-pointer hover:border-brand-blue transition-all" onClick={() => router.push('/admin/verifications')}>
            <p className="text-xs font-normal text-gray-400 uppercase tracking-wider">Pending Verifications</p>
            {loading ? <Skeleton className="h-9 w-12 mt-2" /> : <h2 className="text-3xl font-medium text-brand-dark mt-2">{stats.pendingVerifications}</h2>}
          </div>
          <div className="bg-white p-6 rounded-[6px] border border-gray-300 shadow-sm">
            <p className="text-xs font-normal text-gray-400 uppercase tracking-wider">Total Businesses</p>
            {loading ? <Skeleton className="h-9 w-12 mt-2" /> : <h2 className="text-3xl font-medium text-gray-900 mt-2">{stats.total}</h2>}
          </div>
          <div className="bg-brand-dark p-6 rounded-[6px] border border-brand-dark shadow-lg cursor-pointer hover:bg-brand-blue transition-all" onClick={() => router.push('/admin/billing')}>
            <p className="text-xs font-normal text-white/60 uppercase tracking-wider">Billing & Revenue</p>
            <div className="flex items-center justify-between mt-2">
              <h2 className="text-2xl font-medium text-white">Management</h2>
              <ShieldCheck className="text-brand-sand" size={24} />
            </div>
          </div>
        </div>

        {/* Controls Bar */}
        <div className="flex flex-col lg:flex-row gap-4 mb-8">
          <div className="relative flex-grow group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-blue transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Search by business or owner name..." 
              className="w-full pl-12 pr-4 py-3 bg-white border border-gray-300 rounded-[6px] focus:outline-none focus:ring-1 focus:ring-brand-blue transition-all font-normal text-sm shadow-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 lg:pb-0">
            {(['pending', 'approved', 'rejected', 'all'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-5 py-3 rounded-[6px] text-sm font-normal capitalize transition-all border whitespace-nowrap ${
                  filter === s 
                    ? 'bg-brand-dark text-white border-brand-dark shadow-lg shadow-brand-dark/10' 
                    : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Business Grid */}
        <div className="grid grid-cols-1 gap-4">
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white border border-gray-300 rounded-[6px] p-6 flex flex-col lg:flex-row gap-6">
                  <Skeleton className="w-20 h-20 flex-shrink-0" />
                  <div className="flex-grow space-y-3">
                    <div className="flex justify-between">
                      <Skeleton className="h-6 w-1/3" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-10 w-full" />
                    <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredBusinesses.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-[6px] border border-gray-300">
              <Building2 className="mx-auto text-gray-200 mb-4" size={48} />
              <p className="text-gray-400 font-normal">No business applications found.</p>
            </div>
          ) : (
            filteredBusinesses.map((business) => (
              <div key={business.id} className="bg-white border border-gray-300 rounded-[6px] p-6 hover:shadow-xl hover:shadow-brand-dark/5 transition-all group">
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Logo/Image Section */}
                  <div className="w-20 h-20 relative flex-shrink-0 bg-gray-50 rounded-[6px] border border-gray-300 overflow-hidden flex items-center justify-center">
                    {business.logo_url ? (
                      <Image src={business.logo_url} alt={business.name} fill className="object-cover" />
                    ) : (
                      <Building2 className="text-gray-300" size={32} />
                    )}
                  </div>

                  {/* Info Section */}
                  <div className="flex-grow">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-normal text-gray-900">{business.name}</h3>
                          {business.is_verified && (
                            <ShieldCheck size={16} className="text-blue-500 fill-blue-50" />
                          )}
                          <span className={`px-2.5 py-0.5 rounded-[6px] text-[10px] uppercase tracking-wider font-normal ${
                            business.status === 'approved' ? 'bg-brand-sand/20 text-brand-gold' :
                            business.status === 'rejected' ? 'bg-red-50 text-red-700' :
                            'bg-brand-blue/10 text-brand-blue'
                          }`}>
                            {business.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 font-normal mt-1 flex items-center gap-2">
                          <MapPin size={12} className="text-brand-blue" />
                          {business.address}
                        </p>
                      </div>
                      
                      <div className="text-right text-[11px] text-gray-400 font-normal">
                        Applied: {business.created_at ? new Date(business.created_at).toLocaleDateString() : 'N/A'}
                      </div>
                    </div>

                    <p className="text-sm text-gray-500 font-normal line-clamp-2 mb-4">
                      {business.description || 'No description provided.'}
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-gray-300 pt-4">
                      <div className="flex items-center gap-3 text-xs text-gray-600 font-normal">
                        <User size={14} className="text-gray-300" />
                        {business.owner_name}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-600 font-normal">
                        <Phone size={14} className="text-gray-300" />
                        {business.phone}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-600 font-normal">
                        <Mail size={14} className="text-gray-300" />
                        {business.email}
                      </div>
                    </div>
                  </div>

                  {/* Actions Section */}
                  <div className="lg:w-48 flex lg:flex-col justify-center gap-2">
                    {business.status === 'pending' && (
                      <>
                        <button 
                          onClick={() => handleUpdateStatus(business.id, business.owner_id as string, 'approved')}
                          className="flex-grow py-2.5 bg-brand-dark text-white rounded-[6px] text-xs font-normal hover:bg-brand-blue flex items-center justify-center gap-2 transition-all shadow-md shadow-brand-dark/10"
                        >
                          <CheckCircle size={14} /> Approve
                        </button>
                        <button 
                          onClick={() => handleUpdateStatus(business.id, business.owner_id as string, 'rejected')}
                          className="flex-grow py-2.5 bg-white border border-red-100 text-red-600 rounded-[6px] text-xs font-normal hover:bg-red-50 flex items-center justify-center gap-2 transition-all"
                        >
                          <XCircle size={14} /> Reject
                        </button>
                      </>
                    )}
                    <button 
                      onClick={() => setSelectedBusiness(business)}
                      className="flex-grow py-2.5 bg-gray-50 text-gray-500 rounded-[6px] text-xs font-normal hover:bg-gray-100 flex items-center justify-center gap-2 transition-all border border-gray-300"
                    >
                      <Eye size={14} /> View Details
                    </button>

                    {business.status === 'approved' && (
                      <button 
                        onClick={() => {
                          const isCurrentlyFeatured = featuredIds.some(fid => String(fid) === String(business.id));
                          toggleFeaturedMutation.mutate({ 
                            businessId: business.id, 
                            isFeatured: isCurrentlyFeatured
                          });
                        }}
                        className={`flex-grow py-2.5 rounded-[6px] text-xs font-normal flex items-center justify-center gap-2 transition-all border ${
                          featuredIds.some(fid => String(fid) === String(business.id))
                            ? 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100'
                            : 'bg-white text-gray-400 border-gray-300 hover:text-amber-600 hover:border-amber-200'
                        }`}
                      >
                        <Star size={14} className={featuredIds.some(fid => String(fid) === String(business.id)) ? "fill-amber-600" : ""} />
                        {featuredIds.some(fid => String(fid) === String(business.id)) ? 'Featured' : 'Mark Featured'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Business Details Modal */}
        <Dialog open={!!selectedBusiness} onOpenChange={() => setSelectedBusiness(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white border-gray-300 p-0 overflow-hidden">
            {selectedBusiness && (
              <>
                <div className="relative h-48 w-full bg-gray-100 border-b border-gray-300 flex items-center justify-center">
                  {selectedBusiness.image_url ? (
                    <Image src={selectedBusiness.image_url} alt="" fill className="object-cover opacity-60 grayscale-[0.5]" />
                  ) : (
                    <Building2 size={64} className="text-gray-300" strokeWidth={1} />
                  )}
                  <div className="absolute -bottom-10 left-8 h-20 w-20 bg-white rounded-[6px] border border-gray-300 shadow-xl p-3 flex items-center justify-center">
                    {selectedBusiness.logo_url ? (
                      <Image src={selectedBusiness.logo_url} alt="" width={64} height={64} className="object-contain" />
                    ) : (
                      <Building2 size={32} className="text-gray-300" />
                    )}
                  </div>
                </div>

                <div className="pt-14 px-8 pb-8">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-normal text-gray-900">{selectedBusiness.name}</h2>
                        {selectedBusiness.is_verified && (
                          <CheckCircle size={20} className="text-blue-500 fill-blue-50" />
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-2">
                        <span className={`px-2.5 py-0.5 rounded-[6px] text-[10px] uppercase tracking-wider font-normal ${
                          selectedBusiness.status === 'approved' ? 'bg-brand-sand/20 text-brand-gold' :
                          selectedBusiness.status === 'rejected' ? 'bg-red-50 text-red-700' :
                          'bg-brand-blue/10 text-brand-blue'
                        }`}>
                          {selectedBusiness.status}
                        </span>
                        <span className="text-xs text-gray-400 flex items-center gap-1.5">
                          <MapPin size={12} className="text-brand-blue" /> {selectedBusiness.address}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {/* Top actions removed, moved to footer */}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-8 mt-8 pb-20">
                    {/* Left Column: Business Info */}
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-[11px] uppercase tracking-widest text-gray-400  font-normal mb-3 flex items-center gap-2">
                          <FileText size={12} /> Description
                        </h4>
                        <p className="text-sm text-gray-600  leading-relaxed font-normal">
                          {selectedBusiness.description || 'No description provided.'}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 gap-4 bg-gray-50  p-4 rounded-[6px] border border-gray-300 ">
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 bg-white  rounded-[6px] shadow-sm border border-gray-300 ">
                            <Phone size={14} className="text-gray-400" />
                          </div>
                          <span className="text-sm text-gray-600 ">{selectedBusiness.phone}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 bg-white  rounded-[6px] shadow-sm border border-gray-300 ">
                            <Mail size={14} className="text-gray-400" />
                          </div>
                          <span className="text-sm text-gray-600 ">{selectedBusiness.email}</span>
                        </div>
                        {selectedBusiness.website_url && (
                          <div className="flex items-center gap-3">
                            <div className="p-1.5 bg-white  rounded-[6px] shadow-sm border border-gray-300 ">
                              <ExternalLink size={14} className="text-gray-400" />
                            </div>
                            <span className="text-sm text-brand-dark  truncate">
                              {selectedBusiness.website_name || selectedBusiness.website_url}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Column: Registration & Owner Info */}
                    <div className="space-y-6">
                      <div className="bg-white  border border-gray-300  rounded-[6px] overflow-hidden">
                         <div className="px-4 py-3 bg-gray-50/50  border-b border-gray-300 ">
                           <h4 className="text-[11px] uppercase tracking-widest text-gray-500  font-normal">Owner Information</h4>
                         </div>
                         <div className="p-4 space-y-4">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-[6px] bg-blue-50  flex items-center justify-center">
                                <User size={14} className="text-blue-600 " />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs text-gray-400 font-normal">Full Name</p>
                                <p className="text-sm text-gray-900  truncate font-normal">{selectedBusiness.owner_name}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-[6px] bg-brand-sand/20  flex items-center justify-center">
                                <Briefcase size={14} className="text-brand-dark " />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs text-gray-400 font-normal">Owner NIC</p>
                                <p className="text-sm text-gray-900  font-mono font-normal tracking-wide">{selectedBusiness.nic_number || 'N/A'}</p>
                              </div>
                            </div>
                         </div>
                      </div>

                      <div className="bg-white  border border-gray-300  rounded-[6px] overflow-hidden">
                         <div className="px-4 py-3 bg-gray-50/50  border-b border-gray-300 ">
                           <h4 className="text-[11px] uppercase tracking-widest text-gray-500  font-normal">Legal Details</h4>
                         </div>
                         <div className="p-4 space-y-4">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-[6px] bg-purple-50  flex items-center justify-center">
                                <FileText size={14} className="text-purple-600 " />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs text-gray-400 font-normal">Registration Number</p>
                                <p className="text-sm text-gray-900  font-mono font-normal tracking-wide">{selectedBusiness.registration_number || 'N/A'}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-[6px] bg-amber-50  flex items-center justify-center">
                                <Clock size={14} className="text-amber-600 " />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs text-gray-400 font-normal">Created At</p>
                                <p className="text-sm text-gray-900  font-normal">
                                  {selectedBusiness.created_at ? new Date(selectedBusiness.created_at).toLocaleString() : 'N/A'}
                                </p>
                              </div>
                            </div>
                         </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Fixed Footer for Actions */}
                {selectedBusiness.status === 'pending' && (
                  <div className="sticky bottom-0 left-0 right-0 bg-white/80  backdrop-blur-md border-t border-gray-300  p-4 flex justify-end gap-3 px-8 z-10">
                    <button 
                      onClick={() => {
                        handleUpdateStatus(selectedBusiness.id, selectedBusiness.owner_id as string, 'rejected');
                        setSelectedBusiness(null);
                      }}
                      className="px-6 py-2.5 bg-white  border border-red-100  text-red-600  rounded-[6px] text-xs font-normal hover:bg-red-50  transition-all"
                    >
                      Reject Application
                    </button>
                    <button 
                      onClick={() => {
                        handleUpdateStatus(selectedBusiness.id, selectedBusiness.owner_id as string, 'approved');
                        setSelectedBusiness(null);
                      }}
                      className="px-8 py-2.5 bg-brand-dark text-white rounded-[6px] text-xs font-normal hover:bg-brand-blue flex items-center gap-2 transition-all shadow-lg shadow-brand-dark/20"
                    >
                      <CheckCircle size={16} /> Approve Business
                    </button>
                  </div>
                )}
              </>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
