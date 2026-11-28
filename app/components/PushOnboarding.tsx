'use client';
import {useEffect,useState} from 'react';
import {usePathname} from 'next/navigation';
import {BellRing,X} from 'lucide-react';
import {useSession} from './SessionContext';
import {enablePush,devicePushReady,supportsPush,isIosDevice,devicePushOptedOut} from '@/lib/push/client';
import {toast} from 'sonner';
const week=7*24*60*60*1000;
export default function PushOnboarding(){
 const {user,loading}=useSession();
 const path=usePathname()||'/';
 const uid=user?.id;
 const [visible,setVisible]=useState(false);
 const [busy,setBusy]=useState(false);
 const allowedRoute=!['auth','login','signup','register','reset-password','forgot-password','notifications'].includes(path.split('/')[1]||'');
 useEffect(()=>{
   setVisible(false);
   if(loading||!uid||!allowedRoute||!supportsPush()||isIosDevice())return;
   let alive=true;
   let available=false;
   const sync=()=>{
     if(!alive)return;
     let until=0;try{until=Number(localStorage.getItem('slbi-push-nudge-v1:'+uid)||0)}catch{}
     setVisible(available&&Notification.permission==='default'&&!devicePushReady(uid)&&!devicePushOptedOut(uid)&&until<=Date.now());
   };
   void fetch('/api/push/config',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(d=>{available=d?.enabled===true;sync()}).catch(()=>{});
   window.addEventListener('slbi-push-state',sync);window.addEventListener('focus',sync);
   return()=>{alive=false;window.removeEventListener('slbi-push-state',sync);window.removeEventListener('focus',sync)};
 },[uid,loading,allowedRoute]);
 const dismiss=()=>{if(uid)try{localStorage.setItem('slbi-push-nudge-v1:'+uid,String(Date.now()+week))}catch{}setVisible(false)};
 const enable=async()=>{
   if(!uid||busy)return;
   setBusy(true);
   try{await enablePush(uid);setVisible(false);toast.success('Notifications enabled')}
   catch(e){if(Notification.permission!=='default')setVisible(false);toast.error(e instanceof Error?e.message:'Unable to enable notifications.')}
   finally{setBusy(false)}
 };
 if(!visible||!uid||!allowedRoute)return null;
 return <aside data-slbi-ui="push-onboarding" aria-label="Enable notifications" className="mx-auto my-2 flex w-[calc(100%-24px)] max-w-3xl flex-wrap items-center gap-2 rounded-xl border border-orange-200 bg-white px-3 py-2.5 text-neutral-900 sm:gap-3">
   <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-orange-50 text-[#EA580C]"><BellRing size={19}/></span>
   <div className="min-w-0 flex-1"><p className="text-sm font-semibold">Stay updated</p><p className="text-[11px] text-neutral-500">Get messages and business updates on this device.</p></div>
   <button type="button" disabled={busy} onClick={()=>void enable()} className="min-h-10 rounded-lg bg-[#EA580C] px-3 text-xs font-semibold text-white disabled:opacity-50">{busy?'Enabling…':'Enable notifications'}</button>
   <button type="button" onClick={dismiss} disabled={busy} aria-label="Not now" title="Not now" className="grid h-9 w-9 shrink-0 place-items-center text-neutral-500"><X size={18}/></button>
 </aside>;
}
