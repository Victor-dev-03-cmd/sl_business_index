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
// Explicit utility classes ensure form affordances and dimensions do not depend
// on CSS cascade order. Keep controls visually distinct on every theme/device.
const field='vendor-field block h-11 w-full min-w-0 rounded-md border border-[#C6D5CA] bg-[#FCFDFB] px-3.5 py-2.5 text-[13px] leading-5 text-[#1E3E2C] shadow-[inset_0_1px_2px_rgba(25,54,35,.03)] outline-none focus:border-[#478B63] focus:ring-2 focus:ring-[#E0EEE3] disabled:cursor-not-allowed disabled:bg-[#F1F5F1] disabled:text-[#6D8572]';
const label='vendor-label mb-2 block text-[11px] font-bold leading-5 text-[#3D5E49]';

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
  return 'border-[#E1E7E2] bg-[#F4F7F4] text-[#6A8070]';
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
    <div className="vendor-page-v7 vendor-settings vendor-settings-v5 mx-auto w-full max-w-[1680px] min-w-0 space-y-5 pb-7 text-[#283842]">
      <header className="vendor-owner-heading vendor-settings-header flex flex-col gap-5 rounded-[10px] border border-[#E3E9EC] bg-white px-5 py-6 shadow-[0_2px_14px_rgba(23,41,50,.025)] sm:px-7 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 max-w-[760px]">
          <p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#8B98A2]">Account & workspace / Settings</p>
          <h1 className="mt-2 text-[27px] font-semibold tracking-[-.045em] text-[#1A2B34] sm:text-[31px]">Workspace settings</h1>
          <p className="mt-2 text-[12px] leading-6 text-[#75838E]">Control account details, verify businesses and adjust discovery preferences in one place.</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Link href="/vendor/my-businesses" className="inline-flex h-10 items-center gap-2 rounded-[6px] border border-[#DDE5E9] bg-white px-4 text-[11px] font-semibold text-[#435563] hover:bg-[#F5F8FA]"><Building2 size={15}/> Manage businesses <ArrowUpRight size={13}/></Link>
          <button type="button" onClick={()=>void load()} disabled={loading} className="inline-flex h-10 items-center gap-2 rounded-[6px] bg-[#263A43] px-4 text-[11px] font-semibold text-white hover:bg-[#172A32] disabled:opacity-50"><RefreshCcw size={15}/> Refresh</button>
        </div>
      </header>
      {error&&<div role="alert" className="rounded-xl border border-[#E9D3BE] bg-[#FFF9ED] p-4 text-[12px] text-[#875E38]">{error}<Link href="/login?redirect=/vendor/settings" className="ml-2 underline">Sign in</Link></div>}
      {loading&&<div role="status" className="vendor-premium-panel flex items-center gap-3 p-5 text-sm text-[#50745C]"><Loader2 className="animate-spin" size={18}/> Loading your settings…</div>}

      <div className="grid min-w-0 grid-cols-1 items-start gap-5 lg:grid-cols-[238px_minmax(0,1fr)] lg:gap-6">
        <div className="vendor-settings-navigation min-w-0 overflow-hidden rounded-[10px] border border-[#E4E9ED] bg-white p-2 shadow-[0_2px_14px_rgba(23,41,50,.03)] lg:sticky lg:top-5">
          <p className="px-3 pb-3 pt-4 text-[10px] font-bold uppercase tracking-[.17em] text-[#8B9F90]">Workspace settings</p>
          <nav aria-label="Vendor settings sections" className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-1" role="tablist" aria-orientation="vertical">
            {tabList.map(item=><button type="button" role="tab" id={'tab-'+item.id} aria-selected={activeTab===item.id} aria-controls={'panel-'+item.id} key={item.id} onClick={()=>selectTab(item.id)}
              className={'flex min-h-12 w-full items-center gap-3 rounded-[7px] px-3 py-3 text-left transition '+(activeTab===item.id?'bg-[#E7F1D5] text-[#263A34]':'text-[#63737F] hover:bg-[#F2F5F7] hover:text-[#273943]')}>
              <span className={'flex h-9 w-9 shrink-0 items-center justify-center rounded-[7px] '+(activeTab===item.id?'bg-white text-[#314D3D]':'bg-[#F2F5F7] text-[#72818C]')}><item.icon size={17}/></span>
              <span className="flex-1"><span className="block text-[12px] font-bold">{item.name}</span><span className="mt-0.5 block text-[10px] opacity-70">{item.detail}</span></span>
            </button>)}
          </nav>
          <div className="mx-2 mt-3 rounded-[7px] border border-[#E6EBEF] bg-[#F7F9FA] px-4 py-3 text-[11px] leading-[1.6] text-[#71808C]">
            Need help? <Link href="/vendor/leads" className="font-bold text-[#2B6945] underline underline-offset-2">Your enquiry inbox</Link> remains accessible from the main portal.
          </div>
        </div>
        <div className="vendor-settings-panels min-w-0 w-full space-y-5">
          {activeTab==='profile'&&<section role="tabpanel" id="panel-profile" aria-labelledby="tab-profile" className="vendor-setting-section w-full min-w-0 space-y-6 border border-[#DCE7DE] bg-white p-5 shadow-sm sm:p-7">
            <div><p className="vendor-kicker">Personal profile</p><h2 className="mt-1 text-[22px] font-extrabold text-[#213F2D]">Account identity</h2><p className="mt-1 text-[12px] text-[#7C8994]">This information belongs to your account, not to any single business listing.</p></div>
            <div className="flex flex-wrap items-center gap-4 rounded-[16px] border border-[#E5ECE5] bg-[#FAFCF8] p-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[18px] bg-[#254E38] text-xl font-extrabold text-white">{initials||'V'}</div>
              <div><p className="text-[14px] font-bold text-[#274A34]">{profile.full_name||'Complete your profile'}</p><p className="mt-1 text-[11px] text-[#718675]">{profile.email||'Email is linked to your signed-in account'}</p><span className="mt-2 inline-flex items-center gap-1 rounded-full border border-[#D8E7DC] bg-white px-2 py-1 text-[10px] font-semibold text-[#587C60]"><ShieldCheck size={12}/> Account owner</span></div>
            </div>
            <div className="grid grid-cols-1 items-start gap-x-6 gap-y-5 md:grid-cols-2">
              <div className="min-w-0"><label className={label} htmlFor="vendor-name">Full name</label><input id="vendor-name" className={field} maxLength={100} autoComplete="name" value={profile.full_name} onChange={e=>setProfile(v=>({...v,full_name:e.target.value}))}/></div>
              <div className="min-w-0"><label className={label} htmlFor="vendor-email">Account email</label><input id="vendor-email" className={field} type="email" disabled value={profile.email}/><p className="mt-1.5 text-[10px] text-[#8D9C8F]">Email changes require authentication verification.</p></div>
              <div className="min-w-0"><label className={label} htmlFor="vendor-phone">Contact phone</label><input id="vendor-phone" className={field} type="tel" maxLength={30} autoComplete="tel" value={profile.phone} onChange={e=>setProfile(v=>({...v,phone:e.target.value}))}/></div>
              <div className="min-w-0"><label className={label} htmlFor="vendor-job">Role or job title</label><input id="vendor-job" className={field} maxLength={100} value={profile.job_title} onChange={e=>setProfile(v=>({...v,job_title:e.target.value}))} placeholder="Founder, Owner, Manager…"/></div>
            </div>
            <div className="vendor-settings-savebar flex flex-wrap items-center justify-between gap-4 border-t border-[#E7EBEF] pt-5"><p className="min-w-0 text-[11px] leading-5 text-[#708674]">Only your profile details will be updated.</p><button type="button" onClick={()=>void saveProfile()} disabled={saving||!userId} className="vendor-primary-button">{saving?<Loader2 size={16} className="animate-spin"/>:<Save size={16}/>} Save profile</button></div>
          </section>}

          {activeTab==='verification'&&<section role="tabpanel" id="panel-verification" aria-labelledby="tab-verification" className="vendor-setting-section space-y-5">
            <div><p className="vendor-kicker">Trust & verification</p><h2 className="mt-1 text-[22px] font-extrabold">Verification center</h2><p className="mt-1 text-[12px] leading-5 text-[#7B8792]">Submit official registration information for administrator review. Submission alone never grants a verified badge.</p></div>
            <div className="rounded-xl border border-[#DBE9D9] bg-[#F8FAFB] p-4">
              <label className={label} htmlFor="verification-business">Business under review</label>
              <select id="verification-business" className={field} value={selectedBusinessId} onChange={e=>setSelectedBusinessId(e.target.value)} disabled={!businesses.length}>
                {businesses.length===0?<option value="">No businesses registered</option>:businesses.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <span className={'mt-3 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold '+statusColor(verificationState)}><FileCheck2 size={13}/>{statusLabel(verificationState)}</span>
              {verification?.created_at&&<p className="mt-2 text-[11px] text-[#728775]">Last request: {new Date(verification.created_at).toLocaleDateString('en-LK')}</p>}
            </div>
            {pending&&<p className="rounded-xl border border-[#EEE0B9] bg-[#FFF9E8] p-4 text-[12px] font-medium text-[#917038]">Your verification request is under manual review. New submissions are paused until this request is resolved.</p>}
            {verified&&<p className="rounded-xl border border-[#CAE8D2] bg-[#F0FAF1] p-4 text-[12px] font-medium text-[#32754E]"><CheckCircle2 size={17} className="mr-2 inline"/>This business has a verified status.</p>}
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className={label} htmlFor="business-type">Registration type</label><select id="business-type" className={field} value={businessType} onChange={e=>setBusinessType(e.target.value as typeof businessType)} disabled={pending||verified}><option value="pvt_ltd">Private limited (PVT)</option><option value="local_business">Registered sole proprietorship</option></select></div>
              <div><label className={label} htmlFor="br-number">Business registration number</label><input id="br-number" className={field} maxLength={64} value={brNumber} onChange={e=>setBrNumber(e.target.value)} disabled={pending||verified} placeholder={businessType==='pvt_ltd'?'PV00212345':'123/2024/ABC'}/></div>
              <div><label className={label} htmlFor="tin-number">TIN (optional)</label><input id="tin-number" className={field} maxLength={64} value={tinNumber} onChange={e=>setTinNumber(e.target.value)} disabled={pending||verified}/></div>
              <div><label className={label} htmlFor="svat-number">SVAT (optional)</label><input id="svat-number" className={field} maxLength={64} value={svatNumber} onChange={e=>setSvatNumber(e.target.value)} disabled={pending||verified}/></div>
            </div>
            <div className="rounded-[15px] border border-dashed border-[#BCD8C4] bg-[#F9FCF8] p-5">
              <div className="flex items-center gap-3"><span className="rounded-xl bg-[#EAF4EB] p-3 text-[#3C8154]"><UploadCloud size={22}/></span><div><p className="text-[12px] font-bold text-[#2E513D]">Registration document</p><p className="mt-1 text-[11px] text-[#839386]">JPG, PNG or PDF · 10 MB maximum · private access after security migration</p></div></div>
              <input type="file" aria-label="Select registration document" accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf" disabled={pending||verified||!privateDocsReady||!selectedBusinessId} className="mt-4 block w-full rounded-xl border border-[#E2EAE2] bg-white p-3 text-[12px] text-[#477153] file:mr-3 file:rounded-lg file:border-0 file:bg-[#EFF3F6] file:px-3 file:py-2 file:font-bold file:text-[#3C724A]" onChange={e=>setVerificationFile(e.target.files?.[0]||null)}/>
              {verificationFile&&<p className="mt-2 text-[11px] font-semibold text-[#42754B]">Selected: {verificationFile.name}</p>}
              {documentPreview&&<a href={documentPreview} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-[11px] font-bold text-[#2D7853] underline">View submitted document <ArrowUpRight size={13}/></a>}
              {!privateDocsReady&&<p role="status" className="mt-3 rounded-lg border border-[#EADDB8] bg-[#FFF9E8] p-3 text-[11px] leading-5 text-[#906F2E]">Secure document storage upgrade is pending. New uploads are disabled to protect sensitive IDs and registration documents. Your existing requests remain visible to administrators.</p>}
            </div>
            <div className="vendor-settings-savebar flex flex-wrap justify-end gap-3 border-t border-[#E7EBEF] pt-5"><button type="button" className="vendor-primary-button" disabled={saving||!selectedBusinessId||pending||verified||!privateDocsReady||!verificationFile} onClick={()=>void submitVerification()}>{saving?<Loader2 size={16} className="animate-spin"/>:<ShieldCheck size={16}/>} {submitLabel}</button></div>
          </section>}

          {activeTab==='optimization'&&<section role="tabpanel" id="panel-optimization" aria-labelledby="tab-optimization" className="space-y-5">
            <div className="vendor-setting-section">
              <p className="vendor-kicker">Local discovery controls</p><h2 className="mt-1 text-[22px] font-extrabold">Reach & search keywords</h2>
              <p className="mt-2 text-[12px] leading-6 text-[#7B8792]">Describe your service area and relevant keywords. These are business-provided hints, not guaranteed visibility or ranking outcomes.</p>
              <label className={label+' mt-5'} htmlFor="seo-business">Choose business</label>
              <select id="seo-business" className={field} value={selectedBusinessId} disabled={!businesses.length} onChange={e=>setSelectedBusinessId(e.target.value)}>{businesses.length===0?<option value="">No businesses registered</option>:businesses.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select>
            </div>
            <div className="vendor-setting-section">
              <div className="flex items-center justify-between gap-3"><div><p className="vendor-kicker">Local intelligence</p><h3 className="mt-1 text-[17px] font-bold text-[#254935]">Service radius</h3></div><span className="rounded-xl border border-[#D9E8D9] bg-[#F3F6F7] px-4 py-2 text-[14px] font-extrabold tabular-nums text-[#24613F]">{radius} km</span></div>
              <p className="mt-2 text-[12px] text-[#7B917E]">Set the distance your business says it can serve, from 1 to 50 kilometres.</p>
              <input type="range" min={1} max={50} step={1} value={radius} onChange={e=>setRadius(Number(e.target.value))} disabled={!selectedBusinessId} aria-label="Business service radius" className="mt-6 w-full accent-[#2F8050]"/>
              <div className="mt-2 flex justify-between text-[10px] font-semibold text-[#8BA092]"><span>1 km</span><span>50 km</span></div>
              <div className="mt-5 flex items-center gap-3 rounded-xl border border-[#E6EFE4] bg-[#F5FAF4] p-4"><MapPin className="shrink-0 text-[#3D8855]" size={22}/><p className="text-[11px] leading-5 text-[#62846B]">Saved radius is a business profile preference. Exact discovery ranking still depends on verified locations, query relevance and user-selected filters.</p></div>
            </div>
            <div className="vendor-setting-section">
              <div className="flex items-center gap-3"><span className="rounded-xl bg-[#F0F3F7] p-3 text-[#377C4E]"><Search size={20}/></span><div><h3 className="text-[17px] font-bold">Search keywords</h3><p className="mt-1 text-[11px] text-[#809784]">Maximum 10 relevant terms · up to 50 characters each</p></div></div>
              <div className="mt-5 flex min-w-0 flex-col gap-2 sm:flex-row"><input className={field+' vendor-keyword-input min-w-0 flex-1'} maxLength={50} value={newKeyword} onChange={e=>setNewKeyword(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();addKeyword()}}} placeholder="e.g. plumbing, bike service…"/><button type="button" onClick={addKeyword} disabled={!newKeyword.trim()||keywords.length>=10} aria-label="Add keyword" className="vendor-outline-button shrink-0"><Plus size={16}/> Add</button></div>
              <div className="mt-4 flex min-h-12 flex-wrap gap-2">{keywords.map(k=><span key={k} className="inline-flex items-center gap-2 rounded-full border border-[#DCEBDD] bg-[#F3F6F7] px-3 py-1.5 text-[11px] font-bold text-[#39714C]">{k}<button type="button" onClick={()=>setKeywords(prev=>prev.filter(t=>t!==k))} aria-label={'Remove '+k} className="rounded-full p-0.5 hover:bg-[#DCE9DD]"><X size={12}/></button></span>)}{keywords.length===0&&<p className="text-[11px] text-[#93A597]">No additional search keywords saved.</p>}</div>
              <div className="vendor-settings-savebar mt-5 flex flex-wrap justify-end gap-3 border-t border-[#E7EBEF] pt-5"><button type="button" onClick={()=>void saveOptimization()} disabled={saving||!selectedBusinessId} className="vendor-primary-button">{saving?<Loader2 size={16} className="animate-spin"/>:<Save size={16}/>} Save local discovery</button></div>
            </div>
          </section>}

          {activeTab==='notifications'&&<section role="tabpanel" id="panel-notifications" aria-labelledby="tab-notifications" className="vendor-setting-section space-y-5">
            <div><p className="vendor-kicker">Communication preferences</p><h2 className="mt-1 text-[22px] font-extrabold">Notification preferences</h2><p className="mt-2 text-[12px] leading-6 text-[#7B8994]">Save the kinds of optional business updates you want. Essential security and verification notices remain available.</p></div>
            {!prefsAvailable&&<p role="status" className="rounded-xl border border-[#EADDB9] bg-[#FFF9E9] p-4 text-[11px] text-[#947135]">Preferences storage is not yet configured. Switches cannot be saved until the reviewed database migration is applied.</p>}
            <div className="divide-y divide-[#ECF0EB] rounded-[15px] border border-[#E4ECE3] bg-[#FBFDFB]">
              {([
                {key:'reviews',title:'New reviews',text:'Optional updates when customers leave reviews.',icon:User},
                {key:'leads',title:'New enquiries',text:'Optional notifications for enquiries on owned listings.',icon:Mail},
                {key:'weekly_digest',title:'Weekly summary',text:'Periodic business activity digest, if delivery is enabled.',icon:Globe},
                {key:'marketing_tips',title:'Growth tips',text:'Optional educational marketing updates.',icon:Bell},
              ] as const).map(item=><label key={item.key} className="flex cursor-pointer items-center gap-3 p-4 sm:p-5">
                <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EDF6ED] text-[#42845C] sm:flex"><item.icon size={18}/></span>
                <span className="min-w-0 flex-1"><span className="block text-[12px] font-bold text-[#31513B]">{item.title}</span><span className="mt-1 block text-[11px] leading-5 text-[#819686]">{item.text}</span></span>
                <input type="checkbox" checked={prefs[item.key]} disabled={!prefsAvailable} onChange={e=>setPrefs(v=>({...v,[item.key]:e.target.checked}))} className="h-5 w-5 shrink-0 accent-[#347A4C]" aria-label={item.title}/>
              </label>)}
            </div>
            <p className="text-[11px] leading-5 text-[#86998A]">Preferences are stored with your vendor account. Delivery of future emails/push messages is subject to the messaging service and explicit opt-in; saving a setting does not guarantee delivery.</p>
            <div className="flex justify-end border-t border-[#E6EEE6] pt-5"><button type="button" className="vendor-primary-button" onClick={()=>void savePreferences()} disabled={saving||!prefsAvailable||!userId}><Save size={16}/> Save preferences</button></div>
          </section>}

          {activeTab==='security'&&<section role="tabpanel" id="panel-security" aria-labelledby="tab-security" className="vendor-setting-section space-y-6">
            <div><p className="vendor-kicker">Owner security</p><h2 className="mt-1 text-[22px] font-extrabold">Protect your account</h2><p className="mt-2 text-[12px] leading-6 text-[#7B8792]">Update your password. Other signed-in devices may retain a session until revoked; review your account security if access is unexpected.</p></div>
            <div className="rounded-xl border border-[#DDEBDF] bg-[#F8FAFB] p-4 text-[12px] text-[#597960]"><LockKeyhole className="mr-2 inline" size={18}/> Password changes are handled through Supabase Auth, not stored in vendor business tables.</div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className={label} htmlFor="vendor-password">New password</label><div className="relative"><input id="vendor-password" className={field+' pr-12'} type={showPassword?'text':'password'} autoComplete="new-password" maxLength={128} value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder="12 characters or more"/><button type="button" aria-label={showPassword?'Hide password':'Show password'} onClick={()=>setShowPassword(v=>!v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6A8974]">{showPassword?<EyeOff size={17}/>:<Eye size={17}/>}</button></div></div>
              <div><label className={label} htmlFor="vendor-confirm">Confirm new password</label><input id="vendor-confirm" className={field} type={showPassword?'text':'password'} autoComplete="new-password" maxLength={128} value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)}/></div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E6EEE6] pt-5"><Link href="/vendor/billing" className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#477955] hover:underline">Manage billing security <ArrowUpRight size={13}/></Link><button type="button" className="vendor-primary-button" onClick={()=>void changePassword()} disabled={saving||!userId||newPassword.length<12||newPassword!==confirmPassword}><LockKeyhole size={15}/> Update password</button></div>
          </section>}
        </div>
      </div>
      <p className="pb-4 text-center text-[10px] text-[#8CA192]">SL Business Index · Owner Growth Portal · Changes are validated and restricted to your account and owned businesses.</p>
    </div>
  );
}
