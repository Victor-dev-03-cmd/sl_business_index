'use client';
import {useEffect,useState} from 'react';
import type {LocalEmailCampaign} from '@/lib/marketing/email-hub-contract';
type Plan=NonNullable<LocalEmailCampaign['audiencePlan']>;
type Summary={subscribers:number;networkEnabled:boolean;networkReach:number|null};
type ImportedList={id:string;name:string;total:number;eligible:number};
export default function AudiencePlanPicker({businessId,plan,onChange}:{businessId:string;plan:Plan;onChange:(p:Plan)=>void}){
 const [summary,setSummary]=useState<Summary|null>(null);
 const [lists,setLists]=useState<ImportedList[]>([]);
 useEffect(()=>{const c=new AbortController();setSummary(null);void fetch('/api/marketing/email/audience?businessId='+encodeURIComponent(businessId)+'&language='+plan.language,{cache:'no-store',signal:c.signal}).then(async r=>{if(r.ok){const d=await r.json();if(!c.signal.aborted)setSummary(d.summary);}}).catch(()=>{});return()=>c.abort();},[businessId,plan.language]);
 useEffect(()=>{const c=new AbortController();setLists([]);void fetch('/api/marketing/email/imports?businessId='+encodeURIComponent(businessId),{cache:'no-store',signal:c.signal}).then(async r=>{if(r.ok){const d=await r.json();if(!c.signal.aborted)setLists(d.lists);}}).catch(()=>{});return()=>c.abort();},[businessId]);
 const selected=plan.source==='imported'?lists.find(l=>l.id===plan.listId):undefined;
 const selectSource=(source:string)=>{
   if(source==='imported'){if(lists[0])onChange({source:'imported',language:'all',listId:lists[0].id});}
   else if(source==='network'||source==='business')onChange({source,language:'all'});
 };
 return <div className="space-y-2 rounded-lg border border-[#E5E7EB] p-2.5 text-xs">
   <h3 className="font-semibold">Campaign audience plan</h3>
   <label className="block">Audience source<select aria-label="Campaign audience source" value={plan.source} onChange={e=>selectSource(e.target.value)} className="mt-1 min-h-8 w-full rounded-md border border-[#DDE1E6] px-2"><option value="business">My subscribers</option><option value="network" disabled={!summary?.networkEnabled}>SLBI Audience Network</option><option value="imported" disabled={!lists.length&&plan.source!=='imported'}>Imported contacts</option></select></label>
   {plan.source==='network'&&<label className="block">Preferred language<select aria-label="Network audience language" value={plan.language} onChange={e=>onChange({source:'network',language:e.target.value as Plan['language']})} className="mt-1 min-h-8 w-full rounded-md border border-[#DDE1E6] px-2"><option value="all">All languages</option><option value="en">English</option><option value="ta">Tamil</option><option value="si">Sinhala</option></select></label>}
   {plan.source==='imported'&&<label className="block">Contact list<select aria-label="Imported contact list" value={plan.listId} onChange={e=>onChange({source:'imported',language:'all',listId:e.target.value})} className="mt-1 min-h-8 w-full rounded-md border border-[#DDE1E6] px-2">{!selected&&<option value={plan.listId} disabled>List unavailable</option>}{lists.map(l=><option key={l.id} value={l.id}>{l.name} ({l.eligible})</option>)}</select></label>}
   <p className="text-[#6B7280]">{plan.source==='business'?(summary?'Verified-account opt-ins: '+summary.subscribers:'Audience unavailable'):plan.source==='imported'?(selected?selected.eligible+' eligible contacts · '+selected.total+' total':'Select an available list from Audience & Lists.'):(summary?.networkEnabled&&summary.networkReach!==null?'Approved network recipients: '+summary.networkReach:'Request additional audience access in Audience & Lists.')}</p>
   {!lists.length&&<p className="text-[#6B7280]">Upload your contact list in Audience & Lists.</p>}
   <p className="text-[#6B7280]">Saved audience plan only. No delivery or scheduling.</p>
 </div>;
}
