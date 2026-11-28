'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {Bell,BellRing,Check,Plus} from 'lucide-react';
import {useSession} from '@/app/components/SessionContext';
import {enablePush,devicePushReady} from '@/lib/push/client';
import {toast} from 'sonner';

export type BusinessAudienceState={following:boolean;news:boolean;push:boolean;email:boolean;emailEligible?:boolean;followers?:number;approved?:boolean};
export default function BusinessAudienceControls({businessId,businessName,initial,onChanged,presentation='desktop'}:{businessId:string;businessName:string;initial?:BusinessAudienceState;onChanged?:()=>void;presentation?:'desktop'|'mobile'}){
 const {user}=useSession();
 const mobile=presentation==='mobile';
 const termsId='follow-terms-'+businessId+'-'+presentation;
 const [active,setActive]=useState(false);
 useEffect(()=>{const mq=window.matchMedia('(max-width: 639px)');const sync=()=>setActive(mq.matches===mobile);sync();mq.addEventListener('change',sync);return()=>mq.removeEventListener('change',sync);},[mobile]);
 const [state,setState]=useState<BusinessAudienceState|null>(initial||null);
 const [signedIn,setSignedIn]=useState(Boolean(initial));
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [ring,setRing]=useState(false);
 useEffect(()=>{
   if(!active)return;
   if(initial){setState(initial);setSignedIn(true);return;}
   const ctrl=new AbortController();
   setState(null);setError('');
   void fetch('/api/audience?businessId='+encodeURIComponent(businessId),{signal:ctrl.signal,cache:'no-store'}).then(async res=>{
     const data=await res.json();if(!res.ok)throw Error(data.error||'Updates unavailable.');
     if(!ctrl.signal.aborted){setState(data.state);setSignedIn(data.signedIn);}
   }).catch(e=>{if(!ctrl.signal.aborted)setError(e.message||'Updates unavailable.');});
   return()=>ctrl.abort();
 },[businessId,initial,user?.id,active]);
 const change=async(action:string)=>{
   if(busy)return;
   setBusy(true);setError('');
   try{
     const res=await fetch('/api/audience',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({businessId,action,consentVersion:'slbi-follow-email-v3'})});
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
   setBusy(true);setRing(true);
   try{if(!devicePushReady(user.id))await enablePush(user.id);await change('push_on');}
   catch(e){toast.error(e instanceof Error?e.message:'Device alerts unavailable. In-app updates still work.');}
   finally{setBusy(false);}
 };
 if(!active)return null;
 const button=(mobile?'w-full min-h-10 text-sm ':'min-h-9 text-xs ')+'inline-flex shrink-0 items-center justify-center gap-1 rounded-full border px-3 sm:gap-1.5 font-semibold transition-colors disabled:opacity-40 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[#EA580C]';
 return <div data-testid="business-audience-controls" className={mobile?"rounded-xl border border-orange-200 bg-white p-3 text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900":"hidden min-w-0 flex-col items-start gap-1 text-neutral-900 sm:inline-flex"}>
   <div data-slbi-profile-follow-row className={mobile?"grid grid-cols-2 items-start gap-3":"flex flex-wrap items-center gap-1.5"}>
     {!signedIn&&state?<Link href={'/login?next='+encodeURIComponent('/business/'+businessId)} aria-describedby={termsId} className={button+(mobile?' justify-self-stretch':'')+' border-[#EA580C] bg-[#EA580C] text-white'}><Plus size={15} className="max-sm:h-3 max-sm:w-3"/>Follow</Link>:<button type="button" disabled={!state||busy||state.approved===false&&!state.following} aria-pressed={Boolean(state?.following)} aria-describedby={state&&!state.following?termsId:undefined} aria-label={state?.following?'Unfollow '+businessName:'Follow '+businessName} onClick={()=>void change(state?.following?'unfollow':'follow')} className={button+(state?.following?' border-neutral-200 bg-neutral-50 text-neutral-800':' border-[#EA580C] bg-[#EA580C] text-white')}>{state?.following?<Check size={15} className="max-sm:h-3 max-sm:w-3"/>:<Plus size={15} className="max-sm:h-3 max-sm:w-3"/>} {state?.following?'Following':'Follow'}</button>}
     {(mobile||state?.following)&&<button type="button" disabled={busy||!state?.following||state?.approved===false} aria-pressed={Boolean(state?.push)} aria-label={state?.push?'Turn off business push notifications':'Turn on all business notifications'} title={!state?.following?'Follow this business first':state.push?'All notifications on':'Enable all notifications'} onClick={()=>void toggleBell()} className={(mobile?'flex min-h-10 w-full items-center justify-center gap-2 border-l border-neutral-200 pl-2 text-xs font-semibold disabled:opacity-60 ':'grid h-9 w-9 shrink-0 place-items-center rounded-full border ')+' transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#EA580C] '+(state?.push?'border-orange-200 bg-orange-50 text-[#EA580C]':'border-neutral-200 bg-white text-neutral-600')}><span onAnimationEnd={()=>setRing(false)} className={ring?'motion-safe:animate-[slbi-bell-ring_.4s_ease-in-out_2]':''}>{state?.push?<BellRing size={18} className="max-sm:h-4 max-sm:w-4"/>:<Bell size={18} className="max-sm:h-4 max-sm:w-4"/>}</span>{mobile&&<span>{!state?.following?'Follow to enable':state.push?'Updates on':'Enable updates'}</span>}</button>}
   </div>
   {state&&!state.following&&<p id={termsId} className={mobile?'mt-2 text-xs leading-relaxed text-neutral-600':'max-w-[300px] text-xs leading-tight text-neutral-500'}>Follow shares your verified email with {businessName} for marketing updates. Unfollow anytime.</p>}
   {error&&<span role="alert" className="block min-w-0 text-[11px] text-red-700">{error}</span>}
   <style jsx global>{`@keyframes slbi-bell-ring {0%,100%{transform:rotate(0)}25%{transform:rotate(15deg)}75%{transform:rotate(-15deg)}}`}</style>
 </div>;
}
