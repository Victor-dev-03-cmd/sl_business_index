'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import './settings-studio.css';
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
const field='vendor-field settings-v8-field block h-11 w-full min-w-0 rounded-[7px] border border-[#DADAE0] bg-[#F8F8FA] px-3.5 py-2.5 text-[13px] leading-5 text-[#222228] outline-none focus:border-[#FF7900] focus:ring-2 focus:ring-[#FFE4CC] disabled:cursor-not-allowed disabled:bg-[#F0F0F2] disabled:text-[#7D7D85]';
const label='vendor-label mb-2 block text-[11px] font-semibold leading-5 text-[#55555E]';

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
    <div className="slbi-settings" data-testid="vendor-settings-studio">
      <header className="ss-hero">
        <div className="ss-hero-main">
          <div className="ss-hero-overline"><span className="ss-hero-dot"/> SLBI OWNER PORTAL <span className="ss-hero-divider">/</span> ACCOUNT SETTINGS</div>
          <h1>Workspace settings</h1>
          <p>Manage your identity, business verification, discoverability and account preferences in one secure workspace.</p>
        </div>
        <div className="ss-hero-actions">
          <Link href="/vendor/my-businesses" className="ss-hero-link"><Building2 size={16}/> My businesses <ArrowUpRight size={14}/></Link>
          <button type="button" onClick={()=>void load()} disabled={loading} className="ss-hero-refresh"><RefreshCcw size={16} className={loading?'animate-spin':''}/> Refresh</button>
        </div>
      </header>

      {error&&<div role="alert" className="ss-alert ss-alert-error">{error} <Link href="/login?redirect=/vendor/settings">Sign in</Link></div>}
      {loading&&<div role="status" className="ss-loading"><Loader2 size={18} className="animate-spin"/> Loading your workspace preferences…</div>}

      <div className="ss-layout">
        <aside className="ss-navigation" aria-label="Settings navigation">
          <div className="ss-nav-heading">WORKSPACE SETTINGS</div>
          <nav aria-label="Vendor settings sections">
            {tabList.map(item=><button type="button" key={item.id} aria-current={activeTab===item.id?'page':undefined}
              onClick={()=>selectTab(item.id)} className={'ss-nav-item '+(activeTab===item.id?'ss-nav-item-active':'')}>
              <span className="ss-nav-icon"><item.icon size={19}/></span>
              <span className="ss-nav-copy"><strong>{item.name}</strong><span>{item.detail}</span></span>
              <ArrowUpRight size={14} className="ss-nav-arrow"/>
            </button>)}
          </nav>
          <div className="ss-nav-foot">
            <span className="ss-nav-foot-icon"><ShieldCheck size={17}/></span>
            <p>Account-scoped preferences. Need help? <Link href="/vendor/leads">Open your enquiry inbox</Link>.</p>
          </div>
        </aside>

        <main className="ss-main">
          {activeTab==='profile'&&<section aria-labelledby="ss-profile-heading" className="ss-panel" id="panel-profile">
            <div className="ss-section-heading">
              <span className="ss-eyebrow"><User size={15}/> PROFILE & IDENTITY</span>
              <h2 id="ss-profile-heading">Account profile</h2>
              <p>Keep the details associated with your vendor account accurate. Listing details are managed separately.</p>
            </div>
            <div className="ss-profile-identity">
              <div className="ss-avatar">{initials||'V'}</div>
              <div><strong>{profile.full_name||'Complete your profile'}</strong><span>{profile.email||'Signed-in email address'}</span></div>
              <span className="ss-profile-role"><ShieldCheck size={13}/> Account owner</span>
            </div>
            <div className="ss-form-grid">
              <div className="ss-field"><label htmlFor="vendor-name">Full name</label><input id="vendor-name" type="text" maxLength={100} autoComplete="name" value={profile.full_name} onChange={e=>setProfile(v=>({...v,full_name:e.target.value}))}/></div>
              <div className="ss-field"><label htmlFor="vendor-email">Account email</label><input id="vendor-email" type="email" disabled value={profile.email}/><p className="ss-field-hint">Changing your email requires authentication verification.</p></div>
              <div className="ss-field"><label htmlFor="vendor-phone">Contact phone</label><input id="vendor-phone" type="tel" maxLength={30} autoComplete="tel" value={profile.phone} onChange={e=>setProfile(v=>({...v,phone:e.target.value}))}/></div>
              <div className="ss-field"><label htmlFor="vendor-job">Role or job title</label><input id="vendor-job" type="text" maxLength={100} value={profile.job_title} onChange={e=>setProfile(v=>({...v,job_title:e.target.value}))} placeholder="Founder, Owner, Manager…"/></div>
            </div>
            <div className="ss-action-bar"><p>Changes here affect your account profile only.</p><button type="button" className="ss-save-button" disabled={saving||!userId} onClick={()=>void saveProfile()}>{saving?<Loader2 size={17} className="animate-spin"/>:<Save size={17}/>} Save profile</button></div>
          </section>}

          {activeTab==='verification'&&<section aria-labelledby="ss-verification-heading" className="ss-panel" id="panel-verification">
            <div className="ss-section-heading">
              <span className="ss-eyebrow"><ShieldCheck size={15}/> BUSINESS TRUST</span>
              <h2 id="ss-verification-heading">Business verification</h2>
              <p>Submit registration details for manual review. Submission does not automatically grant a verified status.</p>
            </div>
            <div className="ss-selection-card">
              <div className="ss-field"><label htmlFor="verification-business">Business to verify</label>
                <select id="verification-business" value={selectedBusinessId} onChange={e=>setSelectedBusinessId(e.target.value)} disabled={!businesses.length}>
                  {businesses.length===0?<option value="">No businesses registered</option>:businesses.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <span className={'ss-status-pill '+(verified?'ss-status-success':pending?'ss-status-pending':'ss-status-default')}><FileCheck2 size={15}/>{statusLabel(verificationState)}</span>
              {verification?.created_at&&<p className="ss-field-hint">Last request: {new Date(verification.created_at).toLocaleDateString('en-LK')}</p>}
            </div>
            {pending&&<div className="ss-alert ss-alert-warning">A request is under review. New submissions are paused until it is resolved.</div>}
            {verified&&<div className="ss-alert ss-alert-success"><CheckCircle2 size={17}/> This business has a verified status.</div>}
            <div className="ss-form-grid ss-spacing-top">
              <div className="ss-field"><label htmlFor="business-type">Registration type</label><select id="business-type" value={businessType} onChange={e=>setBusinessType(e.target.value as typeof businessType)} disabled={pending||verified}><option value="pvt_ltd">Private limited (PVT)</option><option value="local_business">Registered sole proprietorship</option></select></div>
              <div className="ss-field"><label htmlFor="br-number">Business registration number</label><input id="br-number" type="text" maxLength={64} value={brNumber} onChange={e=>setBrNumber(e.target.value)} disabled={pending||verified} placeholder={businessType==='pvt_ltd'?'PV00212345':'123/2024/ABC'}/></div>
              <div className="ss-field"><label htmlFor="tin-number">TIN (optional)</label><input id="tin-number" type="text" maxLength={64} value={tinNumber} onChange={e=>setTinNumber(e.target.value)} disabled={pending||verified}/></div>
              <div className="ss-field"><label htmlFor="svat-number">SVAT (optional)</label><input id="svat-number" type="text" maxLength={64} value={svatNumber} onChange={e=>setSvatNumber(e.target.value)} disabled={pending||verified}/></div>
            </div>
            <div className="ss-document-card">
              <span className="ss-section-icon"><UploadCloud size={21}/></span>
              <div className="ss-document-content">
                <h3>Registration document</h3>
                <p>JPG, PNG or PDF · Maximum 10 MB · Private storage access required</p>
                <input type="file" aria-label="Select registration document" accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                  disabled={pending||verified||!privateDocsReady||!selectedBusinessId} onChange={e=>setVerificationFile(e.target.files?.[0]||null)}/>
                {verificationFile&&<p className="ss-field-hint">Selected: {verificationFile.name}</p>}
                {documentPreview&&<a href={documentPreview} target="_blank" rel="noreferrer" className="ss-document-link">View submitted document <ArrowUpRight size={14}/></a>}
                {!privateDocsReady&&<div role="status" className="ss-alert ss-alert-warning">Secure document uploads are disabled until private storage migration is approved. Existing requests remain visible.</div>}
              </div>
            </div>
            <div className="ss-action-bar"><p>Official registration documents are reviewed by the SLBI team.</p><button type="button" className="ss-save-button" disabled={saving||!selectedBusinessId||pending||verified||!privateDocsReady||!verificationFile} onClick={()=>void submitVerification()}>{saving?<Loader2 size={17} className="animate-spin"/>:<ShieldCheck size={17}/>} {submitLabel}</button></div>
          </section>}

          {activeTab==='optimization'&&<section aria-labelledby="ss-optimization-heading" className="ss-panel ss-optimization" id="panel-optimization">
            <div className="ss-section-heading">
              <span className="ss-eyebrow"><Globe size={15}/> BUSINESS DISCOVERABILITY</span>
              <h2 id="ss-optimization-heading">Local reach & SEO</h2>
              <p>Manage your service area and search terms without changing your business profile or guaranteeing rankings.</p>
            </div>
            <div className="ss-selection-card ss-selection-inline">
              <div className="ss-field"><label htmlFor="seo-business">Editing business</label>
                <select id="seo-business" value={selectedBusinessId} disabled={!businesses.length} onChange={e=>setSelectedBusinessId(e.target.value)}>{businesses.length===0?<option value="">No businesses registered</option>:businesses.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select>
              </div>
              <span className="ss-selection-meta"><MapPin size={15}/> Changes are saved per business</span>
            </div>

            <div className="ss-discovery-grid">
              <article className="ss-subcard ss-radius-card">
                <div className="ss-card-title"><span className="ss-section-icon"><MapPin size={19}/></span><div><span>01 / SERVICE AREA</span><h3>Service radius</h3></div></div>
                <p className="ss-card-description">Set the distance your business can genuinely serve.</p>
                <div className="ss-radius-readout"><strong>{radius}</strong><span>kilometres</span></div>
                <div className="ss-recessed ss-slider-container">
                  <input type="range" aria-label="Business service radius" min={1} max={50} step={1} value={radius} onChange={e=>setRadius(Number(e.target.value))} disabled={!selectedBusinessId}/>
                  <div className="ss-slider-labels"><span>1 km</span><span>50 km</span></div>
                </div>
                <p className="ss-card-note">Search ranking also depends on location accuracy, relevance and user filters.</p>
              </article>
              <article className="ss-subcard ss-keywords-card">
                <div className="ss-card-title"><span className="ss-section-icon"><Search size={19}/></span><div><span>02 / SEARCH DISCOVERY</span><h3>Search keywords</h3></div><span className="ss-keyword-count">{keywords.length}/10</span></div>
                <p className="ss-card-description">Use specific services and terms customers actually search for.</p>
                <div className="ss-field ss-keyword-field"><label htmlFor="vendor-seo-keyword">Add a keyword</label>
                  <div className="ss-keyword-row">
                    <input id="vendor-seo-keyword" type="text" maxLength={50} value={newKeyword} onChange={e=>setNewKeyword(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();addKeyword()}}} placeholder="e.g. laptop repair"/>
                    <button type="button" className="ss-add-button" disabled={!newKeyword.trim()||keywords.length>=10} aria-label="Add keyword" onClick={addKeyword}><Plus size={16}/> Add</button>
                  </div>
                </div>
                <div className="ss-keyword-tray">
                  <div className="ss-tray-label"><span>Current keywords</span><span>{keywords.length} of 10</span></div>
                  <div className="ss-keyword-list">{keywords.map(k=><span key={k} className="ss-chip"><span>{k}</span><button type="button" onClick={()=>setKeywords(prev=>prev.filter(t=>t!==k))} aria-label={'Remove '+k}><X size={13}/></button></span>)}{keywords.length===0&&<span className="ss-empty">No keywords yet.</span>}</div>
                </div>
              </article>
            </div>
            <div className="ss-action-bar ss-optimization-actions">
              <p><ShieldCheck size={17}/> Changes are saved only to your selected business. No ranking is guaranteed.</p>
              <button type="button" className="ss-save-button" disabled={saving||!selectedBusinessId} onClick={()=>void saveOptimization()}>{saving?<Loader2 size={17} className="animate-spin"/>:<Save size={17}/>} {saving?'Saving…':'Save discovery settings'}</button>
            </div>
          </section>}

          {activeTab==='notifications'&&<section aria-labelledby="ss-notifications-heading" className="ss-panel" id="panel-notifications">
            <div className="ss-section-heading">
              <span className="ss-eyebrow"><Bell size={15}/> COMMUNICATION</span>
              <h2 id="ss-notifications-heading">Notification preferences</h2>
              <p>Choose the optional business updates you wish to receive. Essential security and verification notices are separate.</p>
            </div>
            {!prefsAvailable&&<div role="status" className="ss-alert ss-alert-warning">Preferences storage is not yet configured. Saving is disabled until the reviewed migration is applied.</div>}
            <div className="ss-preference-list">
              {([
                {key:'reviews',title:'New reviews',text:'Optional updates when customers review your businesses.',icon:User},
                {key:'leads',title:'New enquiries',text:'Enquiry notifications on your owned listings.',icon:Mail},
                {key:'weekly_digest',title:'Weekly summary',text:'Periodic recap when delivery is enabled.',icon:Globe},
                {key:'marketing_tips',title:'Growth tips',text:'Optional marketing and educational updates.',icon:Bell},
              ] as const).map(item=><label key={item.key} className="ss-preference-row">
                <span className="ss-section-icon"><item.icon size={19}/></span>
                <span className="ss-preference-copy"><strong>{item.title}</strong><span>{item.text}</span></span>
                <input type="checkbox" checked={prefs[item.key]} disabled={!prefsAvailable} onChange={e=>setPrefs(v=>({...v,[item.key]:e.target.checked}))} aria-label={item.title}/>
              </label>)}
            </div>
            <div className="ss-action-bar"><p>Saving a preference does not guarantee email or push delivery.</p><button type="button" className="ss-save-button" disabled={saving||!prefsAvailable||!userId} onClick={()=>void savePreferences()}>{saving?<Loader2 size={17} className="animate-spin"/>:<Save size={17}/>} Save preferences</button></div>
          </section>}

          {activeTab==='security'&&<section aria-labelledby="ss-security-heading" className="ss-panel" id="panel-security">
            <div className="ss-section-heading">
              <span className="ss-eyebrow"><LockKeyhole size={15}/> ACCOUNT PROTECTION</span>
              <h2 id="ss-security-heading">Password & security</h2>
              <p>Set a strong password for your vendor account. Existing sessions on other devices may remain active until revoked.</p>
            </div>
            <div className="ss-security-note"><ShieldCheck size={20}/><div><strong>Protected by Supabase Auth</strong><p>Password updates are handled by the authentication provider, not stored in business tables.</p></div></div>
            <div className="ss-form-grid">
              <div className="ss-field"><label htmlFor="vendor-password">New password</label><div className="ss-password-wrap"><input id="vendor-password" type={showPassword?'text':'password'} autoComplete="new-password" maxLength={128} value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder="12 characters or more"/><button type="button" aria-label={showPassword?'Hide password':'Show password'} onClick={()=>setShowPassword(v=>!v)}>{showPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></div>
              <div className="ss-field"><label htmlFor="vendor-confirm">Confirm new password</label><input id="vendor-confirm" type={showPassword?'text':'password'} autoComplete="new-password" maxLength={128} value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)}/></div>
            </div>
            <div className="ss-action-bar"><Link href="/vendor/billing" className="ss-inline-link">Manage billing security <ArrowUpRight size={15}/></Link><button type="button" className="ss-save-button" disabled={saving||!userId||newPassword.length<12||newPassword!==confirmPassword} onClick={()=>void changePassword()}>{saving?<Loader2 size={17} className="animate-spin"/>:<LockKeyhole size={17}/>} Update password</button></div>
          </section>}
        </main>
      </div>
      <p className="ss-footer">SL Business Index · Owner Growth Portal · Changes are restricted to your account and owned businesses.</p>
    </div>
  );
}
