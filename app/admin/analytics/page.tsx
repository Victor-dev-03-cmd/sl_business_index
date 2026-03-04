'use client';

import { supabase } from '@/lib/supabaseClient';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  TrendingUp, 
  Users, 
  Building2, 
  Eye, 
  ArrowUpRight, 
  ArrowDownRight,
  Calendar,
  Filter
} from 'lucide-react';

export default function AdminAnalyticsPage() {
  const { data: stats = { totalUsers: 0, totalBusinesses: 0, pendingRequests: 0, totalViews: 12450 }, isLoading: loading } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: async () => {
      const [usersRes, businessesRes, pendingRes] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('businesses').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
        supabase.from('businesses').select('*', { count: 'exact', head: true }).eq('status', 'pending')
      ]);

      return {
        totalUsers: usersRes.count || 0,
        totalBusinesses: businessesRes.count || 0,
        pendingRequests: pendingRes.count || 0,
        totalViews: 12450
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  const statCards = [
    { name: 'Total Users', value: stats.totalUsers, change: '+12%', trending: 'up', icon: Users, color: 'blue' },
    { name: 'Active Businesses', value: stats.totalBusinesses, change: '+5%', trending: 'up', icon: Building2, color: 'emerald' },
    { name: 'Pending Requests', value: stats.pendingRequests, change: '-2%', trending: 'down', icon: TrendingUp, color: 'amber' },
    { name: 'Platform Views', value: stats.totalViews.toLocaleString(), change: '+24%', trending: 'up', icon: Eye, color: 'purple' },
  ];

  return (
    <div className="min-h-full bg-gray-50/50  transition-colors">
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-normal text-gray-900 ">Platform Analytics</h1>
            <p className="text-sm text-gray-500  mt-1">Track key performance indicators and growth metrics.</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-white  border border-gray-300  rounded-[6px] text-sm font-normal text-gray-600  shadow-sm hover:bg-gray-50  transition-all">
              <Calendar size={14} /> Last 30 Days
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-white  border border-gray-300  rounded-[6px] text-sm font-normal text-gray-600  shadow-sm hover:bg-gray-50  transition-all">
              <Filter size={14} /> Filters
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat) => (
            <div key={stat.name} className="bg-white  p-6 rounded-[6px] border border-gray-300  shadow-sm hover:shadow-md transition-shadow group">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-2.5 rounded-[6px] bg-${stat.color}-50  text-${stat.color}-600  group-hover:scale-110 transition-transform`}>
                  <stat.icon size={20} />
                </div>
                <div className={`flex items-center gap-1 text-[11px] font-normal ${stat.trending === 'up' ? 'text-emerald-600' : 'text-red-600'}`}>
                  {stat.trending === 'up' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  {stat.change}
                </div>
              </div>
              <div>
                <p className="text-sm font-normal text-gray-500 ">{stat.name}</p>
                <div className="text-2xl font-normal text-gray-900  mt-1">
                  {loading ? <Skeleton className="h-8 w-20" /> : stat.value}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Charts Placeholder */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white  rounded-[6px] border border-gray-300  p-8 min-h-[400px] flex flex-col justify-center items-center">
            <TrendingUp size={48} className="text-gray-100  mb-4" strokeWidth={1} />
            <p className="text-gray-400  font-normal">Growth charts and detailed analytics visualization will be displayed here.</p>
          </div>
          <div className="bg-white  rounded-[6px] border border-gray-300  p-8 min-h-[400px] flex flex-col justify-center items-center text-center">
             <Users size={48} className="text-gray-100  mb-4" strokeWidth={1} />
             <p className="text-gray-400  font-normal">User demographic and activity breakdown stats.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
