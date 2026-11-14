'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabaseClient';
import IconsaxIcon from '../../components/IconsaxIcon';
import {
  BRAND_DEFAULTS, BRAND_LANGUAGES, BRAND_TONES, validateBrandProfile,
  type BrandOffer, type BrandProfileInput, type BrandLanguage, type BrandTone,
} from '@/lib/marketing/brand-profile';

type OwnedBusiness = {
  id: string; name: string; logo_url: string | null;
  category: string | null; city: string | null; status: string | null;
};
type ProfileRow = {
  brand_name:string; slogan:string; primary_color:string; secondary_color:string;
  accent_color:string; audience:string; tone:BrandTone; languages:BrandLanguage[];
  guidelines:string; offers:BrandOffer[];updated_at:string;
};
type ServerData = {
  business?:OwnedBusiness;profile?:ProfileRow|null;
  error?:string;success?:boolean;updatedAt?:string;
};
type FormData = Omit<BrandProfileInput,'businessId'>;
const defaults = (name = ''):FormData => ({
  brandName:name, slogan:BRAND_DEFAULTS.slogan,
  primaryColor:BRAND_DEFAULTS.primaryColor,
  secondaryColor:BRAND_DEFAULTS.secondaryColor,
  accentColor:BRAND_DEFAULTS.accentColor,
  audience:BRAND_DEFAULTS.audience, tone:BRAND_DEFAULTS.tone,
  languages:[...BRAND_DEFAULTS.languages],
  guidelines:BRAND_DEFAULTS.guidelines,offers:[],
});
const inputClass = 'mt-1.5 w-full rounded-lg border border-[#E3E3E9] bg-white px-3 py-2.5 text-sm text-[#24242A] outline-none transition focus:border-[#FF7900] focus:ring-2 focus:ring-[#FF7900]/15';
const fieldLabel = 'block text-[11px] font-bold uppercase tracking-[.06em] text-[#4D4D55]';
const titles:Record<BrandLanguage,string>={en:'English',ta:'தமிழ்',si:'සිංහල'};
const toneLabel:Record<BrandTone,string> = {
  professional:'Professional',friendly:'Friendly',bold:'Bold',
  elegant:'Elegant',playful:'Playful',
};

export default function BusinessBrandProfilePage(){
  const [businesses,setBusinesses]=useState<OwnedBusiness[]>([]);
  const [selectedId,setSelectedId]=useState('');
  const [profile,setProfile]=useState<FormData>(()=>defaults());
  const [loadingBusinesses,setLoadingBusinesses]=useState(true);
  const [loadingProfile,setLoadingProfile]=useState(false);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [ready,setReady]=useState(false);
  const [updatedAt,setUpdatedAt]=useState<string|null>(null);
  const business=businesses.find(b=>b.id===selectedId)??null;

  const loadBusinesses=useCallback(async()=>{
    setLoadingBusinesses(true);setError('');
    try{
      const {data:{user},error:authError}=await supabase.auth.getUser();
      if(authError||!user)throw new Error('Sign in to manage a business brand.');
      const {data,error:businessError}=await supabase.from('businesses')
        .select('id,name,logo_url,category,city,status')
        .eq('owner_id',user.id).order('name').limit(250);
      if(businessError)throw new Error('Unable to load your businesses.');
      const owned=(data??[]) as OwnedBusiness[];
      setBusinesses(owned);
      setSelectedId(prev=>owned.some(b=>b.id===prev)?prev:owned[0]?.id??'');
    }catch(e){setError(e instanceof Error?e.message:'Business list unavailable.');}
    finally{setLoadingBusinesses(false);}
  },[]);

  useEffect(()=>{void loadBusinesses()},[loadBusinesses]);
  useEffect(()=>{
    const selected=businesses.find(b=>b.id===selectedId);
    setNotice('');setError('');setReady(false);setUpdatedAt(null);
    setProfile(defaults(selected?.name??''));
    if(!selectedId||!selected)return;
    const ctrl=new AbortController();
    const run=async()=>{
      setLoadingProfile(true);
      try{
        const response=await fetch('/api/marketing/brand-profile?businessId='+encodeURIComponent(selectedId),{
          credentials:'same-origin',cache:'no-store',signal:ctrl.signal,
        });
        const body:ServerData=await response.json();
        if(!response.ok)throw new Error(body.error||'Unable to load your Brand Profile.');
        if(ctrl.signal.aborted)return;
        setReady(true);
        if(body.profile){
          const v=body.profile;
          setProfile({
            brandName:v.brand_name,slogan:v.slogan,
            primaryColor:v.primary_color,secondaryColor:v.secondary_color,
            accentColor:v.accent_color,audience:v.audience,
            tone:v.tone,languages:[...v.languages],
            guidelines:v.guidelines,offers:[...(v.offers||[])],
          });
          setUpdatedAt(v.updated_at);
        }
      }catch(e){
        if(!ctrl.signal.aborted)setError(e instanceof Error?e.message:'Brand Profile unavailable.');
      }finally{
        if(!ctrl.signal.aborted)setLoadingProfile(false);
      }
    };
    void run();
    return()=>ctrl.abort();
  },[selectedId,businesses]);

  function change<K extends keyof FormData>(key:K,value:FormData[K]){
    setProfile(p=>({...p,[key]:value}));
    setNotice('');
  }
  function updateOffer(i:number,field:keyof BrandOffer,value:string|null){
    change('offers',profile.offers.map((o,j)=>j===i?{...o,[field]:value}:o));
  }
  const save=async(event:React.FormEvent<HTMLFormElement>)=>{
    event.preventDefault();
    if(!selectedId||!business||!ready||saving)return;
    const valid=validateBrandProfile({businessId:selectedId,...profile});
    if(!valid.ok){setError(valid.error);return;}
    setSaving(true);setError('');setNotice('');
    try{
      const response=await fetch('/api/marketing/brand-profile',{
        method:'PUT',credentials:'same-origin',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(valid.value),
      });
      const result:ServerData=await response.json();
      if(!response.ok||!result.success)throw new Error(result.error||'Unable to save Brand Profile.');
      setUpdatedAt(result.updatedAt||new Date().toISOString());
      setNotice('Brand Profile saved. Campaign briefs can reuse these brand guidelines after integration.');
    }catch(e){setError(e instanceof Error?e.message:'Brand Profile could not be saved.');}
    finally{setSaving(false);}
  };
  const logo=business?.logo_url||null;
  const previewColors=useMemo(()=>[profile.primaryColor,profile.secondaryColor,profile.accentColor],[profile.primaryColor,profile.secondaryColor,profile.accentColor]);
  const complete=Boolean(ready&&selectedId&&!saving&&!loadingProfile);

  return <div className="mx-auto w-full max-w-[1360px] space-y-5 pb-10 text-[#24242B]">
    <header className="flex flex-wrap items-end justify-between gap-4 rounded-xl border border-[#ECECF0] bg-white p-5 sm:p-7">
      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-[.17em] text-[#C66211]">GrowthOS · Marketing Engine / P2-01</p>
        <h1 className="mt-2 text-[26px] font-extrabold tracking-tight sm:text-[31px]">Business Brand Profile</h1>
        <p className="mt-1.5 max-w-[660px] text-xs leading-6 text-[#73737D]">
          Create a reusable brand identity for your owned business. Social captions, poster layers and campaign briefs
          can use these preferences, while every offer and business claim remains subject to human review.
        </p>
      </div>
      <Link href="/vendor/marketing" className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#E7E7EB] bg-[#F9F9FA] px-4 text-xs font-bold hover:border-[#FFB57B]">
        <IconsaxIcon name="arrow-left-2" size={17}/> Back to Marketing
      </Link>
    </header>

    <section className="rounded-xl border border-[#ECECF0] bg-white p-5 sm:p-6">
      <label htmlFor="brand-business" className={fieldLabel}>Brand belongs to</label>
      <select id="brand-business" value={selectedId} disabled={loadingBusinesses}
        onChange={event=>setSelectedId(event.target.value)}
        className={inputClass+' max-w-xl'}>
        {!businesses.length&&<option value="">No owned businesses</option>}
        {businesses.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
      </select>
      <p className="mt-2 text-[11px] text-[#767680]">
        Profiles stay separate for every business. Your existing listing logo is used as the verified logo source.
      </p>
    </section>

    {error&&<div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-xs text-red-800">{error}</div>}
    {notice&&<div role="status" className="rounded-lg border border-[#CBDFD2] bg-[#F5FAF6] p-4 text-xs text-[#256546]">{notice}</div>}
    {!business&& !loadingBusinesses&&<div className="rounded-xl border bg-white p-8 text-sm text-[#65656C]">Register a business first to create its brand identity.</div>}

    {business&&<form onSubmit={event=>void save(event)} className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(310px,.8fr)]">
      <div className="min-w-0 space-y-5">
        <section className="rounded-xl border border-[#ECECF0] bg-white p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FFF1E5] text-[#C8610C]"><IconsaxIcon name="shop" size={19}/></span>
            <div><h2 className="text-sm font-bold">Identity & personality</h2><p className="mt-0.5 text-[11px] text-[#7C7C83]">Reuse accurate business identity across campaigns</p></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={fieldLabel}>Brand name <span className="text-[#CA4D1B]">*</span>
              <input className={inputClass} required minLength={2} maxLength={100}
                value={profile.brandName} onChange={e=>change('brandName',e.target.value)}/></label>
            <label className={fieldLabel}>Brand voice
              <select className={inputClass} value={profile.tone}
                onChange={e=>change('tone',e.target.value as BrandTone)}>
                {BRAND_TONES.map(t=><option key={t} value={t}>{toneLabel[t]}</option>)}
              </select></label>
            <label className={fieldLabel+' sm:col-span-2'}>Tagline / slogan
              <input className={inputClass} maxLength={160} value={profile.slogan}
                onChange={e=>change('slogan',e.target.value)} placeholder="A short factual brand promise"/></label>
            <label className={fieldLabel+' sm:col-span-2'}>Target audience (non-sensitive)
              <textarea className={inputClass+' min-h-20'} maxLength={240} value={profile.audience}
                onChange={e=>change('audience',e.target.value)}
                placeholder="e.g. local shoppers, family dining guests, small business customers"/></label>
          </div>
        </section>

        <section className="rounded-xl border border-[#ECECF0] bg-white p-5 sm:p-6">
          <h2 className="text-sm font-bold">Brand design tokens</h2>
          <p className="mt-1.5 text-xs text-[#777781]">These are presets for future editable posters — no AI image is generated or charged now.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {([
              ['primaryColor','Primary'],['secondaryColor','Background'],['accentColor','Accent'],
            ] as const).map(([key,label])=><label key={key} className={fieldLabel}>{label} color
              <div className="mt-1.5 flex items-center gap-2">
                <input type="color" aria-label={label+' color picker'} value={profile[key]}
                  onChange={e=>change(key,e.target.value.toUpperCase())}
                  className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-[#E6E6E9] bg-white p-1"/>
                <input className={inputClass+' mt-0 min-w-0 flex-1 font-mono text-xs'}
                  maxLength={7} value={profile[key]} onChange={e=>change(key,e.target.value)}
                  aria-label={label+' hexadecimal color'}/>
              </div>
            </label>)}
          </div>
        </section>

        <section className="rounded-xl border border-[#ECECF0] bg-white p-5 sm:p-6">
          <h2 className="text-sm font-bold">Languages & reusable guidelines</h2>
          <p className="mt-1 text-xs text-[#777781]">Select supported languages; this does not automatically translate or generate content.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            {BRAND_LANGUAGES.map(lang=><label key={lang} className="inline-flex items-center gap-2 rounded-lg border border-[#E6E6EC] bg-[#FAFAFB] px-3 py-2.5 text-xs font-semibold">
              <input type="checkbox" checked={profile.languages.includes(lang)}
                onChange={e=>change('languages',e.target.checked?[...profile.languages,lang]:profile.languages.filter(x=>x!==lang))}
                className="h-4 w-4 accent-[#FF7900]"/>{titles[lang]}
            </label>)}
          </div>
          <label className={fieldLabel+' mt-5'}>Brand guidelines and do-not-say rules
            <textarea className={inputClass+' min-h-[130px]'} value={profile.guidelines} maxLength={2000}
              onChange={e=>change('guidelines',e.target.value)}
              placeholder="Tone, factual product information, preferred terms, imagery, disclaimers, claims to avoid…"/>
          </label>
        </section>

        <section className="rounded-xl border border-[#ECECF0] bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h2 className="text-sm font-bold">Verified-by-owner offers</h2>
              <p className="mt-1 text-xs text-[#777781]">Up to five factual offers, with terms and optional expiry.</p></div>
            <button type="button" disabled={profile.offers.length>=5}
              onClick={()=>change('offers',[...profile.offers,{title:'',details:'',validUntil:null}])}
              className="rounded-lg bg-[#202024] px-3.5 py-2 text-xs font-bold text-white disabled:opacity-40">
              + Add offer
            </button>
          </div>
          <div className="mt-4 space-y-4">
            {profile.offers.map((o,i)=><div key={i} className="rounded-lg border border-[#E9E9ED] bg-[#FCFCFD] p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-bold">Offer {i+1}</span>
                <button type="button" onClick={()=>change('offers',profile.offers.filter((_,j)=>j!==i))}
                  className="text-xs font-semibold text-red-700">Remove</button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className={fieldLabel}>Offer name
                  <input className={inputClass} required maxLength={100} value={o.title}
                    onChange={e=>updateOffer(i,'title',e.target.value)}/></label>
                <label className={fieldLabel}>Valid until (optional)
                  <input type="date" className={inputClass} value={o.validUntil||''}
                    onChange={e=>updateOffer(i,'validUntil',e.target.value||null)}/></label>
                <label className={fieldLabel+' sm:col-span-2'}>Facts and conditions
                  <textarea className={inputClass} required maxLength={500} value={o.details}
                    onChange={e=>updateOffer(i,'details',e.target.value)} placeholder="Real price, eligibility, dates and terms; no unverified discounts"/></label>
              </div>
            </div>)}
            {!profile.offers.length&&<div className="rounded-lg border border-dashed border-[#DADAE0] p-5 text-xs text-[#86868B]">No offers saved. Add only promotions your business can honour.</div>}
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#ECECF0] bg-white p-4">
          <p className="text-[11px] text-[#777780]">
            {updatedAt?'Last saved '+new Date(updatedAt).toLocaleString('en-LK'):'No saved Brand Profile yet'}
          </p>
          <button type="submit" disabled={!complete}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#202024] px-6 text-xs font-bold text-white hover:bg-[#363638] disabled:opacity-40">
            <IconsaxIcon name="document-text" size={16} color="white"/>
            {saving?'Saving…':loadingProfile?'Loading…':'Save Brand Profile'}
          </button>
        </div>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-5">
        <section className="overflow-hidden rounded-xl border border-[#ECECF0] bg-white">
          <div className="p-4" style={{backgroundColor:profile.primaryColor}}>
            <div className="flex min-h-[200px] flex-col justify-between rounded-lg border border-white/20 p-5"
              style={{backgroundColor:profile.secondaryColor,color:profile.primaryColor}}>
              <div className="flex items-start justify-between gap-3">
                {logo?<Image src={logo} alt={business.name+' business logo'} width={68} height={68}
                  unoptimized className="h-[68px] w-[68px] rounded-lg bg-white object-contain"/>
                  : <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-current/20 text-[10px] font-bold">No logo</div>}
                <span className="rounded px-2 py-1 text-[10px] font-bold" style={{backgroundColor:profile.accentColor,color:profile.secondaryColor}}>BRAND</span>
              </div>
              <div className="min-w-0">
                <p className="break-words text-xl font-extrabold">{profile.brandName||business.name}</p>
                <p className="mt-1 break-words text-xs">{profile.slogan||business.category||''}</p>
                <div className="mt-3 h-1 w-20 rounded-full" style={{backgroundColor:profile.accentColor}}/>
              </div>
            </div>
          </div>
          <div className="p-5">
            <h2 className="text-sm font-bold">Live brand preview</h2>
            <p className="mt-1.5 text-[11px] leading-5 text-[#777780]">Illustrative design-token preview; not a finished social creative.</p>
            <div className="mt-4 flex gap-2">
              {previewColors.map((color,i)=><div key={i} className="h-9 flex-1 rounded-lg border border-[#D5D5DA]"
                style={{backgroundColor:/^#[0-9a-fA-F]{6}$/.test(color)?color:'#FFFFFF'}}
                title={color}/>)}
            </div>
            <div className="mt-4 rounded-lg border border-[#ECECF0] bg-[#FAFAFB] p-3 text-[11px] leading-5 text-[#6F6F78]">
              <strong className="text-[#242429]">Business facts:</strong> {business.category||'Uncategorised'} · {business.city||'Sri Lanka'}
              <p className="mt-1">Voice: {toneLabel[profile.tone]} · {profile.languages.map(l=>titles[l]).join(', ')||'No languages selected'}</p>
            </div>
          </div>
        </section>
        <section className="rounded-xl border border-[#ECECF0] bg-[#FAFAFB] p-5">
          <h3 className="text-sm font-bold">Marketing workflow connection</h3>
          <p className="mt-2 text-xs leading-6 text-[#74747D]">
            This brand profile provides context for future captions, editable posters and campaign approvals.
            AI generation, credit deductions and social publishing are not enabled here.
          </p>
          <Link href="/vendor/marketing" className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[#BA5B13]">
            Marketing Studio <IconsaxIcon name="arrow-right-2" size={14}/>
          </Link>
        </section>
      </aside>
    </form>}
  </div>;
}
