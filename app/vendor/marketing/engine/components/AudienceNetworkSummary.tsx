'use client';
import {useEffect,useState} from 'react';
import IconsaxIcon from '@/app/vendor/components/IconsaxIcon';
type Summary={followers:number;subscribers:number;pushPreferences:number;networkEnabled:boolean;networkReach:number|null};
export default function AudienceNetworkSummary({businessId}:{businessId:string}){
 const [summary,setSummary]=useState<Summary|null>(null);
 const [error,setError]=useState('');
 useEffect(()=>{
   const c=new AbortController();setSummary(null);setError('');
   if(!businessId)return;
   void fetch('/api/marketing/email/audience?businessId='+encodeURIComponent(businessId),{cache:'no-store',signal:c.signal}).then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error||'Audience unavailable.');setSummary(d.summary);}).catch(e=>{if(!c.signal.aborted)setError(e.message);});
   return()=>c.abort();
 },[businessId]);
 return <section data-testid="audience-network-summary" className="space-y-3 rounded-xl border border-[#E5E7EB] p-4">
   <div className="flex items-center gap-2"><IconsaxIcon name="people" size={20} variant="bulk"/><h3 className="text-sm font-semibold">Business audience</h3></div>
   <div className="grid grid-cols-3 gap-2">{[{name:'Followers',value:summary?.followers},{name:'Email opt-ins',value:summary?.subscribers},{name:'Push preferences',value:summary?.pushPreferences}].map(s=><div key={s.name} className="rounded-md bg-[#F9FAFB] p-2"><p className="text-xl font-semibold">{s.value??'—'}</p><p className="text-[11px] text-[#6B7280]">{s.name}</p></div>)}</div>
   <div className="border-t border-[#E5E7EB] pt-3"><p className="text-sm font-semibold">SLBI Audience Network</p><p className="mt-1 text-xs text-[#6B7280]">{summary?.networkEnabled?(summary.networkReach===null?'Reach withheld for privacy.':'Approximate opted-in reach: '+summary.networkReach):'Network activation pending.'} Pre-suppression estimates only. Recipient identities remain private. Email delivery is not enabled.</p></div>
   {error&&<p role="status" className="text-xs text-[#92400E]">{error}</p>}
 </section>;
}
