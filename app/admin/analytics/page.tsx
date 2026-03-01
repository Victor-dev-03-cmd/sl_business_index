'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
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
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalBusinesses: 0,
    pendingRequests: 0,
    totalViews: 12450 // Placeholder for now
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    
    const [usersRes, businessesRes, pendingRes] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('businesses').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
      supabase.from('businesses').select('*', { count: 'exact', head: true }).eq('status', 'pending')
    ]);

    setStats({
      totalUsers: usersRes.count || 0,
      totalBusinesses: businessesRes.count || 0,
      pendingRequests: pendingRes.count || 0,
      totalViews: 12450
    });
    setLoading(false);
  };

  const statCards = [
    { name: 'Total Users', value: stats.totalUsers, change: '+12%', trending: 'up', icon: Users, color: 'blue' },
    { name: 'Active Businesses', value: stats.totalBusinesses, change: '+5%', trending: 'up', icon: Building2, color: 'emerald' },
    { name: 'Pending Requests', value: stats.pendingRequests, change: '-2%', trending: 'down', icon: TrendingUp, color: 'amber' },
    { name: 'Platform Views', value: stats.totalViews.toLocaleString(), change: '+24%', trending: 'up', icon: Eye, color: 'purple' },
  ];

  return (
    <div className="min-h-full bg-gray-50/50 dark:bg-gray-950 transition-colors">
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-normal text-gray-900 dark:text-white">Platform Analytics</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Track key performance indicators and growth metrics.</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl text-sm font-normal text-gray-600 dark:text-gray-400 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">
              <Calendar size={14} /> Last 30 Days
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl text-sm font-normal text-gray-600 dark:text-gray-400 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">
              <Filter size={14} /> Filters
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat) => (
            <div key={stat.name} className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow group">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-2.5 rounded-xl bg-${stat.color}-50 dark:bg-${stat.color}-950/30 text-${stat.color}-600 dark:text-${stat.color}-400 group-hover:scale-110 transition-transform`}>
                  <stat.icon size={20} />
                </div>
                <div className={`flex items-center gap-1 text-[11px] font-normal ${stat.trending === 'up' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  {stat.trending === 'up' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  {stat.change}
                </div>
              </div>
              <div>
                <p className="text-sm font-normal text-gray-500 dark:text-gray-400">{stat.name}</p>
                <p className="text-2xl font-normal text-gray-900 dark:text-white mt-1">
                  {loading ? <span className="inline-block w-12 h-6 bg-gray-100 dark:bg-gray-800 animate-pulse rounded" /> : stat.value}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Charts Placeholder */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-8 min-h-[400px] flex flex-col justify-center items-center">
            <TrendingUp size={48} className="text-gray-100 dark:text-gray-800 mb-4" strokeWidth={1} />
            <p className="text-gray-400 dark:text-gray-500 font-normal">Growth charts and detailed analytics visualization will be displayed here.</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-8 min-h-[400px] flex flex-col justify-center items-center text-center">
             <Users size={48} className="text-gray-100 dark:text-gray-800 mb-4" strokeWidth={1} />
             <p className="text-gray-400 dark:text-gray-500 font-normal">User demographic and activity breakdown stats.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
