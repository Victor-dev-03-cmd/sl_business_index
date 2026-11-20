"use client";

import {useCallback,useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import * as Dialog from '@radix-ui/react-dialog';
import {Bell,Check,CheckCheck,Info,AlertTriangle,Clock,ArrowRight,X,RefreshCw} from 'lucide-react';
import {supabase} from '@/lib/supabaseClient';
import {useSession} from './SessionContext';
import PushNotificationToggle from '@/components/PushNotificationToggle';

type Item={id:string;title:string;message:string;type:string;created_at:string;is_read:boolean};
const formatTime=(value:string)=>{
  const seconds=Math.max(0,Math.floor((Date.now()-new Date(value).getTime())/1000));
  if(seconds<60)return 'Just now';
  if(seconds<3600)return Math.floor(seconds/60)+'m ago';
  if(seconds<86400)return Math.floor(seconds/3600)+'h ago';
  return new Date(value).toLocaleDateString('en-LK');
};
export default function NotificationBell(){
  const {user,loading:sessionLoading}=useSession();
  const uid=user?.id;
  const [open,setOpen]=useState(false);
  const trigger=useRef<HTMLButtonElement>(null);
  const [position,setPosition]=useState({top:88,right:12});
  const reposition=()=>{
    const r=trigger.current?.getBoundingClientRect();
    if(!r)return;
    const panelWidth=Math.min(400,window.innerWidth-24);
    const right=Math.max(12,Math.min(window.innerWidth-r.right,window.innerWidth-panelWidth-12));
    setPosition({top:r.bottom+10,right});
  };
  useEffect(()=>{if(!open)return;const close=()=>setOpen(false);window.addEventListener('resize',close);return()=>window.removeEventListener('resize',close)},[open]);
  const [items,setItems]=useState<Item[]>([]);
  const [unread,setUnread]=useState(0);
  const [filter,setFilter]=useState<'all'|'unread'>('all');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(true);
  const [loadedFor,setLoadedFor]=useState<string|null>(null);
  const load=useCallback(async()=>{
    if(!uid)return;
    const [rows,total]=await Promise.all([
      supabase.from('notifications').select('id,title,message,type,created_at,is_read').eq('user_id',uid).order('created_at',{ascending:false}).limit(40),
      supabase.from('notifications').select('id',{count:'exact',head:true}).eq('user_id',uid).eq('is_read',false),
    ]);
    if(rows.error||total.error){setError('Could not load updates. Please retry.');setLoading(false);return;}
    setItems((rows.data||[]) as Item[]);setUnread(total.count||0);setLoadedFor(uid);setError('');setLoading(false);
  },[uid]);
  useEffect(()=>{
    setItems([]);setUnread(0);setLoadedFor(null);setError('');setLoading(!!uid);
    if(!uid)return;
    void load();
    const channel=supabase.channel('notification-bell:'+uid)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications',filter:'user_id=eq.'+uid},()=>void load())
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'notifications',filter:'user_id=eq.'+uid},()=>void load())
      .subscribe();
    const refresh=()=>{if(document.visibilityState==='visible')void load()};
    document.addEventListener('visibilitychange',refresh);
    window.addEventListener('slbi-push-received',refresh);
    return()=>{document.removeEventListener('visibilitychange',refresh);window.removeEventListener('slbi-push-received',refresh);void supabase.removeChannel(channel)};
  },[uid,load]);
  const count=loadedFor===uid?unread:0;
  const safeItems=loadedFor===uid?items:[];
  async function mark(id?:string){
    if(!uid||busy)return;
    setBusy(true);
    let query=supabase.from('notifications').update({is_read:true}).eq('user_id',uid).eq('is_read',false);
    if(id)query=query.eq('id',id);
    const {error:writeError}=await query;
    if(writeError)setError('Could not mark as read. Please retry.');
    else await load();
    setBusy(false);
  }
  const visible=filter==='all'?safeItems:safeItems.filter(n=>!n.is_read);
  if(!uid&&!sessionLoading)return <Link href="/notifications" aria-label="Notifications" className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[#244238] hover:bg-stone-100"><Bell size={20} strokeWidth={1.7}/></Link>;
  return <Dialog.Root open={open} onOpenChange={value=>{if(value){reposition();void load()}setOpen(value)}} modal={false}>
    <Dialog.Trigger asChild>
      <button ref={trigger} type="button" aria-label={'Notifications'+(count?' ('+count+' unread)':'')} className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full text-[#234238] transition hover:bg-stone-100 focus-visible:ring-2 focus-visible:ring-emerald-600">
        <Bell size={21} strokeWidth={1.7}/>
        {count>0&&<span className="absolute -right-0.5 -top-0.5 min-w-[17px] rounded-full border-2 border-white bg-[#b63d43] px-1 text-center text-[9px] font-bold leading-[15px] text-white">{count>99?'99+':count}</span>}
      </button>
    </Dialog.Trigger>
    <Dialog.Portal>
      <Dialog.Content aria-describedby={undefined} style={{top:position.top,right:position.right,maxHeight:"min(680px, calc(100dvh - "+(position.top+12)+"px))"}} className="fixed z-[250] flex max-h-[min(680px,85dvh)] w-[min(400px,calc(100vw-24px))] flex-col overflow-hidden rounded-2xl border border-[#E1E7E2] bg-white text-[#20382E] shadow-[0_20px_65px_rgba(15,35,25,.16)] outline-none">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-stone-100 px-4 pb-3 pt-4 sm:px-5">
          <div><Dialog.Title className="text-lg font-semibold tracking-tight">Notifications</Dialog.Title><p className="mt-1 text-xs text-stone-500">{count?count+' unread updates':'Your latest account updates'}</p></div>
          <button type="button" onClick={()=>setOpen(false)} aria-label="Close notifications" className="grid h-8 w-8 place-items-center rounded-lg text-stone-500 hover:bg-stone-100"><X size={17}/></button>
        </div>
        <div className="shrink-0 border-b border-stone-100 px-4 py-3 sm:px-5">
          <PushNotificationToggle/>
        </div>
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-stone-100 px-4 py-2.5 sm:px-5">
          <div className="flex gap-1 rounded-lg bg-stone-100 p-1">
            {(['all','unread'] as const).map(tab=><button key={tab} type="button" aria-pressed={filter===tab} onClick={()=>setFilter(tab)} className={'rounded-md px-3 py-1.5 text-xs font-semibold '+(filter===tab?'bg-white text-[#204C3B] shadow-sm':'text-stone-500')}>{tab==='all'?'All':'Unread'}</button>)}
          </div>
          <button type="button" disabled={!count||busy} onClick={()=>void mark()} className="flex items-center gap-1.5 text-xs font-semibold text-[#39785C] disabled:opacity-40"><CheckCheck size={15}/>Mark all read</button>
        </div>
        {error&&<div role="alert" className="flex items-center justify-between gap-2 px-4 py-3 text-xs text-red-700">{error}<button type="button" aria-label="Retry" onClick={()=>void load()}><RefreshCw size={16}/></button></div>}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {loading||sessionLoading?<p className="p-6 text-center text-xs text-stone-500">Loading notifications…</p>:visible.length?visible.map(n=>{
            const Icon=n.type==='success'?Check:n.type==='warning'||n.type==='error'?AlertTriangle:Info;
            return <button type="button" key={n.id} onClick={()=>void mark(n.id)} disabled={busy||n.is_read} className={'flex w-full items-start gap-3 border-b border-stone-100 px-4 py-3.5 text-left last:border-0 hover:bg-stone-50 disabled:cursor-default sm:px-5 '+(n.is_read?'bg-white':'bg-[#F2F8F3]')}>
              <span className={'mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl '+(n.type==='error'?'bg-red-100 text-red-600':n.type==='warning'?'bg-amber-100 text-amber-700':'bg-[#E5F0E8] text-[#3A785B]')}><Icon size={17}/></span>
              <span className="min-w-0 flex-1"><span className="block break-words text-[13px] font-semibold leading-[1.4]">{n.title}</span><span className="mt-1 block line-clamp-2 break-words text-xs leading-[1.5] text-stone-600">{n.message}</span><span className="mt-2 flex items-center gap-1 text-[10px] text-stone-500"><Clock size={11}/>{formatTime(n.created_at)}</span></span>
              {!n.is_read&&<span aria-label="Unread" className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#3E8C65]"/>}
            </button>
          }):<div className="px-6 py-9 text-center"><Bell size={27} className="mx-auto text-stone-300"/><p className="mt-3 text-sm font-semibold">You're all caught up</p><p className="mt-1 text-xs text-stone-500">New updates appear here.</p></div>}
        </div>
        <Link href="/notifications" onClick={()=>setOpen(false)} className="flex min-h-12 shrink-0 items-center justify-center gap-2 border-t border-stone-100 text-xs font-semibold text-[#2C684D] hover:bg-stone-50">View all notifications <ArrowRight size={15}/></Link>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
}
