'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from '@/app/components/SessionContext';
import { supabase } from '@/lib/supabaseClient';
import { X, Bell, Megaphone, Info, AlertCircle, Gift } from 'lucide-react';

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'promotion';
}

// Reuse the same in-flight claim under React Strict Mode; render at most once.
const claims=new Map<string,Promise<Announcement|null>>();
const shown=new Set<string>();
async function claim(uid:string|null):Promise<Announcement|null>{
 const key=uid||'guest';
 const pending=claims.get(key);if(pending)return pending;
 const task=(async()=>{
   if(uid){
     const {data,error}=await supabase.rpc('slbi_claim_announcement');
     if(error)return null;
     return data as Announcement|null;
   }
   const now=new Date().toISOString();
   const {data}=await supabase.from('announcements').select('id,title,message,type').eq('target_role','all').eq('is_active',true).lte('starts_at',now).or('ends_at.is.null,ends_at.gt.'+now).order('created_at',{ascending:false}).limit(1).maybeSingle();
   return data as Announcement|null;
 })();
 claims.set(key,task);
 try{return await task}finally{if(claims.get(key)===task)claims.delete(key)}
}
export default function GlobalAnnouncement() {
 const {user,loading}=useSession();
 const path=usePathname()||'/';
 const uid=user?.id||null;
 const allowed=!['auth','login','signup','reset-password','forgot-password'].includes(path.split('/')[1]||'');
 const [announcement,setAnnouncement]=useState<Announcement|null>(null);
 const [isVisible,setIsVisible]=useState(false);
 useEffect(()=>{
   setAnnouncement(null);setIsVisible(false);
   if(loading||!allowed)return;
   let alive=true;
   void claim(uid).then(data=>{
     if(!alive||!data)return;
     const key=uid?'slbi-announcement-shown:'+uid+':'+data.id:'dismissed_announcement_'+data.id;
     const displayKey=(uid||'guest')+':'+data.id;
     if(shown.has(displayKey))return;
     try{
       if(localStorage.getItem(key))return;
       // Mark at presentation, not dismissal, so refresh does not repeat it.
       localStorage.setItem(key,'true');
     }catch{}
     shown.add(displayKey);
     setAnnouncement(data);setIsVisible(true);
   }).catch(()=>{});
   return()=>{alive=false};
 },[uid,loading,allowed]);
 const dismiss=()=>setIsVisible(false);

  if (!isVisible || !announcement) return null;

  const getIcon = () => {
    switch (announcement.type) {
      case 'promotion': return <Gift className="text-brand-gold" />;
      case 'warning': return <AlertCircle className="text-amber-500" />;
      case 'success': return <Info className="text-emerald-500" />;
      default: return <Megaphone className="text-blue-500" />;
    }
  };

  return (
    <div className="fixed bottom-[88px] left-3 right-3 sm:bottom-6 sm:left-6 sm:right-6 md:left-auto md:right-6 md:w-96 z-[100] animate-in slide-in-from-bottom-10 duration-500">
      <div className="bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden">
        <div className={`h-1 w-full ${
          announcement.type === 'promotion' ? 'bg-brand-gold' : 
          announcement.type === 'warning' ? 'bg-amber-500' : 
          announcement.type === 'success' ? 'bg-emerald-500' : 'bg-blue-500'
        }`} />
        
        <div className="p-5">
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-gray-50 rounded-lg">
                {getIcon()}
              </div>
              <h4 className="font-bold text-gray-900">{announcement.title}</h4>
            </div>
            <button 
              onClick={dismiss}
              aria-label="Close announcement" className="text-gray-400 hover:text-gray-600 p-1"
            >
              <X size={18} />
            </button>
          </div>
          
          <p className="text-sm text-gray-600 leading-relaxed mb-4">
            {announcement.message}
          </p>
          
          <button 
            onClick={dismiss}
            className="w-full py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-black transition-colors"
          >
            Got it, thanks!
          </button>
        </div>
      </div>
    </div>
  );
}
