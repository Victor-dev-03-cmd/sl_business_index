'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import IconsaxIcon from '@/app/vendor/components/IconsaxIcon';
export type BusinessAudienceState={following:boolean;news:boolean;push:boolean;email:boolean;followers?:number;approved?:boolean};
export default function BusinessAudienceControls({businessId,businessName,initial,onChanged}:{businessId:string;businessName:string;initial?:BusinessAudienceState;onChanged?:()=>void}){
 const [state,setState]=useState<BusinessAudienceState|null>(initial||null);
 const [signedIn,setSignedIn]=useState(Boolean(initial));
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [expanded,setExpanded]=useState(Boolean(initial));
 useEffect(()=>{
   if(initial)return;
   const ctrl=new AbortController();
   setState(null);setError('');
   void fetch('/api/audience?businessId='+encodeURIComponent(businessId),{signal:ctrl.signal,cache:'no-store'}).then(async res=>{
     const data=await res.json();if(!res.ok)throw Error(data.error||'Updates unavailable.');
     setState(data.state);setSignedIn(data.signedIn);
   }).catch(e=>{if(!ctrl.signal.aborted)setError(e.message||'Updates unavailable.');});
   return()=>ctrl.abort();
 },[businessId,initial]);
 const change=async(action:string)=>{
   if(busy)return;
   setBusy(true);setError('');
   try{
     const res=await fetch('/api/audience',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({businessId,action})});
     const data=await res.json();if(!res.ok)throw Error(data.error||'Could not save.');
     if(typeof data.state?.following==='boolean')setState(data.state);
     else if(initial)setState({...initial,following:false,news:false,push:false,email:false});
     onChanged?.();
   }catch(e){setError(e instanceof Error?e.message:'Could not save.');}finally{setBusy(false);}
 };
 const icon=(name:string)=><IconsaxIcon name={name} size={17} variant="bulk"/>;
 return <div data-testid="business-audience-controls" className="rounded-xl border border-neutral-200 bg-white p-3 text-neutral-900 sm:p-4">
   <div className="flex flex-wrap items-center justify-between gap-2">
     <div className="min-w-0"><p className="text-sm font-semibold">Stay connected</p><p className="text-xs text-neutral-500">{typeof state?.followers==='number'?state.followers+' followers':'Business updates'}</p></div>
     <div className="flex items-center gap-2">
       {!signedIn&&state?<Link href="/login" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[#EA580C] px-3 text-xs font-semibold text-white">{icon('people')} Follow</Link>:<button type="button" disabled={!state||busy||state.approved===false&&!state.following} aria-pressed={Boolean(state?.following)} onClick={()=>void change(state?.following?'unfollow':'follow')} className={'inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold disabled:opacity-40 '+(state?.following?'border-neutral-200 text-neutral-800':'border-[#EA580C] bg-[#EA580C] text-white')}>{icon(state?.following?'tick-circle':'people')}{state?.following?'Following · Unfollow':'Follow'}</button>}
       <button type="button" aria-expanded={expanded} aria-label="Update preferences" onClick={()=>setExpanded(x=>!x)} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-neutral-200 px-3 text-xs font-medium">{icon('setting-2')} Updates</button>
     </div>
   </div>
   {expanded&&state&&<div className="mt-3 space-y-2 border-t border-neutral-100 pt-3 text-xs">
     {!signedIn?<Link href="/login" className="font-semibold text-[#C2410C]">Sign in to manage subscriptions</Link>:<>
       <label className="flex items-center justify-between gap-3"><span>Business news in-app</span><input type="checkbox" checked={state.news} disabled={busy||!state.following||state.approved===false} onChange={e=>void change(e.target.checked?'news_on':'news_off')} className="accent-[#F97316]"/></label>
       <label className="flex items-center justify-between gap-3"><span>Device push for business news</span><input type="checkbox" checked={state.push} disabled={busy||!state.following||state.approved===false} onChange={e=>void change(e.target.checked?'push_on':'push_off')} className="accent-[#F97316]"/></label>
       <label className="flex items-start justify-between gap-3"><span>Receive promotional emails from {businessName} at my verified account email.<small className="mt-1 block text-neutral-500">Optional. Withdraw here at any time. Email delivery is not activated.</small></span><input type="checkbox" checked={state.email} disabled={busy||state.approved===false&&!state.email} onChange={e=>void change(e.target.checked?'subscribe':'unsubscribe')} className="mt-1 accent-[#F97316]"/></label>
       <Link href="/following" className="inline-flex font-semibold text-[#C2410C]">Manage all subscriptions</Link>
     </>}
   </div>}
   {error&&<p role="alert" className="mt-2 text-xs text-red-700">{error}</p>}
 </div>;
}
