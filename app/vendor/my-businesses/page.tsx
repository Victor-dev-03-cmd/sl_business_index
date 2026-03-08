import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Store, Plus, Edit, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { Business } from '@/lib/types';

export default async function MyBusinessesPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-160px)]">
        <p className="text-gray-500">Please log in to manage your businesses.</p>
      </div>
    );
  }

  const { data: businesses, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching businesses:', error);
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-160px)]">
        <p className="text-red-500">Error loading your businesses. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl text-gray-900">My Businesses</h1>
          <p className="text-gray-500 mt-1">Manage your business listings and locations.</p>
        </div>
        <Link 
          href="/register-business" 
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-dark text-white rounded text-sm  transition-colors shadow-sm"
        >
          <Plus size={18} /> Register New Business
        </Link>
      </div>

      {businesses && businesses.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
          <Store className="mx-auto h-16 w-16 text-gray-300 mb-4" />
          <h3 className="text-xl font-bold text-gray-900">No Businesses Registered Yet</h3>
          <p className="text-gray-500 mt-2 mb-6">It looks like you haven't registered any businesses. Get started now!</p>
          <Link href="/register-business" className="px-6 py-3 bg-emerald-600 text-white rounded-lg text-base font-medium hover:bg-emerald-700 transition-colors">
            <Plus size={18} className="inline-block mr-2" /> Register Your First Business
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded border border-gray-300 shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-100">
            {businesses?.map((business: Business) => (
              <div key={business.id} className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-4 flex-grow">
                  <div className="h-16 w-16 rounded bg-gray-100 overflow-hidden border border-gray-300 flex-shrink-0">
                    {business.logo_url ? (
                      <img src={business.logo_url} alt={business.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <Store size={24} />
                      </div>
                    )}
                  </div>
                  <div className="flex-grow">
                    <h3 className=" text-lg text-brand-blue">{business.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">{business.address}</p>
                    <div className="flex items-center gap-2 mt-2">
                      {business.status === 'approved' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-100">
                          <CheckCircle2 size={10} /> Approved
                        </span>
                      ) : business.status === 'pending' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100">
                          <Clock size={10} /> Pending
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-100">
                          <AlertCircle size={10} /> Rejected
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex-shrink-0">
                  <Link 
                    href={`/vendor/my-businesses/${business.id}/edit`}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                  >
                    <Edit size={16} /> Edit Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
