'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
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
  FileText,
  Eye,
  Briefcase,
  User,
  ClipboardList,
  Clock,
  ExternalLink,
  ShieldCheck,
  Download
} from 'lucide-react';
import Image from 'next/image';
import { Business } from '@/lib/types';
import { VerificationWithBusiness } from '@/lib/admin-types';
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

export default function BusinessRequestsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'registrations' | 'verifications'>('registrations');
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [selectedVerification, setSelectedVerification] = useState<VerificationWithBusiness | null>(null);

  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);

  // Business Registrations Query
  const { data: requests = [], isLoading: loading, refetch } = useQuery({
    queryKey: ['admin-businesses-pending'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Business[];
    },
    staleTime: 5 * 60 * 1000,
    enabled: activeTab === 'registrations'
  });

  // Verification Requests Query
  const { data: verifications = [], isLoading: verificationsLoading } = useQuery({
    queryKey: ['admin-verifications-pending'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('verifications')
        .select('*, businesses(name, logo_url, owner_name, email, phone)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as VerificationWithBusiness[];
    },
    staleTime: 5 * 60 * 1000,
    enabled: activeTab === 'verifications'
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, owner_id, status }: { id: string | number, owner_id: string, status: 'approved' | 'rejected' }) => {
      const { error: businessError } = await supabase
        .from('businesses')
        .update({ status })
        .eq('id', id);

      if (businessError) throw businessError;

      if (status === 'approved' && owner_id) {
        await supabase
          .from('profiles')
          .update({ role: 'vendor' })
          .eq('id', owner_id);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-businesses-pending'] });
      queryClient.invalidateQueries({ queryKey: ['admin-businesses-active'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      setSelectedBusiness(null);
      alert(`Business application ${variables.status} successfully!`);
    },
    onError: () => {
      alert('Failed to update business status');
    }
  });

  const updateVerificationMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: 'approved' | 'rejected' }) => {
      const { error } = await supabase
        .from('verifications')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-verifications-pending'] });
      queryClient.invalidateQueries({ queryKey: ['admin-businesses-active'] });
      setSelectedVerification(null);
      alert(`Verification ${variables.status} successfully!`);
    }
  });

  const handleUpdateStatus = (id: string | number, owner_id: string, status: 'approved' | 'rejected') => {
    updateStatusMutation.mutate({ id, owner_id, status });
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredRequests.map(r => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string | number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkStatusChange = async (status: 'approved' | 'rejected') => {
    if (!confirm(`Are you sure you want to ${status} ${selectedIds.length} business applications?`)) return;
    
    // For approved businesses, we need to update owner roles as well
    // In a real app, this should be a transaction or a better optimized query
    const { error } = await supabase
      .from('businesses')
      .update({ status })
      .in('id', selectedIds);

    if (error) {
      alert(`Error updating ${selectedIds.length} businesses`);
    } else {
      if (status === 'approved') {
        const ownerIds = requests
          .filter(r => selectedIds.includes(r.id) && r.owner_id)
          .map(r => r.owner_id);
        
        if (ownerIds.length > 0) {
          await supabase
            .from('profiles')
            .update({ role: 'vendor' })
            .in('id', ownerIds);
        }
      }
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ['admin-businesses-pending'] });
      queryClient.invalidateQueries({ queryKey: ['admin-businesses-active'] });
      alert(`Successfully ${status} ${selectedIds.length} applications`);
    }
  };

  const filteredRequests = requests.filter(r => 
    r.name.toLowerCase().includes(search.toLowerCase()) || 
    (r.owner_name?.toLowerCase() || '').includes(search.toLowerCase()) ||
    (r.registration_number?.toLowerCase() || '').includes(search.toLowerCase())
  );

  const filteredVerifications = verifications.filter(v => 
    v.businesses.name.toLowerCase().includes(search.toLowerCase()) || 
    v.businesses.owner_name.toLowerCase().includes(search.toLowerCase())
  );

  const renderSkeleton = () => (
    <div className="p-0">
      <div className="border-b border-gray-200 bg-gray-50/50 p-4 grid grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-4 w-20" />)}
      </div>
      {[...Array(5)].map((_, i) => (
        <div key={i} className="p-4 grid grid-cols-5 gap-4 border-b border-gray-100">
          <Skeleton className="h-10 w-full col-span-5" />
        </div>
      ))}
    </div>
  );

  const renderEmptyState = (message: string) => (
    <div className="text-center py-24">
      <ClipboardList className="mx-auto text-gray-200  mb-4 h-12 w-12" strokeWidth={1} />
      <p className="text-gray-400 font-normal">{message}</p>
    </div>
  );

  return (
    <div className="min-h-full bg-gray-50/30 transition-colors">
      <main className="max-w-[1600px] mx-auto px-6 md:px-12 py-10">
        <div className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-2xl text-gray-900 tracking-tight">Management Center</h1>
            <p className="text-base text-gray-500 mt-2">Review and manage pending registrations and verification requests.</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-8 border-b border-gray-300 mb-8">
          <button 
            onClick={() => { setActiveTab('registrations'); setSelectedIds([]); }}
            className={`pb-4 text-sm font-bold transition-all relative ${activeTab === 'registrations' ? 'text-brand-dark' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Business Registrations ({requests.length})
            {activeTab === 'registrations' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-brand-dark animate-in fade-in" />}
          </button>
          <button 
            onClick={() => { setActiveTab('verifications'); setSelectedIds([]); }}
            className={`pb-4 text-sm font-bold transition-all relative ${activeTab === 'verifications' ? 'text-brand-dark' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Verification Requests ({verifications.length})
            {activeTab === 'verifications' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-brand-dark animate-in fade-in" />}
          </button>
        </div>

        {/* Professional Action Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-[6px] shadow-sm border border-gray-100 mb-12">
          <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
            <div className="relative w-full md:w-96 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-brand-blue transition-colors" />
              <input 
                type="text" 
                placeholder={`Search ${activeTab}...`} 
                className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-[6px] text-sm focus:outline-none focus:ring-1 focus:ring-brand-blue/10 focus:border-brand-blue focus:bg-white transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <button 
              onClick={() => activeTab === 'registrations' ? refetch() : queryClient.invalidateQueries({ queryKey: ['admin-verifications-pending'] })}
              className="p-2.5 text-gray-500 hover:text-brand-blue hover:bg-brand-blue/5 rounded-[6px] transition-all border border-gray-300 bg-white shadow-sm hover:border-brand-blue/20"
              title="Refresh Data"
            >
              <Clock className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Table */}
        <div className="bg-white rounded-[6px] border border-gray-300 shadow-xl overflow-hidden relative text-sm">
          {activeTab === 'registrations' ? (
            <>
              {selectedIds.length > 0 && (
                <div className="bg-brand-dark/5 border-b border-gray-200 px-8 py-3 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                  <span className="text-sm font-medium text-brand-dark">
                    {selectedIds.length} requests selected
                  </span>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => handleBulkStatusChange('approved')}
                      className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-[6px] text-xs font-bold hover:bg-emerald-600 hover:text-white transition-all border border-emerald-100 shadow-sm"
                    >
                      <CheckCircle size={14} /> Approve Selected
                    </button>
                    <button 
                      onClick={() => handleBulkStatusChange('rejected')}
                      className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-1.5 rounded-[6px] text-xs font-bold hover:bg-red-600 hover:text-white transition-all border border-red-100 shadow-sm"
                    >
                      <XCircle size={14} /> Reject Selected
                    </button>
                    <button 
                      onClick={() => setSelectedIds([])}
                      className="text-xs font-medium text-gray-500 hover:text-gray-700 ml-2"
                    >
                      Clear Selection
                    </button>
                  </div>
                </div>
              )}
              {loading ? (
                renderSkeleton()
              ) : filteredRequests.length === 0 ? (
                renderEmptyState('No pending registration requests found.')
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-200 border-b border-gray-300">
                        <th className="px-8 py-5 w-10">
                          <input 
                            type="checkbox" 
                            className="rounded-[4px] border-gray-300 text-brand-blue focus:ring-brand-blue/20 cursor-pointer"
                            onChange={handleSelectAll}
                            checked={selectedIds.length === filteredRequests.length && filteredRequests.length > 0}
                          />
                        </th>
                        <th className="px-8 py-5 text-[11px] text-gray-800 uppercase tracking-[0.2em]">Business</th>
                        <th className="px-8 py-5 text-[11px] text-gray-800 uppercase tracking-[0.2em]">Category</th>
                        <th className="px-8 py-5 text-[11px] text-gray-800 uppercase tracking-[0.2em]">Owner / Contact</th>
                        <th className="px-8 py-5 text-[11px] text-gray-800 uppercase tracking-[0.2em]">Legal ID</th>
                        <th className="px-8 py-5 text-[11px] text-gray-800 uppercase tracking-[0.2em] text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredRequests.map((business) => (
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
                                <p className="text-brand-blue truncate group-hover:text-brand-dark transition-colors">{business.name}</p>
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
                            <div className="flex flex-col">
                              <span className="text-brand-blue flex items-center gap-1.5">
                                <User size={12} className="text-gray-400" /> {business.owner_name}
                              </span>
                              <span className="font-medium text-[11px] text-gray-400 mt-1 flex items-center gap-1.5">
                                <Phone size={10} /> {business.phone}
                              </span>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex flex-col">
                              <span className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">
                                {business.is_registered ? 'BR' : 'NIC'}
                              </span>
                              <span className="text-gray-900 font-mono font-bold tracking-widest">
                                {business.registration_number || 'N/A'}
                              </span>
                            </div>
                          </td>
                          <td className="px-8 py-6 text-right">
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => setSelectedBusiness(business)}
                                className="p-2 hover:bg-white border border-transparent hover:border-gray-300 rounded-[8px] transition-all text-gray-400 hover:text-brand-dark"
                                title="View Application"
                              >
                                <Eye size={18} />
                              </button>
                              <div className="w-px h-4 bg-gray-200 mx-1" />
                              <button 
                                onClick={() => handleUpdateStatus(business.id, business.owner_id as string, 'approved')}
                                className="p-2 hover:bg-emerald-50 border border-transparent hover:border-emerald-200 rounded-[8px] transition-all text-emerald-600"
                                title="Approve"
                              >
                                <CheckCircle size={18} />
                              </button>
                              <button 
                                onClick={() => handleUpdateStatus(business.id, business.owner_id as string, 'rejected')}
                                className="p-2 hover:bg-red-50 border border-transparent hover:border-red-200 rounded-[8px] transition-all text-red-600"
                                title="Reject"
                              >
                                <XCircle size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <>
              {verificationsLoading ? (
                renderSkeleton()
              ) : filteredVerifications.length === 0 ? (
                renderEmptyState('No pending verification requests found.')
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-200 border-b border-gray-300">
                        <th className="px-8 py-5 text-[11px] text-gray-800 uppercase tracking-[0.2em]">Business</th>
                        <th className="px-8 py-5 text-[11px] text-gray-800 uppercase tracking-[0.2em]">Owner Info</th>
                        <th className="px-8 py-5 text-[11px] text-gray-800 uppercase tracking-[0.2em]">Submitted At</th>
                        <th className="px-8 py-5 text-[11px] text-gray-800 uppercase tracking-[0.2em] text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredVerifications.map((v) => (
                        <tr key={v.id} className="group hover:bg-gray-50/50 transition-colors">
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-4">
                              <div className="h-12 w-12 relative rounded-[3px] bg-gray-50 border border-gray-200 overflow-hidden flex-shrink-0 flex items-center justify-center shadow-sm">
                                {v.businesses.logo_url ? (
                                  <Image src={v.businesses.logo_url} alt="" fill className="object-cover" />
                                ) : (
                                  <Building2 className="h-6 w-6 text-gray-300" strokeWidth={1.5} />
                                )}
                              </div>
                              <div>
                                <p className="text-brand-blue font-medium">{v.businesses.name}</p>
                                <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">Pending Verification</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex flex-col">
                              <span className="text-sm text-gray-900">{v.businesses.owner_name}</span>
                              <span className="text-xs text-gray-500">{v.businesses.email}</span>
                            </div>
                          </td>
                          <td className="px-8 py-6 text-gray-500">
                            {new Date(v.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-8 py-6 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={() => setSelectedVerification(v)}
                                className="px-3 py-1.5 bg-white border border-gray-300 rounded-[6px] text-xs hover:bg-gray-50 flex items-center gap-2"
                              >
                                <Eye size={14} /> Review Documents
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>

        {/* Verification Details Modal */}
        <Dialog open={!!selectedVerification} onOpenChange={() => setSelectedVerification(null)}>
          <DialogContent className="max-w-2xl bg-white border-gray-300 p-8 overflow-hidden">
            {selectedVerification && (
              <div className="space-y-8">
                <div className="flex justify-between items-start border-b border-gray-100 pb-6">
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 bg-brand-blue/5 rounded-[6px] flex items-center justify-center">
                      <ShieldCheck className="h-8 w-8 text-brand-blue" />
                    </div>
                    <div>
                      <h2 className="text-xl text-gray-900">Verification Review</h2>
                      <p className="text-sm text-gray-500 mt-1">{selectedVerification.businesses.name}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Business Documents</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded border border-gray-200 group">
                        <div className="flex items-center gap-3">
                          <FileText className="h-4 w-4 text-brand-blue" />
                          <span className="text-xs font-medium text-gray-700">BR Certificate</span>
                        </div>
                        {selectedVerification.br_document_url ? (
                           <a href={selectedVerification.br_document_url} target="_blank" rel="noreferrer" className="p-1.5 hover:bg-brand-blue/5 text-brand-blue transition-all rounded">
                             <Download size={14} />
                           </a>
                        ) : <span className="text-[10px] text-gray-400 italic">Not provided</span>}
                      </div>

                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded border border-gray-200 group">
                        <div className="flex items-center gap-3">
                          <User className="h-4 w-4 text-brand-blue" />
                          <span className="text-xs font-medium text-gray-700">NIC / Passport</span>
                        </div>
                        {selectedVerification.nic_passport_url ? (
                           <a href={selectedVerification.nic_passport_url} target="_blank" rel="noreferrer" className="p-1.5 hover:bg-brand-blue/5 text-brand-blue transition-all rounded">
                             <Download size={14} />
                           </a>
                        ) : <span className="text-[10px] text-gray-400 italic">Not provided</span>}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Owner Verification</h4>
                    <div className="bg-gray-50 p-4 rounded border border-gray-200 space-y-3">
                       <div className="flex flex-col">
                         <span className="text-[10px] text-gray-400 uppercase">Contact Person</span>
                         <span className="text-sm text-gray-900 font-medium">{selectedVerification.businesses.owner_name}</span>
                       </div>
                       <div className="flex flex-col">
                         <span className="text-[10px] text-gray-400 uppercase">Registered Email</span>
                         <span className="text-sm text-gray-900 font-medium">{selectedVerification.businesses.email}</span>
                       </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => updateVerificationMutation.mutate({ id: selectedVerification.id, status: 'approved' })}
                    className="flex-1 py-3 bg-emerald-600 text-white rounded-[6px] text-sm font-bold hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle size={18} /> Approve Verification
                  </button>
                  <button 
                    onClick={() => updateVerificationMutation.mutate({ id: selectedVerification.id, status: 'rejected' })}
                    className="flex-1 py-3 bg-white border border-red-100 text-red-600 rounded-[6px] text-sm font-bold hover:bg-red-50 transition-all flex items-center justify-center gap-2"
                  >
                    <XCircle size={18} /> Reject
                  </button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
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
                        <span className="px-2.5 py-0.5 rounded-[6px] text-[10px] uppercase tracking-wider bg-brand-blue/10  text-brand-blue  border border-brand-blue/20 ">
                          Pending Approval
                        </span>
                        <span className="text-xs text-gray-400  flex items-center gap-1.5 font-normal">
                          <MapPin size={12} className="text-brand-blue" /> {selectedBusiness.address}
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
                            <span className="text-sm text-brand-dark  truncate font-normal">
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
                    className="px-8 py-2.5 bg-brand-dark text-white rounded-[6px] text-xs font-normal hover:bg-emerald-700 flex items-center gap-2 transition-all shadow-lg shadow-emerald-900/20"
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
