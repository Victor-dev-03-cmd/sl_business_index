'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { User, ShieldCheck, MapPin, Bell, Save, UploadCloud, Globe, Search,
  AlertTriangle, Loader2, CheckCircle2, LockKeyhole, ArrowUpRight, Plus, X,
  Building2, FileCheck2, Mail, Smartphone, Eye, EyeOff, RefreshCcw } from 'lucide-react';

type Tab = 'profile' | 'verification' | 'optimization' | 'notifications' | 'security';
type Profile = {
  full_name:string; email:string; phone:string; job_title:string;
  avatar_url:string; verification_status:string;
};
type Business = {
  id:string; name:string; status:string|null; service_radius:number|null;
  seo_keywords:string[]|null; is_verified:boolean|null; verification_status:string|null;
};
type Verification = {
  id:string;status:string|null; business_type:string|null; br_number:string|null;
  tin_number:string|null;svat_number:string|null; br_document_url:string|null;
  created_at:string|null;
};
type Prefs = {
  reviews:boolean; leads:boolean; weekly_digest:boolean; marketing_tips:boolean;
};
const basePrefs:Prefs={reviews:true,leads:true,weekly_digest:false,marketing_tips:false};
const defaultProfile:Profile={full_name:'',email:'',phone:'',job_title:'',avatar_url:'',verification_status:'unverified'};
const tabList:{id:Tab;name:string;detail:string;icon:typeof User}[]=[
  {id:'profile',name:'Account profile',detail:'Identity and contact',icon:User},
  {id:'verification',name:'Business verification',detail:'Documents and status',icon:ShieldCheck},
  {id:'optimization',name:'Local reach & SEO',detail:'Discovery settings',icon:Globe},
  {id:'notifications',name:'Notifications',detail:'Communication choices',icon:Bell},
  {id:'security',name:'Security',detail:'Account protection',icon:LockKeyhole},
];
// Scoped Tailwind utilities; no Settings-specific stylesheet or versioned selectors.
const field='block h-12 w-full min-w-0 rounded-2xl border border-[#d8dce5] bg-[#e9edf4] px-4 text-[13px] font-medium text-[#323846] shadow-[inset_4px_4px_8px_#c9ced8,inset_-4px_-4px_8px_#ffffff] outline-none transition placeholder:text-[#969dab] focus:border-[#ff7900] focus:ring-2 focus:ring-[#ff7900]/20 disabled:cursor-not-allowed disabled:opacity-60';
const label='mb-2 block text-[11px] font-bold text-[#5b6271]';

function statusLabel(value:string){
  if(value==='approved'||value==='verified')return 'Verified';
  if(value==='pending')return 'Under review';
  if(value==='rejected')return 'Needs attention';
  return 'Not verified';
}
function statusColor(value:string){
  if(value==='approved'||value==='verified')return 'border-[#C9E7D1] bg-[#EDF8EF] text-[#2A7849]';
  if(value==='pending')return 'border-[#EFE0BC] bg-[#FFF8E7] text-[#926C26]';
  if(value==='rejected')return 'border-[#F3D1D1] bg-[#FFF1F1] text-[#A84444]';
  return 'border-[#E7E7EC] bg-[#F4F7F4] text-[#2C2C31]';
}
function normalizeObjectPath(raw:string|null){
  if(!raw)return null;
  if(raw.startsWith('storage://verification-docs/'))return raw.slice('storage://verification-docs/'.length);
  const match=raw.match(/\/storage\/v1\/object\/(?:public|sign)\/verification-docs\/([^?#]+)/);
  if(!match)return null;
  try{return decodeURIComponent(match[1]);}catch{return null;}
}

export default function SettingsPage() {
  const [activeTab,setActiveTab]=useState<Tab>('profile');
  // Section deep links make the command palette and bookmarks actionable.
  // Read the query only after mount to keep SSR and client hydration identical.
  useEffect(()=>{
    const selectFromUrl=()=>{
      const query=new URLSearchParams(window.location.search).get('tab');
      if(query&&tabList.some(section=>section.id===query))setActiveTab(query as Tab);
    };
    selectFromUrl();
    const selectFromCommand=(event:Event)=>{
      const tab=(event as CustomEvent<string>).detail;
      if(tabList.some(section=>section.id===tab))setActiveTab(tab as Tab);
    };
    window.addEventListener('popstate',selectFromUrl);
    window.addEventListener('slbi:settings-tab',selectFromCommand);
    return()=>{
      window.removeEventListener('popstate',selectFromUrl);
      window.removeEventListener('slbi:settings-tab',selectFromCommand);
    };
  },[]);
  const selectTab=(tab:Tab)=>{
    setActiveTab(tab);
    const next=new URL(window.location.href);
    next.searchParams.set('tab',tab);
    window.history.replaceState(window.history.state,'',next.pathname+next.search+next.hash);
  };
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [userId,setUserId]=useState<string|null>(null);
  const [error,setError]=useState('');
  const [profile,setProfile]=useState<Profile>(defaultProfile);
  const [businesses,setBusinesses]=useState<Business[]>([]);
  const [selectedBusinessId,setSelectedBusinessId]=useState('');
  const [verification,setVerification]=useState<Verification|null>(null);
  const [documentPreview,setDocumentPreview]=useState<string|null>(null);
  const [verificationFile,setVerificationFile]=useState<File|null>(null);
  const [businessType,setBusinessType]=useState<'pvt_ltd'|'local_business'>('pvt_ltd');
  const [brNumber,setBrNumber]=useState('');
  const [tinNumber,setTinNumber]=useState('');
  const [svatNumber,setSvatNumber]=useState('');
  const [radius,setRadius]=useState(5);
  const [keywords,setKeywords]=useState<string[]>([]);
  const [newKeyword,setNewKeyword]=useState('');
  const [prefs,setPrefs]=useState<Prefs>(basePrefs);
  const [prefsAvailable,setPrefsAvailable]=useState(false);
  const [newPassword,setNewPassword]=useState('');
  const [confirmPassword,setConfirmPassword]=useState('');
  const [showPassword,setShowPassword]=useState(false);
  const selected=useMemo(()=>businesses.find(b=>b.id===selectedBusinessId)||null,[businesses,selectedBusinessId]);
  const privateDocsReady=process.env.NEXT_PUBLIC_VERIFICATION_PRIVATE_READY==='true';
  const verificationState=verification?.status||selected?.verification_status||'none';
  const verified=verificationState==='approved'||verificationState==='verified';
  const pending=verificationState==='pending';

  const load=useCallback(async()=>{
    setLoading(true);setError('');
    try{
      const {data:{user},error:authError}=await supabase.auth.getUser();
      if(authError)throw authError;
      if(!user){setUserId(null);setError('Sign in to manage vendor settings.');return;}
      setUserId(user.id);
      const [p,b,preference]=await Promise.all([
        supabase.from('profiles').select('full_name,email,phone,job_title,avatar_url,verification_status').eq('id',user.id).maybeSingle(),
        supabase.from('businesses').select('id,name,status,service_radius,seo_keywords,is_verified,verification_status').eq('owner_id',user.id).order('name'),
        supabase.from('vendor_notification_preferences').select('reviews,leads,weekly_digest,marketing_tips').eq('user_id',user.id).maybeSingle(),
      ]);
      if(p.error)throw p.error;
      if(b.error)throw b.error;
      const pr=(p.data||{}) as Partial<Profile>;
      setProfile({
        full_name:pr.full_name||'',email:user.email||pr.email||'',phone:pr.phone||'',
        job_title:pr.job_title||'',avatar_url:pr.avatar_url||'',verification_status:pr.verification_status||'unverified',
      });
      const owned=(b.data||[]) as Business[];
      setBusinesses(owned);
      setSelectedBusinessId(prev=>owned.some(v=>v.id===prev)?prev:owned[0]?.id||'');
      if(preference.error){setPrefsAvailable(false);}
      else {
        setPrefsAvailable(true);
        setPrefs(preference.data?{
          reviews:preference.data.reviews!==false,leads:preference.data.leads!==false,
          weekly_digest:preference.data.weekly_digest===true,
          marketing_tips:preference.data.marketing_tips===true,
        }:basePrefs);
      }
    }catch(caught){
      setError(caught instanceof Error?caught.message:'Could not load vendor settings.');
    }finally{setLoading(false);}
  },[]);

  useEffect(()=>{void load()},[load]);

  useEffect(()=>{
    if(!selected){setVerification(null);setDocumentPreview(null);return;}
    setRadius(Math.max(1,Math.min(50,Number(selected.service_radius)||5)));
    setKeywords(Array.isArray(selected.seo_keywords)?selected.seo_keywords:[]);
    setVerification(null);setDocumentPreview(null);setVerificationFile(null);
    let cancelled=false;
    const loadVerification=async()=>{
      const {data,error}=await supabase.from('verifications')
        .select('id,status,business_type,br_number,tin_number,svat_number,br_document_url,created_at')
        .eq('business_id',selected.id).order('created_at',{ascending:false}).limit(1).maybeSingle();
      if(cancelled)return;
      if(error){toast.error('Could not load business verification.');return;}
      const current=(data||null) as Verification|null;
      setVerification(current);
      setBusinessType(current?.business_type==='local_business'?'local_business':'pvt_ltd');
      setBrNumber(current?.br_number||'');setTinNumber(current?.tin_number||'');setSvatNumber(current?.svat_number||'');
      const path=normalizeObjectPath(current?.br_document_url||null);
      if(path){
        const {data:signed}=await supabase.storage.from('verification-docs').createSignedUrl(path,300);
        if(!cancelled)setDocumentPreview(signed?.signedUrl||null);
      }
    };
    void loadVerification();
    return()=>{cancelled=true};
  },[selectedBusinessId,selected?.id]);

  async function saveProfile(){
    if(!userId)return;
    const fullName=profile.full_name.trim();
    if(fullName.length<2||fullName.length>100){toast.error('Enter a name between 2 and 100 characters.');return;}
    if(profile.phone.length>30||profile.job_title.length>100){toast.error('Please shorten your phone or job title.');return;}
    setSaving(true);
    try{
      const {data,error}=await supabase.from('profiles')
        .update({full_name:fullName,phone:profile.phone.trim(),job_title:profile.job_title.trim(),updated_at:new Date().toISOString()})
        .eq('id',userId).select('id').maybeSingle();
      if(error||!data)throw error||new Error('Profile update was not permitted.');
      toast.success('Account profile saved');
    }catch(e){toast.error(e instanceof Error?e.message:'Could not save your profile.');}
    finally{setSaving(false);}
  }
  async function saveOptimization(){
    if(!userId||!selectedBusinessId)return;
    setSaving(true);
    try{
      const cleanKeywords=keywords.map(k=>k.trim()).filter(Boolean).slice(0,10);
      const {data,error}=await supabase.from('businesses')
        .update({service_radius:Math.round(radius),seo_keywords:cleanKeywords,updated_at:new Date().toISOString()})
        .eq('id',selectedBusinessId).eq('owner_id',userId).select('id').maybeSingle();
      if(error||!data)throw error||new Error('Business update was not permitted.');
      setBusinesses(old=>old.map(b=>b.id===selectedBusinessId?{...b,service_radius:radius,seo_keywords:cleanKeywords}:b));
      toast.success('Local discovery settings saved');
    }catch(e){toast.error(e instanceof Error?e.message:'Could not update your business.');}
    finally{setSaving(false);}
  }
  function addKeyword(){
    const k=newKeyword.trim().replace(/\s+/g,' ').slice(0,50);
    if(!k)return;
    if(keywords.length>=10){toast.error('A maximum of 10 keywords is supported.');return;}
    if(keywords.some(existing=>existing.toLocaleLowerCase()===k.toLocaleLowerCase())){setNewKeyword('');return;}
    setKeywords(old=>[...old,k]);setNewKeyword('');
  }

  async function submitVerification(){
    if(!userId||!selectedBusinessId)return;
    if(!privateDocsReady){toast.error('Secure document uploads are being upgraded. Please contact support.');return;}
    if(verified||pending){toast.info('This business already has an active verification status.');return;}
    const validBr=businessType==='pvt_ltd'?/^PV\d{8}$/i.test(brNumber.trim()):/^\d+\/\d{4}\/[\p{L}\p{N}-]+$/u.test(brNumber.trim());
    if(!validBr){toast.error(businessType==='pvt_ltd'?'BR number format: PV00212345':'BR number format: 123/2024/ABC');return;}
    if(!verificationFile){toast.error('Choose a registration document.');return;}
    if(!['image/jpeg','image/png','application/pdf'].includes(verificationFile.type)||verificationFile.size>10*1024*1024||verificationFile.size===0){
      toast.error('Upload only JPG, PNG or PDF documents up to 10 MB.');return;
    }
    setSaving(true);let objectPath:string|null=null;
    try{
      const extension=verificationFile.type==='application/pdf'?'pdf':verificationFile.type==='image/png'?'png':'jpg';
      objectPath=userId+'/'+selectedBusinessId+'/'+crypto.randomUUID()+'.'+extension;
      const {error:uploadError}=await supabase.storage.from('verification-docs').upload(objectPath,verificationFile,{contentType:verificationFile.type,upsert:false});
      if(uploadError)throw uploadError;
      // Private storage identifier, NOT a public URL. Admin access is authenticated.
      const {error:verifyError}=await supabase.from('verifications').insert({
        business_id:selectedBusinessId,status:'pending',
        br_document_url:'storage://verification-docs/'+objectPath,
        business_type:businessType,br_number:brNumber.trim(),
        tin_number:tinNumber.trim()||null,svat_number:svatNumber.trim()||null,
      });
      if(verifyError)throw verifyError;
      toast.success('Verification request submitted for manual review');
      setVerificationFile(null);
      const {data:latest}=await supabase.from('verifications').select('id,status,business_type,br_number,tin_number,svat_number,br_document_url,created_at')
        .eq('business_id',selectedBusinessId).order('created_at',{ascending:false}).limit(1).maybeSingle();
      setVerification((latest||null) as Verification|null);
    }catch(e){
      if(objectPath)void supabase.storage.from('verification-docs').remove([objectPath]);
      toast.error(e instanceof Error?e.message:'Could not submit verification.');
    }finally{setSaving(false);}
  }

  async function savePreferences(){
    if(!userId)return;
    if(!prefsAvailable){toast.error('Notification preferences database is not yet available.');return;}
    setSaving(true);
    try{
      const {error}=await supabase.from('vendor_notification_preferences')
        .upsert({user_id:userId,...prefs,updated_at:new Date().toISOString()},{onConflict:'user_id'});
      if(error)throw error;
      toast.success('Notification preferences saved');
    }catch(e){toast.error(e instanceof Error?e.message:'Could not save preferences.');}
    finally{setSaving(false);}
  }
  async function changePassword(){
    if(newPassword.length<12){toast.error('Use at least 12 characters for your password.');return;}
    if(newPassword!==confirmPassword){toast.error('Passwords do not match.');return;}
    setSaving(true);
    try{
      const {error}=await supabase.auth.updateUser({password:newPassword});
      if(error)throw error;
      setNewPassword('');setConfirmPassword('');
      toast.success('Password updated. Review your active sessions if needed.');
    }catch(e){toast.error(e instanceof Error?e.message:'Password update failed.');}
    finally{setSaving(false);}
  }

  const initials=(profile.full_name||profile.email||'V').trim().split(/\s+/).slice(0,2).map(n=>n[0]?.toUpperCase()||'').join('');
  const submitLabel=verified?'Verified':pending?'Under review':'Submit for review';
  return (
    <div className="mx-auto w-full max-w-[1440px] min-w-0 px-3 pb-12 pt-3 text-[#252733] sm:px-6 lg:px-8" data-testid="vendor-settings-studio">
      <header className="flex flex-col gap-6 rounded-[28px] border border-white/70 bg-[#e9edf4] px-6 py-8 shadow-[12px_12px_30px_#c7cbd3,-12px_-12px_30px_#ffffff] md:flex-row md:items-center md:justify-between md:px-10">
        <div className="min-w-0 [&_h1]:mt-3 [&_h1]:text-3xl [&_h1]:font-extrabold [&_h1]:tracking-[-0.05em] [&_h1]:text-[#222530] sm:[&_h1]:text-4xl [&_p]:mt-2 [&_p]:max-w-[620px] [&_p]:text-sm [&_p]:leading-7 [&_p]:text-[#696d7b]">
          <div className="flex items-center gap-2 text-[10px] font-extrabold tracking-[.18em] text-[#c26321]"><span className="h-2 w-2 rounded-full bg-[#ff7900] shadow-[0_0_0_5px_#ff79001a]"/> SLBI OWNER PORTAL <span className="px-2 text-[#abaebb]">/</span> ACCOUNT SETTINGS</div>
          <h1>Workspace settings</h1>
          <p>Manage your identity, business verification, discoverability and account preferences in one secure workspace.</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <Link href="/vendor/my-businesses" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#e9edf4] px-5 text-xs font-bold text-[#3d4350] shadow-[5px_5px_12px_#c5cad3,-5px_-5px_12px_#ffffff] transition hover:text-[#f47918] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff7900]"><Building2 size={16}/> My businesses <ArrowUpRight size={14}/></Link>
          <button type="button" onClick={()=>void load()} disabled={loading} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#ff7900] px-5 text-xs font-extrabold text-white shadow-[5px_5px_14px_#c5cad3,-4px_-4px_12px_#ffffff] transition hover:bg-[#e96d00] disabled:opacity-50"><RefreshCcw size={16} className={loading?'animate-spin':''}/> Refresh</button>
        </div>
      </header>

      {error&&<div role="alert" className="mt-5 flex items-center gap-2 rounded-2xl border px-5 py-4 text-sm leading-6 border-red-200 bg-red-50 text-red-800">{error} <Link href="/login?redirect=/vendor/settings">Sign in</Link></div>}
      {loading&&<div role="status" className="mt-5 flex items-center gap-3 rounded-2xl bg-[#edf0f5] px-5 py-4 text-sm font-medium text-[#606779]"><Loader2 size={18} className="animate-spin"/> Loading your workspace preferences…</div>}

      <div className="mt-8 grid min-w-0 items-start gap-8 lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="min-w-0 rounded-[26px] bg-[#e9edf4] p-4 shadow-[9px_9px_22px_#c9cdd5,-9px_-9px_22px_#ffffff] lg:sticky lg:top-6 [&_nav]:flex [&_nav]:flex-row [&_nav]:gap-2 [&_nav]:overflow-x-auto lg:[&_nav]:flex-col" aria-label="Settings navigation">
          <div className="mb-4 px-3 pt-2 text-[10px] font-extrabold uppercase tracking-[.17em] text-[#8b91a0]">WORKSPACE SETTINGS</div>
          <nav aria-label="Vendor settings sections">
            {tabList.map(item=><button type="button" key={item.id} aria-current={activeTab===item.id?'page':undefined}
              onClick={()=>selectTab(item.id)} className={'flex min-w-[175px] flex-1 items-center gap-3 rounded-[17px] px-3 py-3 text-left text-[#626979] transition hover:bg-white/40 lg:min-w-0 lg:w-full lg:flex-none '+(activeTab===item.id?'bg-[#e9edf4] font-bold text-[#ed720d] shadow-[inset_5px_5px_10px_#c7cbd5,inset_-5px_-5px_10px_#ffffff]':'')}>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e9edf4] text-[#ee791c] shadow-[3px_3px_7px_#c7cbd5,-3px_-3px_7px_#ffffff]"><item.icon size={19}/></span>
              <span className="flex min-w-0 flex-1 flex-col gap-1 [&_strong]:text-xs [&_strong]:font-bold [&_span]:text-[10px] [&_span]:text-[#9298a7]"><strong>{item.name}</strong><span>{item.detail}</span></span>
              <ArrowUpRight size={14} className="hidden shrink-0 opacity-50 xl:block"/>
            </button>)}
          </nav>
          <div className="mt-5 hidden items-start gap-3 rounded-2xl bg-[#e9edf4] p-4 text-xs leading-6 text-[#737987] shadow-[inset_4px_4px_8px_#cbd0d8,inset_-4px_-4px_8px_#ffffff] lg:flex [&_a]:font-semibold [&_a]:text-[#d56b10]">
            <span className="shrink-0 text-[#ed791d]"><ShieldCheck size={17}/></span>
            <p>Account-scoped preferences. Need help? <Link href="/vendor/leads">Open your enquiry inbox</Link>.</p>
          </div>
        </aside>

        <main className="min-w-0">
          {activeTab==='profile'&&<section aria-labelledby="ss-profile-heading" className="min-w-0 rounded-[28px] bg-[#e9edf4] p-5 shadow-[12px_12px_28px_#c9cdd5,-12px_-12px_28px_#ffffff] sm:p-8 lg:p-10" id="panel-profile">
            <div className="mb-7 border-b border-[#d4d9e2] pb-6 [&_h2]:mt-3 [&_h2]:text-2xl [&_h2]:font-extrabold [&_h2]:tracking-[-.04em] [&_h2]:text-[#252834] sm:[&_h2]:text-[30px] [&_p]:mt-2 [&_p]:max-w-[690px] [&_p]:text-sm [&_p]:leading-7 [&_p]:text-[#767c89]">
              <span className="inline-flex items-center gap-2 text-[10px] font-extrabold tracking-[.14em] text-[#e67418]"><User size={15}/> PROFILE & IDENTITY</span>
              <h2 id="ss-profile-heading">Account profile</h2>
              <p>Keep the details associated with your vendor account accurate. Listing details are managed separately.</p>
            </div>
            <div className="mb-8 flex flex-wrap items-center gap-4 rounded-[22px] bg-[#e9edf4] p-5 shadow-[inset_6px_6px_12px_#cbd0da,inset_-6px_-6px_12px_#ffffff] [&_div:nth-child(2)]:flex [&_div:nth-child(2)]:min-w-0 [&_div:nth-child(2)]:flex-1 [&_div:nth-child(2)]:flex-col [&_div:nth-child(2)]:gap-1 [&_strong]:break-words [&_strong]:text-sm [&_strong]:font-bold [&_span]:break-all [&_span]:text-xs [&_span]:text-[#858b98]">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-[#262a34] text-lg font-extrabold text-white shadow-[5px_5px_12px_#c0c5cf,-5px_-5px_12px_#ffffff]">{initials||'V'}</div>
              <div><strong>{profile.full_name||'Complete your profile'}</strong><span>{profile.email||'Signed-in email address'}</span></div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fff0e3] px-3 py-2 text-[10px] font-bold text-[#b95d13]"><ShieldCheck size={13}/> Account owner</span>
            </div>
            <div className="grid min-w-0 gap-x-6 gap-y-6 md:grid-cols-2">
              <div className="min-w-0"><label className={label} htmlFor="vendor-name">Full name</label><input className={field} id="vendor-name" type="text" maxLength={100} autoComplete="name" value={profile.full_name} onChange={e=>setProfile(v=>({...v,full_name:e.target.value}))}/></div>
              <div className="min-w-0"><label className={label} htmlFor="vendor-email">Account email</label><input className={field} id="vendor-email" type="email" disabled value={profile.email}/><p className="mt-2 text-[11px] leading-5 text-[#838997]">Changing your email requires authentication verification.</p></div>
              <div className="min-w-0"><label className={label} htmlFor="vendor-phone">Contact phone</label><input className={field} id="vendor-phone" type="tel" maxLength={30} autoComplete="tel" value={profile.phone} onChange={e=>setProfile(v=>({...v,phone:e.target.value}))}/></div>
              <div className="min-w-0"><label className={label} htmlFor="vendor-job">Role or job title</label><input className={field} id="vendor-job" type="text" maxLength={100} value={profile.job_title} onChange={e=>setProfile(v=>({...v,job_title:e.target.value}))} placeholder="Founder, Owner, Manager…"/></div>
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-between gap-5 border-t border-[#d4d9e2] pt-6 [&_p]:text-xs [&_p]:leading-6 [&_p]:text-[#7b8190]"><p>Changes here affect your account profile only.</p><button type="button" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#ff7900] px-6 text-xs font-extrabold text-white shadow-[5px_5px_12px_#c6cbd4,-5px_-5px_12px_#ffffff] transition hover:bg-[#e76c00] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff7900] disabled:cursor-not-allowed disabled:opacity-45" disabled={saving||!userId} onClick={()=>void saveProfile()}>{saving?<Loader2 size={17} className="animate-spin"/>:<Save size={17}/>} Save profile</button></div>
          </section>}

          {activeTab==='verification'&&<section aria-labelledby="ss-verification-heading" className="min-w-0 rounded-[28px] bg-[#e9edf4] p-5 shadow-[12px_12px_28px_#c9cdd5,-12px_-12px_28px_#ffffff] sm:p-8 lg:p-10" id="panel-verification">
            <div className="mb-7 border-b border-[#d4d9e2] pb-6 [&_h2]:mt-3 [&_h2]:text-2xl [&_h2]:font-extrabold [&_h2]:tracking-[-.04em] [&_h2]:text-[#252834] sm:[&_h2]:text-[30px] [&_p]:mt-2 [&_p]:max-w-[690px] [&_p]:text-sm [&_p]:leading-7 [&_p]:text-[#767c89]">
              <span className="inline-flex items-center gap-2 text-[10px] font-extrabold tracking-[.14em] text-[#e67418]"><ShieldCheck size={15}/> BUSINESS TRUST</span>
              <h2 id="ss-verification-heading">Business verification</h2>
              <p>Submit registration details for manual review. Submission does not automatically grant a verified status.</p>
            </div>
            <div className="mb-6 flex flex-wrap items-end gap-4 rounded-[22px] bg-[#e9edf4] p-5 shadow-[inset_5px_5px_11px_#cbd0d9,inset_-5px_-5px_11px_#ffffff] [&_.min-w-0]:min-w-[190px] [&_.min-w-0]:flex-1">
              <div className="min-w-0"><label className={label} htmlFor="verification-business">Business to verify</label>
                <select className={field} id="verification-business" value={selectedBusinessId} onChange={e=>setSelectedBusinessId(e.target.value)} disabled={!businesses.length}>
                  {businesses.length===0?<option value="">No businesses registered</option>:businesses.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <span className={'inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-[11px] font-bold '+(verified?'border-emerald-200 bg-emerald-50 text-emerald-800':pending?'border-amber-200 bg-amber-50 text-amber-800':'border-[#d5d9e1] bg-[#f6f7fa] text-[#686e7b]')}><FileCheck2 size={15}/>{statusLabel(verificationState)}</span>
              {verification?.created_at&&<p className="mt-2 text-[11px] leading-5 text-[#838997]">Last request: {new Date(verification.created_at).toLocaleDateString('en-LK')}</p>}
            </div>
            {pending&&<div className="mt-5 flex items-center gap-2 rounded-2xl border px-5 py-4 text-sm leading-6 border-amber-200 bg-amber-50 text-amber-900">A request is under review. New submissions are paused until it is resolved.</div>}
            {verified&&<div className="mt-5 flex items-center gap-2 rounded-2xl border px-5 py-4 text-sm leading-6 border-emerald-200 bg-emerald-50 text-emerald-800"><CheckCircle2 size={17}/> This business has a verified status.</div>}
            <div className="grid min-w-0 gap-x-6 gap-y-6 md:grid-cols-2 mt-6">
              <div className="min-w-0"><label className={label} htmlFor="business-type">Registration type</label><select className={field} id="business-type" value={businessType} onChange={e=>setBusinessType(e.target.value as typeof businessType)} disabled={pending||verified}><option value="pvt_ltd">Private limited (PVT)</option><option value="local_business">Registered sole proprietorship</option></select></div>
              <div className="min-w-0"><label className={label} htmlFor="br-number">Business registration number</label><input className={field} id="br-number" type="text" maxLength={64} value={brNumber} onChange={e=>setBrNumber(e.target.value)} disabled={pending||verified} placeholder={businessType==='pvt_ltd'?'PV00212345':'123/2024/ABC'}/></div>
              <div className="min-w-0"><label className={label} htmlFor="tin-number">TIN (optional)</label><input className={field} id="tin-number" type="text" maxLength={64} value={tinNumber} onChange={e=>setTinNumber(e.target.value)} disabled={pending||verified}/></div>
              <div className="min-w-0"><label className={label} htmlFor="svat-number">SVAT (optional)</label><input className={field} id="svat-number" type="text" maxLength={64} value={svatNumber} onChange={e=>setSvatNumber(e.target.value)} disabled={pending||verified}/></div>
            </div>
            <div className="mt-7 flex flex-col gap-4 rounded-[22px] bg-[#e9edf4] p-5 shadow-[inset_5px_5px_11px_#cbd0d9,inset_-5px_-5px_11px_#ffffff] sm:flex-row">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] bg-[#e9edf4] text-[#ec7519] shadow-[4px_4px_9px_#c4c9d2,-4px_-4px_9px_#ffffff]"><UploadCloud size={21}/></span>
              <div className="min-w-0 flex-1 [&_h3]:mb-1 [&_h3]:text-sm [&_h3]:font-extrabold [&_p]:mb-3 [&_p]:text-xs [&_p]:leading-6 [&_p]:text-[#737987]">
                <h3>Registration document</h3>
                <p>JPG, PNG or PDF · Maximum 10 MB · Private storage access required</p>
                <input className="block w-full max-w-full cursor-pointer rounded-xl border border-dashed border-[#c7ccd7] bg-white/40 p-3 text-xs text-[#636b79] file:mr-3 file:rounded-lg file:border-0 file:bg-[#ff7900] file:px-3 file:py-2 file:text-xs file:font-bold file:text-white disabled:opacity-50" type="file" aria-label="Select registration document" accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                  disabled={pending||verified||!privateDocsReady||!selectedBusinessId} onChange={e=>setVerificationFile(e.target.files?.[0]||null)}/>
                {verificationFile&&<p className="mt-2 text-[11px] leading-5 text-[#838997]">Selected: {verificationFile.name}</p>}
                {documentPreview&&<a href={documentPreview} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#c46619] underline underline-offset-4">View submitted document <ArrowUpRight size={14}/></a>}
                {!privateDocsReady&&<div role="status" className="mt-5 flex items-center gap-2 rounded-2xl border px-5 py-4 text-sm leading-6 border-amber-200 bg-amber-50 text-amber-900">Secure document uploads are disabled until private storage migration is approved. Existing requests remain visible.</div>}
              </div>
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-between gap-5 border-t border-[#d4d9e2] pt-6 [&_p]:text-xs [&_p]:leading-6 [&_p]:text-[#7b8190]"><p>Official registration documents are reviewed by the SLBI team.</p><button type="button" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#ff7900] px-6 text-xs font-extrabold text-white shadow-[5px_5px_12px_#c6cbd4,-5px_-5px_12px_#ffffff] transition hover:bg-[#e76c00] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff7900] disabled:cursor-not-allowed disabled:opacity-45" disabled={saving||!selectedBusinessId||pending||verified||!privateDocsReady||!verificationFile} onClick={()=>void submitVerification()}>{saving?<Loader2 size={17} className="animate-spin"/>:<ShieldCheck size={17}/>} {submitLabel}</button></div>
          </section>}

          {activeTab==='optimization'&&<section aria-labelledby="ss-optimization-heading" className="min-w-0 rounded-[28px] bg-[#e9edf4] p-5 shadow-[12px_12px_28px_#c9cdd5,-12px_-12px_28px_#ffffff] sm:p-8 lg:p-10" id="panel-optimization">
            <div className="mb-7 border-b border-[#d4d9e2] pb-6 [&_h2]:mt-3 [&_h2]:text-2xl [&_h2]:font-extrabold [&_h2]:tracking-[-.04em] [&_h2]:text-[#252834] sm:[&_h2]:text-[30px] [&_p]:mt-2 [&_p]:max-w-[690px] [&_p]:text-sm [&_p]:leading-7 [&_p]:text-[#767c89]">
              <span className="inline-flex items-center gap-2 text-[10px] font-extrabold tracking-[.14em] text-[#e67418]"><Globe size={15}/> BUSINESS DISCOVERABILITY</span>
              <h2 id="ss-optimization-heading">Local reach & SEO</h2>
              <p>Manage your service area and search terms without changing your business profile or guaranteeing rankings.</p>
            </div>
            <div className="mb-6 flex flex-wrap items-end gap-4 rounded-[22px] bg-[#e9edf4] p-5 shadow-[inset_5px_5px_11px_#cbd0d9,inset_-5px_-5px_11px_#ffffff] [&_.min-w-0]:min-w-[190px] [&_.min-w-0]:flex-1 mb-7">
              <div className="min-w-0"><label className={label} htmlFor="seo-business">Editing business</label>
                <select className={field} id="seo-business" value={selectedBusinessId} disabled={!businesses.length} onChange={e=>setSelectedBusinessId(e.target.value)}>{businesses.length===0?<option value="">No businesses registered</option>:businesses.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select>
              </div>
              <span className="inline-flex items-center gap-2 pb-3 text-xs font-semibold text-[#777e8a]"><MapPin size={15}/> Changes are saved per business</span>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <article className="min-w-0 rounded-[24px] bg-[#e9edf4] p-5 shadow-[6px_6px_15px_#c6cbd5,-6px_-6px_15px_#ffffff] sm:p-6">
                <div className="flex items-center gap-3 [&_div]:min-w-0 [&_div]:flex-1 [&_div_span]:text-[10px] [&_div_span]:font-bold [&_div_span]:tracking-[.11em] [&_div_span]:text-[#dc7525] [&_h3]:mt-1 [&_h3]:text-lg [&_h3]:font-extrabold"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] bg-[#e9edf4] text-[#ec7519] shadow-[4px_4px_9px_#c4c9d2,-4px_-4px_9px_#ffffff]"><MapPin size={19}/></span><div><span>01 / SERVICE AREA</span><h3>Service radius</h3></div></div>
                <p className="my-5 text-xs leading-6 text-[#78808d]">Set the distance your business can genuinely serve.</p>
                <div className="mb-5 flex items-baseline gap-3 [&_strong]:text-5xl [&_strong]:font-extrabold [&_strong]:tracking-[-.07em] [&_span]:text-sm [&_span]:text-[#818796]"><strong>{radius}</strong><span>kilometres</span></div>
                <div className="rounded-[18px] bg-[#e9edf4] p-5 shadow-[inset_5px_5px_11px_#cbd0d9,inset_-5px_-5px_11px_#ffffff] mb-5">
                  <input className="w-full cursor-pointer accent-[#ff7900] disabled:cursor-not-allowed disabled:opacity-50" type="range" aria-label="Business service radius" min={1} max={50} step={1} value={radius} onChange={e=>setRadius(Number(e.target.value))} disabled={!selectedBusinessId}/>
                  <div className="mt-3 flex justify-between text-[11px] font-semibold text-[#8b91a0]"><span>1 km</span><span>50 km</span></div>
                </div>
                <p className="text-[11px] leading-6 text-[#868b99]">Search ranking also depends on location accuracy, relevance and user filters.</p>
              </article>
              <article className="min-w-0 rounded-[24px] bg-[#e9edf4] p-5 shadow-[6px_6px_15px_#c6cbd5,-6px_-6px_15px_#ffffff] sm:p-6">
                <div className="flex items-center gap-3 [&_div]:min-w-0 [&_div]:flex-1 [&_div_span]:text-[10px] [&_div_span]:font-bold [&_div_span]:tracking-[.11em] [&_div_span]:text-[#dc7525] [&_h3]:mt-1 [&_h3]:text-lg [&_h3]:font-extrabold"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] bg-[#e9edf4] text-[#ec7519] shadow-[4px_4px_9px_#c4c9d2,-4px_-4px_9px_#ffffff]"><Search size={19}/></span><div><span>02 / SEARCH DISCOVERY</span><h3>Search keywords</h3></div><span className="ml-auto rounded-full bg-[#fff0e1] px-2.5 py-1 text-[10px] font-extrabold text-[#c2651d]">{keywords.length}/10</span></div>
                <p className="my-5 text-xs leading-6 text-[#78808d]">Use specific services and terms customers actually search for.</p>
                <div className="min-w-0 mt-5"><label className={label} htmlFor="vendor-seo-keyword">Add a keyword</label>
                  <div className="flex flex-col gap-2 sm:flex-row [&_input]:flex-1">
                    <input className={field} id="vendor-seo-keyword" type="text" maxLength={50} value={newKeyword} onChange={e=>setNewKeyword(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();addKeyword()}}} placeholder="e.g. laptop repair"/>
                    <button type="button" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#292d36] px-5 text-xs font-extrabold text-white transition hover:bg-[#454b57] disabled:opacity-40" disabled={!newKeyword.trim()||keywords.length>=10} aria-label="Add keyword" onClick={addKeyword}><Plus size={16}/> Add</button>
                  </div>
                </div>
                <div className="mt-5 min-h-28 rounded-[18px] bg-[#e9edf4] p-4 shadow-[inset_4px_4px_9px_#cbd0d9,inset_-4px_-4px_9px_#ffffff]">
                  <div className="mb-3 flex justify-between gap-2 text-[10px] font-bold uppercase tracking-[.08em] text-[#818897]"><span>Current keywords</span><span>{keywords.length} of 10</span></div>
                  <div className="flex flex-wrap gap-2">{keywords.map(k=><span key={k} className="inline-flex items-center gap-2 rounded-full bg-[#fafbfe] px-3 py-1.5 text-[11px] font-semibold text-[#4c5361] shadow-[2px_2px_5px_#cbd0d9,-2px_-2px_5px_#ffffff] [&_button]:text-[#e4771d]"><span>{k}</span><button type="button" onClick={()=>setKeywords(prev=>prev.filter(t=>t!==k))} aria-label={'Remove '+k}><X size={13}/></button></span>)}{keywords.length===0&&<span className="text-xs text-[#969caa]">No keywords yet.</span>}</div>
                </div>
              </article>
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-between gap-5 border-t border-[#d4d9e2] pt-6 [&_p]:text-xs [&_p]:leading-6 [&_p]:text-[#7b8190] [&_p]:flex [&_p]:items-center [&_p]:gap-2">
              <p><ShieldCheck size={17}/> Changes are saved only to your selected business. No ranking is guaranteed.</p>
              <button type="button" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#ff7900] px-6 text-xs font-extrabold text-white shadow-[5px_5px_12px_#c6cbd4,-5px_-5px_12px_#ffffff] transition hover:bg-[#e76c00] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff7900] disabled:cursor-not-allowed disabled:opacity-45" disabled={saving||!selectedBusinessId} onClick={()=>void saveOptimization()}>{saving?<Loader2 size={17} className="animate-spin"/>:<Save size={17}/>} {saving?'Saving…':'Save discovery settings'}</button>
            </div>
          </section>}

          {activeTab==='notifications'&&<section aria-labelledby="ss-notifications-heading" className="min-w-0 rounded-[28px] bg-[#e9edf4] p-5 shadow-[12px_12px_28px_#c9cdd5,-12px_-12px_28px_#ffffff] sm:p-8 lg:p-10" id="panel-notifications">
            <div className="mb-7 border-b border-[#d4d9e2] pb-6 [&_h2]:mt-3 [&_h2]:text-2xl [&_h2]:font-extrabold [&_h2]:tracking-[-.04em] [&_h2]:text-[#252834] sm:[&_h2]:text-[30px] [&_p]:mt-2 [&_p]:max-w-[690px] [&_p]:text-sm [&_p]:leading-7 [&_p]:text-[#767c89]">
              <span className="inline-flex items-center gap-2 text-[10px] font-extrabold tracking-[.14em] text-[#e67418]"><Bell size={15}/> COMMUNICATION</span>
              <h2 id="ss-notifications-heading">Notification preferences</h2>
              <p>Choose the optional business updates you wish to receive. Essential security and verification notices are separate.</p>
            </div>
            {!prefsAvailable&&<div role="status" className="mt-5 flex items-center gap-2 rounded-2xl border px-5 py-4 text-sm leading-6 border-amber-200 bg-amber-50 text-amber-900">Preferences storage is not yet configured. Saving is disabled until the reviewed migration is applied.</div>}
            <div className="grid gap-4">
              {([
                {key:'reviews',title:'New reviews',text:'Optional updates when customers review your businesses.',icon:User},
                {key:'leads',title:'New enquiries',text:'Enquiry notifications on your owned listings.',icon:Mail},
                {key:'weekly_digest',title:'Weekly summary',text:'Periodic recap when delivery is enabled.',icon:Globe},
                {key:'marketing_tips',title:'Growth tips',text:'Optional marketing and educational updates.',icon:Bell},
              ] as const).map(item=><label key={item.key} className="flex cursor-pointer items-center gap-4 rounded-[20px] bg-[#e9edf4] p-4 shadow-[5px_5px_12px_#c8cdd6,-5px_-5px_12px_#ffffff] transition hover:shadow-[inset_3px_3px_8px_#cbd0d9,inset_-3px_-3px_8px_#ffffff] sm:p-5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] bg-[#e9edf4] text-[#ec7519] shadow-[4px_4px_9px_#c4c9d2,-4px_-4px_9px_#ffffff]"><item.icon size={19}/></span>
                <span className="flex min-w-0 flex-1 flex-col gap-1 [&_strong]:text-sm [&_strong]:font-bold [&_span]:text-xs [&_span]:leading-5 [&_span]:text-[#818796]"><strong>{item.title}</strong><span>{item.text}</span></span>
                <input className="h-5 w-5 shrink-0 cursor-pointer accent-[#ff7900] disabled:cursor-not-allowed disabled:opacity-40" type="checkbox" checked={prefs[item.key]} disabled={!prefsAvailable} onChange={e=>setPrefs(v=>({...v,[item.key]:e.target.checked}))} aria-label={item.title}/>
              </label>)}
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-between gap-5 border-t border-[#d4d9e2] pt-6 [&_p]:text-xs [&_p]:leading-6 [&_p]:text-[#7b8190]"><p>Saving a preference does not guarantee email or push delivery.</p><button type="button" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#ff7900] px-6 text-xs font-extrabold text-white shadow-[5px_5px_12px_#c6cbd4,-5px_-5px_12px_#ffffff] transition hover:bg-[#e76c00] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff7900] disabled:cursor-not-allowed disabled:opacity-45" disabled={saving||!prefsAvailable||!userId} onClick={()=>void savePreferences()}>{saving?<Loader2 size={17} className="animate-spin"/>:<Save size={17}/>} Save preferences</button></div>
          </section>}

          {activeTab==='security'&&<section aria-labelledby="ss-security-heading" className="min-w-0 rounded-[28px] bg-[#e9edf4] p-5 shadow-[12px_12px_28px_#c9cdd5,-12px_-12px_28px_#ffffff] sm:p-8 lg:p-10" id="panel-security">
            <div className="mb-7 border-b border-[#d4d9e2] pb-6 [&_h2]:mt-3 [&_h2]:text-2xl [&_h2]:font-extrabold [&_h2]:tracking-[-.04em] [&_h2]:text-[#252834] sm:[&_h2]:text-[30px] [&_p]:mt-2 [&_p]:max-w-[690px] [&_p]:text-sm [&_p]:leading-7 [&_p]:text-[#767c89]">
              <span className="inline-flex items-center gap-2 text-[10px] font-extrabold tracking-[.14em] text-[#e67418]"><LockKeyhole size={15}/> ACCOUNT PROTECTION</span>
              <h2 id="ss-security-heading">Password & security</h2>
              <p>Set a strong password for your vendor account. Existing sessions on other devices may remain active until revoked.</p>
            </div>
            <div className="mb-8 flex items-start gap-4 rounded-[20px] bg-[#e9edf4] p-5 text-[#dc7623] shadow-[inset_5px_5px_11px_#cbd0d9,inset_-5px_-5px_11px_#ffffff] [&_strong]:text-sm [&_strong]:font-bold [&_strong]:text-[#30343e] [&_p]:mt-1 [&_p]:text-xs [&_p]:leading-6 [&_p]:text-[#7b8190]"><ShieldCheck size={20}/><div><strong>Protected by Supabase Auth</strong><p>Password updates are handled by the authentication provider, not stored in business tables.</p></div></div>
            <div className="grid min-w-0 gap-x-6 gap-y-6 md:grid-cols-2">
              <div className="min-w-0"><label className={label} htmlFor="vendor-password">New password</label><div className="relative [&_input]:pr-12 [&_button]:absolute [&_button]:right-3 [&_button]:top-1/2 [&_button]:-translate-y-1/2 [&_button]:rounded-lg [&_button]:p-2 [&_button]:text-[#6c7482]"><input className={field} id="vendor-password" type={showPassword?'text':'password'} autoComplete="new-password" maxLength={128} value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder="12 characters or more"/><button type="button" aria-label={showPassword?'Hide password':'Show password'} onClick={()=>setShowPassword(v=>!v)}>{showPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></div>
              <div className="min-w-0"><label className={label} htmlFor="vendor-confirm">Confirm new password</label><input className={field} id="vendor-confirm" type={showPassword?'text':'password'} autoComplete="new-password" maxLength={128} value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)}/></div>
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-between gap-5 border-t border-[#d4d9e2] pt-6 [&_p]:text-xs [&_p]:leading-6 [&_p]:text-[#7b8190]"><Link href="/vendor/billing" className="inline-flex items-center gap-2 text-xs font-bold text-[#ca681c] hover:underline">Manage billing security <ArrowUpRight size={15}/></Link><button type="button" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#ff7900] px-6 text-xs font-extrabold text-white shadow-[5px_5px_12px_#c6cbd4,-5px_-5px_12px_#ffffff] transition hover:bg-[#e76c00] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff7900] disabled:cursor-not-allowed disabled:opacity-45" disabled={saving||!userId||newPassword.length<12||newPassword!==confirmPassword} onClick={()=>void changePassword()}>{saving?<Loader2 size={17} className="animate-spin"/>:<LockKeyhole size={17}/>} Update password</button></div>
          </section>}
        </main>
      </div>
      <p className="mt-8 text-center text-[11px] leading-6 text-[#8d94a2]">SL Business Index · Owner Growth Portal · Changes are restricted to your account and owned businesses.</p>
    </div>
  );
}
