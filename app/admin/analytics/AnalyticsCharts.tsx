'use client';

import React, { useEffect, useState } from 'react';
import { 
  BarChart as RechartsBarChart, 
  Bar as RechartsBar, 
  XAxis as RechartsXAxis, 
  YAxis as RechartsYAxis, 
  CartesianGrid as RechartsCartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer as RechartsResponsiveContainer, 
  Cell as RechartsCell,
  LineChart as RechartsLineChart,
  Line as RechartsLine
} from 'recharts';

interface DistrictData {
  name: string;
  value: number;
}

interface GrowthData {
  month: string;
  count: number;
}

interface AnalyticsChartsProps {
  growthData: GrowthData[];
  districtData: DistrictData[];
}

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function AnalyticsCharts({ growthData, districtData }: AnalyticsChartsProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="h-[300px] bg-gray-50 animate-pulse rounded-[6px]" />
        <div className="h-[300px] bg-gray-50 animate-pulse rounded-[6px]" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Growth Chart */}
      <div className="bg-white rounded-[6px] border border-gray-300 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg text-gray-900 font-normal">Business Growth</h3>
          <span className="text-xs text-gray-400">Monthly Registrations</span>
        </div>
        <div className="h-[300px] w-full">
          <RechartsResponsiveContainer width="100%" height="100%">
            <RechartsLineChart data={growthData}>
              <RechartsCartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <RechartsXAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
              <RechartsYAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
              <RechartsTooltip 
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
              />
              <RechartsLine 
                type="monotone" 
                dataKey="count" 
                stroke="#2563eb" 
                strokeWidth={3} 
                dot={{ r: 4, fill: '#2563eb' }}
                activeDot={{ r: 6 }} 
              />
            </RechartsLineChart>
          </RechartsResponsiveContainer>
        </div>
      </div>

      {/* District Distribution */}
      <div className="bg-white rounded-[6px] border border-gray-300 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg text-gray-900 font-normal">Active Regions</h3>
          <span className="text-xs text-gray-400">Most Active Districts</span>
        </div>
        <div className="h-[300px] w-full">
          {districtData && districtData.length > 0 ? (
            <RechartsResponsiveContainer width="100%" height="100%">
              <RechartsBarChart data={districtData} layout="vertical">
                <RechartsCartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                <RechartsXAxis type="number" hide />
                <RechartsYAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fontSize: 12, fill: '#64748b'}}
                  width={100}
                />
                <RechartsTooltip 
                  cursor={{fill: 'transparent'}}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                />
                <RechartsBar dataKey="value" radius={[0, 4, 4, 0]}>
                  {districtData.map((entry, index) => (
                    <RechartsCell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </RechartsBar>
              </RechartsBarChart>
            </RechartsResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <p>No district data available yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
