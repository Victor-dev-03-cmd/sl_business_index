'use client';
import {useEffect,useState} from 'react';
import type {LocalEmailCampaign} from '@/lib/marketing/email-hub-contract';
type Plan=NonNullable<LocalEmailCampaign['audiencePlan']>;
type Summary={subscribers:number;networkEnabled:boolean;networkReach:number|null};
export default function AudiencePlanPicker({businessId,plan,onChange}:{businessId:string;plan:Plan;onChange:(p:Plan)=>void}){
 const [summary,setSummary]=useState<Summary|null>(null);
 useEffect(()=>{const c=new AbortController();setSummary(null);void fetch('/api/marketing/email/audience?businessId='+encodeURIComponent(businessId)+'&language='+plan.language,{cache:'no-store',signal:c.signal}).then(async r=>{if(r.ok){const d=await r.json();if(!c.signal.aborted)setSummary(d.summary);}}).catch(()=>{});return()=>c.abort();},[businessId,plan.language]);
 return <div className="space-y-2 rounded-lg border border-[#E5E7EB] p-2.5 text-xs">
   <h3 className="font-semibold">Campaign audience plan</h3>
   <label className="block">Audience source<select aria-label="Campaign audience source" value={plan.source} onChange={e=>onChange({source:e.target.value as Plan['source'],language:'all'})} className="mt-1 min-h-8 w-full rounded-md border border-[#DDE1E6] px-2"><option value="business">Business email opt-ins</option><option value="network" disabled={!summary?.networkEnabled}>SLBI Audience Network</option></select></label>
   {plan.source==='network'&&<label className="block">Preferred language<select aria-label="Network audience language" value={plan.language} onChange={e=>onChange({...plan,language:e.target.value as Plan['language']})} className="mt-1 min-h-8 w-full rounded-md border border-[#DDE1E6] px-2"><option value="all">All languages</option><option value="en">English</option><option value="ta">Tamil</option><option value="si">Sinhala</option></select></label>}
   <p className="text-[#6B7280]">{plan.source==='business'?(summary?'Verified-account opt-ins: '+summary.subscribers:'Audience unavailable'):(summary?.networkEnabled&&summary.networkReach!==null?'Approximate eligible reach: '+summary.networkReach:'Network disabled or reach withheld for privacy.')}</p>
   <p className="text-[#6B7280]">Saved plan only. No addresses exposed, no delivery or scheduling.</p>
 </div>;
}
