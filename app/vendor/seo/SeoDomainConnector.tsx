'use client';

import {useEffect,useState} from 'react';
import {Check,CheckCircle2,Clipboard,ExternalLink,Globe2,Info,LockKeyhole,RefreshCw,ShieldCheck,Trash2} from 'lucide-react';
import {getWebsiteGuideHostname} from '@/lib/seo/owner-readiness';

export type DomainConnection={
  business_id?:string;
  hostname:string;
  provider:string;
  state:string;
  verification_method?:'dns_txt'|'http_file';
  verificationMethod?:'dns_txt'|'http_file';
  verification_token?:string;
  txt_record_name?:string;
  verified_at?:string|null;
  verification_expires_at?:string|null;
  txtRecordName?:string;
  txtValue?:string;
  verifiedAt?:string|null;
  expiresAt?:string|null;
};
type Props={
  businessId:string;
  initialConnection?:DomainConnection;
  domainServiceReady:boolean;
};

const providers=['Vercel','Cloudflare','GoDaddy','Namecheap','Hostinger','Other provider'] as const;
type Provider=(typeof providers)[number];
type Method='dns_txt'|'http_file';
const HTTP_PATH='/.well-known/slbi-verification.txt';
const guides:Record<Provider,string>={
  Vercel:'Vercel dashboard → Domains → choose the domain → DNS Records. If its nameservers are managed elsewhere, add the TXT record at that DNS host instead.',
  Cloudflare:'Cloudflare dashboard → choose your domain → DNS → Records → Add record.',
  GoDaddy:'GoDaddy → My Products → select the domain → DNS → Add New Record.',
  Namecheap:'Namecheap → Domain List → Manage → Advanced DNS → Add New Record.',
  Hostinger:'Hostinger hPanel → Domains → choose your domain → DNS / Nameservers.',
  'Other provider':'Open your actual DNS hosting provider and find DNS Records → Add TXT record. If unsure, check where your nameservers point.',
};
const messages:Record<string,string>={
  invalid_domain:'Enter a public domain such as yourshop.lk. Do not include a path, account details or port.',
  domain_already_claimed:'This domain is already claimed. Contact support if you control it.',
  invalid_origin:'The request did not come from this site. Refresh and retry.',
  sign_in_required:'Your session expired. Sign in again.',
  business_not_owned:'You do not have access to this business.',
  ownership_changed:'Ownership changed. Refresh your businesses and retry.',
  try_later:'Please allow a minute between changes.',
  verification_rate_limited:'DNS was just checked. Try again in 30 seconds.',
  dns_record_not_found:'TXT record not found yet. Check the name/value at your DNS provider, allow DNS propagation, then retry.',
  verification_file_not_found:'Verification file is not publicly reachable with the exact value. Check the path, deploy your changes, and retry.',
  verification_file_token_mismatch:'The website file is reachable, but its token differs from your CURRENT SLBI verification value. Copy the latest value above into public/.well-known/slbi-verification.txt, redeploy, then retry. Do not start a new verification.',
  verification_file_dns_error:'Our server could not resolve this website hostname. Confirm your Production domain is active, then retry.',
  verification_file_unsafe_dns:'This domain does not resolve exclusively to safe public IPv4 addresses. Check your public DNS records.',
  verification_file_unreachable:'Our server could not reach the HTTPS file. Check that the website is publicly accessible without login, bot challenges or firewall restrictions.',
  verification_file_redirect:'The verification file URL redirects. It must return the token directly at the exact HTTPS URL.',
  verification_file_http_status:'The website returned a non-200 response (for example 404, 403 or a login page). Publish the exact file and make it public.',
  verification_file_content_type:'The URL returned HTML or another unsupported content type. Serve a plain text .txt file, not a website page.',
  verification_file_too_large:'The file is too large. It must contain only the one-line verification token.',
  verification_file_tls_error:'The HTTPS certificate could not be verified. Fix the website HTTPS/TLS configuration.',
  verification_file_timeout:'The SLBI server timed out reaching the site. Check availability and try again.',
  verification_file_bad_hostname:'The website hostname or verification token is invalid. Refresh the page to load the saved domain record.',
  use_http_file_for_hosted_subdomain:'Free hosting subdomains do not allow custom DNS TXT records. Select HTTPS File Verification.',
  domain_storage_unavailable:'Domain database setup is unavailable. Please contact SLBI support.',
  domain_service_not_configured:'The server domain connector is not configured. Please contact SLBI support.',
};
const button='inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#DADAE0] bg-white px-4 text-[12px] font-medium text-[#2D2D33] hover:border-[#FFAF72] focus-visible:outline-2 focus-visible:outline-[#FF7900] disabled:cursor-not-allowed disabled:opacity-40';
const primary='inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#FA7908] px-5 text-[12px] font-medium text-[#1F1A16] hover:bg-[#F89237] focus-visible:outline-2 focus-visible:outline-[#FF7900] disabled:cursor-not-allowed disabled:opacity-40';

export default function SeoDomainConnector({businessId,initialConnection,domainServiceReady}:Props){
  const [connection,setConnection]=useState<DomainConnection|undefined>(initialConnection);
  const [hostname,setHostname]=useState(initialConnection?.hostname||'');
  const [provider,setProvider]=useState<Provider>(
    providers.includes(initialConnection?.provider as Provider)?initialConnection!.provider as Provider:'Other provider');
  const [method,setMethod]=useState<Method>(
    initialConnection?.verification_method||initialConnection?.verificationMethod||'dns_txt');
  const [busy,setBusy]=useState<'start'|'verify'|'disconnect'|null>(null);
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  const [copied,setCopied]=useState(false);
  const selectedDomain=getWebsiteGuideHostname(hostname);
  const expiry=connection?.expiresAt||connection?.verification_expires_at;
  const verified=connection?.state==='verified'&&!!expiry&&Date.parse(expiry)>Date.now();
  const name=connection?.txtRecordName||connection?.txt_record_name;
  const value=connection?.txtValue||connection?.verification_token;
  const currentMethod=connection?.verificationMethod||connection?.verification_method||method;
  const url=connection?.hostname?'https://'+connection.hostname+HTTP_PATH:null;
  const isHosted=!!selectedDomain&&(/\.vercel\.app$|\.netlify\.app$|\.pages\.dev$/).test(selectedDomain);
  // An existing DNS claim is NOT a reason to lock all of the form controls.
  // Changing the method/domain remains a draft until the owner explicitly saves.
  const savedMethod=connection?.verificationMethod||connection?.verification_method||'dns_txt';
  const proofChanged=!!connection&&(selectedDomain!==connection.hostname||method!==savedMethod);
  const providerChanged=!!connection&&provider!==connection.provider;
  const hasUnsavedChanges=proofChanged||providerChanged;

  // Different owner businesses never inherit in-progress domain inputs.
  useEffect(()=>{
    setConnection(initialConnection);
    setHostname(initialConnection?.hostname||'');
    setProvider(providers.includes(initialConnection?.provider as Provider)?initialConnection!.provider as Provider:'Other provider');
    setMethod(initialConnection?.verification_method||initialConnection?.verificationMethod||'dns_txt');
    setError('');setMessage('');setCopied(false);
  },[businessId,initialConnection]);

  async function mutate(action:'start'|'verify'|'disconnect'){
    if(action==='start'&&connection&&!hasUnsavedChanges)return;
    if(action==='start'&&connection&&proofChanged&&verified&&
      !window.confirm('Changing this verified domain or method will revoke its existing proof and issue a new verification token. Continue?'))return;
    setBusy(action);setError('');setMessage('');
    const payload=action==='start'
      ?{action,businessId,hostname:selectedDomain||hostname,provider,verificationMethod:method}
      :{action,businessId};
    try{
      const response=await fetch('/api/vendor/seo/domain',{
        method:'POST',credentials:'same-origin',cache:'no-store',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(payload),
      });
      const data:unknown=await response.json();
      const result=data&&typeof data==='object'&&!Array.isArray(data)?data as Record<string,unknown>:{};
      if(!response.ok){
        setError(messages[String(result.code)]||'Domain operation could not be completed. Please retry.');
        return;
      }
      const next=result.connection;
      setConnection(next&&typeof next==='object'?next as DomainConnection:undefined);
      if(action==='disconnect'){
        setHostname('');setMessage('Domain disconnected from SLBI. No DNS records were changed.');
      }else if(action==='verify'){
        setMessage('Website ownership proof verified and saved. Website editing and Google Search Console require separate authorization.');
      }else{
        setMessage(proofChanged===false&&providerChanged
          ?'Hosting/DNS provider updated. The existing ownership proof remains valid.'
          :method==='http_file'
            ?'Your unique file token was saved. Publish the file on your site, then select Verify HTTPS file.'
            :'Your unique DNS record was saved. Add it in DNS, then select Verify DNS.');
      }
    }catch{setError('Cannot reach the verification service. Check your connection and retry.')}
    finally{setBusy(null)}
  }

  async function copy(txt:string){
    try{await navigator.clipboard.writeText(txt);setCopied(true)}
    catch{setError('Copy failed. Select and copy the TXT value manually.')}
  }

  return <section data-slbi-domain-connector="true" className="space-y-5">
    <header>
      <h2 className="text-[18px] font-medium text-[#25252A]">Connect a website domain</h2>
      <p className="mt-1 text-[12px] leading-6 text-[#777780]">
        Enter your website address, choose a verification method, and prove ownership. We never transfer your domain or ask for hosting passwords.
      </p>
    </header>

    <div className="flex items-start gap-2 rounded-xl border border-[#E7E7EB] bg-[#FAFAFB] px-4 py-3 text-[11px] leading-5 text-[#686871]" role="status" data-testid="seo-domain-state">
      {verified?<CheckCircle2 size={17} className="shrink-0 text-[#1F8053]"/>:<LockKeyhole size={17} className="shrink-0 text-[#BF6A17]"/>}
      <span>{verified
        ?'Domain ownership verified. This is not authorization to edit your website or access Google Search Console.'
        :connection?'Ownership verification pending — complete the selected proof step below.'
        :'No verified domain yet. Choose DNS TXT or HTTPS File Verification below.'}</span>
    </div>

    {!domainServiceReady&&<p role="alert" className="rounded-lg border border-[#F4C9C0] bg-[#FFF7F5] p-4 text-[12px] text-[#A13D26]">
      The secure domain connection service is unavailable. No connection can be saved until the database is ready.
    </p>}

    <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_230px]">
      <div>
        <label htmlFor="seo-website-address" className="mb-2 block text-[12px] font-medium text-[#393941]">1. Website domain</label>
        <input id="seo-website-address" inputMode="url" autoComplete="url" maxLength={250}
          disabled={!!busy} value={hostname}
          onChange={event=>{
            setHostname(event.target.value);
            const typed=getWebsiteGuideHostname(event.target.value);
            if(typed&&/\.vercel\.app$/.test(typed)){
              setMethod('http_file');setProvider('Vercel');
            }
          }}
          placeholder="yourbusiness.lk"
          className="min-h-11 w-full rounded-lg border border-[#DCDCE2] bg-white px-3 text-[13px] text-[#29292F] focus:border-[#FF7900] focus:outline-2 focus:outline-[#FF7900]/20 disabled:bg-[#F6F6F8]"/>
        <p className="mt-1.5 text-[11px] text-[#91919A]">Example: myshop.lk or laxsan-dev.vercel.app. No page paths.</p>
      </div>
      <div>
        <label htmlFor="seo-dns-provider" className="mb-2 block text-[12px] font-medium text-[#393941]">2. Hosting or DNS provider</label>
        <select id="seo-dns-provider" disabled={!!busy}
          value={provider} onChange={event=>setProvider(event.target.value as Provider)}
          className="min-h-11 w-full rounded-lg border border-[#DCDCE2] bg-white px-3 text-[13px] text-[#29292F] focus:border-[#FF7900] focus:outline-2 focus:outline-[#FF7900]/20 disabled:bg-[#F6F6F8]">
          {providers.map(p=><option key={p} value={p}>{p}</option>)}
        </select>
        <p className="mt-1.5 text-[11px] text-[#91919A]">For TXT use your DNS host; for file verification use your website host.</p>
      </div>
    </div>

    <fieldset data-testid="seo-proof-method-switch" className="space-y-2" disabled={!!busy}>
      <legend className="text-[12px] font-medium text-[#393941]">3. How would you like to verify ownership?</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={'flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 '+(method==='dns_txt'?'border-[#F6A665] bg-[#FFF7EF]':'border-[#E5E5EA] bg-white')}>
          <input type="radio" name="seo-verification-method" value="dns_txt" checked={method==='dns_txt'}
            onChange={()=>setMethod('dns_txt')} className="mt-1 accent-[#FF7900]" />
          <span><strong className="block text-[12px] font-medium">DNS TXT</strong>
            <span className="mt-1 block text-[11px] leading-5 text-[#777780]">For a custom domain where you can edit DNS records.</span></span>
        </label>
        <label className={'flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 '+(method==='http_file'?'border-[#F6A665] bg-[#FFF7EF]':'border-[#E5E5EA] bg-white')}>
          <input type="radio" name="seo-verification-method" value="http_file" checked={method==='http_file'}
            onChange={()=>setMethod('http_file')} className="mt-1 accent-[#FF7900]" />
          <span><strong className="block text-[12px] font-medium">HTTPS File Verification</strong>
            <span className="mt-1 block text-[11px] leading-5 text-[#777780]">For Vercel free subdomains or any site you can deploy to.</span></span>
        </label>
      </div>
      {isHosted&&method==='dns_txt'&&<p className="text-[11px] text-[#A65719]" role="status">
        This hosted subdomain does not support your own DNS TXT records. Select HTTPS File Verification.
      </p>}
    </fieldset>

    {connection&&hasUnsavedChanges&&<div role="status" className="rounded-lg border border-[#F3D1AA] bg-[#FFF9F0] px-4 py-3 text-[12px] leading-5 text-[#80531E]">
      Changes are not saved yet. Your current {savedMethod==='dns_txt'?'DNS TXT':'HTTPS file'} proof remains unchanged until you save.
      {proofChanged?' Saving a different domain or method creates a new token and requires verification again.':''}
    </div>}
    {(!connection||hasUnsavedChanges)&&<button type="button"
      disabled={!domainServiceReady||!selectedDomain||!!busy||(isHosted&&method==='dns_txt')}
      onClick={()=>void mutate('start')} className={primary} data-testid="seo-domain-start">
      {busy==='start'?'Saving…':connection?(proofChanged?'Save new verification method':'Save provider'):'Start secure verification'}
    </button>}
    {connection&&hasUnsavedChanges&&<button type="button" disabled={!!busy}
      onClick={()=>{
        setHostname(connection.hostname);
        setProvider(providers.includes(connection.provider as Provider)?connection.provider as Provider:'Other provider');
        setMethod(savedMethod);
        setError('');setMessage('');
      }}
      className={button+' ml-2'}>Cancel changes</button>}

    {connection&&!hasUnsavedChanges&&<div data-testid="seo-domain-steps" className="space-y-4 rounded-xl border border-[#E5E5E9] bg-[#FCFCFD] p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[15px] font-medium text-[#28282D]">{currentMethod==='http_file'?'HTTPS file':'DNS TXT'} verification for {connection.hostname}</h3>
        <span className={'rounded-full px-2.5 py-1 text-[11px] font-medium '+(verified?'bg-[#E7F5EC] text-[#236B47]':'bg-[#FFF1E3] text-[#975516]')}>
          {verified?'Ownership verified':'Awaiting verification'}
        </span>
      </div>
      {currentMethod==='dns_txt'?<>
      <p className="text-[12px] leading-6 text-[#777780]">{guides[provider]}</p>
      <p className="text-[11px] text-[#777780]">Add a TXT record; do not change your existing A, CNAME or MX records.</p>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="min-w-0">
          <label htmlFor="seo-record-name" className="mb-1 block text-[11px] font-medium text-[#5B5B64]">TXT host/name (full DNS name)</label>
          <input id="seo-record-name" value={name||''} readOnly className="w-full rounded-lg border border-[#E5E5E9] bg-white px-3 py-3 font-mono text-[11px] text-[#45454D]"/>
          <p className="mt-1 text-[10px] text-[#92929A]">Some DNS providers require only _slbi-verify as the Host field.</p>
        </div>
        <div className="min-w-0">
          <label htmlFor="seo-record-value" className="mb-1 block text-[11px] font-medium text-[#5B5B64]">TXT value</label>
          <div className="flex gap-2">
            <input id="seo-record-value" value={value||''} readOnly className="min-w-0 flex-1 rounded-lg border border-[#E5E5E9] bg-white px-3 py-3 font-mono text-[11px] text-[#45454D]"/>
            <button type="button" className={button} onClick={()=>void copy(value||'')} aria-label="Copy DNS TXT value">
              {copied?<Check size={16}/>:<Clipboard size={16}/>}
            </button>
          </div>
        </div>
      </div>
      </>:<>
        <div className="space-y-3 rounded-lg border border-[#E8E8EB] bg-white p-4">
          <p className="text-[12px] font-medium text-[#34343A]">Publish a verification file on your website</p>
          <p className="text-[11px] leading-5 text-[#6E6E77]">1. Create <code className="font-mono">public/.well-known/slbi-verification.txt</code> in your Vercel/Next.js project (or the equivalent public folder for your framework).</p>
          <p className="text-[11px] leading-5 text-[#6E6E77]">2. Paste the exact one-line value below and deploy the website. The URL must be publicly accessible without login or redirects.</p>
          <div className="flex min-w-0 gap-2">
            <input aria-label="HTTP verification file content" readOnly value={value||''}
              className="min-w-0 flex-1 rounded-lg border border-[#E4E4EA] bg-[#FAFAFC] px-3 py-2 font-mono text-[11px]"/>
            <button type="button" className={button} onClick={()=>void copy(value||'')} aria-label="Copy HTTP verification file content">
              {copied?<Check size={16}/>:<Clipboard size={16}/>}
            </button>
          </div>
          <p className="text-[11px] leading-5 text-[#6E6E77]">3. Confirm the file is visible at the exact address below, then click Verify HTTPS file.</p>
          {url&&<a href={url} target="_blank" rel="noopener noreferrer" className="block break-all text-[12px] text-[#AD560D] underline underline-offset-2">{url}</a>}
        </div>
      </>}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={()=>void mutate('verify')} disabled={!!busy} className={primary} data-testid="seo-domain-verify">
          {busy==='verify'?<RefreshCw size={16} className="animate-spin"/>:<ShieldCheck size={16}/>}
          {busy==='verify'?'Checking ownership proof…':currentMethod==='http_file'?'Verify HTTPS file':'Verify DNS ownership'}
        </button>
        <button type="button" disabled={!!busy}
          onClick={()=>{if(window.confirm('Disconnect this domain from this business in SLBI? This does not alter external DNS records.'))void mutate('disconnect')}}
          className={button+' text-[#A34B31]'}>
          <Trash2 size={15}/> Disconnect
        </button>
      </div>
      {verified&&<div className="flex items-start gap-2 rounded-lg border border-[#D5E9DD] bg-[#F4FBF6] p-3 text-[11px] leading-5 text-[#2B714A]">
        <CheckCircle2 size={17} className="shrink-0"/> Ownership verified for 30 days. SEO recommendations may reference this website, but actual edits need separate CMS authorization and owner approval.
      </div>}
    </div>}

    {error&&<p role="alert" className="rounded-lg border border-[#F4C9C0] bg-[#FFF7F5] px-4 py-3 text-[12px] text-[#9A3925]">{error}</p>}
    {message&&<p role="status" className="rounded-lg border border-[#DBEADB] bg-[#F5FBF5] px-4 py-3 text-[12px] text-[#2A7049]">{message}</p>}

    <footer className="border-t border-[#EAEAF0] pt-4 text-[11px] leading-5 text-[#888890]">
      <p className="flex items-start gap-2"><Info size={15} className="shrink-0"/> DNS TXT or HTTPS file verification proves control of that record or website file only. SLBI does not transfer domains or gain permission to edit your site. Google Search Console and CMS editing remain separate permissions.</p>
      <a href="https://vercel.com/docs/domains/managing-dns-records" target="_blank" rel="noopener noreferrer"
        className="mt-3 inline-flex items-center gap-1 text-[#B65D12] underline underline-offset-2">
        Vercel DNS instructions <ExternalLink size={13}/>
      </a>
    </footer>
  </section>;
}
