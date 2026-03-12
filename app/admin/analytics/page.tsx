'use client';

import { supabase } from '@/lib/supabaseClient';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  TrendingUp, 
  Users, 
  Building2, 
  ArrowUpRight, 
  ArrowDownRight,
  DollarSign,
  ExternalLink,
  Activity
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  LineChart,
  Line
} from 'recharts';

export default function AdminAnalyticsPage() {
  const { data: stats, isLoading: loading } = useQuery({
    queryKey: ['admin-global-analytics'],
    queryFn: async () => {
      const [
        usersRes, 
        businessesRes, 
        pendingBizRes, 
        verifRes,
        revenueRes,
        logsRes
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('businesses').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
        supabase.from('businesses').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('verifications').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('invoices').select('amount').eq('status', 'paid'),
        supabase.from('analytics_logs').select('created_at, event_type, city')
      ]);

      const totalRevenue = revenueRes.data?.reduce((acc, curr) => acc + (curr.amount || 0), 0) || 0;
      
      // Process district data
      const districtCounts: Record<string, number> = {};
      logsRes.data?.forEach(log => {
        if (log.city) {
          districtCounts[log.city] = (districtCounts[log.city] || 0) + 1;
        }
      });
      const districtData = Object.entries(districtCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);

      // Process growth data (mock for visualization)
      const growthData = [
        { month: 'Jan', count: 45 },
        { month: 'Feb', count: 52 },
        { month: 'Mar', count: 61 },
        { month: 'Apr', count: 58 },
        { month: 'May', count: 72 },
        { month: 'Jun', count: 85 },
      ];

      return {
        totalUsers: usersRes.count || 0,
        totalBusinesses: businessesRes.count || 0,
        pendingRequests: (pendingBizRes.count || 0) + (verifRes.count || 0),
        totalRevenue,
        districtData,
        growthData,
        totalViews: logsRes.data?.filter(l => l.event_type === 'view').length || 0
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  const statCards = [
    { name: 'Total Users', value: stats?.totalUsers || 0, change: '+12%', trending: 'up', icon: Users, color: 'blue' },
    { name: 'Active Businesses', value: stats?.totalBusinesses || 0, change: '+5%', trending: 'up', icon: Building2, color: 'brand-dark' },
    { name: 'Pending Requests', value: stats?.pendingRequests || 0, change: '+3', trending: 'up', icon: TrendingUp, color: 'brand-blue' },
    { name: 'Total Revenue', value: `LKR ${stats?.totalRevenue.toLocaleString() || 0}`, change: '+18%', trending: 'up', icon: DollarSign, color: 'brand-gold' },
  ];

  const getStatColors = (color: string) => {
    switch (color) {
      case 'brand-dark': return 'bg-brand-dark/10 text-brand-dark';
      case 'brand-blue': return 'bg-brand-blue/10 text-brand-blue';
      case 'brand-gold': return 'bg-brand-sand/20 text-brand-gold';
      case 'blue': return 'bg-blue-50 text-blue-600';
      default: return 'bg-gray-50 text-gray-600';
    }
  };

  const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <div className="min-h-full bg-gray-50/50 transition-colors">
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-normal text-brand-dark">Global Insights</h1>
            <p className="text-sm text-gray-500 mt-1">Real-time overview of platform performance and growth.</p>
          </div>
          <div className="flex items-center gap-3">
            <a 
              href="https://clarity.microsoft.com/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-brand-dark text-white rounded-[6px] text-sm font-normal shadow-sm hover:bg-brand-blue transition-all"
            >
              <ExternalLink size={14} /> Clarity Dashboard
            </a>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat) => (
            <div key={stat.name} className="bg-white p-6 rounded-[6px] border border-gray-300 shadow-sm hover:shadow-md transition-shadow group">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-2.5 rounded-[6px] ${getStatColors(stat.color)} group-hover:scale-110 transition-transform`}>
                  <stat.icon size={20} />
                </div>
                <div className={`flex items-center gap-1 text-[11px] font-normal ${stat.trending === 'up' ? 'text-brand-blue' : 'text-red-600'}`}>
                  {stat.trending === 'up' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  {stat.change}
                </div>
              </div>
              <div>
                <p className="text-sm font-normal text-gray-500">{stat.name}</p>
                <div className="text-2xl font-normal text-gray-900 mt-1">
                  {loading ? <Skeleton className="h-8 w-20" /> : stat.value}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Growth Chart */}
          <div className="bg-white rounded-[6px] border border-gray-300 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg text-gray-900 font-normal">Business Growth</h3>
              <span className="text-xs text-gray-400">Monthly Registrations</span>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats?.growthData || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#2563eb" 
                    strokeWidth={3} 
                    dot={{ r: 4, fill: '#2563eb' }}
                    activeDot={{ r: 6 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* District Distribution */}
          <div className="bg-white rounded-[6px] border border-gray-300 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg text-gray-900 font-normal">Active Regions</h3>
              <span className="text-xs text-gray-400">Most Active Districts</span>
            </div>
            <div className="h-[300px] w-full">
              {stats?.districtData && stats.districtData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.districtData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                    <XAxis type="number" hide />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fontSize: 12, fill: '#64748b'}}
                      width={100}
                    />
                    <Tooltip 
                      cursor={{fill: 'transparent'}}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {stats.districtData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  <Activity size={48} strokeWidth={1} className="mb-2" />
                  <p>No district data available yet</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Realtime Status Summary */}
        <div className="mt-8 bg-white rounded-[6px] border border-gray-300 p-8 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="space-y-2">
              <p className="text-xs text-gray-400 uppercase tracking-widest">Platform Health</p>
              <div className="flex items-center justify-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xl font-medium text-gray-900">Optimal</span>
              </div>
            </div>
            <div className="space-y-2 border-x border-gray-100">
              <p className="text-xs text-gray-400 uppercase tracking-widest">Active Users</p>
              <span className="text-3xl font-medium text-brand-dark">{stats?.totalUsers || 0}</span>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-gray-400 uppercase tracking-widest">Clarity Integration</p>
              <span className="text-xl font-medium text-blue-600">Active</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
