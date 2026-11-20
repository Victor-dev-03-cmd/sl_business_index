'use client';

import {useCallback,useEffect,useState} from 'react';
import Link from 'next/link';
import BrandIcon from '@/app/components/BrandIcon';
import {useSession} from '@/app/components/SessionContext';
import {supabase} from '@/lib/supabaseClient';
import PushNotificationToggle from '@/components/PushNotificationToggle';

type Item={id:string;title:string;message:string;type:string;created_at:string;is_read:boolean};
export default function PublicNotificationsPage(){
  const {user,loading:sessionLoading}=useSession();
  const [entries,setEntries]=useState<Item[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [working,setWorking]=useState(false);
  const load=useCallback(async()=>{
    if(!user?.id){setEntries([]);setLoading(false);return;}
    setLoading(true);setError('');
    const {data,error:readError}=await supabase.from('notifications')
      .select('id,title,message,type,created_at,is_read')
      .eq('user_id',user.id).order('created_at',{ascending:false}).limit(50);
    if(readError)setError('Notifications could not be loaded. Please retry.');
    else setEntries((data||[]) as Item[]);
    setLoading(false);
  },[user?.id]);
  useEffect(()=>{void load();},[load]);
  const markRead=async(id:string)=>{
    if(!user?.id||working)return;
    setWorking(true);
    const {error:writeError}=await supabase.from('notifications')
      .update({is_read:true}).eq('user_id',user.id).eq('id',id);
    if(writeError)setError('Could not update this notification. Try again.');
    else setEntries(old=>old.map(item=>item.id===id?{...item,is_read:true}:item));
    setWorking(false);
  };
  const markAll=async()=>{
    if(!user?.id||working)return;
    setWorking(true);
    const {error:writeError}=await supabase.from('notifications')
      .update({is_read:true}).eq('user_id',user.id).eq('is_read',false);
    if(writeError)setError('Could not mark notifications as read. Try again.');
    else setEntries(old=>old.map(item=>({...item,is_read:true})));
    setWorking(false);
  };
  const unread=entries.filter(x=>!x.is_read).length;
  return <main className="min-h-[75dvh] bg-[#F8F7F2] px-4 pb-14 pt-8 text-[#203B31] sm:px-8 sm:pt-14">
    <div className="mx-auto max-w-[850px]">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-[#D7C9B1] bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.12em] text-[#966E36]"><BrandIcon name="notification" size={15}/> Your updates</span>
          <h1 className="mt-4 text-[clamp(2rem,5vw,3.2rem)] font-semibold tracking-[-.05em]">Notifications<span className="text-[#C7A16E]">.</span></h1>
          <p className="mt-2 text-[13px] text-[#65796B]">Account updates and messages in one place.</p>
        </div>
        {!!unread&&<button type="button" onClick={()=>void markAll()} disabled={working}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#D6DFD4] bg-white px-4 text-[12px] font-semibold text-[#27634B] disabled:opacity-50"><BrandIcon name="tick-circle" size={17}/> Mark all as read ({unread})</button>}
      </div>
      {user&&<div className="mb-5 rounded-xl border border-[#E1E6DC] bg-white p-4"><PushNotificationToggle/></div>}
      {error&&<p role="alert" className="mb-4 rounded-xl border border-[#F3DACB] bg-[#FFF9F5] p-3 text-[12px] text-[#8B462B]">{error}</p>}
      {sessionLoading||loading?<p role="status" className="rounded-2xl bg-white p-6 text-[13px] text-[#65796B]">Loading notifications…</p>:
        !user?<div className="rounded-[22px] border border-[#E2E5DA] bg-white px-5 py-10 text-center">
          <BrandIcon name="notification" size={30} className="mx-auto text-[#407B63]"/>
          <h2 className="mt-4 text-lg font-semibold">Sign in to see your notifications</h2>
          <p className="mt-2 text-[13px] text-[#697C6E]">Only your own account notifications are shown here.</p>
          <Link href="/login?redirect=%2Fnotifications" className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-[#1B3430] px-5 text-[13px] font-semibold text-white">Sign in</Link>
        </div>:
        entries.length?<div className="overflow-hidden rounded-[20px] border border-[#E1E6DC] bg-white">
          {entries.map(item=><button type="button" key={item.id} disabled={working||item.is_read}
            onClick={()=>void markRead(item.id)}
            className={'flex w-full items-start gap-3 border-b border-[#EDF1EA] px-4 py-4 text-left last:border-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#3D8C6D] disabled:cursor-default '+(item.is_read?'bg-white':'bg-[#F1F8F0]')}>
            <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E2EFE5] text-[#3F8062]"><BrandIcon name="notification" size={19}/></span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-semibold text-[#264739]">{item.title}</span>
              <span className="mt-1 block whitespace-pre-wrap break-words text-[12px] leading-5 text-[#62786A]">{item.message}</span>
              <span className="mt-2 block text-[10px] text-[#8A9A90]">{new Date(item.created_at).toLocaleString('en-LK')} {!item.is_read?'· Tap to mark read':''}</span>
            </span>
            {!item.is_read&&<span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#D5A968]" aria-label="Unread"/>}
          </button>)}
        </div>:
        <div className="rounded-[22px] border border-dashed border-[#DDE4D7] bg-white p-10 text-center">
          <BrandIcon name="notification" size={28} className="mx-auto text-[#477F64]"/>
          <h2 className="mt-4 text-lg font-semibold">You’re all caught up</h2>
          <p className="mt-2 text-[12px] text-[#819084]">New account notifications will appear here.</p>
        </div>}
      {user&&!sessionLoading&&<button type="button" onClick={()=>void load()} disabled={loading}
        className="mt-5 inline-flex min-h-10 items-center gap-2 text-[12px] font-semibold text-[#407F61] disabled:opacity-50"><BrandIcon name="refresh" size={16}/> Refresh notifications</button>}
    </div>
  </main>;
}
