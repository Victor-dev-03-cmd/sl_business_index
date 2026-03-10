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
  const [planLimits, setPlanLimits] = useState<any>(null);

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

      const planName = subscription?.plan_name || 'Basic';
      
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
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl text-gray-900">Dashboard Overview</h1>
          <p className="text-gray-500 mt-1">Welcome back! Here&apos;s what&apos;s happening with your businesses today.</p>
        </div>
        <Link 
          href="/vendor/marketing" 
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-dark text-white rounded text-sm transition-colors shadow-sm "
        >
          <Plus size={18} /> Create Promotion
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded border border-gray-300 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 rounded-lg text-blue-600">
              <Eye size={20} />
            </div>
            {planLimits?.advanced_analytics ? (
              <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full flex items-center gap-1">
                <TrendingUp size={12} /> +12%
              </span>
            ) : (
              <Link href="/vendor/billing" className="text-[10px] font-bold text-brand-gold bg-brand-sand/20 px-2 py-1 rounded flex items-center gap-1">
                <Lock size={10} /> Upgrade
              </Link>
            )}
          </div>
          <h3 className="text-2xl text-gray-900">{stats.views}</h3>
          <p className="text-sm text-gray-500">Total Profile Views</p>
        </div>

        <div className="bg-white p-6 rounded border border-gray-300 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-emerald-100 rounded-lg text-emerald-600">
              <Phone size={20} />
            </div>
            {planLimits?.advanced_analytics ? (
              <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full flex items-center gap-1">
                <TrendingUp size={12} /> +5%
              </span>
            ) : (
              <Link href="/vendor/billing" className="text-[10px] font-bold text-brand-gold bg-brand-sand/20 px-2 py-1 rounded flex items-center gap-1">
                <Lock size={10} /> Upgrade
              </Link>
            )}
          </div>
          <h3 className="text-2xl text-gray-900">{stats.calls}</h3>
          <p className="text-sm text-gray-500">Click to Calls</p>
        </div>

        <div className="bg-white p-6 rounded border border-gray-300 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-amber-100 rounded-lg text-amber-600">
              <Star size={20} />
            </div>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
              4.8 Avg
            </span>
          </div>
          <h3 className="text-2xl text-gray-900">{stats.reviews}</h3>
          <p className="text-sm text-gray-500">New Reviews</p>
        </div>

        <div className="bg-white p-6 rounded border border-gray-300 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-100 rounded-lg text-purple-600">
              <MessageSquare size={20} />
            </div>
            {planLimits?.advanced_analytics ? (
              <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full flex items-center gap-1">
                <TrendingUp size={12} /> +2
              </span>
            ) : (
              <Link href="/vendor/billing" className="text-[10px] font-bold text-brand-gold bg-brand-sand/20 px-2 py-1 rounded flex items-center gap-1">
                <Lock size={10} /> Upgrade
              </Link>
            )}
          </div>
          <h3 className="text-2xl text-gray-900">{stats.leads}</h3>
          <p className="text-sm text-gray-500">Active Leads</p>
        </div>
      </div>

      {/* My Businesses Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Business List */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-300 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-300 flex items-center justify-between">
            <h2 className="text-lg text-gray-900">My Businesses</h2>
            <Link href="/vendor/my-businesses" className="text-sm text-brand-dark ">
              View All
            </Link>
          </div>
          
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading businesses...</div>
          ) : businesses.length === 0 ? (
            <div className="p-12 text-center">
              <Store className="mx-auto h-12 w-12 text-gray-300 mb-3" />
              <h3 className="text-lg text-gray-900">No businesses yet</h3>
              <p className="text-gray-500 text-sm mt-1 mb-6">Start by registering your first business location.</p>
              <Link href="/register-business" className="px-4 py-2 bg-brand-dark text-white rounded text-sm ">
                Register Business
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {businesses.map((business) => (
                <div key={business.id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded bg-gray-300 overflow-hidden border border-gray-200">
                      {business.logo_url ? (
                        <img src={business.logo_url} alt={business.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-blue-500">
                          <Store size={20} />
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="text-gray-900">{business.name}</h3>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${business.status === 'approved' ? 'bg-green-500' : 'bg-amber-500'}`}></span>
                        {business.status === 'approved' ? 'Live' : 'Pending Review'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => toggleBusinessStatus(business.id, business.is_open)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all flex items-center gap-1.5 ${
                        business.is_open 
                          ? 'bg-green-50 text-blue-500 border-green-200 hover:bg-green-100' 
                          : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                      }`}
                    >
                      <Clock size={12} />
                      {business.is_open ? 'Open Now' : 'Closed'}
                    </button>
                    
                    <Link 
                      href={`/vendor/my-businesses/${business.id}`}
                      className="p-2 text-gray-400 hover:bg-emerald-50 rounded transition-colors"
                    >
                      <Edit size={16} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions & Tips */}
        <div className="space-y-6">
          <div className="bg-brand-dark rounded p-6 text-white shadow">
            <h3 className="text-lg mb-2">Boost Your Reach</h3>
            <p className="text-brand-sand text-sm mb-6">Create a new promotion banner to attract more customers this weekend.</p>
            <Link 
              href="/vendor/marketing"
              className="block w-full py-2.5 bg-white text-brand-dark text-center rounded text-sm  transition-colors"
            >
              Create Banner
            </Link>
          </div>

          <div className="bg-white rounded border border-gray-300 shadow-sm p-6">
            <h3 className="text-gray-900 mb-4">Recent Activity</h3>
            <div className="space-y-4">
              {activities.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No recent activity.</p>
              ) : (
                activities.map((activity) => (
                  <div key={activity.id} className="flex gap-3 items-start">
                    <div className="mt-1 p-1.5 bg-blue-50 text-blue-500 rounded-full shrink-0">
                      <MessageSquare size={12} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-800">{activity.message}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{activity.date}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <Link href="/vendor/reviews" className="block mt-4 text-center text-sm text-brand-dark ">
              View All Activity
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
