'use client';

import { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Search, 
  Building2, 
  Phone, 
  Mail, 
  MapPin, 
  ExternalLink,
  MoreVertical,
  Trash2,
  Edit,
  Eye,
  FileText,
  Clock,
  Briefcase,
  User,
  Filter,
  RefreshCw,
  X,
  Plus,
  ChevronDown,
  ShieldCheck
} from 'lucide-react';
import Image from 'next/image';
import { Business } from '@/lib/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function AdminBusinessesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);

  const { data: businesses = [], isLoading: loading, isFetching, refetch, error: queryError } = useQuery({
    queryKey: ['admin-businesses-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('status', 'approved')
        .order('name', { ascending: true });

      if (error) throw error;
      return data as Business[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string | number) => {
      const { error } = await supabase
        .from('businesses')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-businesses-active'] });
      setSelectedBusiness(null);
    },
  });

  const handleDelete = async (id: string | number) => {
    if (!confirm('Are you sure you want to delete this business? This action cannot be undone.')) return;
    deleteMutation.mutate(id);
  };

  const categories = useMemo(() => {
    const cats = new Set(businesses.map(b => b.category));
    return Array.from(cats).sort();
  }, [businesses]);

  const filteredBusinesses = useMemo(() => {
    return businesses.filter(b => {
      const matchesSearch = b.name.toLowerCase().includes(search.toLowerCase()) || 
                           (b.owner_name?.toLowerCase() || '').includes(search.toLowerCase()) ||
                           (b.category?.toLowerCase() || '').includes(search.toLowerCase());
      const matchesCategory = filterCategory === 'all' || b.category === filterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [businesses, search, filterCategory]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredBusinesses.map(b => b.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string | number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} businesses?`)) return;
    
    const { error } = await supabase
      .from('businesses')
      .delete()
      .in('id', selectedIds);

    if (error) {
      alert('Error deleting businesses');
    } else {
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ['admin-businesses-active'] });
    }
  };

  return (
    <div className="min-h-full bg-gray-50/30 transition-colors">
      <main className="max-w-[1600px] mx-auto px-6 md:px-12 py-10">
        <div className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-2xl text-gray-900 tracking-tight">Active Businesses</h1>
            <p className="text-base text-gray-500 mt-2">Manage and monitor all approved businesses on the platform. <span className="text-brand-dark ml-2">{businesses.length} active establishments</span></p>
          </div>
        </div>

        {/* Professional Action Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-[6px] shadow-sm border border-gray-100 mb-12">
          <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
            <div className="relative w-full md:w-96 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-brand-blue transition-colors" />
              <input
                type="text"
                placeholder="Search business, owner or category..."
                className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-[6px] text-sm focus:outline-none focus:ring-1 focus:ring-brand-blue/10 focus:border-brand-blue focus:bg-white transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            
            <div className="relative group w-full md:w-auto">
              <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-brand-blue transition-colors pointer-events-none" />
              <select 
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="bg-white border border-gray-300 rounded-[6px] pl-10 pr-10 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-brand-blue/5 focus:border-brand-blue appearance-none cursor-pointer hover:border-gray-300 transition-all min-w-[200px] shadow-sm w-full md:w-auto"
              >
                <option value="all">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <button 
              onClick={() => refetch()}
              disabled={isFetching}
              className={`p-2.5 text-gray-500 hover:text-brand-blue hover:bg-brand-blue/5 rounded-[6px] transition-all border border-gray-300 bg-white shadow-sm hover:border-brand-blue/20 ${isFetching ? 'opacity-50' : 'active:scale-95'}`}
              title="Refresh Data"
            >
              <RefreshCw className={`h-5 w-5 ${isFetching ? 'animate-spin' : ''}`} />
            </button>

            <div className="h-8 w-px bg-gray-200 hidden md:block" />

            <button 
              onClick={() => window.location.href = '/register'}
              className="flex items-center gap-2 bg-brand-dark text-white px-6 py-2.5 rounded-[6px] text-sm hover:bg-brand-dark transition-all shadow-lg shadow-brand-dark/10 hover:-translate-y-0.5 active:scale-95 whitespace-nowrap"
            >
              <Plus size={16} strokeWidth={3} />
              Add Business
            </button>
          </div>
        </div>

        {/* Businesses Table */}
        <div className="bg-white rounded-[6px] border border-gray-300 shadow-xl overflow-hidden relative">
          {selectedIds.length > 0 && (
            <div className="bg-brand-dark/5 border-b border-gray-200 px-8 py-3 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
              <span className="text-sm font-medium text-brand-dark">
                {selectedIds.length} businesses selected
              </span>
              <div className="flex items-center gap-3">
                <button 
                  onClick={handleBulkDelete}
                  className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-1.5 rounded-[6px] text-xs font-bold hover:bg-red-600 hover:text-white transition-all border border-red-100 shadow-sm"
                >
                  <Trash2 size={14} /> Delete Selected
                </button>
                <button 
                  onClick={() => setSelectedIds([])}
                  className="text-xs font-medium text-gray-500 hover:text-gray-700"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          )}
          {queryError && (
            <div className="absolute top-0 left-0 right-0 z-50 bg-red-600 text-white px-6 py-3 flex items-center justify-between shadow-lg animate-in slide-in-from-top duration-300">
              <div className="flex items-center gap-3">
                <X className="h-5 w-5 bg-white/20 rounded-full p-1" />
                <div className="flex flex-col">
                  <span className="text-sm font-bold">Connection Error</span>
                  <span className="text-[11px] opacity-90">{(queryError as any).message || 'Failed to sync with database'}</span>
                </div>
              </div>
              <button 
                onClick={() => refetch()}
                className="bg-white text-red-600 px-4 py-1.5 rounded-md text-xs  hover:bg-gray-100 transition-colors shadow-sm"
              >
                Retry Sync
              </button>
            </div>
          )}

          {loading && businesses.length === 0 ? (
            <div className="p-8 space-y-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex gap-6 items-center">
                  <Skeleton className="h-12 w-12 rounded-lg" />
                  <Skeleton className="h-6 flex-1" />
                  <Skeleton className="h-6 w-32" />
                </div>
              ))}
            </div>
          ) : filteredBusinesses.length === 0 ? (
            <div className="text-center py-32 bg-gray-50/50">
              <div className="h-20 w-20 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center mx-auto mb-6">
                <Building2 className="text-gray-200 h-10 w-10" strokeWidth={1} />
              </div>
              <p className="text-gray-500 font-semibold text-lg italic">No businesses found matching your criteria.</p>
              <button onClick={() => {setSearch(''); setFilterCategory('all');}} className="mt-4 text-brand-blue hover:underline font-bold text-sm">Clear all filters</button>
            </div>
          ) : (
            <div className="overflow-x-auto text-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-200 border-b border-gray-300">
                    <th className="px-8 py-5 w-10">
                      <input 
                        type="checkbox" 
                        className="rounded-[4px] border-gray-300 text-brand-blue focus:ring-brand-blue/20 cursor-pointer"
                        onChange={handleSelectAll}
                        checked={selectedIds.length === filteredBusinesses.length && filteredBusinesses.length > 0}
                      />
                    </th>
                    <th className="px-8 py-5 text-[11px] text-gray-800 uppercase tracking-[0.2em]">Business & Details</th>
                    <th className="px-8 py-5 text-[11px] text-gray-800 uppercase tracking-[0.2em]">Category</th>
                    <th className="px-8 py-5 text-[11px] text-gray-800 uppercase tracking-[0.2em]">Rating</th>
                    <th className="px-8 py-5 text-[11px] text-gray-800 uppercase tracking-[0.2em]">Owner Info</th>
                    <th className="px-8 py-5 text-[11px] text-gray-800 uppercase tracking-[0.2em] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredBusinesses.map((business) => (
                    <tr key={business.id} className={`group hover:bg-gray-50/50 transition-colors ${selectedIds.includes(business.id) ? 'bg-brand-blue/5' : ''}`}>
                      <td className="px-8 py-6">
                        <input 
                          type="checkbox" 
                          className="rounded-[4px] border-gray-300 text-brand-blue focus:ring-brand-blue/20 cursor-pointer"
                          checked={selectedIds.includes(business.id)}
                          onChange={() => handleSelectOne(business.id)}
                        />
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 relative rounded-[3px] bg-gray-50 border border-gray-200 overflow-hidden flex-shrink-0 flex items-center justify-center shadow-sm group-hover:border-brand-sand transition-all">
                            {business.logo_url ? (
                              <Image src={business.logo_url} alt="" fill className="object-cover" />
                            ) : (
                              <Building2 className="h-6 w-6 text-gray-300" strokeWidth={1.5} />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-brand-blue truncate group-hover:text-brand-dark transition-colors">{business.name}</p>
                              {business.is_verified && <ShieldCheck size={14} className="text-blue-500 flex-shrink-0" />}
                            </div>
                            <p className="font-semibold text-[11px] text-gray-400 truncate flex items-center gap-1 mt-0.5">
                              <MapPin size={10} className="text-brand-blue" /> {business.address}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 bg-blue-50 text-brand-dark border border-blue-100 rounded-full">
                          {business.category}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-1.5 bg-gray-50 w-fit px-2 py-1 rounded-lg border border-gray-100">
                          <span className="text-amber-500 text-sm">★</span>
                          <span className="font-bold text-gray-700">{business.rating || '0.0'}</span>
                          <span className="text-[10px] text-gray-400 font-medium">({business.reviews_count || 0})</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col">
                          <span className="text-brand-blue flex items-center gap-1.5">
                            <User size={12} className="text-gray-400" /> {business.owner_name}
                          </span>
                          <span className="font-medium text-[11px] text-gray-400 mt-1 flex items-center gap-1.5">
                            <Phone size={10} /> {business.phone}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                           <button 
                             onClick={() => setSelectedBusiness(business)}
                             className="p-2 hover:bg-white border border-transparent hover:border-gray-300 rounded-[8px] transition-all text-gray-400 hover:text-brand-dark"
                             title="Quick View"
                           >
                             <Eye size={18} />
                           </button>
                           <DropdownMenu>
                             <DropdownMenuTrigger className="p-2 hover:bg-white border border-transparent hover:border-gray-300 rounded-[8px] transition-all outline-none group-hover:shadow-sm">
                               <MoreVertical size={18} className="text-gray-400" />
                             </DropdownMenuTrigger>
                             <DropdownMenuContent align="end" className="w-56 bg-white border-gray-200 p-1.5 shadow-2xl rounded-[12px] animate-in fade-in slide-in-from-top-2 duration-200">
                               <DropdownMenuItem className="flex items-center gap-2.5 cursor-pointer py-3 px-3 text-[13px] font-medium focus:bg-gray-50 rounded-[8px] transition-colors">
                                 <Edit size={14} className="text-gray-400" /> Edit Details
                               </DropdownMenuItem>
                               <DropdownMenuItem className="flex items-center gap-2.5 cursor-pointer py-3 px-3 text-[13px] font-medium focus:bg-blue-50 focus:text-blue-600 rounded-[8px] transition-colors" onClick={() => window.open(`/nearby?q=${business.name}`, '_blank')}>
                                 <ExternalLink size={14} /> Live Preview
                               </DropdownMenuItem>
                               <div className="h-px bg-gray-100 my-1" />
                               <DropdownMenuItem 
                                 onClick={() => handleDelete(business.id)}
                                 className="flex items-center gap-2.5 cursor-pointer py-3 px-3 text-[13px] font-medium text-red-600 focus:bg-red-50 focus:text-red-700 rounded-[8px] transition-colors"
                               >
                                 <Trash2 size={14} /> Remove Business
                               </DropdownMenuItem>
                             </DropdownMenuContent>
                           </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Business Details Modal */}
        <Dialog open={!!selectedBusiness} onOpenChange={() => setSelectedBusiness(null)}>
          <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto bg-white border-gray-200 p-0 overflow-hidden rounded-2xl shadow-2xl">
            {selectedBusiness && (
              <>
                <div className="relative h-64 w-full bg-gray-100 border-b border-gray-200 flex items-center justify-center">
                  {selectedBusiness.image_url ? (
                    <Image src={selectedBusiness.image_url} alt="" fill className="object-cover opacity-80" />
                  ) : (
                    <div className="bg-brand-blue/5 w-full h-full flex items-center justify-center">
                      <Building2 size={80} className="text-brand-blue/20" strokeWidth={1} />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  <div className="absolute -bottom-12 left-10 h-28 w-28 bg-white rounded-2xl border-4 border-white shadow-2xl p-4 flex items-center justify-center z-10">
                    {selectedBusiness.logo_url ? (
                      <Image src={selectedBusiness.logo_url} alt="" width={80} height={80} className="object-contain" />
                    ) : (
                      <Building2 size={40} className="text-brand-blue/30" />
                    )}
                  </div>
                </div>

                <div className="pt-16 px-10 pb-10">
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <DialogTitle className="text-3xl font-bold text-gray-900 tracking-tight">{selectedBusiness.name}</DialogTitle>
                      <div className="flex items-center gap-4 mt-3">
                        <span className="px-3 py-1 bg-green-50 text-green-700 border border-green-100 rounded-full text-[10px] font-bold uppercase tracking-wider">
                          Verified Business
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button 
                        onClick={() => handleDelete(selectedBusiness.id)}
                        className="px-5 py-2.5 bg-red-50 text-red-600 border border-red-100 rounded-xl text-sm font-bold hover:bg-red-600 hover:text-white transition-all flex items-center gap-2 shadow-sm"
                      >
                        <Trash2 size={16} /> Remove Listing
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 mt-10">
                    {/* Left & Middle Column: Business Info */}
                    <div className="lg:col-span-2 space-y-8">
                      <div>
                        <h4 className="text-[11px] uppercase tracking-[0.2em] text-gray-400 font-bold mb-4 flex items-center gap-2">
                          <FileText size={14} /> Company Profile
                        </h4>
                        <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
                          <p className="text-base text-gray-600 leading-relaxed font-medium italic">
                            "{selectedBusiness.description || 'No detailed description provided for this establishment.'}"
                          </p>
                          <div className="mt-4 pt-4 border-t border-gray-200/50 flex items-start gap-2.5 text-sm text-gray-500 font-medium">
                            <MapPin size={16} className="text-brand-blue mt-0.5" />
                            <span>{selectedBusiness.address}</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                          <div className="p-3 bg-blue-50 rounded-xl text-brand-blue">
                            <Phone size={18} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] text-gray-400 font-bold uppercase">Contact Number</p>
                            <p className="text-sm text-gray-900 font-bold">{selectedBusiness.phone}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                          <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
                            <Mail size={18} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] text-gray-400 font-bold uppercase">Email Address</p>
                            <p className="text-sm text-gray-900 font-bold truncate">{selectedBusiness.email}</p>
                          </div>
                        </div>
                        {selectedBusiness.website_url && (
                          <div className="md:col-span-2 flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                            <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
                              <ExternalLink size={18} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[10px] text-gray-400 font-bold uppercase">Official Website</p>
                              <p className="text-sm text-brand-dark font-bold truncate">
                                {selectedBusiness.website_name || selectedBusiness.website_url}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Column: Registration & Owner Info */}
                    <div className="space-y-6">
                      <div className="bg-gray-50/50 border border-gray-200 rounded-2xl overflow-hidden">
                         <div className="px-5 py-4 bg-white border-b border-gray-200">
                           <h4 className="text-[11px] uppercase tracking-[0.2em] text-gray-500 font-bold">Ownership Identity</h4>
                         </div>
                         <div className="p-6 space-y-5">
                            <div className="flex items-center gap-4">
                              <div className="h-10 w-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center shadow-sm">
                                <User size={18} className="text-brand-blue" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[10px] text-gray-400 font-bold uppercase">Full Legal Name</p>
                                <p className="text-sm text-gray-900 font-bold truncate">{selectedBusiness.owner_name}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="h-10 w-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center shadow-sm">
                                <Briefcase size={18} className="text-brand-dark" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[10px] text-gray-400 font-bold uppercase">National ID (NIC)</p>
                                <p className="text-sm text-gray-900 font-mono font-bold tracking-widest">{selectedBusiness.nic_number || 'NOT PROVIDED'}</p>
                              </div>
                            </div>
                         </div>
                      </div>

                      <div className="bg-gray-50/50 border border-gray-200 rounded-2xl overflow-hidden">
                         <div className="px-5 py-4 bg-white border-b border-gray-200">
                           <h4 className="text-[11px] uppercase tracking-[0.2em] text-gray-500 font-bold">Legal Compliance</h4>
                         </div>
                         <div className="p-6 space-y-5">
                            <div className="flex items-center gap-4">
                              <div className="h-10 w-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center shadow-sm">
                                <FileText size={18} className="text-purple-600" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[10px] text-gray-400 font-bold uppercase">Reg Number</p>
                                <p className="text-sm text-gray-900 font-mono font-bold tracking-widest">{selectedBusiness.registration_number || 'UNREGISTERED'}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="h-10 w-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center shadow-sm">
                                <Clock size={18} className="text-amber-600" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[10px] text-gray-400 font-bold uppercase">Platform Entry</p>
                                <p className="text-sm text-gray-900 font-bold">
                                  {selectedBusiness.created_at ? new Date(selectedBusiness.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'N/A'}
                                </p>
                              </div>
                            </div>
                         </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}