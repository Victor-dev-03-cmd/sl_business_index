'use client';

import { useUser } from '@/lib/hooks/useUser';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Store, Plus, Edit, CheckCircle2, AlertCircle, Clock, Loader2 } from 'lucide-react';
import { Business } from '@/lib/types';

export default function MyBusinessesPage() {
  const router = useRouter();
  const { data: user, isLoading: userLoading } = useUser();

  const handleEditClick = (e: React.MouseEvent, businessId: string | number) => {
    e.stopPropagation();
    router.push(`/vendor/my-businesses/${businessId}/edit`);
  };

  const { data: businesses, isLoading: businessesLoading, error: businessesError } = useQuery({
    queryKey: ['my-businesses', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Business[];
    },
    enabled: !!user?.id,
  });

  const { data: subscription } = useQuery({
    queryKey: ['my-subscription', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('subscriptions')
        .select('plan_name')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  const planName = subscription?.plan_name || 'Basic';

  const { data: planDetails } = useQuery({
    queryKey: ['plan-details', planName],
    queryFn: async () => {
      const { data } = await supabase
        .from('subscription_plans')
        .select('max_listings')
        .eq('name', planName)
        .maybeSingle();
      return data;
    },
    enabled: !!planName,
  });

  const maxListings = planDetails?.max_listings || 1;
  const currentCount = businesses?.length || 0;
  const isLimitReached = currentCount >= maxListings;

  if (userLoading || (user && businessesLoading)) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100dvh-160px)]">
        <Loader2 className="h-8 w-8 animate-spin text-brand-dark" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100dvh-160px)]">
        <p className="text-gray-500">Please log in to manage your businesses.</p>
      </div>
    );
  }

  if (businessesError) {
    console.error('Error fetching businesses:', businessesError);
    return (
      <div className="flex items-center justify-center min-h-[calc(100dvh-160px)]">
        <p className="text-red-500">Error loading your businesses. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl text-gray-900 font-bold tracking-tight">My Businesses</h1>
          <p className="text-sm text-gray-500 mt-1 uppercase tracking-widest text-[10px] md:text-xs font-bold">
            Listing limit: <span className="text-brand-dark">{currentCount}/{maxListings}</span>
          </p>
        </div>
        {isLimitReached ? (
          <Link 
            href="/vendor/billing" 
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-gold text-white rounded-[6px] text-xs font-bold transition-all shadow-lg shadow-brand-gold/20 animate-pulse uppercase tracking-widest"
          >
            Upgrade Plan to Add More
          </Link>
        ) : (
          <Link 
            href="/register-business" 
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-dark text-white rounded-[6px] text-xs font-bold transition-all shadow-lg shadow-brand-dark/20 hover:scale-[1.02] active:scale-[0.98] uppercase tracking-widest"
          >
            <Plus size={18} /> Register Business
          </Link>
        )}
      </div>

      {businesses && businesses.length === 0 ? (
        <div className="bg-white rounded-[6px] border border-gray-300 shadow-sm p-12 text-center">
          <Store className="mx-auto h-20 w-20 text-gray-100 mb-6" strokeWidth={1} />
          <h3 className="text-lg font-bold text-gray-900 tracking-tight uppercase text-xs sm:text-sm">No Businesses Registered Yet</h3>
          <p className="text-gray-400 text-xs sm:text-sm mt-2 mb-8 max-w-sm mx-auto font-medium leading-relaxed">It looks like you haven't registered any businesses. Start by creating your first listing to reach more customers.</p>
          <Link href="/register-business" className="inline-flex items-center px-8 py-3 bg-brand-dark text-white rounded-[6px] text-xs sm:text-sm font-bold shadow-xl shadow-brand-dark/10 transition-transform hover:scale-105 uppercase tracking-widest">
            <Plus size={18} className="mr-2" /> Register Your First Business
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded border border-gray-300 shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-100">
            {businesses?.map((business: Business) => (
              <div 
                key={business.id} 
                onClick={(e) => handleEditClick(e, business.id)}
                className="p-5 md:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 hover:bg-gray-50/50 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-5 flex-grow min-w-0 w-full">
                  <div className="h-16 w-16 md:h-20 md:w-20 rounded-xl bg-gray-50 overflow-hidden border border-gray-200 group-hover:border-brand-dark/20 transition-colors shrink-0">
                    {business.logo_url ? (
                      <img src={business.logo_url} alt={business.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <Store size={28} strokeWidth={1.5} />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base md:text-lg font-bold text-gray-900 truncate tracking-tight group-hover:text-brand-dark transition-colors">{business.name}</h3>
                    <p className="text-xs md:text-sm text-gray-400 mt-1 truncate font-medium">{business.address}</p>
                    <div className="flex items-center gap-2 mt-3">
                      {business.status === 'approved' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-50 text-green-700 border border-green-100/50">
                          <CheckCircle2 size={10} /> Live
                        </span>
                      ) : business.status === 'pending' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-100/50">
                          <Clock size={10} /> Pending
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-50 text-red-700 border border-red-100/50">
                          <AlertCircle size={10} /> Rejected
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="shrink-0 w-full sm:w-auto">
                  <button 
                    onClick={(e) => handleEditClick(e, business.id)}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-white border border-gray-300 rounded-[6px] text-xs font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm group-hover:border-gray-400 uppercase tracking-widest"
                  >
                    <Edit size={16} /> Edit Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
