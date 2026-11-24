'use client';
import {useEffect,useState} from 'react';
import {BookOpen,RefreshCw,ShieldCheck} from 'lucide-react';
import type {CampaignLanguage} from '@/lib/marketing/campaign-language';
import {readG1PlannerFacts,servicePlannerMessage,type G1PlannerFacts} from '@/lib/marketing/g1-planner-facts';

const i18n={
 English:{title:'Saved business facts',hint:'Select a service to start a message. Review and edit it before sharing.',refresh:'Refresh',loading:'Checking your approved business…',missing:'Facts unavailable; planning still works.',none:'No saved services yet.',use:'Use in message'},
 'தமிழ்':{title:'சேமித்த வணிகத் தகவல்கள்',hint:'சேவையைத் தேர்ந்தெடுத்து செய்தி தொடங்குங்கள். பகிர்வதற்கு முன் திருத்திச் சரிபாருங்கள்.',refresh:'புதுப்பி',loading:'அனுமதிக்கப்பட்ட வணிகத்தைச் சரிபார்க்கிறோம்…',missing:'தகவல்கள் கிடைக்கவில்லை; தொடர்ந்து திட்டமிடலாம்.',none:'சேமித்த சேவைகள் இல்லை.',use:'செய்தியில் சேர்'},
 'සිංහල':{title:'සුරකින ලද ව්‍යාපාරික තොරතුරු',hint:'සේවාවක් තෝරා පණිවිඩය ආරම්භ කරන්න. පළ කිරීමට පෙර සංස්කරණය කරන්න.',refresh:'යාවත්කාලීන',loading:'අනුමත ව්‍යාපාරය පරීක්ෂා කරමින්…',missing:'තොරතුරු නැත; සැලසුම් කළ හැක.',none:'සුරකින ලද සේවා නැත.',use:'පණිවිඩයට යොදන්න'},
} as const;

export default function G1PlannerFacts({businessId,status,language,canApply,onUse}:{
 businessId:string;status:string|null;language:CampaignLanguage;canApply:boolean;onUse:(message:string)=>void;
}){
 const [facts,setFacts]=useState<G1PlannerFacts|null>(null);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState(false);
 const [refresh,setRefresh]=useState(0);
 const words=i18n[language];
 const approved=status==='approved';
 useEffect(()=>{
  setFacts(null);setError(false);
  if(!approved||!businessId){setLoading(false);return;}
  const controller=new AbortController();
  let live=true;
  setLoading(true);
  void (async()=>{
   try{
    const r=await fetch('/api/vendor/g1-knowledge?businessId='+encodeURIComponent(businessId),{
     method:'GET',credentials:'same-origin',cache:'no-store',
     headers:{Accept:'application/json'},signal:controller.signal
    });
    if(!r.ok)throw new Error('unavailable');
    const data:unknown=await r.json();
    const parsed=readG1PlannerFacts(data,businessId);
    if(!parsed)throw new Error('unexpected response');
    if(live)setFacts(parsed);
   }catch{if(live&&!controller.signal.aborted)setError(true);}
   finally{if(live)setLoading(false);}
  })();
  return ()=>{live=false;controller.abort();};
 },[businessId,approved,refresh]);
 if(!approved||!businessId)return null;
 return <section aria-label={words.title} data-testid="g1-planner-facts" className="rounded-xl border border-[#E8DDD2] bg-[#FFFCF9] p-3.5">
  <div className="flex flex-wrap items-center justify-between gap-2">
   <h3 className="inline-flex items-center gap-2 text-[12px] font-extrabold text-[#40352E]"><BookOpen size={16} className="text-[#CF7325]"/>{words.title}<span className="rounded bg-[#FFF0E5] px-1.5 py-1 text-[9px] text-[#AB652E]">G1 · Read-only</span></h3>
   <button type="button" aria-label={words.refresh} disabled={loading} onClick={()=>setRefresh(x=>x+1)}
    className="inline-flex items-center gap-1 rounded-md border border-[#E8D7C9] bg-white px-2.5 py-1.5 text-[10px] font-bold text-[#785841] disabled:opacity-50"><RefreshCw size={12}/>{words.refresh}</button>
  </div>
  {loading?<p role="status" className="mt-3 text-[11px] text-[#877467]">{words.loading}</p>:
   error?<p role="alert" className="mt-3 text-[11px] text-[#945329]">{words.missing}</p>:
   facts?<div className="mt-3 space-y-2.5">
    <div className="flex flex-wrap gap-1.5 text-[10px] text-[#745E50]">
     {facts.brandName&&<span className="rounded-md border border-[#EFE5DB] bg-white px-2 py-1.5">{facts.brandName}</span>}
     {facts.galleryCount!==null&&<span className="rounded-md border border-[#EFE5DB] bg-white px-2 py-1.5">Gallery: {facts.galleryCount}</span>}
     {facts.verified&&<span className="rounded-md border border-blue-200 bg-blue-50 px-2 py-1.5 text-blue-700">Verified listing</span>}
    </div>
    <p className="text-[11px] leading-5 text-[#857366]">{words.hint}</p>
    <div className="flex flex-wrap gap-2">{facts.services.map(service=>{
      const msg=servicePlannerMessage(service,language);
      return <button type="button" key={service} disabled={!canApply||!msg}
       title={canApply?words.use:words.hint} onClick={()=>{if(canApply&&msg)onUse(msg);}}
       className="rounded-md border border-[#E9D7C6] bg-white px-3 py-2 text-left text-[11px] font-semibold text-[#5D4939] hover:border-[#E99551] hover:bg-[#FFF5EA] disabled:cursor-not-allowed disabled:opacity-50">+ {service}</button>;
    })}</div>
    {!facts.services.length&&<p className="text-[11px] text-[#8A7B70]">{words.none}</p>}
    <p className="inline-flex items-center gap-1 text-[10px] text-[#8D7B6D]"><ShieldCheck size={12}/>Owner-scoped saved facts only · No AI or automatic sharing</p>
   </div>:null}
 </section>;
}
