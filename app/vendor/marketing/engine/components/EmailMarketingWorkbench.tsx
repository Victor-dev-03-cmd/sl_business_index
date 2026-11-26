'use client';

import {useMemo,useState} from 'react';
import Link from 'next/link';
import IconsaxIcon from '@/app/vendor/components/IconsaxIcon';

type Locale='en'|'ta'|'si';
type Kind='announcement'|'offer'|'followup';
const languages:{value:Locale;label:string}[]=[
  {value:'en',label:'English'},{value:'ta',label:'தமிழ்'},{value:'si',label:'සිංහල'},
];
const campaigns:{value:Kind;label:string}[]=[
  {value:'announcement',label:'Business update'},{value:'offer',label:'Promotion draft'},
  {value:'followup',label:'Customer follow-up'},
];
const templates:Record<Locale,Record<Kind,{subject:string;hello:string;lead:string;close:string}>>={
 en:{
  announcement:{subject:'An update from',hello:'Hello,',lead:'We would like to share this update:',close:'Thank you for staying connected.'},
  offer:{subject:'An offer from',hello:'Hello,',lead:'Here is an offer from our team:',close:'Please check the details and availability with us.'},
  followup:{subject:'Following up with',hello:'Hello,',lead:'Thank you for your enquiry. Here is an update:',close:'Please let us know if you have any questions.'},
 },
 ta:{
  announcement:{subject:'புதிய தகவல் -',hello:'வணக்கம்,',lead:'எங்கள் வணிகத்திலிருந்து ஒரு புதிய தகவல்:',close:'எங்களுடன் இணைந்திருப்பதற்கு நன்றி.'},
  offer:{subject:'சலுகை -',hello:'வணக்கம்,',lead:'எங்களுடைய சலுகை விவரம்:',close:'மேலதிக விபரங்களுக்கு எங்களைத் தொடர்புகொள்ளுங்கள்.'},
  followup:{subject:'தொடர்பு தகவல் -',hello:'வணக்கம்,',lead:'உங்கள் விசாரணைக்கு நன்றி. இதோ மேலதிக தகவல்:',close:'கேள்விகள் இருந்தால் எங்களைத் தொடர்புகொள்ளுங்கள்.'},
 },
 si:{
  announcement:{subject:'නව තොරතුරු -',hello:'ආයුබෝවන්,',lead:'අපගේ ව්‍යාපාරයේ නව තොරතුරු:',close:'අප සමඟ රැඳී සිටීම ගැන ස්තූතියි.'},
  offer:{subject:'විශේෂ දීමනාව -',hello:'ආයුබෝවන්,',lead:'අපගේ දීමනා විස්තර:',close:'වැඩි විස්තර සඳහා අප හා සම්බන්ධ වන්න.'},
  followup:{subject:'පසු විපරම -',hello:'ආයුබෝවන්,',lead:'ඔබගේ විමසීමට ස්තූතියි. වැඩිදුර තොරතුරු:',close:'ඕනෑම ප්‍රශ්නයක් ඇත්නම් අප හා සම්බන්ධ වන්න.'},
 },
};
const clean=(value:string,max:number)=>value.replace(/[\u0000-\u001F\u007F]/g,' ').trim().slice(0,max);

/**
 * Offline reviewed marketing copy. No GPT/Gemini inference, contact import,
 * API writes, persistence, batch scheduling or automatic Gmail send.
 */
export default function EmailMarketingWorkbench({mailboxConnected=false}:{
  mailboxConnected?:boolean;
}){
  const [locale,setLocale]=useState<Locale>('en');
  const [kind,setKind]=useState<Kind>('announcement');
  const [business,setBusiness]=useState('');
  const [details,setDetails]=useState('');
  const [cta,setCta]=useState('');
  const [subjectOverride,setSubjectOverride]=useState('');
  const [copied,setCopied]=useState(false);
  const template=templates[locale][kind];
  const draft=useMemo(()=>{
    const brand=clean(business,100)||'[Business name]';
    const content=clean(details,1200)||'[Add accurate, approved business details]';
    const action=clean(cta,180);
    return {
      subject:clean(subjectOverride,140)||template.subject+' '+brand,
      body:[template.hello,'',template.lead,content,'',action,template.close,'',brand,
        '',kind==='offer'?'[Unsubscribe link — required before any marketing send]':''].filter((line,i,a)=>
          !(line===''&&a[i-1]==='')).join('\n').trim(),
    };
  },[business,details,cta,subjectOverride,template,kind]);
  const copy=async()=>{
    setCopied(false);
    try{
      await navigator.clipboard.writeText('Subject: '+draft.subject+'\n\n'+draft.body);
      setCopied(true);
    }catch{setCopied(false);}
  };
  const label='block text-[11px] font-semibold text-[#5B575E]';
  const input='mt-2 min-h-11 w-full min-w-0 rounded-xl border border-[#E6E3E5] bg-white px-3 py-2.5 text-[12px] text-[#29262D] outline-none focus:border-[#FF7900] focus:ring-2 focus:ring-[#FF7900]/15';
  return <section data-testid="email-marketing-workbench" className="rounded-[22px] border border-[#ECE9EC] bg-white p-5 shadow-[0_7px_22px_rgba(34,29,32,.035)] sm:p-7">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#B6621E]">Email Studio · Human review</p>
        <h2 className="mt-1 text-[21px] font-bold tracking-tight text-[#222126]">Prepare an email campaign</h2>
        <p className="mt-2 max-w-2xl text-[11px] leading-6 text-[#767079]">Write honest, multilingual email copy. This rules-first template assistant produces editable drafts, not AI-generated or automatically sent messages.</p>
      </div>
      <span className="rounded-full bg-[#FFF1E8] px-3 py-1.5 text-[10px] font-bold text-[#A85311]">Draft only · No send</span>
    </header>
    <div className="mt-5 grid gap-5 xl:grid-cols-2">
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={label}>Language
            <select value={locale} onChange={e=>{setLocale(e.target.value as Locale);setSubjectOverride('');setCopied(false);}} className={input}>
              {languages.map(v=><option key={v.value} value={v.value}>{v.label}</option>)}
            </select></label>
          <label className={label}>Email type
            <select value={kind} onChange={e=>{setKind(e.target.value as Kind);setSubjectOverride('');setCopied(false);}} className={input}>
              {campaigns.map(v=><option key={v.value} value={v.value}>{v.label}</option>)}
            </select></label>
        </div>
        <label className={label}>Business name
          <input maxLength={100} value={business} onChange={e=>{setBusiness(e.target.value);setCopied(false);}} className={input} placeholder="Your owned business name"/></label>
        <label className={label}>Approved message / offer details
          <textarea rows={5} maxLength={1200} value={details} onChange={e=>{setDetails(e.target.value);setCopied(false);}}
            className={input+' resize-y'} placeholder="Write the accurate information you want to share. No invented offers."/>
        </label>
        <label className={label}>Call to action (optional)
          <input maxLength={180} value={cta} onChange={e=>{setCta(e.target.value);setCopied(false);}} className={input} placeholder="Contact us for more details"/></label>
        <label className={label}>Custom subject (optional)
          <input maxLength={140} value={subjectOverride} onChange={e=>{setSubjectOverride(e.target.value);setCopied(false);}} className={input} placeholder="Keep the automatically suggested subject"/></label>
      </div>
      <div className="flex min-w-0 flex-col rounded-[18px] border border-[#ECE5E2] bg-[#FCFAF9] p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3 border-b border-[#EBE4E0] pb-3">
          <h3 className="text-[13px] font-bold text-[#282329]">Email preview</h3>
          <span className="text-[10px] text-[#918890]">Editable · Local only</span>
        </div>
        <div className="mt-4 space-y-3 text-[12px] text-[#4D474B]">
          <p className="break-words"><strong className="text-[#2A252A]">Subject:</strong> {draft.subject}</p>
          <pre className="min-h-[220px] whitespace-pre-wrap break-words rounded-xl bg-white p-4 font-[family-name:var(--font-inter)] text-[12px] leading-7 text-[#3D383D]">{draft.body}</pre>
        </div>
        <div className="mt-auto flex flex-wrap gap-2 pt-4">
          <button type="button" onClick={()=>void copy()} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#242126] px-4 text-[11px] font-semibold text-white">
            <IconsaxIcon name="document-download" size={17} color="white"/>{copied?'Copied to clipboard':'Copy reviewed draft'}
          </button>
          <Link href="/vendor/marketing-engine/connections" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#DEC9BA] bg-white px-4 text-[11px] font-semibold text-[#AF5C1A]">Gmail Connector <IconsaxIcon name="arrow-right-2" size={15}/></Link>
        </div>
      </div>
    </div>
    <div className="mt-5 rounded-xl border border-[#F2DCCB] bg-[#FFF8F1] p-4 text-[11px] leading-6 text-[#805C48]">
      <strong>Marketing safety:</strong> {mailboxConnected?'Preview Gmail authorization exists, but sending is not activated. ':'Gmail connection is not active in this environment. '}
      A received email does not establish promotional opt-in. Sending requires a separate reviewed audience, consent records, suppression/unsubscribe support, Google authorization and an audited execution workflow. No contact list or email is sent from this screen.
    </div>
  </section>;
}
