'use client';

import Link from 'next/link';
import {ArrowUpRight,Compass,MessageCircle,PhoneCall,ShieldCheck,Star,TrendingUp} from 'lucide-react';
import {buildG3PortfolioActions,type G3MetricSnapshot} from '@/lib/growth/g3/portfolio-actions';

const icons={
  register:Compass,'review-listings':ShieldCheck,contact:PhoneCall,
  respond:MessageCircle,reputation:Star,campaign:TrendingUp,insights:TrendingUp,
} as const;

/** Owner-portfolio recorded counters only; separate from selected business GrowthScore.
 * No extra API request, inferred sales, cross-tenant data or paid tool action.
 */
export default function G3PortfolioActions({
  snapshot,loading,error,
}:{snapshot:G3MetricSnapshot;loading:boolean;error:boolean}){
  const actions=loading||error?[]:buildG3PortfolioActions(snapshot);
  return <section aria-label="Portfolio next best actions"
    data-g3-portfolio-actions="true"
    className="vendor-mobile-safe min-w-0 rounded-xl border border-[#E9E4E0] bg-white p-3 sm:p-4">
    <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
      <div className="min-w-0">
        <h3 className="text-[14px] font-extrabold text-[#262428]">Next best actions</h3>
        <p className="mt-1 text-[12px] leading-5 text-[#79716C]">
          Recorded portfolio signals, not verified sales or unique visitors
        </p>
      </div>
      <span className="vendor-status-badge rounded-md bg-[#FFF1E5] px-2 py-1 text-[11px] font-semibold text-[#AD5A13]">
        Portfolio
      </span>
    </div>
    {loading?<div className="mt-3 h-24 animate-pulse rounded-lg bg-[#F6F2ED]" role="status" aria-label="Loading portfolio actions"/>:
      error?<p role="alert" className="mt-3 text-[12px] leading-5 text-[#8C522B]">
        Recorded activity is unavailable; refresh your overview.
      </p>:<div className="mt-3 space-y-2">
      {actions.map((action,index)=>{
        const Icon=icons[action.id];
        return <Link key={action.id} href={action.href}
          className="flex min-h-14 min-w-0 items-center gap-3 rounded-lg border border-[#F1EAE5] bg-[#FFFCF9] px-3 py-2.5 transition hover:border-[#F6C18F] hover:bg-[#FFF5EC] focus-visible:outline-2 focus-visible:outline-[#F47A1B]">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#FFF0E4] text-[#D46B19]">
            <Icon size={17} aria-hidden="true"/>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[12px] font-bold leading-5 text-[#2C2928]">
              {index+1}. {action.title}
            </span>
            <span className="mt-0.5 block text-[11px] leading-4 text-[#77706B]">{action.description}</span>
          </span>
          <ArrowUpRight size={16} className="shrink-0 text-[#BB6226]" aria-hidden="true"/>
        </Link>;
      })}
    </div>}
  </section>;
}
