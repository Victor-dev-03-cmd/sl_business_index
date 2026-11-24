'use client';

import {useCallback,useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {toast} from 'sonner';
import {supabase} from '@/lib/supabaseClient';
import IconsaxIcon from '../../components/IconsaxIcon';
import CampaignFormatSelector from './CampaignFormatSelector';
import LinkedCaptionPoster from './LinkedCaptionPoster';
import {tFor,type CampaignFormat,type CampaignPalette,type CampaignLanguage,type CampaignObjective} from '@/lib/marketing/campaign-language';
import {renderCampaignPoster} from '@/lib/marketing/campaign-poster';
import {CAMPAIGN_HELP,getCampaignStarterIdeas} from '@/lib/marketing/campaign-starters';
import {CheckCircle2,Lightbulb,ShieldCheck,ArrowRight} from 'lucide-react';
import G1PlannerFacts from './G1PlannerFacts';
import {shareCampaignCaption} from '@/lib/marketing/campaign-manual-share';
import {Share2} from 'lucide-react';

type Business={id:string;name:string;category:string;city:string|null;status:string|null};
type CampaignBrief={
  offer:string;cta:string;terms:string;language:CampaignLanguage;
  objective:CampaignObjective;format:CampaignFormat;palette:CampaignPalette;
  createdFrom?:string;posterLocalKey?:string|null;
  selectedAngle?:string;captionBundle?:unknown;
};
type Campaign={
  id:string;business_id:string|null;banner_text:string;banner_color:string;
  platforms:string[]|null;status:string|null;scheduled_at:string|null;created_at:string|null;
  brief:CampaignBrief|null;is_archived:boolean;poster_asset_id?:string|null;
};
type Section='overview'|'social'|'calendar'|'library';
const channels=['Facebook','Instagram','WhatsApp','LinkedIn'] as const;
const languages:CampaignLanguage[]=['English','தமிழ்','සිංහල'];
const goals:CampaignObjective[]=['awareness','promotion','enquiries','announcement'];
const validFormats:CampaignFormat[]=['square','portrait','story','landscape'];
const clean=(s:string,limit=3000)=>s.trim().replace(/\r/g,'').slice(0,limit);
const formatDate=(s:string|null)=>s?new Date(s).toLocaleDateString('en-LK',{day:'numeric',month:'short',year:'numeric'}):'—';
const localDatetime=(iso:string|null)=>{
  if(!iso)return '';
  const d=new Date(iso);
  if(!Number.isFinite(d.getTime()))return '';
  const p=(n:number)=>String(n).padStart(2,'0');
  return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+'T'+p(d.getHours())+':'+p(d.getMinutes());
};
const caption=(business:Business|undefined,brief:CampaignBrief)=>{
  const name=business?.name||'Business';
  const offer=clean(brief.offer,240),cta=clean(brief.cta,130),terms=clean(brief.terms,220);
  if(brief.language==='தமிழ்')return [name,offer||'எங்கள் சேவைகளை அறிந்துகொள்ளுங்கள்.',cta||'மேலும் விவரங்களுக்கு தொடர்புகொள்ளுங்கள்.',terms?'நிபந்தனைகள்: '+terms:''].filter(Boolean).join('\n\n');
  if(brief.language==='සිංහල')return [name,offer||'අපගේ සේවාවන් පිළිබඳ දැනගන්න.',cta||'වැඩි විස්තර සඳහා අමතන්න.',terms?'කොන්දේසි: '+terms:''].filter(Boolean).join('\n\n');
  const headline={awareness:'Discover our business',promotion:'A special offer',enquiries:'We are here to help',announcement:'Latest announcement'}[brief.objective];
  return [headline+' — '+name,offer||'Explore our services.',cta||'Contact us for details.',terms?'Terms: '+terms:''].filter(Boolean).join('\n\n');
};
function exportText(name:string,content:string){
  const url=URL.createObjectURL(new Blob([content],{type:'text/plain;charset=utf-8'}));
  const anchor=document.createElement('a');anchor.href=url;anchor.download=name;anchor.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

export default function CampaignPlanner(){
  const [section,setSection]=useState<Section>('social');
  const [language,setLanguage]=useState<CampaignLanguage>('English');
  const [businesses,setBusinesses]=useState<Business[]>([]);
  const [campaigns,setCampaigns]=useState<Campaign[]>([]);
  const [selectedId,setSelectedId]=useState('');
  const [objective,setObjective]=useState<CampaignObjective>('awareness');
  const [offer,setOffer]=useState('');
  const [cta,setCta]=useState('');
  const [terms,setTerms]=useState('');
  const [channelsSelected,setChannelsSelected]=useState<string[]>(['Facebook']);
  const [scheduledAt,setScheduledAt]=useState('');
  const [posterSize,setPosterSize]=useState<CampaignFormat>('portrait');
  const [posterPalette,setPosterPalette]=useState<CampaignPalette>('forest');
  const [editingId,setEditingId]=useState<string|null>(null);
  const [viewArchived,setViewArchived]=useState(false);
  const [search,setSearch]=useState('');
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [exporting,setExporting]=useState(false);
  const [error,setError]=useState('');
  const [userId,setUserId]=useState<string|null>(null);
  const copy=tFor(language);
  const helper=CAMPAIGN_HELP[language];
  const quickStarts=getCampaignStarterIdeas(language,objective);
  const business=businesses.find(b=>b.id===selectedId);
  const brief:CampaignBrief={offer,cta,terms,language,objective,format:posterSize,palette:posterPalette};
  const preview=useMemo(()=>caption(business,brief),[business,offer,cta,terms,language,objective,posterSize,posterPalette]);
  const visible=useMemo(()=>campaigns.filter(c=>c.is_archived===viewArchived)
    .filter(c=>[c.banner_text,c.status,c.platforms?.join(' '),businesses.find(b=>b.id===c.business_id)?.name]
      .join(' ').toLocaleLowerCase().includes(search.toLocaleLowerCase())),[campaigns,viewArchived,search,businesses]);
  const active=campaigns.filter(c=>!c.is_archived);
  const plannedCount=active.filter(c=>c.status==='scheduled').length;
  const readiness=[Boolean(business),Boolean(offer.trim()||cta.trim()),channelsSelected.length>0];
  const readyCount=readiness.filter(Boolean).length;
  const draftCount=active.filter(c=>c.status==='drafted').length;
  const now=localDatetime(new Date().toISOString());

  const load=useCallback(async()=>{
    setLoading(true);setError('');
    try{
      const {data:{user},error:authError}=await supabase.auth.getUser();
      if(authError)throw authError;
      if(!user){setUserId(null);setBusinesses([]);setCampaigns([]);return;}
      setUserId(user.id);
      const own=await supabase.from('businesses').select('id,name,category,city,status').eq('owner_id',user.id).order('name').limit(300);
      if(own.error)throw own.error;
      const owned=(own.data||[]) as Business[];
      setBusinesses(owned);setSelectedId(prev=>owned.some(b=>b.id===prev)?prev:(owned[0]?.id||''));
      if(!owned.length){setCampaigns([]);return;}
      const rows=await supabase.from('marketing_campaigns')
        .select('id,business_id,banner_text,banner_color,platforms,status,scheduled_at,created_at,brief,is_archived,poster_asset_id')
        .in('business_id',owned.map(b=>b.id)).order('created_at',{ascending:false}).limit(200);
      if(rows.error)throw rows.error;
      setCampaigns((rows.data||[]) as Campaign[]);
    }catch(e){setError(e instanceof Error?e.message:'Campaigns unavailable.');}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{void load()},[load]);
  // A saved connected Caption Lab draft lands directly in the campaign library.
  useEffect(()=>{
    if(typeof window!=='undefined'&&
      new URLSearchParams(window.location.search).get('source')==='caption-lab')
      setSection('library');
  },[]);

  const reset=()=>{
    setEditingId(null);setObjective('awareness');setOffer('');setCta('');setTerms('');
    setChannelsSelected(['Facebook']);setScheduledAt('');setPosterSize('portrait');setPosterPalette('forest');
    setSection('social');window.scrollTo({top:0,behavior:'smooth'});
  };
  const openCampaign=(item:Campaign,duplicate=false)=>{
    if(!item.business_id||!businesses.some(b=>b.id===item.business_id)){toast.error(copy.errorBusiness);return;}
    setSelectedId(item.business_id);
    const b=item.brief;
    setEditingId(duplicate?null:item.id);
    setObjective(b&&goals.includes(b.objective)?b.objective:'awareness');
    // Older drafts pre-date structured campaign briefs. Reverse the original
    // generated paragraphs without deleting words or translating vendor text.
    const legacyParts=item.banner_text.split(/\n\s*\n/).map(s=>s.trim()).filter(Boolean);
    const inferredLanguage:CampaignLanguage=/[\u0B80-\u0BFF]/u.test(item.banner_text)?'தமிழ்':
      /[\u0D80-\u0DFF]/u.test(item.banner_text)?'සිංහල':'English';
    const legacyStructured=legacyParts.length>=2 && Boolean(
      businesses.find(o=>o.id===item.business_id) &&
      legacyParts[0].includes(businesses.find(o=>o.id===item.business_id)!.name));
    const legacyMessage=legacyStructured?legacyParts[1]:item.banner_text;
    const legacyCta=legacyStructured?(legacyParts[2]||''):'';
    const legacyTerms=legacyStructured?(legacyParts[3]||'')
      .replace(/^(விதிமுறைகள்|කොන්දේසි|Offer conditions|Terms):\s*/iu,''):'';
    setLanguage(b&&languages.includes(b.language)?b.language:inferredLanguage);
    setOffer(b?b.offer:legacyMessage);
    setCta(b?b.cta:legacyCta);setTerms(b?b.terms:legacyTerms);
    setPosterSize(b&&validFormats.includes(b.format)?b.format:'portrait');
    setPosterPalette(b&&['forest','navy','cream'].includes(b.palette)?b.palette:'forest');
    setChannelsSelected((item.platforms||[]).map(p=>p.charAt(0).toUpperCase()+p.slice(1)).filter(p=>(channels as readonly string[]).includes(p)));
    setScheduledAt(localDatetime(item.scheduled_at));
    setSection('social');window.scrollTo({top:0,behavior:'smooth'});
    if(!b)toast.message('Legacy campaign: review the original saved text before updating.');
  };
  const save=async(schedule:boolean)=>{
    if(saving)return;
    if(!userId||!business||!selectedId){toast.error(copy.errorBusiness);return;}
    if(!offer.trim()&&!cta.trim()){toast.error(copy.errorMessage);return;}
    if(offer.length>240||cta.length>130||terms.length>220){toast.error(copy.offerLimit);return;}
    if(!channelsSelected.length){toast.error(copy.errorChannel);return;}
    if(schedule&&(!scheduledAt||new Date(scheduledAt).getTime()<=Date.now())){toast.error(copy.errorDate);return;}
    setSaving(true);
    try{
      const patch={
        banner_text:preview.slice(0,3000),
        banner_color:'growth-brief-v3',
        platforms:channelsSelected.map(x=>x.toLowerCase()),
        scheduled_at:schedule?new Date(scheduledAt).toISOString():null,
        status:schedule?'scheduled':'drafted',
        brief,
      };
      if(editingId){
        // Keep the original business_id immutable: only update a row that still
        // belongs to the selected, server-RLS-owned business.
        const result=await supabase.from('marketing_campaigns').update(patch)
          .eq('id',editingId).eq('business_id',selectedId).select('id').maybeSingle();
        if(result.error)throw result.error;
        if(!result.data)throw new Error(copy.updateConflict);
      }else{
        const result=await supabase.from('marketing_campaigns').insert({
          business_id:selectedId,...patch,
        }).select('id').maybeSingle();
        if(result.error)throw result.error;
        if(!result.data)throw new Error(copy.updateConflict);
      }
      toast.success(copy.success);
      // Reset the editing form after saving. Existing item stays in Library.
      reset();setSection('library');await load();
    }catch(e){toast.error(e instanceof Error?e.message:copy.updateConflict);}
    finally{setSaving(false);}
  };
  const changeArchive=async(c:Campaign)=>{
    if(saving||!c.business_id)return;
    if(c.status==='posted'){toast.error(copy.archiveError);return;}
    if(!c.is_archived&&!window.confirm(copy.archiveConfirm))return;
    setSaving(true);
    try{
      const result=await supabase.from('marketing_campaigns')
        .update({is_archived:!c.is_archived})
        .eq('id',c.id).eq('business_id',c.business_id).select('id').maybeSingle();
      if(result.error)throw result.error;
      if(!result.data)throw new Error(copy.archiveError);
      await load();
    }catch(e){toast.error(e instanceof Error?e.message:copy.archiveError);}
    finally{setSaving(false);}
  };
  const manualShareCaption=async()=>{
    if(!business||(!offer.trim()&&!cta.trim())){toast.error(copy.errorMessage);return;}
    // Invoked only by a real click. Never wait before navigator.share is called.
    const share=typeof navigator.share==='function'?navigator.share.bind(navigator):undefined;
    const clipboardCopy=typeof navigator.clipboard?.writeText==='function'
      ?navigator.clipboard.writeText.bind(navigator.clipboard):undefined;
    const outcome=await shareCampaignCaption({title:business.name,text:preview},{
      share,copy:clipboardCopy,
    });
    if(outcome==='copied')toast.success(copy.shareCopied);
    else if(outcome==='sheet_closed')toast.message(copy.shareSheetClosed);
    else if(outcome==='failed')toast.error(copy.shareFailed);
    else if(outcome==='unavailable')toast.error(copy.shareUnavailable);
    // AbortError from the user canceling the OS share sheet: no toast or clipboard.
  };
  const exportBrandedCreative=async()=>{
    if(exporting)return;
    if(!business||!offer.trim()){toast.error(copy.errorMessage);return;}
    setExporting(true);
    try{
      const result=await renderCampaignPoster({business:business.name,offer,cta,terms,language,format:posterSize,palette:posterPalette});
      if(!result.ok){toast.error(result.error==='text_overflow'?copy.errorExport:'Canvas unavailable');return;}
      const anchor=document.createElement('a');anchor.href=result.dataUrl;anchor.download=result.filename;anchor.click();
      toast.success(copy.posterReady);
    }catch{toast.error(copy.errorExport);}
    finally{setExporting(false);}
  };
  const button='rounded-lg px-4 py-2.5 text-[12px] font-bold transition disabled:cursor-not-allowed disabled:opacity-50';
  const field='mt-2 w-full rounded-lg border border-[#E6E3E0] bg-white p-3 text-[13px] text-[#29262B] outline-none focus:border-[#FA890C] focus:ring-2 focus:ring-[#FF7900]/15';
  const label='block text-[12px] font-bold text-[#393238]';
  // Native select arrows have inconsistent browser spacing; keep a 16px visual inset.
  const dropdownArrow={backgroundImage:'url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22m5%207.5%205%205%205-5%22%20stroke%3D%22%23615A60%22%20stroke-width%3D%221.8%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E")',backgroundRepeat:'no-repeat',backgroundPosition:'right 16px center',backgroundSize:'16px 16px'} as const;

  const card='rounded-[15px] border border-[#E8E6E6] bg-white shadow-[0_4px_22px_rgba(20,20,28,.035)]';
  const tabs:ReadonlyArray<[Section,string,string]>=[
    ['overview',copy.overview,'element-4'],['social',copy.editor,'edit'],
    ['calendar',copy.calendar,'calendar'],['library',copy.library,'document-text'],
  ];
  return <main data-testid="campaign-planner-free" className="mx-auto w-full max-w-[1500px] space-y-4 pb-12 text-[#242429]">
    <header className="relative overflow-hidden rounded-[18px] bg-[#1B1B20] px-5 py-6 text-white sm:px-8 sm:py-7">
      <div aria-hidden className="pointer-events-none absolute -right-20 -top-32 h-80 w-80 rounded-full bg-[#FF7900]/15 blur-3xl"/>
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/vendor/marketing" className="inline-flex items-center gap-2 text-[11px] font-bold text-[#FFC18A]">
            <IconsaxIcon name="arrow-left-2" size={15} color="#FFC18A"/> Marketing Studio
          </Link>
          <p className="mt-4 text-[10px] font-extrabold uppercase tracking-[.2em] text-[#FB9C55]">{copy.subtitle}</p>
          <h1 className="mt-2 text-[29px] font-extrabold tracking-[-.05em] sm:text-[40px]">{copy.title}</h1>
          <p className="mt-2 max-w-[630px] text-[12px] leading-6 text-white/70">{copy.about}</p>
        </div>
        <div className="relative flex flex-wrap items-center gap-2">
          <span className="inline-flex h-11 items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3 text-[11px] font-bold text-white/90"><ShieldCheck size={15} className="text-[#FFA45C]"/>{helper.free}</span>
          <button type="button" onClick={reset} className={button+' inline-flex h-11 items-center gap-2 bg-[#FF7900] text-[#211C1B] hover:bg-[#FFA253]'}>
            <IconsaxIcon name="add" size={16}/>{copy.newCampaign}
          </button>
        </div>
      </div>
      <div className="relative mt-4 flex flex-wrap gap-2">
        <span className="rounded-lg bg-white/10 px-3 py-2 text-[11px] text-white/90">{copy.method}</span>
        <span className="rounded-lg bg-white/10 px-3 py-2 text-[11px] text-white/90">{copy.reviewWorkflow}</span>
      </div>
    </header>
    {error&&<div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800">{error}</div>}
    {!loading&&!userId&&<div className={card+' p-5 text-sm'}><Link href="/login?redirect=/vendor/marketing/campaigns" className="underline">Sign in to open your campaigns</Link></div>}
    <section aria-label="Campaign overview" className="grid grid-cols-3 gap-2 sm:gap-3">
      {[
        [copy.saved,active.length,'document-text'],[copy.drafts,draftCount,'edit'],[copy.planned,plannedCount,'calendar']
      ].map(([name,count,icon])=><div key={name} className={card+' flex min-w-0 items-center justify-between gap-2 p-3 sm:p-4'}>
        <div><p className="text-[11px] font-semibold text-[#817982]">{name}</p>
          <p className="mt-1 text-[24px] font-extrabold tabular-nums">{loading?'—':count}</p></div>
        <span className="hidden rounded-lg bg-[#FFF1E6] p-2 sm:inline-flex"><IconsaxIcon name={String(icon)} size={22} color="#D56D18"/></span>
      </div>)}
    </section>
    <div className="space-y-4">
      <nav aria-label="Campaign sections" className={card+' flex items-center gap-2 overflow-x-auto p-2 sm:p-2.5'}>
        {tabs.map(([key,name,icon])=><button type="button" key={key} onClick={()=>setSection(key)} aria-current={section===key?'page':undefined}
          className={'flex min-h-10 shrink-0 items-center gap-2 rounded-lg px-4 text-left text-[12px] font-bold transition '+(section===key?'bg-[#242326] text-white':'text-[#716C72] hover:bg-[#FFF1E7]')}>
          <IconsaxIcon name={icon} size={18} color={section===key?'#FFFFFF':'#9E7A60'}/>{name}
        </button>)}
      </nav>
      <div className="min-w-0">
        {section==='overview'&&<section className={card+' p-6 md:p-9'}>
          <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-[#BE6624]">BASIC MARKETING</p>
          <h2 className="mt-3 text-[24px] font-extrabold">{copy.start}</h2>
          <p className="mt-3 max-w-2xl text-[13px] leading-7 text-[#757078]">{copy.about}</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[copy.business,copy.message,copy.poster].map((value,i)=><div key={value} className="rounded-2xl border border-[#EDE7E2] bg-[#FFF9F4] p-5">
              <p className="text-[23px] font-bold text-[#E38032]">{String(i+1).padStart(2,'0')}</p>
              <p className="mt-3 text-[12px] font-bold">{value}</p>
            </div>)}
          </div>
          <button type="button" onClick={reset} className={button+' mt-6 bg-[#242326] text-white'}>{copy.start}</button>
          <p className="mt-5 text-[11px] leading-6 text-[#907960]">{copy.noAuto}</p>
        </section>}
        {section==='social'&&<div className="grid gap-4 lg:grid-cols-[minmax(0,1.07fr)_minmax(320px,.93fr)] xl:gap-5">
          <section className={card+' min-w-0 p-4 sm:p-6'}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div><p className="text-[10px] font-extrabold uppercase tracking-[.13em] text-[#C46B25]">{editingId?copy.editing:copy.newCampaign}</p>
                <h2 className="mt-1 text-[20px] font-extrabold">{copy.editor}</h2></div>
              {editingId&&<button type="button" onClick={reset} className={button+' border border-[#EDE2D8] text-[#A35C23]'}>{copy.reset}</button>}
            </div>
            <p className="mt-2 text-[11px] leading-6 text-[#8B7D75]">{copy.captionHelp}</p>
             <div aria-label={helper.readiness} className="mt-4 rounded-lg border border-[#F2E2D6] bg-[#FFF9F3] p-3">
               <div className="flex items-center justify-between text-[11px] font-bold text-[#A15B22]"><span>{helper.readiness}</span><span>{readyCount}/3</span></div>
               <div className="mt-2 flex gap-1" aria-hidden="true">{readiness.map((ready,i)=><span key={i} className={'h-1.5 flex-1 rounded-full '+(ready?'bg-[#E87818]':'bg-[#ECD8C9]')}/>)}</div>
               <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-[#776B66]">{[helper.business,helper.message,helper.channel].map((item,i)=><span key={item} className="inline-flex items-center gap-1"><CheckCircle2 size={12} className={readiness[i]?'text-[#DE791A]':'text-[#C3B4AA]'}/>{item}</span>)}</div>
             </div>
            <div className="mt-5 space-y-4">
              <label className={label}>{copy.business}
                <select className={field+' appearance-none pr-12'} style={dropdownArrow} value={selectedId} disabled={Boolean(editingId)} onChange={e=>setSelectedId(e.target.value)}>
                  <option value="">{copy.selectBusiness}</option>
                  {businesses.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </label>
              {!loading&&!businesses.length&&<p className="text-[12px] text-amber-700">{copy.noBusiness}</p>}
               {business&&<div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#EEE8E3] bg-[#FCFBFA] px-3 py-2.5 text-[11px] text-[#675E58]">
                 <span><strong>{business.category}</strong>{business.city?' · '+business.city:''} · {business.status==='approved'?'Published':'Under review'}</span>
                 <Link href={'/vendor/gallery-services?business='+encodeURIComponent(business.id)} className="font-bold text-[#AF6223] hover:underline">Gallery &amp; Services →</Link>
               </div>}
              {business&&<G1PlannerFacts key={business.id}
                 businessId={business.id} status={business.status} language={language}
                 canApply={!offer.trim()}
                 onUse={message=>setOffer(current=>current.trim()?current:message)}
              />}
              <div><p className={label}>{copy.objective}</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {goals.map((g,i)=><button key={g} type="button" aria-pressed={objective===g}
                    onClick={()=>setObjective(g)} className={'rounded-xl border p-3 text-left text-[11px] font-bold transition '+(objective===g?'border-[#FBA25B] bg-[#FFF2E7] text-[#A35218]':'border-[#E6E4E5] bg-white text-[#6D6970] hover:border-[#EDBC92]')}>
                    {copy.goals[i]}
                  </button>)}
                </div>
              </div>
              <label className={label}>{copy.language}
                <select value={language} onChange={e=>setLanguage(e.target.value as CampaignLanguage)} className={field+' appearance-none pr-12'} style={dropdownArrow}>
                  {languages.map(l=><option key={l} value={l}>{l}</option>)}
                </select>
              </label>
              <label className={label}>{copy.message}
                <textarea className={field+' min-h-32 resize-y'} maxLength={240} value={offer} onChange={e=>setOffer(e.target.value)}
                  placeholder={copy.messageHint}/>
                <span className="mt-1 block text-right text-[10px] text-[#89818A]">{offer.length}/240</span>
              </label>
               {!offer.trim()&&<div aria-label={helper.ideas} className="rounded-xl border border-[#EDE6E0] bg-[#FCFAF8] p-3.5">
                 <div className="flex items-start gap-2"><Lightbulb size={16} className="mt-0.5 shrink-0 text-[#CB6C23]"/>
                   <div><p className="text-[12px] font-bold text-[#3B3431]">{helper.ideas}</p>
                     <p className="mt-1 text-[11px] leading-5 text-[#847A75]">{helper.ideaNote}</p></div>
                 </div>
                 <div className="mt-3 grid gap-2 sm:grid-cols-2">
                   {quickStarts.map((idea,i)=><button type="button" key={idea} onClick={()=>setOffer(idea)}
                     className="flex min-h-[68px] items-start gap-2 rounded-lg border border-[#EAE0D6] bg-white p-3 text-left text-[11px] leading-5 text-[#51443A] hover:border-[#EDAE80] hover:bg-[#FFF5EB]">
                     <span className="shrink-0 rounded-md bg-[#FFF0E4] px-1.5 py-0.5 font-bold text-[#B7601D]">{i+1}</span>
                     <span>{idea}</span><ArrowRight size={13} className="ml-auto mt-0.5 shrink-0 text-[#C47E4D]"/>
                   </button>)}
                 </div>
               </div>}
              <label className={label}>{copy.cta}
                <input className={field} maxLength={130} value={cta} onChange={e=>setCta(e.target.value)} placeholder={copy.ctaHint}/>
              </label>
              <label className={label}>{copy.terms}
                <textarea className={field+' min-h-20 resize-y'} maxLength={220} value={terms} onChange={e=>setTerms(e.target.value)} placeholder={copy.termsHint}/>
              </label>
              <div><p className={label}>{copy.channels}</p>
                <div className="mt-2 flex flex-wrap gap-2">{channels.map(name=><button type="button" key={name}
                  aria-pressed={channelsSelected.includes(name)} onClick={()=>setChannelsSelected(a=>a.includes(name)?a.filter(x=>x!==name):[...a,name])}
                  className={button+' border '+(channelsSelected.includes(name)?'border-[#FB790B] bg-[#FFF1E6] text-[#9C4F1F]':'border-[#E2DFE1] bg-white text-[#68616A]')}>{name}</button>)}</div>
              </div>
              <label className={label}>{copy.planningDate}
                <input type="datetime-local" value={scheduledAt} min={now} onChange={e=>setScheduledAt(e.target.value)} className={field}/>
              </label>
            </div>
            <div className="mt-6 flex flex-wrap gap-2 border-t border-[#F1ECE8] pt-5">
              <button type="button" onClick={()=>void save(Boolean(editingId&&scheduledAt&&campaigns.find(c=>c.id===editingId)?.status==='scheduled'))} disabled={saving||!userId}
                className={button+' bg-[#252329] text-white hover:bg-[#3F393C]'}>{saving?'…':editingId?copy.update:copy.save}</button>
              <button type="button" onClick={()=>void save(true)} disabled={saving||!userId||!scheduledAt}
                className={button+' border border-[#E9AD7C] bg-[#FFF2E7] text-[#A65A23]'}>{copy.schedule}</button>
              <button type="button" onClick={reset} className={button+' border border-[#E3DFE0]'}>{copy.reset}</button>
            </div>
          </section>
          <aside className={card+' min-w-0 overflow-hidden lg:sticky lg:top-4'}>
            <div className="border-b border-[#E9E4E2] bg-[#FFF7F0] px-5 py-4">
              <p className="text-[10px] font-extrabold uppercase tracking-[.13em] text-[#B96E33]">CREATIVE REVIEW</p>
              <h2 className="mt-1 text-[17px] font-extrabold">{copy.preview}</h2>
            </div>
            <div className="space-y-4 p-4 sm:p-5">
              <div className="min-h-[170px] whitespace-pre-wrap break-words rounded-lg border border-[#E9E5E3] bg-[#FCFAF7] p-4 text-[13px] leading-6">{preview}</div>
               <p className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-[#AC7047]"><ShieldCheck size={13}/>{helper.preview}</p>
              <p className="text-[11px] leading-6 text-[#867D82]">{copy.review}</p>
              <p className="text-[11px] leading-5 text-[#A17A5B]">{copy.shareExplain}</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" className={button+' border border-[#E9E3DE]'} onClick={()=>void navigator.clipboard.writeText(preview).then(()=>toast.success(copy.copy)).catch(()=>toast.error(copy.updateConflict))}>{copy.copy}</button>
                <button type="button" className={button+' border border-[#E9E3DE]'} onClick={()=>exportText('slbi-campaign-'+language+'.txt',preview)}>{copy.exportText}</button>
                <button type="button" data-testid="planner-manual-share-caption"
                  onClick={()=>void manualShareCaption()} disabled={!business||(!offer.trim()&&!cta.trim())}
                  className={button+' inline-flex items-center gap-2 border border-[#EFA365] bg-[#FFF3E9] text-[#A15216] hover:bg-[#FFE5CD]'}>
                  <Share2 size={15}/>{copy.shareCaption}
                </button>
              </div>
              <div className="border-t border-[#EEE8E3] pt-5">
                <h3 className="text-[15px] font-extrabold">{copy.poster}</h3>
                <p className="mt-2 text-[11px] leading-6 text-[#8B8185]">{copy.posterHelp}</p>
                <p className="mt-5 mb-2 text-[12px] font-bold">{copy.formats}</p>
                <CampaignFormatSelector selected={posterSize} onChange={setPosterSize} language={language}/>
                <label className={label+' mt-5'}>{copy.palette}
                  <select className={field+' appearance-none pr-12'} style={dropdownArrow} value={posterPalette} onChange={e=>setPosterPalette(e.target.value as CampaignPalette)}>
                    <option value="forest">Forest Green</option><option value="navy">Midnight Navy</option><option value="cream">Warm Cream</option>
                  </select>
                </label>
                <p className="mt-3 text-[11px] leading-5 text-[#9A7A5D]">{copy.offerLimit}</p>
                <button type="button" onClick={()=>void exportBrandedCreative()} disabled={exporting||!business||!offer.trim()}
                  className={button+' mt-4 w-full bg-[#FF7900] py-3 text-[#211A16] hover:bg-[#FF9C40]'}>
                  <IconsaxIcon name="document-download" size={17}/> {' '} {exporting?'…':copy.exportPoster}
                </button>
                <p className="mt-3 text-center text-[10px] text-[#97939A]">DRAFT — REVIEW BEFORE PUBLISHING</p>
              </div>
            </div>
          </aside>
        </div>}
        {section==='calendar'&&<section className={card+' p-5 md:p-7'}>
          <h2 className="text-[20px] font-extrabold">{copy.calendar}</h2>
          <p className="mt-2 text-[11px] text-[#8A7F83]">{copy.noAuto}</p>
          <div className="mt-5 space-y-3">
            {active.filter(c=>c.scheduled_at).sort((a,b)=>String(a.scheduled_at).localeCompare(String(b.scheduled_at))).map(c=>
              <div key={c.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-[#EAE6E4] p-4">
                <div><span className="text-[10px] font-bold text-[#BA6B29]">{formatDate(c.scheduled_at)}</span>
                  <p className="mt-1 text-[12px] font-bold">{businesses.find(b=>b.id===c.business_id)?.name}</p>
                  <p className="mt-2 max-w-[700px] line-clamp-2 text-[11px] text-[#79727A]">{c.banner_text}</p>
                </div>
                <button type="button" className={button+' border border-[#E8DCCE]'} onClick={()=>openCampaign(c)}>{copy.edit}</button>
              </div>)}
            {!active.some(c=>c.scheduled_at)&&<p className="rounded-xl border border-dashed border-[#E8E4E2] p-8 text-[12px] text-[#8C838B]">{copy.empty}</p>}
          </div>
        </section>}
        {section==='library'&&<section className={card+' overflow-hidden'}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ECE6E4] p-5">
            <div><h2 className="text-[19px] font-extrabold">{copy.library}</h2>
              <p className="mt-1 text-[11px] text-[#8F868A]">{copy.reviewWorkflow}</p></div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={()=>setViewArchived(false)} aria-pressed={!viewArchived} className={button+(viewArchived?' border border-[#E3E1E3]':' bg-[#28262A] text-white')}>{copy.active}</button>
              <button type="button" onClick={()=>setViewArchived(true)} aria-pressed={viewArchived} className={button+(viewArchived?' bg-[#28262A] text-white':' border border-[#E3E1E3]')}>{copy.archived}</button>
            </div>
            <input type="search" value={search} aria-label={copy.search} placeholder={copy.search} onChange={e=>setSearch(e.target.value)}
              className="w-full max-w-[255px] rounded-xl border border-[#E6E2E3] px-3 py-2.5 text-[12px] outline-none focus:border-[#F69A56]"/>
          </div>
          {loading&&<p role="status" className="p-5 text-[12px] text-[#7F787D]">Loading…</p>}
          <div className="divide-y divide-[#EFEBE8]">{visible.map(c=><article key={c.id} className="grid gap-4 p-5 transition hover:bg-[#FFFDFC] sm:grid-cols-[minmax(0,1fr)_auto]">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-lg bg-[#FFF2E7] px-2.5 py-1 text-[10px] font-bold text-[#A55A20]">
                  {c.status==='scheduled'?copy.statusPlanned:c.status==='drafted'?copy.statusDraft:c.status}
                </span>
                <span className="text-[11px] font-bold text-[#373037]">{businesses.find(b=>b.id===c.business_id)?.name||copy.business}</span>
              </div>
              {(c.banner_color==='caption-lab-connected-v1'||c.brief?.createdFrom==='caption_lab')&&
                <span className="mt-2 inline-block rounded-full bg-[#FFF1E6] px-2 py-1 text-[10px] font-bold text-[#9A3412]">
                  AI Caption Lab · Connected campaign
                </span>}
              <p className="mt-3 line-clamp-3 whitespace-pre-line break-words text-[12px] leading-6 text-[#5E5961]">{c.banner_text}</p>
              {(c.poster_asset_id||c.brief?.posterLocalKey)&&
                <LinkedCaptionPoster localKey={c.brief?.posterLocalKey}
                  businessId={c.business_id} assetId={c.poster_asset_id}/>}
              <p className="mt-3 text-[10px] text-[#979097]">{copy.created} {formatDate(c.created_at)} · {c.platforms?.join(', ')||'—'} {c.scheduled_at?' · '+formatDate(c.scheduled_at):''}</p>
            </div>
            <div className="flex flex-wrap items-start gap-2 sm:max-w-[265px]">
              {!c.is_archived&&c.status!=='posted'&&
                ((c.banner_color==='caption-lab-connected-v1'||c.brief?.createdFrom==='caption_lab')?
                  <Link href="/vendor/marketing/captions"
                    className={button+' border border-[#F1C49C] bg-[#FFF5ED] text-[#B45B16]'}>Open Caption Lab</Link>:
                  <button type="button" onClick={()=>openCampaign(c)}
                    className={button+' border border-[#F1C49C] bg-[#FFF5ED] text-[#B45B16]'}>{copy.edit}</button>)}
              {!c.is_archived&&c.banner_color!=='caption-lab-connected-v1'&&c.brief?.createdFrom!=='caption_lab'&&<button type="button" onClick={()=>openCampaign(c,true)} className={button+' border border-[#E8E3E3]'}>{copy.duplicate}</button>}
              {!c.is_archived&&c.banner_color!=='caption-lab-connected-v1'&&c.brief?.createdFrom!=='caption_lab'&&<button type="button" onClick={()=>openCampaign(c)} className={button+' border border-[#E8E3E3]'}>{copy.posterFromLibrary}</button>}
              <button type="button" onClick={()=>exportText('slbi-campaign-'+c.id.slice(0,8)+'.txt',c.banner_text)} className={button+' border border-[#E8E3E3]'}>{copy.export}</button>
              {c.status!=='posted'&&<button type="button" disabled={saving} onClick={()=>void changeArchive(c)}
                className={button+' border border-[#E8E3E3] text-[#817780]'}>{c.is_archived?copy.restore:copy.archive}</button>}
            </div>
          </article>)}</div>
          {!loading&&!visible.length&&<div className="p-10 text-center text-[12px] text-[#8D848A]">{copy.empty}</div>}
        </section>}
      </div>
    </div>
    <footer className="px-3 text-[11px] leading-6 text-[#8A8187]">{copy.noAuto}</footer>
  </main>;
}
