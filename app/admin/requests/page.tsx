'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { 
  CheckCircle, 
  XCircle, 
  Search, 
  Building2, 
  Phone, 
  Mail, 
  User as UserIcon,
  MapPin,
  ChevronRight,
  FileText,
  BadgeCheck,
  AlertCircle,
  Eye,
  Clock,
  Briefcase,
  User,
  ExternalLink,
  ClipboardList
} from 'lucide-react';
import Image from 'next/image';
import { Business } from '@/lib/types';
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

export default function BusinessRequestsPage() {
  const [requests, setRequests] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (data) {
      setRequests(data);
    }
    setLoading(false);
  };

  const handleUpdateStatus = async (id: string | number, owner_id: string, status: 'approved' | 'rejected') => {
    const { error: businessError } = await supabase
      .from('businesses')
      .update({ status })
      .eq('id', id);

    if (businessError) {
      alert('Failed to update business status');
      return;
    }

    if (status === 'approved' && owner_id) {
      await supabase
        .from('profiles')
        .update({ role: 'vendor' })
        .eq('id', owner_id);
    }

    setRequests(requests.filter(r => r.id !== id));
    setSelectedBusiness(null);
    alert(`Business application ${status} successfully!`);
  };

  const filteredRequests = requests.filter(r => 
    r.name.toLowerCase().includes(search.toLowerCase()) || 
    (r.owner_name?.toLowerCase() || '').includes(search.toLowerCase()) ||
    (r.registration_number?.toLowerCase() || '').includes(search.toLowerCase())
  );

  return (
    <div className="min-h-full bg-gray-50/50  transition-colors">
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-normal text-gray-900 ">Business Registration Requests</h1>
          <p className="text-sm text-gray-500  mt-1">Review and manage pending business applications.</p>
        </div>

        {/* Search Bar */}
        <div className="mb-8 max-w-xl">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors h-4 w-4" />
            <input 
              type="text" 
              placeholder="Search by business, owner, or BR number..." 
              className="w-full pl-12 pr-4 py-3 bg-white  border border-gray-300  rounded-[6px] focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all font-normal text-sm shadow-sm "
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Requests Table */}
        <div className="bg-white  rounded-[6px] border border-gray-300  shadow-sm overflow-hidden text-sm">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-[6px] h-8 w-8 border-b-2 border-emerald-600"></div>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-24">
              <ClipboardList className="mx-auto text-gray-200  mb-4 h-12 w-12" strokeWidth={1} />
              <p className="text-gray-400  font-normal">No pending registration requests found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-300  bg-gray-50/50 ">
                    <th className="px-6 py-4 text-[11px] font-normal text-gray-400  uppercase tracking-widest">Business</th>
                    <th className="px-6 py-4 text-[11px] font-normal text-gray-400  uppercase tracking-widest">Category</th>
                    <th className="px-6 py-4 text-[11px] font-normal text-gray-400  uppercase tracking-widest">Owner / Contact</th>
                    <th className="px-6 py-4 text-[11px] font-normal text-gray-400  uppercase tracking-widest">Legal ID</th>
                    <th className="px-6 py-4 text-[11px] font-normal text-gray-400  uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-300 ">
                  {filteredRequests.map((business) => (
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
                        <span className="text-xs font-normal text-emerald-600  bg-emerald-50  px-2 py-1 rounded-[6px]">
                          {business.category}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-normal text-gray-700 ">
                          {business.owner_name}
                          <div className="flex items-center gap-2 mt-1 font-normal">
                            <span className="text-[11px] text-gray-400  flex items-center gap-1">
                              <Phone size={10} /> {business.phone}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-normal">
                        <div className="flex flex-col">
                          <span className="text-[11px] text-gray-400  mb-0.5">
                            {business.is_registered ? 'BR' : 'NIC'}
                          </span>
                          <span className="text-gray-700  font-mono tracking-wide">
                            {business.registration_number || 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => setSelectedBusiness(business)}
                            className="p-2 text-gray-400 hover:bg-gray-50  rounded-[6px] transition-colors hover:text-emerald-600"
                            title="View Application"
                          >
                            <Eye size={18} strokeWidth={1.5} />
                          </button>
                          <div className="w-px h-4 bg-gray-100  mx-1" />
                          <button 
                            onClick={() => handleUpdateStatus(business.id, business.owner_id as string, 'approved')}
                            className="p-2 text-emerald-600 hover:bg-emerald-50  rounded-[6px] transition-colors"
                            title="Approve"
                          >
                            <CheckCircle size={18} strokeWidth={1.5} />
                          </button>
                          <button 
                            onClick={() => handleUpdateStatus(business.id, business.owner_id as string, 'rejected')}
                            className="p-2 text-red-600 hover:bg-red-50  rounded-[6px] transition-colors"
                            title="Reject"
                          >
                            <XCircle size={18} strokeWidth={1.5} />
                          </button>
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
                      <div className="flex items-center gap-4 mt-2 font-normal">
                        <span className="px-2.5 py-0.5 rounded-[6px] text-[10px] uppercase tracking-wider bg-amber-50  text-amber-700  border border-amber-100 ">
                          Pending Approval
                        </span>
                        <span className="text-xs text-gray-400  flex items-center gap-1.5 font-normal">
                          <MapPin size={12} className="text-emerald-500" /> {selectedBusiness.address}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                        {/* Actions moved to footer */}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-8 mt-8 pb-20">
                    {/* Left Column: Business Info */}
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-[11px] uppercase tracking-widest text-gray-400  font-normal mb-3 flex items-center gap-2">
                          <FileText size={12} /> Business Description
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
                    <div className="space-y-6 font-normal">
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

                      <div className="bg-white  border border-gray-300  rounded-[6px] overflow-hidden shadow-sm font-normal">
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
                                <p className="text-xs text-gray-400 font-normal">Submitted On</p>
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
                <div className="sticky bottom-0 left-0 right-0 bg-white/80  backdrop-blur-md border-t border-gray-300  p-4 flex justify-end gap-3 px-8 z-10">
                  <button 
                    onClick={() => handleUpdateStatus(selectedBusiness.id, selectedBusiness.owner_id as string, 'rejected')}
                    className="px-6 py-2.5 bg-white  border border-red-100  text-red-600  rounded-[6px] text-xs font-normal hover:bg-red-50  transition-all"
                  >
                    Reject Application
                  </button>
                  <button 
                    onClick={() => handleUpdateStatus(selectedBusiness.id, selectedBusiness.owner_id as string, 'approved')}
                    className="px-8 py-2.5 bg-emerald-600 text-white rounded-[6px] text-xs font-normal hover:bg-emerald-700 flex items-center gap-2 transition-all shadow-lg shadow-emerald-900/20"
                  >
                    <CheckCircle size={16} /> Approve Business
                  </button>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
