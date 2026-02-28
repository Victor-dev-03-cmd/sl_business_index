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
  MoreVertical
} from 'lucide-react';
import Image from 'next/image';

type Business = {
  id: string;
  name: string;
  description: string;
  logo_url: string;
  email: string;
  owner_name: string;
  phone: string;
  category: string;
  status: 'pending' | 'approved' | 'rejected';
  address: string;
  created_at: string;
};

export default function AdminDashboard() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState({ pending: 0, total: 0 });
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

    if (profile?.role !== 'admin' && profile?.role !== 'ceo') {
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

  const handleUpdateStatus = async (id: string, status: 'approved' | 'rejected') => {
    const { error } = await supabase
      .from('businesses')
      .update({ status })
      .eq('id', id);

    if (!error) {
      setBusinesses(businesses.map(b => b.id === id ? { ...b, status } : b));
      // Update role of owner to vendor if approved
      if (status === 'approved') {
        const business = businesses.find(b => b.id === id);
        if (business) {
          // This would ideally be done via a Postgres trigger or Edge Function 
          // but for now we trust the admin UI
        }
      }
    }
  };

  const filteredBusinesses = businesses.filter(b => 
    b.name.toLowerCase().includes(search.toLowerCase()) || 
    b.owner_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Admin Header */}
      <div className="bg-white border-b border-gray-100 px-8 py-6 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-[8px] flex items-center justify-center text-emerald-700">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h1 className="text-xl font-normal text-gray-900 tracking-tight">Admin Control Center</h1>
              <p className="text-xs text-gray-400 font-normal uppercase tracking-widest mt-0.5">SL Business Index Management</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 bg-emerald-50 rounded-[6px] border border-emerald-100">
              <span className="text-xs font-normal text-emerald-700">
                <span className="font-semibold">{stats.pending}</span> Pending Approvals
              </span>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-8 py-8">
        {/* Controls Bar */}
        <div className="flex flex-col lg:flex-row gap-4 mb-8">
          <div className="relative flex-grow group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Search by business or owner name..." 
              className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-100 rounded-[6px] focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all font-normal text-sm shadow-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            {(['pending', 'approved', 'rejected', 'all'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-5 py-3.5 rounded-[6px] text-sm font-normal capitalize transition-all border ${
                  filter === s 
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-900/10' 
                    : 'bg-white text-gray-500 border-gray-100 hover:bg-gray-50'
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
            <div className="text-center py-20 bg-white rounded-[6px] border border-gray-100">
              <Building2 className="mx-auto text-gray-200 mb-4" size={48} />
              <p className="text-gray-400 font-normal">No business applications found for this filter.</p>
            </div>
          ) : (
            filteredBusinesses.map((business) => (
              <div key={business.id} className="bg-white border border-gray-100 rounded-[6px] p-6 hover:shadow-xl hover:shadow-emerald-950/5 transition-all group">
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Logo/Image Section */}
                  <div className="w-24 h-24 relative flex-shrink-0 bg-gray-50 rounded-[6px] border border-gray-50 overflow-hidden flex items-center justify-center">
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
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-normal ${
                            business.status === 'approved' ? 'bg-emerald-50 text-emerald-700' :
                            business.status === 'rejected' ? 'bg-red-50 text-red-700' :
                            'bg-amber-50 text-amber-700'
                          }`}>
                            {business.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 font-normal uppercase tracking-widest mt-1 flex items-center gap-2">
                          <MapPin size={12} className="text-emerald-500" />
                          {business.address}
                        </p>
                      </div>
                      
                      <div className="text-right text-[11px] text-gray-400 font-normal">
                        Applied on: {new Date(business.created_at).toLocaleDateString()}
                      </div>
                    </div>

                    <p className="text-sm text-gray-500 font-normal line-clamp-2 mb-4">
                      {business.description || 'No description provided.'}
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-gray-50 pt-4">
                      <div className="flex items-center gap-3 text-sm text-gray-600 font-normal">
                        <UserIcon size={14} className="text-gray-300" />
                        {business.owner_name}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-600 font-normal">
                        <Phone size={14} className="text-gray-300" />
                        {business.phone}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-600 font-normal">
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
                          onClick={() => handleUpdateStatus(business.id, 'approved')}
                          className="flex-grow py-2.5 bg-emerald-600 text-white rounded-[6px] text-xs font-normal hover:bg-emerald-700 flex items-center justify-center gap-2 transition-all"
                        >
                          <CheckCircle size={14} /> Approve
                        </button>
                        <button 
                          onClick={() => handleUpdateStatus(business.id, 'rejected')}
                          className="flex-grow py-2.5 bg-white border border-red-100 text-red-600 rounded-[6px] text-xs font-normal hover:bg-red-50 flex items-center justify-center gap-2 transition-all"
                        >
                          <XCircle size={14} /> Reject
                        </button>
                      </>
                    )}
                    <button className="flex-grow py-2.5 bg-gray-50 text-gray-500 rounded-[6px] text-xs font-normal hover:bg-gray-100 flex items-center justify-center gap-2 transition-all border border-gray-100">
                      View Details <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
