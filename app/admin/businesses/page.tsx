'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
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
  CheckCircle,
  XCircle
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
} from "@/components/ui/dialog";

export default function AdminBusinessesPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);

  useEffect(() => {
    fetchBusinesses();
  }, []);

  const fetchBusinesses = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('status', 'approved')
      .order('name', { ascending: true });

    if (data) {
      setBusinesses(data);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string | number) => {
    if (!confirm('Are you sure you want to delete this business? This action cannot be undone.')) return;

    const { error } = await supabase
      .from('businesses')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Error deleting business');
    } else {
      setBusinesses(businesses.filter(b => b.id !== id));
      setSelectedBusiness(null);
    }
  };

  const filteredBusinesses = businesses.filter(b => 
    b.name.toLowerCase().includes(search.toLowerCase()) || 
    (b.owner_name?.toLowerCase() || '').includes(search.toLowerCase())
  );

  return (
    <div className="min-h-full bg-gray-50/50  transition-colors">
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-normal text-gray-900 ">Active Businesses</h1>
          <p className="text-sm text-gray-500  mt-1">Manage and monitor all approved businesses on the platform.</p>
        </div>

        {/* Search Bar */}
        <div className="mb-8 max-w-xl">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors h-4 w-4" />
            <input 
              type="text" 
              placeholder="Search active businesses..." 
              className="w-full pl-12 pr-4 py-3 bg-white  border border-gray-300  rounded-[6px] focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all font-normal text-sm shadow-sm "
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Businesses Table */}
        <div className="bg-white  rounded-[6px] border border-gray-300  shadow-sm overflow-hidden text-sm">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-[6px] h-8 w-8 border-b-2 border-emerald-600"></div>
            </div>
          ) : filteredBusinesses.length === 0 ? (
            <div className="text-center py-24">
              <Building2 className="mx-auto text-gray-200  mb-4 h-12 w-12" strokeWidth={1} />
              <p className="text-gray-400  font-normal">No active businesses found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-300  bg-gray-50/50 ">
                    <th className="px-6 py-4 text-[11px] font-normal text-gray-400  uppercase tracking-widest">Business</th>
                    <th className="px-6 py-4 text-[11px] font-normal text-gray-400  uppercase tracking-widest">Category</th>
                    <th className="px-6 py-4 text-[11px] font-normal text-gray-400  uppercase tracking-widest">Rating</th>
                    <th className="px-6 py-4 text-[11px] font-normal text-gray-400  uppercase tracking-widest">Owner</th>
                    <th className="px-6 py-4 text-[11px] font-normal text-gray-400  uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-300 ">
                  {filteredBusinesses.map((business) => (
                    <tr key={business.id} className="hover:bg-gray-50/50  transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 relative rounded-[6px] bg-gray-50  border border-gray-300  overflow-hidden flex-shrink-0 flex items-center justify-center">
                            {business.logo_url ? (
                              <Image src={business.logo_url} alt="" fill className="object-cover" />
                            ) : (
                              <Building2 className="h-5 w-5 text-gray-300 " strokeWidth={1.5} />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-normal text-gray-900  truncate">{business.name}</p>
                            <p className="text-[11px] text-gray-400  truncate">{business.address}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-normal text-gray-600  bg-gray-100  px-2 py-1 rounded-[6px]">
                          {business.category}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          <span className="text-amber-500 text-xs">★</span>
                          <span className="font-normal text-gray-700 ">{business.rating || '0.0'}</span>
                          <span className="text-[11px] text-gray-400">({business.reviews_count || 0})</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-gray-700 ">{business.owner_name}</span>
                          <span className="text-[11px] text-gray-400 mt-0.5">{business.phone}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                           <button 
                             onClick={() => setSelectedBusiness(business)}
                             className="p-2 hover:bg-gray-100  rounded-[6px] transition-colors text-gray-400 hover:text-emerald-600"
                             title="Quick View"
                           >
                             <Eye size={16} />
                           </button>
                           <DropdownMenu>
                             <DropdownMenuTrigger className="p-2 hover:bg-gray-100  rounded-[6px] transition-colors outline-none">
                               <MoreVertical size={16} className="text-gray-400" />
                             </DropdownMenuTrigger>
                             <DropdownMenuContent align="end" className="w-40 bg-white  border-gray-300 ">
                               <DropdownMenuItem className="flex items-center gap-2 cursor-pointer py-2 px-3 text-xs font-normal focus:bg-emerald-50  focus:text-emerald-600 ">
                                 <Edit size={14} /> Edit Business
                               </DropdownMenuItem>
                               <DropdownMenuItem className="flex items-center gap-2 cursor-pointer py-2 px-3 text-xs font-normal focus:bg-blue-50  focus:text-blue-600 " onClick={() => window.open(`/nearby?q=${business.name}`, '_blank')}>
                                 <ExternalLink size={14} /> View Page
                               </DropdownMenuItem>
                               <DropdownMenuItem 
                                 onClick={() => handleDelete(business.id)}
                                 className="flex items-center gap-2 cursor-pointer py-2 px-3 text-xs font-normal text-red-600 focus:bg-red-50  focus:text-red-600"
                               >
                                 <Trash2 size={14} /> Delete
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
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white  border-gray-300  p-0 overflow-hidden">
            {selectedBusiness && (
              <>
                <div className="relative h-48 w-full bg-gray-100  border-b border-gray-300  flex items-center justify-center">
                  {selectedBusiness.image_url ? (
                    <Image src={selectedBusiness.image_url} alt="" fill className="object-cover opacity-60 grayscale-[0.5]" />
                  ) : (
                    <Building2 size={64} className="text-gray-300 " strokeWidth={1} />
                  )}
                  <div className="absolute -bottom-10 left-8 h-20 w-20 bg-white  rounded-[6px] border border-gray-300  shadow-xl p-3 flex items-center justify-center">
                    {selectedBusiness.logo_url ? (
                      <Image src={selectedBusiness.logo_url} alt="" width={64} height={64} className="object-contain" />
                    ) : (
                      <Building2 size={32} className="text-gray-300 " />
                    )}
                  </div>
                </div>

                <div className="pt-14 px-8 pb-8">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-2xl font-normal text-gray-900 ">{selectedBusiness.name}</h2>
                      <div className="flex items-center gap-4 mt-2">
                        <span className={`px-2.5 py-0.5 rounded-[6px] text-[10px] uppercase tracking-wider font-normal bg-emerald-50  text-emerald-700  border border-emerald-100 
                          Active
                        </span>
                        <span className="text-xs text-gray-400  flex items-center gap-1.5 font-normal">
                          <MapPin size={12} className="text-emerald-500" /> {selectedBusiness.address}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleDelete(selectedBusiness.id)}
                        className="px-4 py-2 bg-red-50  text-red-600  rounded-[6px] text-xs font-normal hover:bg-red-100 flex items-center gap-2 transition-colors"
                      >
                        <Trash2 size={14} /> Delete Business
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-8 mt-8">
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
                          <span className="text-sm text-gray-600  font-normal">{selectedBusiness.phone}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 bg-white  rounded-[6px] shadow-sm border border-gray-300 ">
                            <Mail size={14} className="text-gray-400" />
                          </div>
                          <span className="text-sm text-gray-600  font-normal">{selectedBusiness.email}</span>
                        </div>
                        {selectedBusiness.website_url && (
                          <div className="flex items-center gap-3">
                            <div className="p-1.5 bg-white  rounded-[6px] shadow-sm border border-gray-300 ">
                              <ExternalLink size={14} className="text-gray-400" />
                            </div>
                            <span className="text-sm text-emerald-600  truncate font-normal">
                              {selectedBusiness.website_name || selectedBusiness.website_url}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Column: Registration & Owner Info */}
                    <div className="space-y-6">
                      <div className="bg-white  border border-gray-300  rounded-[6px] overflow-hidden shadow-sm">
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
                              <div className="h-8 w-8 rounded-[6px] bg-emerald-50  flex items-center justify-center">
                                <Briefcase size={14} className="text-emerald-600 " />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs text-gray-400 font-normal">Owner NIC</p>
                                <p className="text-sm text-gray-900  font-mono font-normal tracking-wide">{selectedBusiness.nic_number || 'N/A'}</p>
                              </div>
                            </div>
                         </div>
                      </div>

                      <div className="bg-white  border border-gray-300  rounded-[6px] overflow-hidden shadow-sm">
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
              </>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}