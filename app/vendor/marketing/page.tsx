'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabaseClient';
import IconsaxIcon from '../components/IconsaxIcon';

type Business = { id:string; name:string; category:string; city:string|null; status:string|null };
type Campaign = {id:string;business_id:string|null;banner_text:string;banner_color:string;platforms:string[]|null;status:string|null;scheduled_at:string|null;created_at:string|null};
type Objective = 'awareness'|'promotion'|'enquiries'|'announcement';
type Language = 'English'|'தமிழ்'|'සිංහල';
type Section = 'overview'|'social'|'email'|'calendar'|'library';
const card='border border-[#DCE6DE] bg-white shadow-[0_2px_12px_rgba(22,56,37,.035)]';
const input='w-full min-h-10 border border-[#D7E2D9] bg-white px-3 py-2.5 text-[12px] text-[#264736] outline-none focus:border-[#4D8F64] focus:ring-2 focus:ring-[#E0EFE4]';
const objectives: {key:Objective;title:string;description:string}[]=[
  {key:'awareness',title:'Brand awareness',description:'Introduce your business and what makes it useful'},
  {key:'promotion',title:'Offer / promotion',description:'Communicate a real offer and its conditions'},
  {key:'enquiries',title:'Customer enquiries',description:'Encourage people to contact your business'},
  {key:'announcement',title:'Announcement',description:'Opening hours, events or service updates'},
];
const channels=['Facebook','Instagram','WhatsApp','LinkedIn'] as const;
const languages:Language[]=['English','தமிழ்','සිංහල'];
const clean=(value:string,max=250)=>value.replace(/\s+/g,' ').trim().slice(0,max);
const day=(value:string|null)=>value?new Date(value).toLocaleDateString('en-LK',{day:'numeric',month:'short',year:'numeric'}):'—';

function composeCaption(input:{business:string;city:string;category:string;offer:string;cta:string;objective:Objective;language:Language;terms:string}) {
  const business=clean(input.business)||'Your business';
  const city=clean(input.city,100);
  const offer=clean(input.offer,240);
  const cta=clean(input.cta,130);
  const terms=clean(input.terms,220);
  if(input.language==='தமிழ்')return [business+(city?' · '+city:''),offer||'எங்கள் சேவைகளை அறிந்துகொள்ளுங்கள்.',cta||'மேலும் விவரங்களுக்கு தொடர்புகொள்ளுங்கள்.',terms?'விதிமுறைகள்: '+terms:''].filter(Boolean).join('\n\n');
  if(input.language==='සිංහල')return [business+(city?' · '+city:''),offer||'අපගේ සේවාවන් පිළිබඳ වැඩි විස්තර දැනගන්න.',cta||'වැඩි විස්තර සඳහා අප අමතන්න.',terms?'කොන්දේසි: '+terms:''].filter(Boolean).join('\n\n');
  const headline=input.objective==='promotion'?'An offer worth knowing about':input.objective==='announcement'?'News from our business':input.objective==='enquiries'?'Looking for a local business?':'Discover what we do';
  return [headline+' — '+business+(city?', '+city:''),offer||('Explore our '+(input.category||'local')+' services.'),cta||'Contact us for details.',terms?'Offer conditions: '+terms:''].filter(Boolean).join('\n\n');
}
function downloadText(name:string,contents:string) {
  const file=new Blob([contents],{type:'text/plain;charset=utf-8'});
  const url=URL.createObjectURL(file);const a=document.createElement('a');a.href=url;a.download=name;a.click();
  URL.revokeObjectURL(url);
}
export default function MarketingPage() {
  const [section,setSection]=useState<Section>('overview');
  const [businesses,setBusinesses]=useState<Business[]>([]);
  const [campaigns,setCampaigns]=useState<Campaign[]>([]);
  const [selectedId,setSelectedId]=useState('');
  const [objective,setObjective]=useState<Objective>('awareness');
  const [language,setLanguage]=useState<Language>('English');
  const [offer,setOffer]=useState('');
  const [terms,setTerms]=useState('');
  const [cta,setCta]=useState('');
  const [channelsSelected,setChannelsSelected]=useState<string[]>(['Facebook']);
  const [scheduledAt,setScheduledAt]=useState('');
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  const [userId,setUserId]=useState<string|null>(null);
  const [search,setSearch]=useState('');
  const [posterSize,setPosterSize]=useState<'square'|'portrait'|'story'>('square');
  const [posterPalette,setPosterPalette]=useState<'forest'|'navy'|'cream'>('forest');

  const load=useCallback(async()=>{
    setLoading(true);setError('');
    try {
      const {data:{user},error:authError}=await supabase.auth.getUser();
      if(authError)throw authError;
      if(!user){setUserId(null);setBusinesses([]);setCampaigns([]);return;}
      setUserId(user.id);
      const owned=await supabase.from('businesses').select('id,name,category,city,status').eq('owner_id',user.id).order('name');
      if(owned.error)throw owned.error;
      const list=(owned.data||[]) as Business[];
      setBusinesses(list);setSelectedId(prev=>list.some(b=>b.id===prev)?prev:list[0]?.id||'');
      if(!list.length){setCampaigns([]);return;}
      const result=await supabase.from('marketing_campaigns')
        .select('id,business_id,banner_text,banner_color,platforms,status,scheduled_at,created_at')
        .in('business_id',list.map(b=>b.id)).order('created_at',{ascending:false}).limit(200);
      if(result.error)throw result.error;
      setCampaigns((result.data||[]) as Campaign[]);
    } catch(err){setError(err instanceof Error?err.message:'Could not load marketing workspace.');}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{void load()},[load]);
  const business=businesses.find(b=>b.id===selectedId);
  const preview=useMemo(()=>composeCaption({
    business:business?.name||'',city:business?.city||'',category:business?.category||'',
    offer,terms,cta,objective,language,
  }),[business,offer,terms,cta,objective,language]);
  const visible=campaigns.filter(c=>[c.banner_text,c.status,c.platforms?.join(' '),businesses.find(b=>b.id===c.business_id)?.name].join(' ').toLowerCase().includes(search.toLowerCase()));
  const scheduledCount=campaigns.filter(c=>c.status==='scheduled').length;
  const draftCount=campaigns.filter(c=>c.status==='drafted').length;
  const now=new Date().toISOString().slice(0,16);

  const save=async(schedule:boolean)=>{
    if(!userId||!selectedId||!business){toast.error('Select a business first.');return;}
    if(!clean(offer)&&!clean(cta)){toast.error('Add a campaign message or a call to action.');return;}
    if(!channelsSelected.length){toast.error('Choose at least one distribution channel.');return;}
    if(schedule&&(!scheduledAt||new Date(scheduledAt).getTime()<=Date.now())){toast.error('Choose a future date for a scheduling record.');return;}
    setSaving(true);
    try {
      // marketing_campaigns is owned through businesses RLS. A scheduled
      // record is a planning entry, never a claim that the post was published.
      const result=await supabase.from('marketing_campaigns').insert({
        business_id:selectedId,banner_text:preview.slice(0,3000),banner_color:'growth-brief-v2',
        platforms:channelsSelected.map(x=>x.toLowerCase()),
        scheduled_at:schedule?new Date(scheduledAt).toISOString():null,
        status:schedule?'scheduled':'drafted',
      });
      if(result.error)throw result.error;
      toast.success(schedule?'Campaign planning date saved; external publishing is not automatic.':'Campaign draft saved.');
      setSection('library');void load();
    } catch(err){toast.error(err instanceof Error?err.message:'Could not save campaign.');}
    finally{setSaving(false);}
  };
  const exportBrandedCreative=()=>{
    if(!business){toast.error('Select an owned business first.');return;}
    if(!clean(offer)){toast.error('Enter a factual campaign message to create a poster.');return;}
    const dimensions={square:[1080,1080],portrait:[1080,1350],story:[1080,1920]} as const;
    const [width,height]=dimensions[posterSize];
    const palettes={
      forest:{bg:'#173F2D',soft:'#23543D',accent:'#B4D8A9',text:'#F8FBF6'},
      navy:{bg:'#192D43',soft:'#273F58',accent:'#B1D0E4',text:'#FAFBFE'},
      cream:{bg:'#F3F0E5',soft:'#DFE7D7',accent:'#265E43',text:'#203A2A'},
    } as const;
    const p=palettes[posterPalette];
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
    const ctx=canvas.getContext('2d');if(!ctx){toast.error('Canvas unavailable');return;}
    ctx.fillStyle=p.bg;ctx.fillRect(0,0,width,height);
    ctx.fillStyle=p.soft;ctx.fillRect(width*.64,0,width*.36,height);
    ctx.fillStyle=p.accent;ctx.fillRect(0,0,13,height);
    const left=88,contentWidth=width-176;
    const typeface='system-ui, "Noto Sans Tamil", "Noto Sans Sinhala", sans-serif';
    const wrap=(value:string,font:string,maxWidth:number,maxLines:number)=>{
      ctx.font=font;
      const words=value.trim().split(/\\s+/);
      const lines:string[]=[];let line='';
      for(const word of words){
        const next=line?line+' '+word:word;
        if(ctx.measureText(next).width>maxWidth&&line){lines.push(line);line=word;}
        else line=next;
      }
      if(line)lines.push(line);
      if(lines.length>maxLines){
        const clipped=lines.slice(0,maxLines);
        while(clipped[maxLines-1].length>2&&ctx.measureText(clipped[maxLines-1]+'…').width>maxWidth)
          clipped[maxLines-1]=clipped[maxLines-1].slice(0,-1);
        clipped[maxLines-1]+='…';
        return clipped;
      }
      return lines;
    };
    ctx.textBaseline='top';ctx.textAlign='left';
    ctx.fillStyle=p.accent;ctx.font='700 25px '+typeface;
    ctx.fillText('SLBI  /  BUSINESS CAMPAIGN',left,82);
    ctx.fillStyle=p.text;
    const names=wrap(business.name,'800 57px '+typeface,contentWidth,2);
    names.forEach((line,i)=>{ctx.font='800 57px '+typeface;ctx.fillText(line,left,150+i*74);});
    const top=Math.max(height*.35,330);
    ctx.fillStyle=p.accent;ctx.fillRect(left,top-44,100,5);
    ctx.fillStyle=p.text;
    const message=wrap(clean(offer,240),'700 67px '+typeface,contentWidth,6);
    message.forEach((line,i)=>{ctx.font='700 67px '+typeface;ctx.fillText(line,left,top+i*89);});
    const footerY=height-260;
    ctx.fillStyle=p.accent;ctx.fillRect(left,footerY,contentWidth,2);
    ctx.fillStyle=p.text;ctx.font='600 29px '+typeface;
    const action=clean(cta,120)||'Contact us for details';
    const actionLines=wrap(action,'600 29px '+typeface,contentWidth,2);
    actionLines.forEach((line,i)=>ctx.fillText(line,left,footerY+30+i*39));
    ctx.font='500 21px '+typeface;ctx.fillStyle=p.accent;
    ctx.fillText('SLBUSINESSINDEX.COM  ·  DRAFT — REVIEW BEFORE PUBLISHING',left,height-79);
    const a=document.createElement('a');a.href=canvas.toDataURL('image/png');
    a.download='slbi-'+business.id.slice(0,8)+'-'+posterSize+'-'+language+'.png';a.click();
    toast.success('Branded '+posterSize+' draft downloaded for review.');
  };
  const tabs:{key:Section;name:string;icon:string}[]=[
    {key:'overview',name:'Overview',icon:'category'},
    {key:'social',name:'Social campaigns',icon:'flash'},
    {key:'email',name:'Email marketing',icon:'sms'},
    {key:'calendar',name:'Calendar',icon:'calendar'},
    {key:'library',name:'Campaign library',icon:'document-download'},
  ];
  const launch=(target:Section)=>{setSection(target);document.getElementById('marketing-workspace')?.scrollIntoView({behavior:'smooth',block:'start'});};
  return (
    <div className="mx-auto max-w-[1480px] space-y-5 pb-8 text-[#213D30]">
      <header className="grid gap-5 border-b border-[#DCE7DF] bg-white px-5 py-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end md:px-7">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#538262]">SLBI Growth OS / Marketing Engine</p>
          <h1 className="mt-2 text-[28px] font-bold tracking-[-.045em] md:text-[34px]">Marketing Studio</h1>
          <p className="mt-2 max-w-[720px] text-[12px] leading-6 text-[#647B6B]">Build business-aware campaigns, review multilingual copy, plan distribution, and keep a clear record of every draft. No generic canvas editor.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/vendor/insights" className="flex h-10 items-center gap-2 border border-[#CFE0D3] px-4 text-[12px] font-semibold text-[#3A6348] hover:bg-[#F3F9F3]"><IconsaxIcon name="status-up" size={17}/> Growth insights</Link>
          <button type="button" onClick={()=>launch('social')} className="flex h-10 items-center gap-2 bg-[#235B3C] px-4 text-[12px] font-semibold text-white hover:bg-[#19472E]"><IconsaxIcon name="add" size={17} color="white"/> New campaign</button>
        </div>
      </header>
      {error&&<div role="alert" className="border border-red-200 bg-red-50 p-4 text-[12px] text-red-800">{error}</div>}
      {!loading&&!userId&&<div className={card+' p-6 text-sm'}>Sign in to manage marketing. <Link href="/login?redirect=/vendor/marketing" className="font-bold text-[#286646] underline">Sign in</Link></div>}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          {title:'Saved campaigns',value:campaigns.length,sub:'Actual directory records',icon:'document-download'},
          {title:'Drafts',value:draftCount,sub:'Awaiting your approval',icon:'edit'},
          {title:'Planning dates',value:scheduledCount,sub:'Not automatic social publishing',icon:'calendar'},
        ].map(k=><div key={k.title} className={card+' flex items-start justify-between p-5'}>
          <div><p className="text-[11px] font-semibold text-[#6C8370]">{k.title}</p><p className="mt-2 text-[29px] font-bold tabular-nums tracking-tight">{loading?'—':k.value}</p><p className="mt-1 text-[10px] text-[#8B998D]">{k.sub}</p></div>
          <span className="bg-[#E8F2EA] p-2.5 text-[#38734C]"><IconsaxIcon name={k.icon} size={20}/></span>
        </div>)}
      </div>
      <section aria-label="Marketing services" className="grid gap-3 md:grid-cols-3">
        {[
          {title:'AI Social Marketing',sub:'Business brief, multilingual caption, creative review and campaign planning',icon:'flash',action:'Open social workflow',target:'social' as Section},
          {title:'Consent-based Email',sub:'Audience permissions, segmentation, review and compliance checks',icon:'sms',action:'Review email readiness',target:'email' as Section},
          {title:'Campaign Calendar',sub:'Plan your next promotions without misreporting automated publishing',icon:'calendar',action:'Open calendar',target:'calendar' as Section},
        ].map(item=><button type="button" key={item.title} onClick={()=>launch(item.target)} className={card+' group min-h-[176px] p-5 text-left transition hover:border-[#83B99A] hover:bg-[#FCFEFC]'}>
          <span className="flex h-10 w-10 items-center justify-center bg-[#EAF3EA] text-[#316B48]"><IconsaxIcon name={item.icon} size={20}/></span>
          <h2 className="mt-3 text-[15px] font-bold">{item.title}</h2>
          <p className="mt-1 text-[11px] leading-5 text-[#6C806F]">{item.sub}</p>
          <span className="mt-4 inline-flex items-center gap-1 text-[11px] font-bold text-[#2D7850]">{item.action}<IconsaxIcon name="arrow-right-2" size={13}/></span>
        </button>)}
      </section>

      <div id="marketing-workspace" className="scroll-mt-24 grid items-start gap-5 lg:grid-cols-[210px_minmax(0,1fr)]">
        <nav aria-label="Marketing Studio sections" className={card+' flex flex-wrap gap-1 p-2 lg:sticky lg:top-3 lg:flex-col'}>
          {tabs.map(tab=><button key={tab.key} type="button" onClick={()=>setSection(tab.key)} aria-current={section===tab.key?'page':undefined}
            className={'flex min-h-11 items-center gap-2 border-l-[3px] px-3 py-2 text-left text-[11px] font-semibold transition '+(section===tab.key?'border-[#288051] bg-[#EAF4EC] text-[#215A39]':'border-transparent text-[#718273] hover:bg-[#F5F8F5]')}>
            <IconsaxIcon name={tab.icon} size={17}/>{tab.name}
          </button>)}
        </nav>
        <div className="min-w-0">
          {section==='overview'&&<div className={card+' p-6 md:p-8'}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#4F8860]">Campaign workflow</p>
            <h2 className="mt-2 text-xl font-bold">Plan with a clear objective.</h2>
            <p className="mt-2 text-[12px] leading-6 text-[#6B816F]">Our GrowthOS roadmap requires business context, factual offers, multilingual copy, owner review and consent checks before distribution.</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {['1 · Select an owned business','2 · Define campaign objective','3 · Review multilingual copy','4 · Approve and export','5 · Record planned date','6 · Measure real results'].map(step=><div key={step} className="border border-[#E2EAE2] bg-[#FAFCFA] p-4 text-[12px] font-semibold text-[#355741]">{step}</div>)}
            </div>
            <button type="button" onClick={()=>setSection('social')} className="mt-6 bg-[#235B3C] px-5 py-3 text-xs font-bold text-white">Create a campaign brief</button>
          </div>}
          {section==='social'&&<div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(280px,.85fr)]">
            <div className={card+' min-w-0 p-5 md:p-6'}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#4E8863]">01 · Creative brief</p>
              <h2 className="mt-2 text-[19px] font-bold">Business-aware campaign</h2>
              <p className="mt-1 text-[11px] leading-5 text-[#79907C]">Drafting is local and editable; choose a language and provide reviewed text in that language. Automatic translation and social posting are not enabled.</p>
              <div className="mt-6 space-y-4">
                <label className="block text-[11px] font-semibold text-[#536E5D]">Your business
                  <select className={input+' mt-1.5'} value={selectedId} onChange={e=>setSelectedId(e.target.value)}>
                    <option value="">Select business</option>{businesses.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
                  </select></label>
                <div><span className="text-[11px] font-semibold text-[#536E5D]">Campaign objective</span>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {objectives.map(o=><button type="button" key={o.key} onClick={()=>setObjective(o.key)}
                      className={'border p-3 text-left '+(objective===o.key?'border-[#4A9A65] bg-[#EDF7EF]':'border-[#DEE7DF] bg-white hover:border-[#9DBDA6]')}>
                      <strong className="block text-[11px] text-[#294C35]">{o.title}</strong><span className="mt-1 block text-[10px] leading-4 text-[#7B907D]">{o.description}</span>
                    </button>)}
                  </div>
                </div>
                <label className="block text-[11px] font-semibold text-[#536E5D]">Language
                  <select className={input+' mt-1.5'} value={language} onChange={e=>setLanguage(e.target.value as Language)}>{languages.map(l=><option key={l} value={l}>{l}</option>)}</select>
                </label>
                <label className="block text-[11px] font-semibold text-[#536E5D]">Key message / factual offer
                  <textarea className={input+' mt-1.5 min-h-[96px] resize-y'} maxLength={240} value={offer} onChange={e=>setOffer(e.target.value)} placeholder="The verified service or offer you want customers to know…"/></label>
                <label className="block text-[11px] font-semibold text-[#536E5D]">Call to action
                  <input className={input+' mt-1.5'} maxLength={130} value={cta} onChange={e=>setCta(e.target.value)} placeholder="Call us for availability"/></label>
                <label className="block text-[11px] font-semibold text-[#536E5D]">Offer terms / conditions
                  <input className={input+' mt-1.5'} maxLength={220} value={terms} onChange={e=>setTerms(e.target.value)} placeholder="Valid until… / subject to availability"/></label>
                <div><p className="text-[11px] font-semibold text-[#536E5D]">Distribution channels (planning only)</p>
                  <div className="mt-2 flex flex-wrap gap-2">{channels.map(channel=><button key={channel} type="button" aria-pressed={channelsSelected.includes(channel)}
                    onClick={()=>setChannelsSelected(x=>x.includes(channel)?x.filter(v=>v!==channel):[...x,channel])}
                    className={'border px-3 py-2 text-[11px] font-semibold '+(channelsSelected.includes(channel)?'border-[#56A36F] bg-[#E9F4EB] text-[#276541]':'border-[#DBE5DD] bg-white text-[#67806D]')}>{channel}</button>)}</div>
                </div>
                <label className="block text-[11px] font-semibold text-[#536E5D]">Optional planned date
                  <input type="datetime-local" min={now} value={scheduledAt} onChange={e=>setScheduledAt(e.target.value)} className={input+' mt-1.5'}/></label>
              </div>
              <div className="mt-6 flex flex-wrap gap-2 border-t border-[#E5EBE4] pt-5">
                <button type="button" disabled={saving||!userId} onClick={()=>void save(false)} className="bg-[#235B3C] px-4 py-2.5 text-[12px] font-bold text-white disabled:opacity-40">Save draft</button>
                <button type="button" disabled={saving||!userId||!scheduledAt} onClick={()=>void save(true)} className="border border-[#C9DCCF] px-4 py-2.5 text-[12px] font-semibold text-[#316648] disabled:opacity-40">Record planned date</button>
              </div>
            </div>
            <aside className={card+' min-w-0 overflow-hidden'}>
              <div className="border-b border-[#DEE8DE] bg-[#F6FAF6] p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-[#4C8A60]">02 · Review copy</p><h3 className="mt-1 text-[15px] font-bold">Live campaign draft</h3></div>
              <div className="p-5"><div className="min-h-[255px] border border-[#DBE7DD] bg-[#FCFDFB] p-5">
                <p className="whitespace-pre-wrap break-words text-[13px] leading-7 text-[#2D4B35]">{preview}</p></div>
                <p className="mt-3 text-[10px] leading-5 text-[#819184]">Verify business facts, terms, translations and contact information before sending. This preview is editable through the brief fields.</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" onClick={()=>{void navigator.clipboard.writeText(preview).then(()=>toast.success('Copy saved to clipboard')).catch(()=>toast.error('Could not copy text'));}} className="border border-[#D1E1D3] px-3 py-2.5 text-[11px] font-semibold text-[#2B6748]">Copy caption</button>
                  <button type="button" onClick={()=>downloadText('slbi-campaign-'+language+'.txt',preview)} className="border border-[#D1E1D3] px-3 py-2.5 text-[11px] font-semibold text-[#2B6748]">Export text</button>
                </div>
                <div className="mt-5 border-t border-[#E2ECE3] pt-5">
                  <h4 className="text-[12px] font-bold">Branded creative export</h4>
                  <p className="mt-1 text-[11px] leading-5 text-[#819184]">Generate an editable-brief-based PNG design for social sharing. It only uses the business name and the text you supply; it is not an AI-generated image or an automatically published post.</p>
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <label className="text-[11px] font-semibold text-[#536E5D]">Canvas format
                      <select value={posterSize} onChange={e=>setPosterSize(e.target.value as typeof posterSize)} className={input+' mt-1.5'}>
                        <option value="square">Square · 1080 × 1080</option><option value="portrait">Portrait · 1080 × 1350</option><option value="story">Story · 1080 × 1920</option>
                      </select>
                    </label>
                    <label className="text-[11px] font-semibold text-[#536E5D]">Brand palette
                      <select value={posterPalette} onChange={e=>setPosterPalette(e.target.value as typeof posterPalette)} className={input+' mt-1.5'}>
                        <option value="forest">Forest</option><option value="navy">Navy</option><option value="cream">Cream</option>
                      </select>
                    </label>
                  </div>
                  <button type="button" disabled={!business||!clean(offer)} onClick={exportBrandedCreative} className="mt-3 w-full border border-[#C9DACC] bg-[#EFF6EF] px-3 py-3 text-[11px] font-bold text-[#296744] disabled:opacity-40">
                    Download branded PNG draft
                  </button>
                </div>
                <div className="mt-5 border-t border-[#E2ECE3] pt-5"><h4 className="text-[12px] font-bold">Next design phase</h4><p className="mt-1 text-[11px] leading-5 text-[#819184]">Model-generated creative variations, editable typography, human approval and social-platform API integrations are separate gated features—not a canvas editor or simulated publishing.</p></div>
              </div>
            </aside>
          </div>}
          {section==='email'&&<div className={card+' space-y-5 p-6 md:p-8'}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#4D8B62]">Consent-based campaigns</p>
            <h2 className="text-xl font-bold">Email Marketing · Compliance First</h2>
            <p className="max-w-[720px] text-[12px] leading-6 text-[#708573]">Only use subscribers who explicitly agreed to the campaign purpose. Automated email sends are not enabled until consent records, suppression, unsubscribe handling and deliverability checks are implemented.</p>
            <div className="grid gap-3 sm:grid-cols-2">{[
              ['01','Audience consent','Verified opt-in and purpose-specific permissions'],
              ['02','Segmentation','Relevant customers, without secret profiling'],
              ['03','Human review','Subject, content, sender details and fact-checks'],
              ['04','Compliance checks','Unsubscribe, suppression, SPF/DKIM/DMARC'],
              ['05','Schedule & send','Only after mail provider and entitlements are connected'],
              ['06','Reporting','Measured deliveries and opt-in conversions'],
            ].map(x=><div key={x[0]} className="border border-[#E0E9E0] p-4"><span className="text-[10px] font-bold text-[#7FA98B]">{x[0]}</span><h3 className="mt-1 text-[12px] font-bold">{x[1]}</h3><p className="mt-1 text-[11px] text-[#7B907F]">{x[2]}</p></div>)}</div>
            <div className="border-l-[3px] border-[#B8984E] bg-[#FBF7E9] px-4 py-3 text-[11px] text-[#8E763E]">Email sending is not yet active. No unconsented leads or automatically imported CRM contacts are used.</div>
          </div>}
          {section==='calendar'&&<div className={card+' p-6'}>
            <h2 className="text-xl font-bold">Campaign planning calendar</h2><p className="mt-1 text-[12px] text-[#718575]">These are planning records, not confirmed social-network publishing times.</p>
            <div className="mt-6 space-y-2">{campaigns.filter(c=>c.scheduled_at).sort((a,b)=>String(a.scheduled_at).localeCompare(String(b.scheduled_at))).map(c=><div key={c.id} className="flex flex-wrap items-start gap-4 border border-[#E2EAE2] p-4 text-[11px]">
              <span className="w-28 font-bold text-[#3D7251]">{day(c.scheduled_at)}</span><div className="min-w-0 flex-1"><p className="font-semibold text-[#324C3A]">{businesses.find(b=>b.id===c.business_id)?.name||'Business'}</p><p className="mt-1 line-clamp-2 text-[#7D917F]">{c.banner_text}</p></div><span className="border border-[#E0E8DF] px-2 py-1 text-[#78907D]">{c.status}</span>
            </div>)}{!campaigns.some(c=>c.scheduled_at)&&<p className="border border-dashed border-[#D7E2D9] p-6 text-sm text-[#819384]">No dates planned yet. Create a campaign brief to begin.</p>}</div>
          </div>}
          {section==='library'&&<div className={card+' overflow-hidden'}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E3EAE2] p-5"><div><h2 className="text-[17px] font-bold">Campaign library</h2><p className="mt-1 text-[11px] text-[#7B8F7E]">Owner-scoped saved drafts and scheduling records.</p></div>
              <input aria-label="Filter saved campaigns" className={input+' max-w-[240px]'} placeholder="Search saved campaigns" value={search} onChange={e=>setSearch(e.target.value)}/></div>
            <div className="divide-y divide-[#E7EDE7]">{visible.map(c=><div key={c.id} className="grid gap-3 p-5 sm:grid-cols-[minmax(0,1fr)_auto]">
              <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wide text-[#5C8D69]">{businesses.find(b=>b.id===c.business_id)?.name||'Your business'} · {c.status}</p>
                <p className="mt-2 line-clamp-3 whitespace-pre-wrap break-words text-[12px] leading-6 text-[#395543]">{c.banner_text}</p>
                <p className="mt-2 text-[10px] text-[#889989]">Created {day(c.created_at)} · {c.platforms?.join(', ')||'No channels'}{c.scheduled_at?' · Planned '+day(c.scheduled_at):''}</p></div>
              <button type="button" onClick={()=>downloadText('slbi-campaign-'+c.id.slice(0,8)+'.txt',c.banner_text)} className="h-9 self-center border border-[#C9DACC] px-3 text-[11px] font-semibold text-[#326B49]">Export copy</button>
            </div>)}{!loading&&!visible.length&&<div className="p-8 text-center text-[12px] text-[#7E9081]">No saved campaigns match. Start with a business-aware brief.</div>}</div>
          </div>}
        </div>
      </div>
      <footer className="border-t border-[#E4EAE1] pt-4 text-[10px] leading-5 text-[#7F8E81]">Marketing workflow follows the SLBI Growth & Security OS roadmap. No invented reach, consent, AI generation or automatic publishing is reported.</footer>
    </div>
  );
}
