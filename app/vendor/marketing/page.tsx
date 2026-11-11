'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import IconsaxIcon from '../components/IconsaxIcon';

type Business = { id:string; name:string; category:string|null; city:string|null; status:string|null };
type Campaign = {id:string;business_id:string;banner_text:string|null;status:string|null;platforms:string[]|null;scheduled_at:string|null;created_at:string;businesses:{name:string}|{name:string}[]|null};
type Mode = 'social' | 'email' | 'calendar' | 'library';
type Language = 'English' | 'Tamil' | 'Sinhala';
type Objective = 'Awareness' | 'Enquiries' | 'Offer' | 'Repeat customers';
type Platform = 'Facebook'|'Instagram'|'WhatsApp'|'LinkedIn';
const platforms:Platform[]=['Facebook','Instagram','WhatsApp','LinkedIn'];
const panel='rounded-[9px] border border-[#DEE7E0] bg-white shadow-[0_3px_16px_rgba(25,65,42,.035)]';
const input='w-full min-w-0 rounded-[6px] border border-[#D9E5DB] bg-white px-3 py-2.5 text-[12px] text-[#274234] outline-none focus:border-[#6AAB7C] focus:ring-2 focus:ring-[#E4F1E4]';
const label='mb-1.5 block text-[11px] font-bold text-[#526C58]';
const formatDate=(date:string)=>new Date(date).toLocaleString('en-LK',{dateStyle:'medium',timeStyle:'short'});
const campaignTitle=(value:string)=>value.trim().replace(/\s+/g,' ').slice(0,180);
const exportText=(name:string,text:string)=>{
  const objectUrl=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));
  const anchor=document.createElement('a');anchor.href=objectUrl;anchor.download=name;anchor.click();
  window.setTimeout(()=>URL.revokeObjectURL(objectUrl),1000);
};
function approvedFacts(b:Business|null){
  return b?[b.name,b.category,b.city].filter(Boolean).join(' · '):'Select an approved business';
}
export default function MarketingStudioPage(){
  const [mode,setMode]=useState<Mode>('social');
  const [businesses,setBusinesses]=useState<Business[]>([]);
  const [selectedId,setSelectedId]=useState('');
  const [campaigns,setCampaigns]=useState<Campaign[]>([]);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  const [objective,setObjective]=useState<Objective>('Enquiries');
  const [language,setLanguage]=useState<Language>('English');
  const [channels,setChannels]=useState<Platform[]>(['Facebook','Instagram']);
  const [audience,setAudience]=useState('Local customers');
  const [offer,setOffer]=useState('');
  const [tone,setTone]=useState('Professional and friendly');
  const [callToAction,setCallToAction]=useState('Contact us for details');
  const [scheduledAt,setScheduledAt]=useState('');
  const [subject,setSubject]=useState('');
  const [emailDraft,setEmailDraft]=useState('');
  const [consentChecked,setConsentChecked]=useState(false);
  const [approvedBrief,setApprovedBrief]=useState(false);
  const selected=businesses.find(b=>b.id===selectedId)||null;

  const load=useCallback(async()=>{
    setLoading(true);setError('');
    try{
      const {data:{user},error:authError}=await supabase.auth.getUser();
      if(authError)throw authError;
      if(!user){setError('Sign in to use Marketing Studio.');setBusinesses([]);setCampaigns([]);return;}
      const businessResult=await supabase.from('businesses').select('id,name,category,city,status')
        .eq('owner_id',user.id).eq('status','approved').order('name');
      if(businessResult.error)throw businessResult.error;
      const owned=(businessResult.data||[]) as Business[];
      setBusinesses(owned);
      setSelectedId(old=>owned.some(b=>b.id===old)?old:owned[0]?.id||'');
      if(owned.length===0){setCampaigns([]);return;}
      const campaignResult=await supabase.from('marketing_campaigns')
        .select('id,business_id,banner_text,status,platforms,scheduled_at,created_at,businesses(name)')
        .in('business_id',owned.map(b=>b.id)).order('created_at',{ascending:false}).limit(100);
      if(campaignResult.error)throw campaignResult.error;
      setCampaigns((campaignResult.data||[]) as Campaign[]);
    }catch(e){setError(e instanceof Error?e.message:'Marketing records could not be loaded.');}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{void load()},[load]);
  useEffect(()=>{setApprovedBrief(false)},[selectedId,objective,language,channels,offer,audience,tone,callToAction]);

  const brief=useMemo(()=>{
    const name=selected?.name||'Your business';
    return [
      'SL BUSINESS INDEX / CREATIVE BRIEF',
      'Business: '+approvedFacts(selected),
      'Objective: '+objective,
      'Channels: '+(channels.length?channels.join(', '):'Not selected'),
      'Audience: '+audience.trim(),
      'Language: '+language,
      'Brand voice: '+tone,
      'Offer / approved facts: '+(offer.trim()||'No special offer specified'),
      'Call to action: '+callToAction.trim(),
      '',
      'COPY GUIDANCE — FOR HUMAN REVIEW',
      (language==='Tamil'?'தமிழ்: ':language==='Sinhala'?'සිංහල: ':'English: ')+name+' · '+(offer.trim()||objective)+' · '+callToAction,
      '',
      'Deliverables to prepare: campaign caption, hashtag options, 2–4 creative concepts,',
      'square and portrait assets, stories/WhatsApp status and platform-specific versions.',
      'Verify product claims, prices, phone numbers, offer conditions and dates before publishing.',
      'No AI image, automatic publication or external social integration has been executed.',
    ].join('\n');
  },[selected,objective,channels,audience,language,tone,offer,callToAction]);

  const toggleChannel=(c:Platform)=>setChannels(old=>old.includes(c)?old.filter(x=>x!==c):[...old,c]);
  const copyText=async(value:string)=>{
    try{await navigator.clipboard.writeText(value);toast.success('Copied to clipboard');}
    catch{toast.error('Clipboard access unavailable. Use Download instead.');}
  };
  const saveCampaign=async(schedule:boolean)=>{
    if(!selected||!approvedBrief){toast.error('Select a business and approve the brief before saving.');return;}
    if(schedule&&(!scheduledAt||!Number.isFinite(Date.parse(scheduledAt))||Date.parse(scheduledAt)<=Date.now())){
      toast.error('Choose a future date to record a schedule.');return;
    }
    setSaving(true);
    try{
      const {error:writeError}=await supabase.from('marketing_campaigns').insert({
        business_id:selected.id,banner_text:campaignTitle(offer||objective+' · '+audience),
        banner_color:'bg-emerald-600',platforms:channels.map(x=>x.toLowerCase()),
        scheduled_at:schedule?new Date(scheduledAt).toISOString():null,
        status:schedule?'scheduled':'drafted',
      });
      if(writeError)throw writeError;
      toast.success(schedule?'Schedule recorded in SLBI. External publishing is not connected.':'Campaign draft saved to SLBI.');
      setMode('library');void load();
    }catch(e){toast.error(e instanceof Error?e.message:'Unable to save campaign.');}
    finally{setSaving(false);}
  };
  const modes:{id:Mode;name:string;icon:string;description:string}[]=[
    {id:'social',name:'Social campaigns',icon:'flash',description:'Brief, review and creative directions'},
    {id:'email',name:'Email intelligence',icon:'sms',description:'Consent-first message planning'},
    {id:'calendar',name:'Content calendar',icon:'calendar',description:'Track internal campaign schedules'},
    {id:'library',name:'Campaign records',icon:'document-download',description:'Owner-scoped saved work'},
  ];
  return <div className="mx-auto max-w-[1500px] space-y-5 text-[#273F32]">
    <header className="vendor-premium-header flex flex-wrap items-end justify-between gap-4 px-6 py-7 sm:px-8">
      <div className="relative z-10 max-w-[760px]">
        <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#BCDCC0]">SLBI Growth OS / Marketing Engine</p>
        <h1 className="mt-2 text-[27px] font-extrabold tracking-[-.04em] text-white sm:text-[34px]">Marketing command center.</h1>
        <p className="mt-2 max-w-[650px] text-[12px] leading-6 text-[#DAE9D8]">Plan business-aware social campaigns, multilingual messaging and consent-first email programs. Clear workflow, real records, no confusing canvas.</p>
      </div>
      <div className="relative z-10 flex gap-2">
        <Link href="/vendor/insights" className="inline-flex h-10 items-center gap-2 rounded-[6px] border border-white/25 px-4 text-xs font-bold text-white hover:bg-white/10"><IconsaxIcon name="status-up" size={16}/> Growth insights</Link>
        <button type="button" onClick={()=>void load()} disabled={loading} className="inline-flex h-10 items-center gap-2 rounded-[6px] bg-white px-4 text-xs font-bold text-[#254E37]"><IconsaxIcon name="refresh" size={16}/> Refresh</button>
      </div>
    </header>
    {error&&<div role="alert" className="rounded-[7px] border border-[#E7C6BB] bg-[#FFF7F3] p-4 text-xs text-[#9E5641]">{error} <Link className="underline" href="/login?redirect=/vendor/marketing">Sign in</Link></div>}
    <section className={panel+' p-4 sm:p-5'}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#7A9780]">Step 01 / Business context</p><h2 className="mt-1 text-[16px] font-extrabold">Campaign workspace</h2></div>
        <label className="w-full max-w-[365px] text-xs"><span className={label}>Approved business</span>
          <select className={input} value={selectedId} onChange={e=>setSelectedId(e.target.value)} disabled={loading||!businesses.length}>
            {!businesses.length&&<option value="">No approved business available</option>}
            {businesses.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </label>
      </div>
      <p className="mt-3 text-[11px] leading-5 text-[#698371]">Only your approved business facts can be used in campaign planning. An approved brief is not an automatically generated or published advertisement.</p>
    </section>
    <div className="grid gap-4 md:grid-cols-4">
      {modes.map(item=><button key={item.id} type="button" onClick={()=>setMode(item.id)} aria-pressed={mode===item.id}
        className={'flex min-w-0 flex-col items-start gap-2 rounded-[8px] border p-4 text-left transition '+(mode===item.id?'border-[#7BAB87] bg-[#EAF3EA]':'border-[#E1E9E0] bg-white hover:border-[#B7CDB9]')}>
        <IconsaxIcon name={item.icon} size={22}/><span className="text-[13px] font-extrabold text-[#244C34]">{item.name}</span><span className="text-[11px] leading-5 text-[#7D9180]">{item.description}</span>
      </button>)}
    </div>
    {mode==='social'&&<div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,.9fr)]">
      <section className={panel+' space-y-5 p-5 sm:p-6'}>
        <div><p className="vendor-kicker">Step 02 / Creative strategy</p><h2 className="mt-1 text-[19px] font-extrabold">Build the campaign brief</h2><p className="mt-1 text-xs text-[#799080]">Guided planning — no canvas editor.</p></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label><span className={label}>Campaign objective</span><select className={input} value={objective} onChange={e=>setObjective(e.target.value as Objective)}>{(['Awareness','Enquiries','Offer','Repeat customers'] as Objective[]).map(x=><option key={x}>{x}</option>)}</select></label>
          <label><span className={label}>Creative language</span><select className={input} value={language} onChange={e=>setLanguage(e.target.value as Language)}>{(['English','Tamil','Sinhala'] as Language[]).map(x=><option key={x}>{x}</option>)}</select></label>
          <label><span className={label}>Audience</span><input className={input} maxLength={100} value={audience} onChange={e=>setAudience(e.target.value)}/></label>
          <label><span className={label}>Brand voice</span><select className={input} value={tone} onChange={e=>setTone(e.target.value)}><option>Professional and friendly</option><option>Premium and understated</option><option>Warm and local</option><option>Energetic and clear</option></select></label>
        </div>
        <label><span className={label}>Approved offer / product details</span><textarea className={input} rows={3} maxLength={500} value={offer} onChange={e=>setOffer(e.target.value)} placeholder="Describe an accurate offer, conditions and product details. No invented prices."/></label>
        <label><span className={label}>Call to action</span><input className={input} maxLength={120} value={callToAction} onChange={e=>setCallToAction(e.target.value)}/></label>
        <div><span className={label}>Destination platforms</span><div className="flex flex-wrap gap-2">{platforms.map(p=><button key={p} type="button" aria-pressed={channels.includes(p)} onClick={()=>toggleChannel(p)} className={'rounded-[6px] border px-3 py-2 text-xs font-semibold '+(channels.includes(p)?'border-[#82B18C] bg-[#EAF4EB] text-[#246343]':'border-[#DFE7E0] bg-white text-[#698070]')}>{p}</button>)}</div></div>
        <label className="flex items-start gap-3 border-t border-[#E8EFE8] pt-4 text-xs leading-5 text-[#5E7A66]"><input type="checkbox" className="mt-1 accent-[#286844]" checked={approvedBrief} onChange={e=>setApprovedBrief(e.target.checked)}/>I reviewed these business facts and approve this brief for saving.</label>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={!selected||!approvedBrief||saving} onClick={()=>void saveCampaign(false)} className="vendor-primary-button">Save campaign draft</button>
          <button type="button" disabled={!selected} onClick={()=>exportText('slbi-campaign-brief.txt',brief)} className="vendor-outline-button"><IconsaxIcon name="document-download" size={15}/> Export brief</button>
        </div>
      </section>
      <aside className={panel+' min-w-0 overflow-hidden'}>
        <div className="border-b border-[#E5EDE5] bg-[#F7FAF7] p-5"><p className="vendor-kicker">Step 03 / Human review</p><h2 className="mt-1 text-[19px] font-extrabold">Creative direction</h2><p className="mt-1 text-[11px] text-[#829684]">Ready for AI creative service integration; current brief is deterministic and editable.</p></div>
        <pre className="max-h-[500px] overflow-auto whitespace-pre-wrap break-words p-5 font-sans text-[12px] leading-7 text-[#375343]">{brief}</pre>
        <div className="flex flex-wrap gap-2 border-t border-[#E8EFE6] p-4">
          <button type="button" onClick={()=>void copyText(brief)} className="vendor-outline-button"><IconsaxIcon name="document-download" size={14}/> Copy</button>
          <button type="button" onClick={()=>exportText('slbi-campaign-brief.txt',brief)} className="vendor-outline-button">Download .txt</button>
        </div>
      </aside>
    </div>}
    {mode==='email'&&<div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(270px,.7fr)]">
      <section className={panel+' space-y-4 p-5 sm:p-6'}>
        <p className="vendor-kicker">Consent-first email marketing</p><h2 className="text-[20px] font-extrabold">Campaign intelligence</h2>
        <p className="text-[12px] leading-6 text-[#728776]">Prepare human-reviewed copy. Sending, contact imports and audience segmentation stay locked until verified opt-in, unsubscribe handling, suppression and sender authentication are operational.</p>
        <label><span className={label}>Subject</span><input className={input} maxLength={120} value={subject} onChange={e=>setSubject(e.target.value)} placeholder="Clear, accurate subject line"/></label>
        <label><span className={label}>Email copy</span><textarea className={input} rows={9} maxLength={4000} value={emailDraft} onChange={e=>setEmailDraft(e.target.value)} placeholder="Draft a permission-based message using only approved business facts."/></label>
        <label className="flex gap-2 text-xs leading-5 text-[#6E8675]"><input type="checkbox" checked={consentChecked} onChange={e=>setConsentChecked(e.target.checked)} className="mt-1 accent-[#2D714D]"/>I understand that only opted-in recipients may receive marketing messages.</label>
        <div className="flex flex-wrap gap-2"><button type="button" disabled={!subject.trim()||!emailDraft.trim()||!consentChecked} onClick={()=>exportText('slbi-email-draft.txt', 'Subject: '+subject+'\n\n'+emailDraft+'\n\n[Add compliant unsubscribe details before sending]')} className="vendor-primary-button">Download reviewed draft</button><span className="self-center text-[11px] text-[#9B8164]">No emails will be sent by this action.</span></div>
      </section>
      <section className={panel+' p-5 sm:p-6'}><h3 className="text-[16px] font-bold">Delivery readiness</h3><div className="mt-5 space-y-3">{['Evidence of consent and lawful purpose','Audience segments and suppression list','Sender SPF, DKIM and DMARC checks','Unsubscribe workflow and complaint handling','Human approval and scheduled delivery'].map((x,i)=><div key={x} className="flex gap-3 border-b border-[#EFF2EE] pb-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[5px] border border-[#D9E6D8] bg-[#F0F5EF] text-[10px] font-bold text-[#7F9983]">{i+1}</span><span className="text-[12px] leading-5 text-[#617869]">{x}</span></div>)}</div><p className="mt-5 rounded-[6px] bg-[#FFF8EB] p-3 text-xs text-[#946A30]">Email sending is not enabled. This is a preparation workspace, not a provider integration.</p></section>
    </div>}
    {mode==='calendar'&&<div className={panel+' space-y-5 p-5 sm:p-6'}>
      <div><p className="vendor-kicker">Schedule preparation</p><h2 className="mt-1 text-[19px] font-bold">Content calendar</h2><p className="mt-1 text-[11px] text-[#7F9584]">Store an internal planned date; external networks are never automatically published from these records.</p></div>
      <label className="block max-w-[320px]"><span className={label}>Campaign date and time</span><input type="datetime-local" className={input} value={scheduledAt} onChange={e=>setScheduledAt(e.target.value)}/></label>
      <div className="flex flex-wrap gap-3"><button type="button" className="vendor-primary-button" disabled={!selected||!approvedBrief||saving} onClick={()=>void saveCampaign(true)}>Save internal schedule</button><button type="button" className="vendor-outline-button" onClick={()=>setMode('social')}>Review campaign brief</button></div>
      {!approvedBrief&&<p className="text-xs text-[#9D7447]">Approve the brief in Social campaigns before scheduling.</p>}
      <div className="border-t border-[#E5EBE5] pt-5"><h3 className="text-[13px] font-bold">Scheduled records</h3><div className="mt-3 space-y-2">{campaigns.filter(c=>c.status==='scheduled').map(c=><p key={c.id} className="flex flex-wrap justify-between gap-2 border-b border-[#EDF1EC] py-3 text-[12px]"><span>{c.banner_text||'Campaign'} <span className="text-[#8EA092]">· {businesses.find(b=>b.id===c.business_id)?.name||'Business'}</span></span><span className="font-semibold text-[#456E53]">{c.scheduled_at?formatDate(c.scheduled_at):'Not set'}</span></p>)}{!campaigns.some(c=>c.status==='scheduled')&&<p className="py-5 text-xs text-[#899A8C]">No internal schedules found.</p>}</div></div>
    </div>}
    {mode==='library'&&<div className={panel+' overflow-hidden'}>
      <div className="border-b border-[#E5EBE5] p-5 sm:p-6"><h2 className="text-[19px] font-extrabold">Campaign record library</h2><p className="mt-1 text-[11px] text-[#7A8C7D]">Existing owner-scoped records remain intact. “Posted” is a database status, not proof of publication to an external network.</p></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-xs"><thead className="bg-[#F7FAF7] text-[10px] uppercase tracking-wider text-[#758C7A]"><tr><th className="px-5 py-3">Campaign</th><th className="px-5 py-3">Business</th><th className="px-5 py-3">SLBI status</th><th className="px-5 py-3">Created</th></tr></thead><tbody className="divide-y divide-[#EDF2ED]">{campaigns.map(c=><tr key={c.id}><td className="px-5 py-3 font-semibold">{c.banner_text||'Untitled campaign'}</td><td className="px-5 py-3">{businesses.find(b=>b.id===c.business_id)?.name||'Your business'}</td><td className="px-5 py-3 capitalize">{c.status||'unknown'}</td><td className="px-5 py-3 text-[#748879]">{formatDate(c.created_at)}</td></tr>)}{!campaigns.length&&<tr><td colSpan={4} className="px-5 py-12 text-center text-[#829685]">{loading?'Loading saved campaigns…':'No saved campaigns. Create a brief to begin.'}</td></tr>}</tbody></table></div>
    </div>}
    <footer className="pb-5 text-center text-[10px] text-[#91A396]">SLBI Marketing Engine · Business-aware planning · Consent first · No automatic publishing claims</footer>
  </div>;
}
