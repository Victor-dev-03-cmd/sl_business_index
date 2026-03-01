'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { 
  CheckCircle, 
  XCircle, 
  Search, 
  Filter, 
  Building2, 
  Phone, 
  Mail, 
  User as UserIcon,
  ShieldCheck,
  MapPin,
  ExternalLink,
  ChevronRight,
  MoreVertical,
  Eye,
  FileText,
  Clock,
  Briefcase,
  User,
  Image as ImageIcon
} from 'lucide-react';
import Image from 'next/image';
import { Business } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function AdminDashboard() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState({ pending: 0, total: 0 });
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const router = useRouter();

  useEffect(() => {
    checkAdmin();
    fetchBusinesses();
  }, [filter]);

  const checkAdmin = async () => {
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
  };

  const fetchBusinesses = async () => {
    setLoading(true);
    let query = supabase
      .from('businesses')
      .select('*')
      .order('created_at', { ascending: false });

    if (filter !== 'all') {
      query = query.eq('status', filter);
    }

    const { data, error } = await query;

    if (data) {
      setBusinesses(data);
      
      // Calculate stats
      const total = data.length;
      const pendingCount = data.filter(b => b.status === 'pending').length;
      setStats({ pending: pendingCount, total });
    }
    setLoading(false);
  };

  const handleUpdateStatus = async (id: string | number, status: 'approved' | 'rejected') => {
    const { error } = await supabase
      .from('businesses')
      .update({ status })
      .eq('id', id);

    if (!error) {
      setBusinesses(businesses.map(b => b.id === id ? { ...b, status } : b));
      // Update role of owner to vendor if approved
      if (status === 'approved') {
        const business = businesses.find(b => b.id === id);
        if (business && business.owner_id) {
          await supabase
            .from('profiles')
            .update({ role: 'vendor' })
            .eq('id', business.owner_id);
        }
      }
    }
  };

  const filteredBusinesses = businesses.filter(b => 
    b.name.toLowerCase().includes(search.toLowerCase()) || 
    (b.owner_name?.toLowerCase() || '').includes(search.toLowerCase())
  );

  return (
    <div className="min-h-full bg-gray-50/50 dark:bg-gray-950 transition-colors">
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-2xl font-normal text-gray-900 dark:text-white">Overview</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your platform's businesses and requests.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
            <p className="text-xs font-normal text-gray-400 dark:text-gray-500 uppercase tracking-wider">Pending Approvals</p>
            <h2 className="text-3xl font-medium text-emerald-600 dark:text-emerald-400 mt-2">{stats.pending}</h2>
          </div>
          <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
            <p className="text-xs font-normal text-gray-400 dark:text-gray-500 uppercase tracking-wider">Total Businesses</p>
            <h2 className="text-3xl font-medium text-gray-900 dark:text-white mt-2">{stats.total}</h2>
          </div>
        </div>

        {/* Controls Bar */}
        <div className="flex flex-col lg:flex-row gap-4 mb-8">
          <div className="relative flex-grow group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Search by business or owner name..." 
              className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all font-normal text-sm shadow-sm dark:text-gray-200"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 lg:pb-0">
            {(['pending', 'approved', 'rejected', 'all'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-5 py-3 rounded-xl text-sm font-normal capitalize transition-all border whitespace-nowrap ${
                  filter === s 
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-900/10' 
                    : 'bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800'
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
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            </div>
          ) : filteredBusinesses.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800">
              <Building2 className="mx-auto text-gray-200 dark:text-gray-800 mb-4" size={48} />
              <p className="text-gray-400 dark:text-gray-500 font-normal">No business applications found.</p>
            </div>
          ) : (
            filteredBusinesses.map((business) => (
              <div key={business.id} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-6 hover:shadow-xl hover:shadow-emerald-950/5 dark:hover:shadow-none transition-all group">
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Logo/Image Section */}
                  <div className="w-20 h-20 relative flex-shrink-0 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-50 dark:border-gray-700 overflow-hidden flex items-center justify-center">
                    {business.logo_url ? (
                      <Image src={business.logo_url} alt={business.name} fill className="object-cover" />
                    ) : (
                      <Building2 className="text-gray-300 dark:text-gray-600" size={32} />
                    )}
                  </div>

                  {/* Info Section */}
                  <div className="flex-grow">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-normal text-gray-900 dark:text-white">{business.name}</h3>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-normal ${
                            business.status === 'approved' ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400' :
                            business.status === 'rejected' ? 'bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-400' :
                            'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400'
                          }`}>
                            {business.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 dark:text-gray-500 font-normal mt-1 flex items-center gap-2">
                          <MapPin size={12} className="text-emerald-500" />
                          {business.address}
                        </p>
                      </div>
                      
                      <div className="text-right text-[11px] text-gray-400 dark:text-gray-500 font-normal">
                        Applied: {business.created_at ? new Date(business.created_at).toLocaleDateString() : 'N/A'}
                      </div>
                    </div>

                    <p className="text-sm text-gray-500 dark:text-gray-400 font-normal line-clamp-2 mb-4">
                      {business.description || 'No description provided.'}
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-gray-50 dark:border-gray-800 pt-4">
                      <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400 font-normal">
                        <UserIcon size={14} className="text-gray-300 dark:text-gray-600" />
                        {business.owner_name}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400 font-normal">
                        <Phone size={14} className="text-gray-300 dark:text-gray-600" />
                        {business.phone}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400 font-normal">
                        <Mail size={14} className="text-gray-300 dark:text-gray-600" />
                        {business.email}
                      </div>
                    </div>
                  </div>

                  {/* Actions Section */}
                  <div className="lg:w-48 flex lg:flex-col justify-center gap-2">
                    {business.status === 'pending' && (
                      <>
                        <button 
                          onClick={() => handleUpdateStatus(business.id, 'approved')}
                          className="flex-grow py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-normal hover:bg-emerald-700 flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-900/10"
                        >
                          <CheckCircle size={14} /> Approve
                        </button>
                        <button 
                          onClick={() => handleUpdateStatus(business.id, 'rejected')}
                          className="flex-grow py-2.5 bg-white dark:bg-gray-800 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 rounded-xl text-xs font-normal hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center gap-2 transition-all"
                        >
                          <XCircle size={14} /> Reject
                        </button>
                      </>
                    )}
                    <button 
                      onClick={() => setSelectedBusiness(business)}
                      className="flex-grow py-2.5 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-xl text-xs font-normal hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center gap-2 transition-all border border-gray-100 dark:border-gray-700"
                    >
                      <Eye size={14} /> View Details
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Business Details Modal */}
        <Dialog open={!!selectedBusiness} onOpenChange={() => setSelectedBusiness(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-950 border-gray-100 dark:border-gray-800 p-0 overflow-hidden">
            {selectedBusiness && (
              <>
                <div className="relative h-48 w-full bg-gray-100 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex items-center justify-center">
                  {selectedBusiness.image_url ? (
                    <Image src={selectedBusiness.image_url} alt="" fill className="object-cover opacity-60 grayscale-[0.5]" />
                  ) : (
                    <Building2 size={64} className="text-gray-300 dark:text-gray-700" strokeWidth={1} />
                  )}
                  <div className="absolute -bottom-10 left-8 h-20 w-20 bg-white dark:bg-gray-950 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xl p-3 flex items-center justify-center">
                    {selectedBusiness.logo_url ? (
                      <Image src={selectedBusiness.logo_url} alt="" width={64} height={64} className="object-contain" />
                    ) : (
                      <Building2 size={32} className="text-gray-300 dark:text-gray-800" />
                    )}
                  </div>
                </div>

                <div className="pt-14 px-8 pb-8">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-2xl font-normal text-gray-900 dark:text-white">{selectedBusiness.name}</h2>
                      <div className="flex items-center gap-4 mt-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-normal ${
                          selectedBusiness.status === 'approved' ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400' :
                          selectedBusiness.status === 'rejected' ? 'bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-400' :
                          'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400'
                        }`}>
                          {selectedBusiness.status}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
                          <MapPin size={12} className="text-emerald-500" /> {selectedBusiness.address}
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
                        <h4 className="text-[11px] uppercase tracking-widest text-gray-400 dark:text-gray-500 font-normal mb-3 flex items-center gap-2">
                          <FileText size={12} /> Description
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed font-normal">
                          {selectedBusiness.description || 'No description provided.'}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 gap-4 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
                            <Phone size={14} className="text-gray-400" />
                          </div>
                          <span className="text-sm text-gray-600 dark:text-gray-400">{selectedBusiness.phone}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
                            <Mail size={14} className="text-gray-400" />
                          </div>
                          <span className="text-sm text-gray-600 dark:text-gray-400">{selectedBusiness.email}</span>
                        </div>
                        {selectedBusiness.website && (
                          <div className="flex items-center gap-3">
                            <div className="p-1.5 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
                              <ExternalLink size={14} className="text-gray-400" />
                            </div>
                            <span className="text-sm text-emerald-600 dark:text-emerald-400 truncate">{selectedBusiness.website}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Column: Registration & Owner Info */}
                    <div className="space-y-6">
                      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
                         <div className="px-4 py-3 bg-gray-50/50 dark:bg-gray-800/30 border-b border-gray-50 dark:border-gray-800">
                           <h4 className="text-[11px] uppercase tracking-widest text-gray-500 dark:text-gray-400 font-normal">Owner Information</h4>
                         </div>
                         <div className="p-4 space-y-4">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-blue-50 dark:bg-blue-950 flex items-center justify-center">
                                <User size={14} className="text-blue-600 dark:text-blue-400" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs text-gray-400 font-normal">Full Name</p>
                                <p className="text-sm text-gray-900 dark:text-white truncate font-normal">{selectedBusiness.owner_name}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center">
                                <Briefcase size={14} className="text-emerald-600 dark:text-emerald-400" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs text-gray-400 font-normal">Owner NIC</p>
                                <p className="text-sm text-gray-900 dark:text-white font-mono font-normal tracking-wide">{selectedBusiness.nic_number || 'N/A'}</p>
                              </div>
                            </div>
                         </div>
                      </div>

                      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
                         <div className="px-4 py-3 bg-gray-50/50 dark:bg-gray-800/30 border-b border-gray-50 dark:border-gray-800">
                           <h4 className="text-[11px] uppercase tracking-widest text-gray-500 dark:text-gray-400 font-normal">Legal Details</h4>
                         </div>
                         <div className="p-4 space-y-4">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-purple-50 dark:bg-purple-950 flex items-center justify-center">
                                <FileText size={14} className="text-purple-600 dark:text-purple-400" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs text-gray-400 font-normal">Registration Number</p>
                                <p className="text-sm text-gray-900 dark:text-white font-mono font-normal tracking-wide">{selectedBusiness.registration_number || 'N/A'}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-amber-50 dark:bg-amber-950 flex items-center justify-center">
                                <Clock size={14} className="text-amber-600 dark:text-amber-400" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs text-gray-400 font-normal">Created At</p>
                                <p className="text-sm text-gray-900 dark:text-white font-normal">
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
                  <div className="sticky bottom-0 left-0 right-0 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-t border-gray-100 dark:border-gray-800 p-4 flex justify-end gap-3 px-8 z-10">
                    <button 
                      onClick={() => {
                        handleUpdateStatus(selectedBusiness.id, 'rejected');
                        setSelectedBusiness(null);
                      }}
                      className="px-6 py-2.5 bg-white dark:bg-gray-900 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 rounded-xl text-xs font-normal hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                    >
                      Reject Application
                    </button>
                    <button 
                      onClick={() => {
                        handleUpdateStatus(selectedBusiness.id, 'approved');
                        setSelectedBusiness(null);
                      }}
                      className="px-8 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-normal hover:bg-emerald-700 flex items-center gap-2 transition-all shadow-lg shadow-emerald-900/20"
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
