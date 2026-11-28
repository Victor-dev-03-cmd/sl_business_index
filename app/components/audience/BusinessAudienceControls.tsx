'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {Bell,BellRing,Check,Plus,Mail} from 'lucide-react';
import {useSession} from '@/app/components/SessionContext';
import {enablePush,devicePushReady} from '@/lib/push/client';
import {toast} from 'sonner';

export type BusinessAudienceState={following:boolean;news:boolean;push:boolean;email:boolean;emailEligible?:boolean;followers?:number;approved?:boolean};
export default function BusinessAudienceControls({businessId,businessName,initial,onChanged}:{businessId:string;businessName:string;initial?:BusinessAudienceState;onChanged?:()=>void}){
 const {user}=useSession();
 const [state,setState]=useState<BusinessAudienceState|null>(initial||null);
 const [signedIn,setSignedIn]=useState(Boolean(initial));
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [ring,setRing]=useState(false);
 useEffect(()=>{
   if(initial){setState(initial);setSignedIn(true);return;}
   const ctrl=new AbortController();
   setState(null);setError('');
   void fetch('/api/audience?businessId='+encodeURIComponent(businessId),{signal:ctrl.signal,cache:'no-store'}).then(async res=>{
     const data=await res.json();if(!res.ok)throw Error(data.error||'Updates unavailable.');
     if(!ctrl.signal.aborted){setState(data.state);setSignedIn(data.signedIn);}
   }).catch(e=>{if(!ctrl.signal.aborted)setError(e.message||'Updates unavailable.');});
   return()=>ctrl.abort();
 },[businessId,initial,user?.id]);
 const change=async(action:string)=>{
   if(busy)return;
   setBusy(true);setError('');
   try{
     const res=await fetch('/api/audience',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({businessId,action,consentVersion:'slbi-audience-sharing-v2'})});
     const data=await res.json();if(!res.ok)throw Error(data.error||'Could not save.');
     if(typeof data.state?.following==='boolean')setState(data.state);
     else if(initial)setState({...initial,following:false,news:false,push:false,email:false});
     onChanged?.();
   }catch(e){setError(e instanceof Error?e.message:'Could not save.');}finally{setBusy(false);}
 };
 const toggleBell=async()=>{
   if(!state?.following||busy||!user)return;
   if(state.push){await change('push_off');return;}
   // Start browser permission directly in the click handler, before any network await.
   // In-app preference is independent; if native delivery is unavailable, do not claim it works.
   const device=devicePushReady(user.id)?Promise.resolve():enablePush(user.id);
   setRing(true);
   void device.catch(e=>toast.error(e instanceof Error?e.message:'Device alerts unavailable. In-app updates still work.'));
   await change('push_on');
 };
 const button='inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors disabled:opacity-40 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[#EA580C]';
 return <div data-testid="business-audience-controls" className="inline-flex min-w-0 flex-col items-start gap-1 text-neutral-900">
   <div className="flex flex-wrap items-center gap-1.5">
     {!signedIn&&state?<Link href={'/login?next='+encodeURIComponent('/business/'+businessId)} className={button+' border-[#EA580C] bg-[#EA580C] text-white'}><Plus size={15}/>Follow</Link>:<button type="button" disabled={!state||busy||state.approved===false&&!state.following} aria-pressed={Boolean(state?.following)} aria-label={state?.following?'Unfollow '+businessName:'Follow '+businessName} onClick={()=>void change(state?.following?'unfollow':'follow')} className={button+(state?.following?' border-neutral-200 bg-neutral-50 text-neutral-800':' border-[#EA580C] bg-[#EA580C] text-white')}>{state?.following?<Check size={15}/>:<Plus size={15}/>} {state?.following?'Following':'Follow'}</button>}
     {state?.following&&<button type="button" disabled={busy||state.approved===false} aria-pressed={state.push} aria-label={state.push?'Turn off business push notifications':'Turn on all business notifications'} title={state.push?'All notifications on':'Enable all notifications'} onClick={()=>void toggleBell()} className={'grid h-9 w-9 shrink-0 place-items-center rounded-full border transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#EA580C] '+(state.push?'border-orange-200 bg-orange-50 text-[#EA580C]':'border-neutral-200 bg-white text-neutral-600')}><span onAnimationEnd={()=>setRing(false)} className={ring?'motion-safe:animate-[slbi-bell-ring_.4s_ease-in-out_2]':''}>{state.push?<BellRing size={18}/>:<Bell size={18}/>}</span></button>}
     {initial&&state&&signedIn&&<button type="button" disabled={busy||state.approved===false&&!state.email} onClick={()=>void change(state.email&&state.emailEligible!==false?'unsubscribe':'subscribe')} className={button+' border-neutral-200 bg-white text-neutral-700'}><Mail size={15}/>{state.email&&state.emailEligible!==false?'Unsubscribe email':state.email?'Confirm email':'Subscribe email'}</button>}
   </div>
   {initial&&state&&<p className="max-w-sm text-[11px] text-neutral-500">{state.email?'Email subscription is optional. Withdrawal stops future access; copies cannot be recalled.':'Subscribe email shares your verified email with '+businessName+' for its marketing. You can unsubscribe anytime.'}</p>}
   {error&&<span role="alert" className="text-[11px] text-red-700">{error}</span>}
   <style jsx>{`@keyframes slbi-bell-ring {0%,100%{transform:rotate(0)}25%{transform:rotate(15deg)}75%{transform:rotate(-15deg)}}`}</style>
 </div>;
}
