'use client';
import {useEffect,useState} from 'react';
import IconsaxIcon from '@/app/vendor/components/IconsaxIcon';
type Summary={followers:number;subscribers:number;pushPreferences:number;networkEnabled:boolean;networkReach:number|null};
type RequestItem={id:string;status:string;requested_count:number;purpose:string;expires_at:string|null};
type Lists={direct:string[];network:string[];requests:RequestItem[]};
export default function AudienceNetworkSummary({businessId}:{businessId:string}){
 const [summary,setSummary]=useState<Summary|null>(null);
 const [lists,setLists]=useState<Lists|null>(null);
 const [error,setError]=useState('');
 const [offset,setOffset]=useState(0);
 const [revision,setRevision]=useState(0);
 const [busy,setBusy]=useState(false);
 const [count,setCount]=useState('50');
 const [purpose,setPurpose]=useState('');
 const [language,setLanguage]=useState('all');
 useEffect(()=>{
   const c=new AbortController();setSummary(null);setLists(null);setError('');
   if(!businessId)return;
   const url='/api/marketing/email/audience?businessId='+encodeURIComponent(businessId);
   void Promise.all([fetch(url,{cache:'no-store',signal:c.signal}),fetch(url+'&view=lists&offset='+offset,{cache:'no-store',signal:c.signal})]).then(async ([a,b])=>{
     const [s,l]=await Promise.all([a.json(),b.json()]);
     if(!a.ok||!b.ok)throw Error(s.error||l.error||'Audience unavailable.');
     if(!c.signal.aborted){setSummary(s.summary);setLists(l.lists);}
   }).catch(e=>{if(!c.signal.aborted)setError(e.message);});
   return()=>c.abort();
 },[businessId,offset,revision]);
 const submit=async()=>{
   if(busy)return;
   setBusy(true);setError('');
   try{
     const res=await fetch('/api/marketing/email/audience',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({businessId,count:Number(count),language,purpose})});
     const d=await res.json();if(!res.ok)throw Error(d.error||'Request failed.');
     setPurpose('');setRevision(x=>x+1);
   }catch(e){setError(e instanceof Error?e.message:'Request failed.');}finally{setBusy(false);}
 };
 const active=lists?.requests.some(q=>q.status==='pending'||q.status==='approved'&&q.expires_at&&new Date(q.expires_at).getTime()>Date.now());
 const input='min-h-8 w-full rounded-md border border-[#DDE1E6] bg-white px-2 py-1 text-xs';
 const emailList=(items:string[])=>items.length?<div className="max-h-44 overflow-auto divide-y divide-[#E5E7EB] rounded-md border border-[#E5E7EB]">{items.map(email=><p key={email} className="break-all px-2 py-1.5 text-xs">{email}</p>)}</div>:<p className="text-xs text-[#6B7280]">No eligible emails available.</p>;
 return <section data-testid="audience-network-summary" className="space-y-3 rounded-xl border border-[#E5E7EB] p-4">
   <div className="flex items-center justify-between gap-2"><h3 className="flex items-center gap-2 text-sm font-semibold"><IconsaxIcon name="people" size={20} variant="bulk"/>My subscribers</h3><button type="button" onClick={()=>setRevision(x=>x+1)} aria-label="Refresh subscribers" className="rounded-md border px-2 py-1 text-xs">Refresh</button></div>
   <div className="grid grid-cols-3 gap-2">{[{name:'Followers',value:summary?.followers},{name:'Email opt-ins',value:summary?.subscribers},{name:'Push preferences',value:summary?.pushPreferences}].map(s=><div key={s.name} className="rounded-md bg-[#F9FAFB] p-2"><p className="text-xl font-semibold">{s.value??'—'}</p><p className="text-[11px] text-[#6B7280]">{s.name}</p></div>)}</div>
   <p className="text-xs text-[#6B7280]">Direct subscribers who agreed to share their email appear automatically. Use only for this business, honor withdrawals and never redistribute.</p>
   {lists&&<>{emailList(lists.direct)}<div className="flex justify-between text-xs"><button disabled={offset===0} onClick={()=>setOffset(x=>Math.max(0,x-100))} className="rounded-md border px-2 py-1 disabled:opacity-40">Previous</button><button disabled={lists.direct.length<100||offset>=10000} onClick={()=>setOffset(x=>x+100)} className="rounded-md border px-2 py-1 disabled:opacity-40">Next</button></div></>}
   <div className="space-y-2 border-t border-[#E5E7EB] pt-3"><h3 className="text-sm font-semibold">SLBI Audience Network</h3><p className="text-xs text-[#6B7280]">Request additional consenting recipients. Admin approval is required only here.</p>
   {lists?.requests.map(q=><div key={q.id} className="flex items-center justify-between gap-2 rounded-md bg-[#F9FAFB] p-2 text-xs"><span>{q.requested_count} requested · {q.purpose}</span><span className="capitalize">{q.status==='approved'&&q.expires_at&&new Date(q.expires_at).getTime()<=Date.now()?'Expired':q.status}</span></div>)}
   {lists&&emailList(lists.network)}
   {lists&&!active&&<form onSubmit={e=>{e.preventDefault();void submit();}} className="space-y-2"><div className="grid grid-cols-2 gap-2"><label className="text-xs">Recipient count<input className={input} type="number" min={1} max={100} value={count} onChange={e=>setCount(e.target.value)} required/></label><label className="text-xs">Language<select className={input} value={language} onChange={e=>setLanguage(e.target.value)}><option value="all">All</option><option value="en">English</option><option value="ta">Tamil</option><option value="si">Sinhala</option></select></label></div><label className="block text-xs">Campaign purpose<input className={input} value={purpose} minLength={5} maxLength={300} onChange={e=>setPurpose(e.target.value)} required/></label><button type="submit" disabled={busy||purpose.trim().length<5} className="rounded-md bg-[#EA580C] px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">Request audience</button></form>}
   <p className="text-xs text-[#6B7280]">Approved access lasts seven days. Sending providers are not connected.</p></div>
   {error&&<p role="status" className="text-xs text-[#92400E]">{error}</p>}
 </section>;
}
