'use client'

import React, { useEffect, useState } from 'react'
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend,
  AreaChart,
  Area
} from 'recharts'
import { supabase } from '@/lib/supabaseClient'
import { Loader2 } from 'lucide-react'

interface AnalyticsData {
  date: string
  views: number
  calls: number
  leads: number
}

export default function VendorAnalytics({ businessIds }: { businessIds: string[] }) {
  const [mounted, setMounted] = useState(false)
  const [data, setData] = useState<AnalyticsData[]>([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'7d' | '30d'>('7d')

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (businessIds.length > 0) {
      fetchAnalytics()
    } else {
      setLoading(false)
    }
  }, [businessIds, timeRange])

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const days = timeRange === '7d' ? 7 : 30
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      const { data: logs, error } = await supabase
        .from('analytics_logs')
        .select('*')
        .in('business_id', businessIds)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true })

      if (error) throw error

      // Process logs into daily buckets
      const dailyBuckets: Record<string, AnalyticsData> = {}
      
      // Initialize buckets for all days in range
      for (let i = 0; i < days; i++) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        const dateStr = date.toISOString().split('T')[0]
        dailyBuckets[dateStr] = { date: dateStr, views: 0, calls: 0, leads: 0 }
      }

      logs.forEach(log => {
        const dateStr = log.created_at.split('T')[0]
        if (dailyBuckets[dateStr]) {
          if (log.event_type === 'view') dailyBuckets[dateStr].views++
          if (log.event_type === 'call_click') dailyBuckets[dateStr].calls++
          if (log.event_type === 'lead_form_submit') dailyBuckets[dateStr].leads++
        }
      })

      const chartData = Object.values(dailyBuckets).sort((a, b) => a.date.localeCompare(b.date))
      setData(chartData)
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="h-[400px] flex items-center justify-center bg-white rounded-xl border border-gray-300">
        <Loader2 className="animate-spin text-brand-dark" size={32} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg text-gray-900">Performance Trends</h3>
        <div className="flex bg-gray-100 p-1 rounded-lg">
          <button 
            onClick={() => setTimeRange('7d')}
            className={`px-3 py-1 text-xs rounded-md transition-all ${timeRange === '7d' ? 'bg-white shadow-sm text-brand-dark font-bold' : 'text-gray-500'}`}
          >
            7 Days
          </button>
          <button 
            onClick={() => setTimeRange('30d')}
            className={`px-3 py-1 text-xs rounded-md transition-all ${timeRange === '30d' ? 'bg-white shadow-sm text-brand-dark font-bold' : 'text-gray-500'}`}
          >
            30 Days
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded border border-gray-300 shadow-sm">
        <div className="h-[350px] w-full">
          {mounted ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis 
                  dataKey="date" 
                  tick={{fontSize: 10, fill: '#94a3b8'}}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(str) => {
                    const date = new Date(str);
                    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  }}
                />
                <YAxis 
                  tick={{fontSize: 10, fill: '#94a3b8'}}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  labelFormatter={(str) => new Date(str).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                />
                <Legend verticalAlign="top" height={36}/>
                <Area 
                  name="Views"
                  type="monotone" 
                  dataKey="views" 
                  stroke="#2563eb" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorViews)" 
                />
                <Area 
                  name="Calls"
                  type="monotone" 
                  dataKey="calls" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorCalls)" 
                />
                <Area 
                  name="Leads"
                  type="monotone" 
                  dataKey="leads" 
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorLeads)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400 text-sm">
              Preparing charts...
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
