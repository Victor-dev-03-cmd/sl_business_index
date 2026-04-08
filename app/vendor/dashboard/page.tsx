'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  Eye, 
  Phone, 
  MessageSquare, 
  TrendingUp, 
  Store, 
  Clock, 
  Plus, 
  Edit, 
  Star,
  Lock
} from 'lucide-react';
import Link from 'next/link';
import VendorAnalytics from './VendorAnalytics';

interface Business {
  id: string;
  name: string;
  logo_url?: string;
  status: string;
  is_open: boolean;
  views: number;
  calls: number;
}

interface Activity {
  id: string;
  type: string;
  message: string;
  date: string;
}

interface PlanLimits {
  advanced_analytics?: boolean;
  featured_listing?: boolean;
  business_limit?: number;
}

export default function VendorDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    views: 0,
    calls: 0,
    reviews: 0,
    leads: 0
  });
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [planLimits, setPlanLimits] = useState<PlanLimits | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'performance'>('overview');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch active subscription and plan limits
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('plan_name')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      const planName = subscription.plan_name || 'Basic';
      
      const { data: planDetails } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('name', planName)
        .maybeSingle();

      setPlanLimits(planDetails);

      // Fetch businesses owned by the vendor
      const { data: businessData } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', user.id);

      if (businessData && businessData.length > 0) {
        setBusinesses(businessData);
        
        const businessIds = businessData.map(b => b.id);
        
        // Fetch reviews count for these businesses
        const { count: reviewsCount } = await supabase
          .from('reviews')
          .select('*', { count: 'exact', head: true })
          .in('business_id', businessIds);

        // Fetch leads count for these businesses
        const { count: leadsCount } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .in('business_id', businessIds);
        
        // Fetch recent activities (reviews)
        const { data: recentReviews } = await supabase
          .from('reviews')
          .select('*, businesses(name)')
          .in('business_id', businessIds)
          .order('created_at', { ascending: false })
          .limit(3);

        if (recentReviews) {
          setActivities(recentReviews.map((r) => ({
            id: r.id,
            type: 'review',
            message: `New review from ${r.user_name} on ${r.businesses.name}`,
            date: new Date(r.created_at).toLocaleDateString()
          })));
        }
        
        // Calculate stats
        const totalViews = businessData.reduce((acc, curr) => acc + (curr.views || 0), 0);
        const totalCalls = businessData.reduce((acc, curr) => acc + (curr.calls || 0), 0);
        
        setStats({
          views: totalViews,
          calls: totalCalls,
          reviews: reviewsCount || 0,
          leads: leadsCount || 0
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleBusinessStatus = async (businessId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('businesses')
        .update({ is_open: !currentStatus })
        .eq('id', businessId);

      if (error) throw error;

      setBusinesses((prev: Business[]) => prev.map(b => 
        b.id === businessId ? { ...b, is_open: !currentStatus } : b
      ));
    } catch (error) {
      console.error('Error toggling business status:', error);
    }
  };

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Welcome Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl text-gray-900 font-bold tracking-tight">Dashboard Overview</h1>
          <p className="text-sm text-gray-500 mt-1">Welcome back! Here&apos;s what&apos;s happening with your businesses today.</p>
        </div>
        <Link 
          href="/vendor/marketing" 
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-dark text-white rounded-[6px] text-sm transition-all hover:bg-brand-dark/90 shadow-sm font-bold"
        >
          <Plus size={18} /> Create Promotion
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-300 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 md:px-6 py-3 text-xs md:text-sm font-bold tracking-tight transition-all relative whitespace-nowrap ${
            activeTab === 'overview' ? 'text-brand-dark' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          Overview
          {activeTab === 'overview' && (
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-brand-dark" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('performance')}
          className={`px-4 md:px-6 py-3 text-xs md:text-sm font-bold tracking-tight transition-all relative whitespace-nowrap ${
            activeTab === 'performance' ? 'text-brand-dark' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          Business Performance
          {activeTab === 'performance' && (
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-brand-dark" />
          )}
        </button>
      </div>

      {activeTab === 'overview' ? (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 md:p-6 rounded-[6px] border border-gray-300 shadow-sm transition-all hover:shadow-md">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600 border border-blue-100/50">
                  <Eye size={20} strokeWidth={1.5} />
                </div>
                {planLimits.advanced_analytics ? (
                  <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full flex items-center gap-1 border border-green-100/50">
                    <TrendingUp size={12} /> +12%
                  </span>
                ) : (
                  <Link href="/vendor/billing" className="text-[10px] font-bold text-brand-gold bg-brand-gold/10 px-2 py-1 rounded flex items-center gap-1 border border-brand-gold/20">
                    <Lock size={10} /> Upgrade
                  </Link>
                )}
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">{stats.views}</h3>
              <p className="text-[11px] md:text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Profile Views</p>
            </div>

            <div className="bg-white p-5 md:p-6 rounded-[6px] border border-gray-300 shadow-sm transition-all hover:shadow-md">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600 border border-emerald-100/50">
                  <Phone size={20} strokeWidth={1.5} />
                </div>
                {planLimits.advanced_analytics ? (
                  <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full flex items-center gap-1 border border-green-100/50">
                    <TrendingUp size={12} /> +5%
                  </span>
                ) : (
                  <Link href="/vendor/billing" className="text-[10px] font-bold text-brand-gold bg-brand-gold/10 px-2 py-1 rounded flex items-center gap-1 border border-brand-gold/20">
                    <Lock size={10} /> Upgrade
                  </Link>
                )}
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">{stats.calls}</h3>
              <p className="text-[11px] md:text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Click to Calls</p>
            </div>

            <div className="bg-white p-5 md:p-6 rounded-[6px] border border-gray-300 shadow-sm transition-all hover:shadow-md">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2.5 bg-amber-50 rounded-xl text-amber-600 border border-amber-100/50">
                  <Star size={20} strokeWidth={1.5} />
                </div>
                <span className="text-[10px] font-bold text-gray-500 bg-gray-50 px-2 py-1 rounded-full border border-gray-200/50">
                  4.8 AVG
                </span>
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">{stats.reviews}</h3>
              <p className="text-[11px] md:text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Total Reviews</p>
            </div>

            <div className="bg-white p-5 md:p-6 rounded-[6px] border border-gray-300 shadow-sm transition-all hover:shadow-md">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2.5 bg-purple-50 rounded-xl text-purple-600 border border-purple-100/50">
                  <MessageSquare size={20} strokeWidth={1.5} />
                </div>
                {planLimits.advanced_analytics ? (
                  <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full flex items-center gap-1 border border-green-100/50">
                    <TrendingUp size={12} /> +2
                  </span>
                ) : (
                  <Link href="/vendor/billing" className="text-[10px] font-bold text-brand-gold bg-brand-gold/10 px-2 py-1 rounded flex items-center gap-1 border border-brand-gold/20">
                    <Lock size={10} /> Upgrade
                  </Link>
                )}
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">{stats.leads}</h3>
              <p className="text-[11px] md:text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Active Leads</p>
            </div>
          </div>

          {/* My Businesses Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
            {/* Business List */}
            <div className="lg:col-span-2 bg-white rounded-[6px] border border-gray-300 shadow-sm overflow-hidden flex flex-col">
              <div className="p-5 md:p-6 border-b border-gray-300 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900 tracking-tight uppercase text-xs sm:text-sm">My Businesses</h2>
                <Link href="/vendor/my-businesses" className="text-[11px] font-bold text-brand-dark uppercase tracking-wider hover:underline">
                  View All
                </Link>
              </div>
              
              {loading ? (
                <div className="p-12 text-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-dark border-t-transparent mx-auto" />
                  <p className="text-gray-400 text-sm mt-4 font-medium tracking-tight">Loading businesses...</p>
                </div>
              ) : businesses.length === 0 ? (
                <div className="p-12 text-center">
                  <Store className="mx-auto h-16 w-16 text-gray-200 mb-4" strokeWidth={1} />
                  <h3 className="text-lg font-bold text-gray-900 tracking-tight uppercase text-xs sm:text-sm">No businesses yet</h3>
                  <p className="text-gray-400 text-xs sm:text-sm mt-1 mb-8 max-w-xs mx-auto font-medium">Start by registering your first business location to reach more customers.</p>
                  <Link href="/register-business" className="inline-flex items-center px-6 py-3 bg-brand-dark text-white rounded-[6px] text-xs sm:text-sm font-bold shadow-lg shadow-brand-dark/10 transition-transform hover:scale-105">
                    Register Business
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 flex-1 overflow-y-auto max-h-[400px]">
                  {businesses.map((business) => (
                    <div key={business.id} className="p-5 md:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-gray-50/50 transition-colors group">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 md:h-14 md:w-14 rounded-xl bg-gray-50 overflow-hidden border border-gray-200 group-hover:border-brand-dark/20 transition-colors shrink-0">
                          {business.logo_url ? (
                            <img src={business.logo_url} alt={business.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                              <Store size={24} strokeWidth={1.5} />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm md:text-base font-bold text-gray-900 truncate tracking-tight">{business.name}</h3>
                          <p className="text-[10px] md:text-xs font-bold text-gray-400 flex items-center gap-1.5 mt-1 uppercase tracking-widest">
                            <span className={`w-1.5 h-1.5 rounded-full ${business.status === 'approved' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]'}`}></span>
                            {business.status === 'approved' ? 'Live' : 'Under Review'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        <button 
                          onClick={() => toggleBusinessStatus(business.id, business.is_open)}
                          className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-[11px] font-bold border transition-all flex items-center justify-center gap-2 tracking-tight ${
                            business.is_open 
                              ? 'bg-green-50 text-green-600 border-green-200/50 hover:bg-green-100' 
                              : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          <Clock size={12} strokeWidth={2} />
                          {business.is_open ? 'Open' : 'Closed'}
                        </button>
                        
                        <Link 
                          href={`/vendor/my-businesses/${business.id}/edit`}
                          className="p-2.5 text-gray-400 hover:text-brand-dark hover:bg-brand-blue/5 rounded-xl transition-all border border-transparent hover:border-brand-blue/10"
                        >
                          <Edit size={16} strokeWidth={2} />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions & Tips */}
            <div className="space-y-6">
              <div className="bg-brand-dark rounded-[6px] p-6 text-white shadow-xl shadow-brand-dark/10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                  <TrendingUp size={80} />
                </div>
                <h3 className="text-lg font-bold tracking-tight mb-2 relative z-10">Boost Your Reach</h3>
                <p className="text-brand-gold text-[13px] font-medium mb-6 leading-relaxed relative z-10">Create a new promotion banner to attract more customers this weekend and increase visibility.</p>
                <Link 
                  href="/vendor/marketing"
                  className="block w-full py-3 bg-white text-brand-dark text-center rounded-[6px] text-xs font-bold uppercase tracking-widest transition-transform hover:scale-[1.02] active:scale-[0.98] relative z-10 shadow-lg"
                >
                  Create Banner
                </Link>
              </div>

              <div className="bg-white rounded-[6px] border border-gray-300 shadow-sm p-6">
                <h3 className="text-gray-900 font-bold tracking-tight uppercase text-xs sm:text-sm mb-6">Recent Activity</h3>
                <div className="space-y-5">
                  {activities.length === 0 ? (
                    <div className="py-8 text-center">
                      <Clock className="mx-auto h-10 w-10 text-gray-100 mb-3" />
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No recent activity</p>
                    </div>
                  ) : (
                    activities.map((activity) => (
                      <div key={activity.id} className="flex gap-4 items-start group">
                        <div className="mt-0.5 p-2 bg-blue-50 text-blue-500 rounded-xl border border-blue-100/50 group-hover:scale-110 transition-transform shrink-0">
                          <MessageSquare size={14} strokeWidth={2} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs md:text-sm font-medium text-gray-800 leading-relaxed">{activity.message}</p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1.5">{activity.date}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <Link href="/vendor/reviews" className="block mt-8 text-center text-[11px] font-bold text-brand-dark uppercase tracking-wider hover:underline border-t border-gray-100 pt-5">
                  View All Activity
                </Link>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-6 md:space-y-8">
          <VendorAnalytics businessIds={businesses.map(b => b.id)} />
        </div>
      )}
    </div>
  );
}
