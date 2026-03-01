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
  AlertCircle
} from 'lucide-react';
import Image from 'next/image';
import { Business } from '@/lib/types';

export default function BusinessRequestsPage() {
  const [requests, setRequests] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
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
    // 1. Update business status
    const { error: businessError } = await supabase
      .from('businesses')
      .update({ status })
      .eq('id', id);

    if (businessError) {
      console.error('Error updating business status:', businessError);
      alert('Failed to update business status');
      return;
    }

    // 2. If approved, update user role to 'vendor'
    if (status === 'approved' && owner_id) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ role: 'vendor' })
        .eq('id', owner_id);
      
      if (profileError) {
        console.error('Error updating user role:', profileError);
        // We still continue since the business was approved
      }
    }

    // Refresh the list
    setRequests(requests.filter(r => r.id !== id));
    alert(`Business application ${status} successfully!`);
  };

  const filteredRequests = requests.filter(r => 
    r.name.toLowerCase().includes(search.toLowerCase()) || 
    (r.owner_name?.toLowerCase() || '').includes(search.toLowerCase()) ||
    (r.registration_number?.toLowerCase() || '').includes(search.toLowerCase())
  );

  return (
    <div className="min-h-full bg-gray-50/50 dark:bg-gray-950 transition-colors">
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-normal text-gray-900 dark:text-white">Business Registration Requests</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Review and manage pending business applications.</p>
        </div>

        {/* Search Bar */}
        <div className="mb-8 max-w-xl">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors h-4 w-4" />
            <input 
              type="text" 
              placeholder="Search by business, owner, or BR number..." 
              className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all font-normal text-sm shadow-sm dark:text-gray-200"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Requests Table */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-24">
              <ClipboardList className="mx-auto text-gray-200 dark:text-gray-800 mb-4 h-12 w-12" strokeWidth={1} />
              <p className="text-gray-400 dark:text-gray-500 font-normal">No pending registration requests found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-50 dark:border-gray-800/50 bg-gray-50/50 dark:bg-gray-800/20">
                    <th className="px-6 py-4 text-[11px] font-normal text-gray-400 dark:text-gray-500 uppercase tracking-widest">Business</th>
                    <th className="px-6 py-4 text-[11px] font-normal text-gray-400 dark:text-gray-500 uppercase tracking-widest">Category</th>
                    <th className="px-6 py-4 text-[11px] font-normal text-gray-400 dark:text-gray-500 uppercase tracking-widest">Owner / Contact</th>
                    <th className="px-6 py-4 text-[11px] font-normal text-gray-400 dark:text-gray-500 uppercase tracking-widest">Legal ID</th>
                    <th className="px-6 py-4 text-[11px] font-normal text-gray-400 dark:text-gray-500 uppercase tracking-widest">Date</th>
                    <th className="px-6 py-4 text-[11px] font-normal text-gray-400 dark:text-gray-500 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                  {filteredRequests.map((business) => (
                    <tr key={business.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 relative rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 overflow-hidden flex-shrink-0 flex items-center justify-center">
                            {business.logo_url ? (
                              <Image src={business.logo_url} alt="" fill className="object-cover" />
                            ) : (
                              <Building2 className="h-5 w-5 text-gray-300 dark:text-gray-600" strokeWidth={1.5} />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-normal text-gray-900 dark:text-white truncate">{business.name}</p>
                            <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">{business.address}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-normal text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-1 rounded-md">
                          {business.category}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-normal text-gray-700 dark:text-gray-300">
                          {business.owner_name}
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[11px] text-gray-400 dark:text-gray-500 flex items-center gap-1">
                              <Phone size={10} /> {business.phone}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-[11px] text-gray-400 dark:text-gray-500 mb-1">
                            {business.is_registered ? 'BR' : 'NIC'}
                          </span>
                          <span className="text-sm font-normal text-gray-700 dark:text-gray-200">
                            {business.registration_number || 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-[11px] text-gray-500 dark:text-gray-400">
                          {business.created_at ? new Date(business.created_at).toLocaleDateString() : 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleUpdateStatus(business.id, business.owner_id as string, 'approved')}
                            className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg transition-colors"
                            title="Approve"
                          >
                            <CheckCircle size={18} strokeWidth={1.5} />
                          </button>
                          <button 
                            onClick={() => handleUpdateStatus(business.id, business.owner_id as string, 'rejected')}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors"
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
      </main>
    </div>
  );
}

// Support icons
function ClipboardList(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M9 12h6" />
      <path d="M9 16h6" />
      <path d="M9 8h6" />
    </svg>
  );
}
