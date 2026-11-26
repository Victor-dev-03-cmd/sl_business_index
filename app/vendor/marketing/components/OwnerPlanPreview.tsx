'use client';
import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {ArrowRight,CheckCircle2,ClipboardCopy,LockKeyhole,Mail,ShieldAlert} from 'lucide-react';
import {MARKETING_STUDIO_APPS} from '@/lib/marketing/studio-apps';

type Lang='en'|'ta'|'si';
type StudioAction={id:string;href:string;kind:'provider_blocked'|'draft_review';requiresProviderAuthorization:boolean};
type OwnerAction={id:string;href:string;title:string;requiresFreshApproval:boolean};
type ReviewItem={id:string;href:string;title:string;blocked:boolean};
const TEXT={
 en:{
  title:'Your request → an understandable review plan',
  intro:'These are editable example templates and next steps, not generated artwork or a sent campaign.',
  business:'Selected business',brief:'Your original instruction',
  step1:'1. Review example content',step2:'2. Open the relevant workspace',step3:'3. Connect & approve before sending',
  sample:'Illustrative copy · not saved',open:'Open workspace',notCarried:'Your brief is not automatically transferred to the opened tool.',
  copy:'Copy example',copied:'Copied',copyError:'Copy failed — select the text to copy it.',
  none:'No matching tool. Mention a poster, caption, email, calls, reviews or automation.',
  blocked:'Provider connection & separate approval required',draft:'Manual editing / review available',
  next:'What happens next?',nextText:'Edit the copy or artwork in the linked tool. Provider sending stays disabled until the account is securely connected, the recipients have opted in, and you explicitly approve the exact content.',
  warning:'No AI image was rendered. No document was saved, no automation ran, and no email, WhatsApp message or social post was sent.',
  emailLink:'Email / provider connection status',
 },
 ta:{
  title:'உங்கள் கோரிக்கை → புரியக்கூடிய செயல் திட்டம்',
  intro:'கீழே உள்ளவை திருத்தக்கூடிய மாதிரி உள்ளடக்கங்கள். உண்மையான Poster உருவாகவோ Campaign அனுப்பப்படவோ இல்லை.',
  business:'தேர்ந்தெடுத்த வணிகம்',brief:'நீங்கள் கொடுத்த கோரிக்கை',
  step1:'1. மாதிரி உள்ளடக்கத்தைப் பாருங்கள்',step2:'2. தொடர்புடைய Tool-ஐத் திறங்கள்',step3:'3. Connect + ஒப்புதல் பெற்ற பிறகே அனுப்பலாம்',
  sample:'மாதிரி வரைவு · சேமிக்கப்படவில்லை',open:'Tool-ஐத் திற',notCarried:'இந்தக் கோரிக்கை அடுத்த Tool-க்கு தானாக மாற்றப்படாது.',
  copy:'மாதிரியை Copy செய்',copied:'Copy ஆனது',copyError:'Copy செய்ய முடியவில்லை. உரையைத் தேர்வு செய்து Copy செய்யவும்.',
  none:'பொருத்தமான Tool இல்லை. Poster, Caption, Email, Call அல்லது Automation என்று தெளிவாக எழுதுங்கள்.',
  blocked:'Provider இணைப்பும் தனி ஒப்புதலும் தேவை',draft:'திருத்த / பரிசீலனை செய்யலாம்',
  next:'அடுத்ததாக என்ன நடக்கும்?',nextText:'இணைக்கப்பட்ட Tool-ல் இந்த மாதிரியைத் திருத்துங்கள். சரிபார்க்கப்பட்ட Provider இணைப்பு, பெறுநர் சம்மதம், நீங்கள் இறுதி Content-க்கு தனி ஒப்புதல் கொடுத்த பிறகே Sending சாத்தியம்.',
  warning:'AI படம் உருவாகவில்லை. எதுவும் சேமிக்கப்படவில்லை; Automation இயங்கவில்லை; Email, WhatsApp அல்லது Social Post அனுப்பப்படவில்லை.',
  emailLink:'Email / Provider இணைப்பு நிலை',
 },
 si:{
  title:'ඔබේ ඉල්ලීම → පැහැදිලි සමාලෝචන සැලැස්ම',
  intro:'මෙම අන්තර්ගතය සංස්කරණය කළ හැකි උදාහරණ පමණි; පෝස්ටරයක් නිර්මාණය හෝ ප්‍රචාරණයක් යැවීම සිදු කර නැත.',
  business:'තෝරාගත් ව්‍යාපාරය',brief:'ඔබේ ඉල්ලීම',
  step1:'1. උදාහරණ සමාලෝචනය',step2:'2. අදාළ මෙවලම විවෘත කරන්න',step3:'3. සම්බන්ධ කර අනුමත කිරීමෙන් පසු යැවීම',
  sample:'උදාහරණය · සුරැකී නැත',open:'මෙවලම විවෘත කරන්න',notCarried:'මෙම ඉල්ලීම ඊළඟ මෙවලම වෙත ස්වයංක්‍රීයව යොමු නොවේ.',
  copy:'උදාහරණය පිටපත් කරන්න',copied:'පිටපත් විය',copyError:'පිටපත් කළ නොහැක. පෙළ තෝරන්න.',
  none:'ගැළපෙන මෙවලමක් නැත. පෝස්ටර්, කැප්ෂන්, ඊමේල් හෝ ස්වයංක්‍රීයකරණය සඳහන් කරන්න.',
  blocked:'සේවා සම්බන්ධතාව සහ වෙනම අනුමැතිය අවශ්‍යයි',draft:'සංස්කරණය / සමාලෝචනය පමණි',
  next:'ඊළඟ පියවර',nextText:'මෙවලම තුළ අන්තර්ගතය සංස්කරණය කරන්න. ගිණුම් සම්බන්ධතාව, ලබන්නාගේ කැමැත්ත සහ නිශ්චිත අන්තර්ගතයට ඔබේ අනුමැතිය නොමැතිව යැවීම අක්‍රීයයි.',
  warning:'AI රූපයක් නොසාදන ලදී. කිසිවක් සුරැකී නැත; ස්වයංක්‍රීයකරණයක් හෝ පණිවිඩයක් යවා නැත.',
  emailLink:'ඊමේල් / සේවා සම්බන්ධතා තත්ත්වය',
 }
} as const;
const EXAMPLES={
 en:{
  poster:'SPECIAL OFFER\n[Offer details and dates to be filled by owner]\n[Contact / CTA to be added]',
  caption:'We have an update to share! ✨\n[Insert verified offer details and dates]\nContact us to learn more. #YourBusiness',
  email:'Subject: An update from [Business]\n\nHello [First name],\nWe have news to share: [approved offer details and dates].\n[Approved call-to-action]\n\nYou are receiving this because you opted in.\nUnsubscribe: [working link required]',
  agent:'Greeting: Welcome to [Business]. How can we help?\nCollect only necessary enquiry details, then ask whether the caller wants a human handoff.\nNo live call is connected.',
  automation:'Trigger: customer explicitly opts in → Prepare follow-up draft → OWNER REVIEWS → Check unsubscribe/suppression → Send only via approved provider → Record delivery receipt.\nNo background job is active.',
  campaign:'Goal: [campaign goal]\nAudience: [consented audience]\nOffer: [exact terms and dates]\nCreative: poster + caption + email draft\nLaunch: human review required',
  social:'[Business] is sharing an update!\n[Approved offer text]\n[Approved CTA]\nNot published to Facebook or Instagram.',
  general:'Review the owned business information and prepare any changes manually in the linked workspace. No change has been made.'
 },
 ta:{
  poster:'சிறப்புச் சலுகை\n[சலுகை விவரம் மற்றும் தேதி நீங்கள் நிரப்ப வேண்டும்]\n[தொடர்பு எண் / CTA சேர்க்கவும்]',
  caption:'உங்களுக்காக ஒரு புதிய அறிவிப்பு! ✨\n[உறுதிசெய்த சலுகை விவரம் மற்றும் தேதி]\nமேலும் அறிய எங்களைத் தொடர்பு கொள்ளுங்கள். #உங்கள்_வணிகம்',
  email:'Subject: [Business] வழங்கும் புதிய அறிவிப்பு\n\nவணக்கம் [வாடிக்கையாளர் பெயர்],\n[உறுதிசெய்த சலுகை விவரம் மற்றும் காலவரை] உங்களுக்குத் தெரிவிக்க விரும்புகிறோம்.\n[உங்கள் CTA]\n\nஉங்கள் முன் அனுமதியின்பேரில் இந்த மின்னஞ்சல் அனுப்பப்படும்.\nUnsubscribe: [செயல்படும் இணைப்பு தேவை]',
  agent:'வணக்கம்! [Business]-க்கு வரவேற்கிறோம். உங்களுக்கு எப்படி உதவலாம்?\nதேவையான விசாரணை விவரத்தை மட்டுமே கேட்டு, மனித உதவியாளருடன் பேச வேண்டுமா எனக் கேளுங்கள்.\nதற்போது எந்த அழைப்பும் இணைக்கப்படவில்லை.',
  automation:'வாடிக்கையாளர் வெளிப்படையாக சம்மதித்தார் → Follow-up வரைவு → உரிமையாளர் Review → Unsubscribe பட்டியல் சரிபார் → அனுமதிக்கப்பட்ட Provider மூலம் மட்டுமே Send → Delivery receipt பதிவு.\nஎந்த Automation-உம் இப்போது இயங்கவில்லை.',
  campaign:'நோக்கம்: [பிரச்சார நோக்கம்]\nயாருக்கு: [சம்மதித்த வாடிக்கையாளர்கள்]\nசலுகை: [சரியான விதிகள் + தேதி]\nஉள்ளடக்கம்: Poster + Caption + Email வரைவு\nLaunch: உங்கள் ஒப்புதல் தேவை',
  social:'[Business] சார்பாக ஒரு புதிய அறிவிப்பு!\n[உறுதிசெய்த சலுகை விவரம்]\n[உங்கள் CTA]\nFacebook/Instagram-ல் எதுவும் வெளியிடப்படவில்லை.',
  general:'உங்கள் வணிகத் தகவல்களை இணைக்கப்பட்ட Workspace-ல் பார்த்து, தேவையானதை நீங்களே திருத்துங்கள். எந்த மாற்றமும் செய்யப்படவில்லை.'
 },
 si:{
  poster:'විශේෂ දීමනාව\n[දීමනාවේ විස්තර සහ දිනය]\n[සම්බන්ධතා අංකය / CTA]',
  caption:'අපෙන් අලුත් පණිවිඩයක්! ✨\n[තහවුරු කළ දීමනාව සහ දිනය]\nවැඩි විස්තර සඳහා අප හා සම්බන්ධ වන්න.',
  email:'Subject: [Business] වෙතින් අලුත් තොරතුරු\n\nආයුබෝවන් [නම],\n[අනුමත කළ දීමනා විස්තර සහ දිනය]\n[CTA]\n\nඔබගේ කැමැත්ත මත පමණක් මෙම ඊමේල් යවනු ලැබේ.\nUnsubscribe: [ක්‍රියාකාරී සබැඳිය අවශ්‍යයි]',
  agent:'ආයුබෝවන්! [Business] වෙත සාදරයෙන් පිළිගනිමු. ඔබට කෙසේ උදව් කළ හැකිද?\nඅවශ්‍ය විමසීම් පමණක් ලබාගෙන මිනිස් සහාය ලබාදීමට යොමු කරන්න.\nසජීවී ඇමතුමක් නැත.',
  automation:'පාරිභෝගිකයා කැමැත්ත ලබා දෙයි → කෙටුම්පත → හිමිකරු සමාලෝචනය → Unsubscribe පරීක්ෂාව → අනුමත සේවාවෙන් පමණක් යවන්න → ලැබුණු බව සටහන් කරන්න.\nස්වයංක්‍රීයකරණයක් ක්‍රියාත්මක නැත.',
  campaign:'අරමුණ: [අරමුණ]\nප්‍රේක්ෂකයින්: [අනුමැතිය ඇති]\nදීමනාව: [විස්තර සහ දිනය]\nපෝස්ටර් + කැප්ෂන් + ඊමේල් කෙටුම්පත\nහිමිකරු අනුමැතිය අවශ්‍යයි.',
  social:'[Business] වෙතින් අලුත් තොරතුරු!\n[අනුමත විස්තර]\n[CTA]\nසමාජ මාධ්‍ය තුළ පළ කර නැත.',
  general:'අදාළ ව්‍යාපාර මෙවලමට ගොස් තොරතුරු පරීක්ෂා කරන්න. කිසිවක් වෙනස් කර නැත.'
 }
} as const;
function sampleFor(id:string,locale:Lang,businessName:string):string{
 const kind=
  id==='poster-editor'?'poster':id==='caption-lab'?'caption':
  id==='email-marketing'?'email':id==='voice-agent'?'agent':
  id==='workflow-automation'?'automation':id==='campaign-planner'?'campaign':
  id==='social-marketing'?'social':'general';
 // Only insert the server-derived owned-business display name; all other values remain visible placeholders.
 return EXAMPLES[locale][kind].replaceAll('[Business]',businessName);
}
export default function OwnerPlanPreview({locale,businessName,request,studioActions,ownerActions}:{
 locale:Lang;businessName:string;request:string;
 studioActions:readonly StudioAction[];ownerActions:readonly OwnerAction[];
}){
 const [copied,setCopied]=useState('');
 const words=TEXT[locale];
 const items=useMemo(()=>{
  const next:ReviewItem[]=studioActions.map(a=>{
   const app=MARKETING_STUDIO_APPS.find(v=>v.id===a.id);
   return {id:a.id,href:a.href,title:app?.title??a.id,blocked:a.requiresProviderAuthorization};
  });
  for(const a of ownerActions){
   const duplicate=a.id==='campaign'&&next.some(x=>['campaign-planner','poster-editor','caption-lab','social-marketing'].includes(x.id))
    ||a.id==='email'&&next.some(x=>x.id==='email-marketing')
    ||a.id==='leads'&&next.some(x=>['leads-workspace','leads-crm'].includes(x.id));
   if(!duplicate&&!next.some(x=>x.href===a.href))
    next.push({id:a.id,href:a.href,title:a.title,blocked:a.requiresFreshApproval});
  }
  return next;
 },[studioActions,ownerActions]);
 useEffect(()=>{
  const element=document.getElementById('owner-plan-result');
  if(element){
   const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
   element.scrollIntoView({block:'start',behavior:reduced?'auto':'smooth'});
  }
 },[]);
 async function copySample(id:string,content:string){
  try{
   await navigator.clipboard.writeText(content);
   setCopied(id);
  }catch{setCopied('error:'+id)}
 }
 return <div id="owner-plan-result" aria-live="polite" className="scroll-mt-24 space-y-5 rounded-2xl border border-[#F2D7BD] bg-[#FFFAF5] p-4 sm:p-5">
  <div>
   <div className="flex flex-wrap items-center gap-2">
    <CheckCircle2 className="h-5 w-5 text-[#CA6110]"/>
    <h3 className="text-base font-extrabold text-[#28252B]">{words.title}</h3>
   </div>
   <p className="mt-2 text-xs leading-6 text-[#695548]">{words.intro}</p>
  </div>
  <div className="rounded-xl border border-[#EFDDCC] bg-white p-4">
   <div className="grid gap-3 sm:grid-cols-2">
    <div><p className="text-[11px] font-bold uppercase text-[#8B7A6B]">{words.business}</p>
     <p className="mt-1 break-words text-sm font-bold text-[#28252B]">{businessName}</p></div>
    <div><p className="text-[11px] font-bold uppercase text-[#8B7A6B]">{words.brief}</p>
     <p className="mt-1 whitespace-pre-wrap break-words text-sm text-[#35333A]">{request}</p></div>
   </div>
  </div>
  <h4 className="text-sm font-bold text-[#312A26]">{words.step1}</h4>
  {items.length===0?<p className="text-sm text-[#765A43]">{words.none}</p>:<div className="grid gap-3 xl:grid-cols-2">
   {items.map((item,index)=>{
    const sample=sampleFor(item.id,locale,businessName);
    return <article key={item.id} className="min-w-0 rounded-xl border border-[#EEE1D5] bg-white p-4">
     <div className="flex items-start justify-between gap-3">
      <h5 className="text-sm font-extrabold text-[#26252A]">{index+1}. {item.title}</h5>
      {item.blocked?<LockKeyhole aria-label={words.blocked} className="h-4 w-4 shrink-0 text-[#A65B25]"/>:
       <CheckCircle2 aria-label={words.draft} className="h-4 w-4 shrink-0 text-[#A65B25]"/>}
     </div>
     <p className="mt-1 text-[11px] text-[#916C51]">{item.blocked?words.blocked:words.draft}</p>
     <p className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-[#827A78]">{words.sample}</p>
     <div className="mt-2 whitespace-pre-wrap break-words rounded-lg border border-[#EFE8E2] bg-[#F9F9FA] p-3 text-xs leading-6 text-[#34343B]">{sample}</div>
     <div className="mt-3 flex flex-wrap items-center gap-2">
      <button type="button" onClick={()=>void copySample(item.id,sample)}
       className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#E7D8C6] px-3 text-[11px] font-bold text-[#8B4918] hover:bg-[#FFF4E9]">
       <ClipboardCopy className="h-3.5 w-3.5"/>{copied===item.id?words.copied:words.copy}</button>
      <Link href={item.href} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[#FF7900] px-3 text-[11px] font-bold text-[#211B18] hover:bg-[#FF9D43]">
       {words.open}<ArrowRight className="h-3.5 w-3.5"/></Link>
     </div>
     {copied==='error:'+item.id&&<p role="alert" className="mt-2 text-xs text-[#AB3838]">{words.copyError}</p>}
     <p className="mt-3 text-[10px] leading-5 text-[#8F8681]">{words.notCarried}</p>
    </article>;
   })}
  </div>}
  <div className="rounded-xl border border-[#E8D7C6] bg-white p-4">
   <h4 className="text-sm font-bold text-[#26252A]">{words.step2} / {words.step3}</h4>
   <p className="mt-2 text-xs leading-6 text-[#59545A]">{words.nextText}</p>
   <Link href="/vendor/marketing-engine/connections" className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-[#A55211] hover:underline">
    <Mail className="h-4 w-4"/>{words.emailLink}<ArrowRight className="h-3.5 w-3.5"/></Link>
  </div>
  <p className="flex items-start gap-2 text-xs leading-6 text-[#805332]"><ShieldAlert className="mt-1 h-4 w-4 shrink-0"/>{words.warning}</p>
 </div>;
}
