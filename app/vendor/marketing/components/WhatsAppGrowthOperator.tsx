'use client';
import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {ArrowRight,CheckCircle2,Globe2,Loader2,LockKeyhole,MessageSquareText,
 ShieldCheck,AlertTriangle,PlugZap,Workflow,Mail,RefreshCw} from 'lucide-react';
import type {WhatsAppOwnedBusiness} from './WhatsAppConnectionLab';

type Lang='en'|'ta'|'si';
type Action={id:string;href:string;title:string;kind:'review_only_external_blocked'|'read_link'|'draft_review';requiresFreshApproval:boolean;executed:false};
type OperatorPlan={locale:Lang;actions:Action[];summary:string;approved:false;persisted:false;externallyDispatched:false};
type Status={ok:true;business:{id:string;name:string;approved:boolean};
 sandboxTestWebhookConfigured:boolean;vendorOnboardingAvailable:false;
 vendorOnboardingBlocker:string;providerMetadataReadable:boolean;
 connections:Array<{id:string;status:string;displayName:string|null;connectedAt:string|null}>;
 automatedRepliesAvailable:false;marketingSendsAvailable:false;
 requiresIndividualOwnerApproval:true};
const LOCALE_COPY={
 en:{eyebrow:'NeuroGrowth · Owner command center',title:'One business. One Growth operator.',
 subtitle:'Plan work from your business context. Preview each action before opening the existing GrowthOS tool.',
 choose:'Business',language:'Language',request:'What should GrowthOS help you prepare?',
 placeholder:'Prepare an offer poster, a social caption and an email draft for my business.',
 generate:'Prepare review plan',empty:'Enter a request to prepare an owner-reviewed plan.',
 plans:'Proposed actions · not executed',status:'Connection readiness',
 refresh:'Refresh status',owned:'Owner scope verified',test:'Meta test webhook',
 live:'Vendor WhatsApp onboarding',testReady:'Test webhook configured',notReady:'Not configured',
 blocked:'Waiting for Meta Tech Provider approval and secure per-vendor account linking',
 notConnected:'No vendor account verified',linkedMetadata:'Account record exists · provider verification still required',
 open:'Open tool to review',approval:'Separate approval and recipient consent required before any sending',
 saved:'No content saved, no message sent and no account changed.',
 warning:'The current Meta test-number connection belongs to the SLBI sandbox, not to this vendor.',
 provider:'Provider channels',whatsapp:'WhatsApp · test-only',email:'Email · connect and review',meta:'Facebook / Instagram · permissions required',
 noBusiness:'No approved business selected. Draft planning is available only to approved owners.',
 error:'Could not prepare the plan. Review your business and try again.',
 draft:'Draft or review only', noPlans:'Nothing was published or sent.',
 legacy:'Previous setup preview (reference only)'},
 ta:{eyebrow:'NeuroGrowth · உரிமையாளர் கட்டுப்பாட்டு மையம்',title:'ஒரு வணிகம். ஒரு Growth operator.',
 subtitle:'உங்கள் வணிகத்திற்கான வேலைகளைத் திட்டமிடுங்கள். GrowthOS கருவியில் ஒவ்வொரு செயலும் முதலில் பரிசீலிக்கப்படும்.',
 choose:'வணிகம்',language:'மொழி',request:'GrowthOS எந்த வேலைக்கான வரைவைத் தயாரிக்க வேண்டும்?',
 placeholder:'என் வணிகத்திற்கான சலுகை போஸ்டர், கேப்ஷன் மற்றும் மின்னஞ்சல் வரைவு தயார் செய்ய வேண்டும்.',
 generate:'பரிசீலனைத் திட்டம் தயாரி',empty:'ஒரு கோரிக்கையை எழுதுங்கள்.',
 plans:'பரிந்துரைக்கப்பட்ட செயல்கள் · எதுவும் செய்யப்படவில்லை',status:'இணைப்பு நிலை',
 refresh:'மீண்டும் சரிபார்',owned:'உரிமையாளர் உறுதிசெய்யப்பட்டார்',test:'Meta சோதனை Webhook',
 live:'Vendor WhatsApp இணைப்பு',testReady:'Test Webhook தயாராக உள்ளது',notReady:'இன்னும் தயாராக இல்லை',
 blocked:'Meta Tech Provider அனுமதியும் தனிப்பட்ட Vendor இணைப்பும் தேவை',
 notConnected:'Vendor WhatsApp account இன்னும் சரிபார்க்கப்படவில்லை',linkedMetadata:'Account பதிவு உள்ளது · Provider சரிபார்ப்பு தேவை',
 open:'பரிசீலிக்க கருவியைத் திற',approval:'Message அனுப்ப தனி ஒப்புதலும் பெறுநர் சம்மதமும் அவசியம்',
 saved:'எதுவும் சேமிக்கப்படவில்லை; Message அனுப்பப்படவில்லை; Account மாற்றப்படவில்லை.',
 warning:'SLBI-ன் Meta Test Number இணைப்பு இந்த Vendor-ன் தனிப்பட்ட இணைப்பு அல்ல.',
 provider:'இணைக்கக்கூடிய சேனல்கள்',whatsapp:'WhatsApp · சோதனை மட்டும்',email:'மின்னஞ்சல் · இணைத்து பரிசீலிக்க',meta:'Facebook / Instagram · அனுமதி தேவை',
 noBusiness:'அங்கீகரிக்கப்பட்ட வணிகத்தைத் தேர்ந்தெடுக்கவும். அதன் உரிமையாளருக்கே plan அனுமதி.',
 error:'திட்டம் தயாரிக்க முடியவில்லை. வணிகத்தைச் சரிபார்த்து மீண்டும் முயலுங்கள்.',
 draft:'வரைவு / பரிசீலனை மட்டும்',noPlans:'எதுவும் வெளியிடப்படவோ அனுப்பப்படவோ இல்லை.',
 legacy:'முந்தைய setup preview (குறிப்புக்காக மட்டும்)'},
 si:{eyebrow:'NeuroGrowth · හිමිකරු පාලන මධ්‍යස්ථානය',title:'එක් ව්‍යාපාරයක්. එක් Growth operator.',
 subtitle:'ඔබේ ව්‍යාපාරයට අදාළ වැඩ සැලසුම් කරන්න. සෑම ක්‍රියාවක්ම GrowthOS තුළ පළමුව සමාලෝචනය කරන්න.',
 choose:'ව්‍යාපාරය',language:'භාෂාව',request:'GrowthOS විසින් සකස් කළ යුත්තේ කුමක්ද?',
 placeholder:'මගේ ව්‍යාපාරය සඳහා පෝස්ටරයක්, කැප්ෂන් සහ ඊමේල් කෙටුම්පතක් සකස් කරන්න.',
 generate:'සමාලෝචන සැලැස්ම සකසන්න',empty:'ඉල්ලීමක් ඇතුළත් කරන්න.',
 plans:'යෝජිත ක්‍රියා · කිසිවක් සිදු කර නැත',status:'සම්බන්ධතා තත්ත්වය',
 refresh:'යළි පරීක්ෂා කරන්න',owned:'හිමිකම තහවුරුයි',test:'Meta පරීක්ෂණ Webhook',
 live:'Vendor WhatsApp සම්බන්ධතාව',testReady:'පරීක්ෂණ Webhook සකසා ඇත',notReady:'සූදානම් නැත',
 blocked:'Meta Tech Provider අනුමැතිය සහ ආරක්ෂිත ව්‍යාපාර සම්බන්ධතාව අවශ්‍යයි',
 notConnected:'Vendor ගිණුම තවම තහවුරු වී නැත',linkedMetadata:'ගිණුම් වාර්තාවක් ඇත · Provider තහවුරු කිරීම අවශ්‍යයි',
 open:'සමාලෝචනයට මෙවලම විවෘත කරන්න',approval:'යැවීමට පෙර වෙනම අනුමැතිය සහ ලබන්නාගේ කැමැත්ත අවශ්‍යයි',
 saved:'දත්ත සුරක්ෂිත කර නැත; පණිවිඩ යවා නැත; ගිණුම වෙනස් වී නැත.',
 warning:'SLBI Meta පරීක්ෂණ අංකය මෙම Vendorගේ පෞද්ගලික සම්බන්ධතාව නොවේ.',
 provider:'සම්බන්ධක නාලිකා',whatsapp:'WhatsApp · පරීක්ෂණ පමණි',email:'ඊමේල් · සම්බන්ධ කර සමාලෝචනය',meta:'Facebook / Instagram · අවසර අවශ්‍යයි',
 noBusiness:'අනුමත ව්‍යාපාරයක් තෝරන්න. සැලසුම් කිරීමට හිමිකම අවශ්‍යයි.',
 error:'සැලැස්ම සකස් කළ නොහැකි විය. ව්‍යාපාරය පරීක්ෂා කර නැවත උත්සාහ කරන්න.',
 draft:'කෙටුම්පත / සමාලෝචනය පමණි',noPlans:'කිසිවක් පළ හෝ යවා නැත.',
 legacy:'පෙර සැකසුම් පෙරදසුන (යොමුව සඳහා පමණි)'},
} as const;
function readLocale():Lang{
 if(typeof navigator!=='undefined'){
  const n=navigator.language.toLowerCase();
  if(n.startsWith('ta'))return 'ta';
  if(n.startsWith('si'))return 'si';
 }
 return 'en';
}
export default function WhatsAppGrowthOperator({businesses,ownershipReady}:{
 businesses:readonly WhatsAppOwnedBusiness[];ownershipReady:boolean;
}){
 const [locale,setLocale]=useState<Lang>('en');
 const [businessId,setBusinessId]=useState(businesses[0]?.id??'');
 const [request,setRequest]=useState('');
 const [status,setStatus]=useState<Status|null>(null);
 const [statusLoading,setStatusLoading]=useState(false);
 const [busy,setBusy]=useState(false);
 const [plan,setPlan]=useState<OperatorPlan|null>(null);
 const [error,setError]=useState('');
 const [refresh,setRefresh]=useState(0);
 const words=LOCALE_COPY[locale];
 const current=useMemo(()=>businesses.find(b=>b.id===businessId),[businesses,businessId]);
 const canPlan=ownershipReady&&current?.status==='approved';
 useEffect(()=>{setLocale(readLocale())},[]);
 useEffect(()=>{
  let cancelled=false;
  setStatus(null);setPlan(null);
  if(!ownershipReady||!businessId)return;
  setStatusLoading(true);
  const controller=new AbortController();
  fetch('/api/vendor/marketing/whatsapp/status?businessId='+encodeURIComponent(businessId),{
   credentials:'same-origin',cache:'no-store',signal:controller.signal,
  }).then(async result=>{
   const json:unknown=await result.json();
   if(!cancelled&&result.ok&&json&&typeof json==='object'&&'ok' in json)
    setStatus(json as Status);
  }).catch(()=>{}).finally(()=>{if(!cancelled)setStatusLoading(false)});
  return()=>{cancelled=true;controller.abort()};
 },[businessId,ownershipReady,refresh]);
 async function buildPlan(){
  if(!canPlan||busy||!request.trim())return;
  setError('');setPlan(null);setBusy(true);
  try{
   const response=await fetch('/api/vendor/marketing/whatsapp/plan',{
    method:'POST',credentials:'same-origin',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({businessId,locale,request}),
   });
   const data:unknown=await response.json();
   if(!response.ok||!data||typeof data!=='object'||!('plan' in data))
    throw new Error('plan_unavailable');
   setPlan((data as {plan:OperatorPlan}).plan);
  }catch{setError(words.error)}
  finally{setBusy(false)}
 }
 return <section aria-label="NeuroGrowth owner growth operator" className="space-y-5">
  <div className="overflow-hidden rounded-[24px] border border-[#2D2C30] bg-[#1D1C20] p-5 text-white shadow-xl sm:p-8">
   <div className="flex flex-wrap items-start justify-between gap-4">
    <div className="max-w-2xl">
     <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-[#FFAE74]">{words.eyebrow}</p>
     <h2 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">{words.title}</h2>
     <p className="mt-2 text-xs leading-6 text-white/65">{words.subtitle}</p>
    </div>
    <div aria-label="Select interface language" className="flex gap-1 rounded-xl border border-white/20 bg-white/5 p-1">
     {([['en','English'],['ta','தமிழ்'],['si','සිංහල']] as const).map(([value,label])=>
      <button key={value} type="button" onClick={()=>{setLocale(value);setPlan(null);setError('')}}
       aria-pressed={locale===value} className={'min-h-10 rounded-lg px-3 text-xs font-bold transition '+(locale===value?'bg-[#FF7900] text-black':'text-white/70 hover:bg-white/10')}>
       {label}</button>)}
    </div>
   </div>
   <div className="mt-6 grid gap-3 sm:grid-cols-3">
    {[{icon:MessageSquareText,text:words.whatsapp},{icon:Mail,text:words.email},{icon:PlugZap,text:words.meta}].map(entry=>
     <div key={entry.text} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-[11px] font-bold text-white/75">
      <entry.icon className="h-4 w-4 shrink-0 text-[#FF9D4B]"/>{entry.text}
     </div>)}
   </div>
  </div>
  <div className="grid gap-5 lg:grid-cols-[1.25fr_.75fr]">
   <div className="rounded-[20px] border border-[#E7E7EB] bg-white p-5 shadow-sm sm:p-7">
    <div className="flex items-center gap-2 text-sm font-bold text-[#29292F]">
     <Workflow className="h-5 w-5 text-[#D46A10]"/>{words.request}
    </div>
    <label htmlFor="wa04-business" className="mt-5 block text-xs font-bold text-[#52525B]">{words.choose}</label>
    <select id="wa04-business" value={businessId} onChange={e=>{setBusinessId(e.target.value);setError('')}}
     className="mt-2 min-h-12 w-full rounded-xl border border-[#DDDDE2] bg-white px-3 text-xs text-[#25252C] focus:border-[#FF7900] focus:outline-none">
     {businesses.length===0?<option value="">No owned business</option>:businesses.map(b=>
      <option value={b.id} key={b.id}>{b.name}{b.status!=='approved'?' · pending':''}</option>)}
    </select>
    <label htmlFor="wa04-request" className="mt-4 block text-xs font-bold text-[#52525B]">{words.request}</label>
    <textarea id="wa04-request" value={request} maxLength={500} rows={4}
     onChange={e=>{setRequest(e.target.value);setPlan(null);setError('')}}
     placeholder={words.placeholder} className="mt-2 min-h-28 w-full resize-y rounded-xl border border-[#DDDDE2] bg-[#FAFAFB] p-3 text-sm leading-6 text-[#242429] focus:border-[#FF7900] focus:outline-none focus:ring-2 focus:ring-[#FF7900]/15"/>
    <p className="mt-2 text-right text-[10px] text-[#96969F]">{request.length}/500</p>
    {!canPlan&&<p className="mt-2 text-xs text-[#985624]">{words.noBusiness}</p>}
    <button onClick={()=>void buildPlan()} type="button" disabled={!canPlan||!request.trim()||busy}
     className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#FF7900] px-5 text-sm font-extrabold text-[#1E1C20] transition hover:bg-[#FF9B36] disabled:cursor-not-allowed disabled:opacity-45">
     {busy?<Loader2 className="h-4 w-4 animate-spin"/>:<Workflow className="h-4 w-4"/>}{words.generate}
    </button>
    <p className="mt-3 text-center text-xs text-[#85858F]">{words.saved}</p>
    {error&&<p role="alert" className="mt-3 text-xs font-semibold text-[#B13B21]">{error}</p>}
    {plan&&<div aria-live="polite" className="mt-6 space-y-3 rounded-xl border border-[#F0D7BB] bg-[#FFFAF5] p-4">
     <h3 className="text-sm font-bold text-[#6D3E17]">{words.plans}</h3>
     {plan.actions.length===0&&<p className="text-xs text-[#6D5649]">{plan.summary}</p>}
     {plan.actions.map(a=><div key={a.id} className="rounded-xl border border-[#F0E4DA] bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
       <div><p className="text-xs font-bold text-[#27252B]">{a.title}</p>
       <p className="mt-1 text-[10px] text-[#7D7D85]">{a.requiresFreshApproval?words.approval:words.draft}</p></div>
       <Link href={a.href} className="flex min-h-9 items-center gap-1 rounded-lg border border-[#E8DBCE] px-3 text-[11px] font-bold text-[#9E531A] hover:bg-[#FFF0DF]">
        {words.open}<ArrowRight className="h-3 w-3"/></Link>
      </div>
     </div>)}
     <p className="text-[11px] leading-5 text-[#7C6353]">{plan.summary}</p>
    </div>}
   </div>
   <aside className="rounded-[20px] border border-[#E7E7EB] bg-white p-5 shadow-sm sm:p-7">
    <div className="flex items-center justify-between gap-3">
     <h3 className="flex items-center gap-2 text-sm font-extrabold text-[#28282E]"><ShieldCheck className="h-5 w-5 text-[#D46A10]"/>{words.status}</h3>
     <button type="button" aria-label={words.refresh} onClick={()=>setRefresh(v=>v+1)}
      className="rounded-lg border border-[#E6E6EB] p-2 text-[#696971] hover:bg-[#F7F7F9]">
      <RefreshCw className={'h-4 w-4 '+(statusLoading?'animate-spin':'')}/></button>
    </div>
    <div className="mt-5 space-y-4 text-xs">
     <div className="flex gap-3"><CheckCircle2 className="h-4 w-4 shrink-0 text-[#D07420]"/>
      <p className="font-semibold text-[#34343A]">{ownershipReady&&current?words.owned:words.noBusiness}</p></div>
     <div className="flex gap-3"><Globe2 className="h-4 w-4 shrink-0 text-[#D07420]"/>
      <p><strong className="text-[#34343A]">{words.test}:</strong> <span className="text-[#7B7B85]">{status?.sandboxTestWebhookConfigured?words.testReady:words.notReady}</span></p></div>
     <div className="flex gap-3"><LockKeyhole className="h-4 w-4 shrink-0 text-[#D07420]"/>
      <div><p className="font-bold text-[#34343A]">{words.live}</p>
       <p className="mt-1 leading-5 text-[#8A7A6E]">{words.blocked}</p></div></div>
    </div>
    <div className="mt-5 rounded-xl border border-[#F0DFCE] bg-[#FFFAF5] p-4 text-[11px] leading-6 text-[#8A6748]">
     <AlertTriangle className="mb-2 h-4 w-4"/>{words.warning}
    </div>
    {status&&<p className="mt-3 text-[11px] font-semibold text-[#797984]">
     {status.connections.length?words.linkedMetadata:words.notConnected}</p>}
    <div className="mt-5 border-t border-[#EAEAF0] pt-4">
     <Link href="/vendor/marketing-engine/connections" className="flex items-center gap-2 text-xs font-bold text-[#AD5814] hover:underline">
      {words.provider}<ArrowRight className="h-4 w-4"/></Link>
    </div>
   </aside>
  </div>
 </section>;
}
