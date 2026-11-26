'use client';

import {useEffect,useState} from 'react';
import {Check,CheckCircle2,Clipboard,ExternalLink,Globe2,Info,LockKeyhole,RefreshCw,ShieldCheck,Trash2} from 'lucide-react';
import {getWebsiteGuideHostname} from '@/lib/seo/owner-readiness';

export type DomainConnection={
  business_id?:string;
  hostname:string;
  provider:string;
  state:string;
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
  const [busy,setBusy]=useState<'start'|'verify'|'disconnect'|null>(null);
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  const [copied,setCopied]=useState(false);
  const selectedDomain=getWebsiteGuideHostname(hostname);
  const expiry=connection?.expiresAt||connection?.verification_expires_at;
  const verified=connection?.state==='verified'&&!!expiry&&Date.parse(expiry)>Date.now();
  const name=connection?.txtRecordName||connection?.txt_record_name;
  const value=connection?.txtValue||connection?.verification_token;

  // Different owner businesses never inherit in-progress domain inputs.
  useEffect(()=>{
    setConnection(initialConnection);
    setHostname(initialConnection?.hostname||'');
    setProvider(providers.includes(initialConnection?.provider as Provider)?initialConnection!.provider as Provider:'Other provider');
    setError('');setMessage('');setCopied(false);
  },[businessId,initialConnection]);

  async function mutate(action:'start'|'verify'|'disconnect'){
    setBusy(action);setError('');setMessage('');
    const payload=action==='start'
      ?{action,businessId,hostname:selectedDomain||hostname,provider}
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
        setMessage('DNS ownership verified and saved. Website editing and Google Search Console require separate authorization.');
      }else{
        setMessage('Your unique DNS record was saved. Add it in DNS, then select Verify DNS.');
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
        Enter the domain you control. SLBI verifies ownership using a real DNS TXT record. Your website, hosting and nameservers stay where they are.
      </p>
    </header>

    <div className="flex items-start gap-2 rounded-xl border border-[#E7E7EB] bg-[#FAFAFB] px-4 py-3 text-[11px] leading-5 text-[#686871]" role="status" data-testid="seo-domain-state">
      {verified?<CheckCircle2 size={17} className="shrink-0 text-[#1F8053]"/>:<LockKeyhole size={17} className="shrink-0 text-[#BF6A17]"/>}
      <span>{verified
        ?'Domain ownership verified. This is not authorization to edit your website or access Google Search Console.'
        :connection?'DNS verification pending — complete the TXT record step below.'
        :'No verified domain yet. Start with your domain and DNS provider below.'}</span>
    </div>

    {!domainServiceReady&&<p role="alert" className="rounded-lg border border-[#F4C9C0] bg-[#FFF7F5] p-4 text-[12px] text-[#A13D26]">
      The secure domain connection service is unavailable. No connection can be saved until the database is ready.
    </p>}

    <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_230px]">
      <div>
        <label htmlFor="seo-website-address" className="mb-2 block text-[12px] font-medium text-[#393941]">1. Website domain</label>
        <input id="seo-website-address" inputMode="url" autoComplete="url" maxLength={250}
          disabled={!!connection||!!busy} value={hostname}
          onChange={event=>setHostname(event.target.value)}
          placeholder="yourbusiness.lk"
          className="min-h-11 w-full rounded-lg border border-[#DCDCE2] bg-white px-3 text-[13px] text-[#29292F] focus:border-[#FF7900] focus:outline-2 focus:outline-[#FF7900]/20 disabled:bg-[#F6F6F8]"/>
        <p className="mt-1.5 text-[11px] text-[#91919A]">Use the domain, not a page URL (for example, example.lk).</p>
      </div>
      <div>
        <label htmlFor="seo-dns-provider" className="mb-2 block text-[12px] font-medium text-[#393941]">2. DNS provider</label>
        <select id="seo-dns-provider" disabled={!!connection||!!busy}
          value={provider} onChange={event=>setProvider(event.target.value as Provider)}
          className="min-h-11 w-full rounded-lg border border-[#DCDCE2] bg-white px-3 text-[13px] text-[#29292F] focus:border-[#FF7900] focus:outline-2 focus:outline-[#FF7900]/20 disabled:bg-[#F6F6F8]">
          {providers.map(p=><option key={p} value={p}>{p}</option>)}
        </select>
        <p className="mt-1.5 text-[11px] text-[#91919A]">Choose where you manage DNS, not necessarily where the website runs.</p>
      </div>
    </div>

    {!connection&&<button type="button" disabled={!domainServiceReady||!selectedDomain||!!busy}
      onClick={()=>void mutate('start')} className={primary} data-testid="seo-domain-start">
      {busy==='start'?'Saving domain…':'Start secure verification'}
    </button>}

    {connection&&<div data-testid="seo-domain-steps" className="space-y-4 rounded-xl border border-[#E5E5E9] bg-[#FCFCFD] p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[15px] font-medium text-[#28282D]">DNS verification for {connection.hostname}</h3>
        <span className={'rounded-full px-2.5 py-1 text-[11px] font-medium '+(verified?'bg-[#E7F5EC] text-[#236B47]':'bg-[#FFF1E3] text-[#975516]')}>
          {verified?'Ownership verified':'Awaiting DNS record'}
        </span>
      </div>
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
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={()=>void mutate('verify')} disabled={!!busy} className={primary} data-testid="seo-domain-verify">
          {busy==='verify'?<RefreshCw size={16} className="animate-spin"/>:<ShieldCheck size={16}/>}
          {busy==='verify'?'Checking public DNS…':'Verify DNS ownership'}
        </button>
        <button type="button" disabled={!!busy}
          onClick={()=>{if(window.confirm('Disconnect this domain from this business in SLBI? This does not alter external DNS records.'))void mutate('disconnect')}}
          className={button+' text-[#A34B31]'}>
          <Trash2 size={15}/> Disconnect
        </button>
      </div>
      {verified&&<div className="flex items-start gap-2 rounded-lg border border-[#D5E9DD] bg-[#F4FBF6] p-3 text-[11px] leading-5 text-[#2B714A]">
        <CheckCircle2 size={17} className="shrink-0"/> Verified for 30 days. SEO recommendations can reference this website, but automatic edits require separate CMS authorization and owner approval.
      </div>}
    </div>}

    {error&&<p role="alert" className="rounded-lg border border-[#F4C9C0] bg-[#FFF7F5] px-4 py-3 text-[12px] text-[#9A3925]">{error}</p>}
    {message&&<p role="status" className="rounded-lg border border-[#DBEADB] bg-[#F5FBF5] px-4 py-3 text-[12px] text-[#2A7049]">{message}</p>}

    <footer className="border-t border-[#EAEAF0] pt-4 text-[11px] leading-5 text-[#888890]">
      <p className="flex items-start gap-2"><Info size={15} className="shrink-0"/> DNS verification confirms access to the TXT record only. Your domain does not need to be transferred to SLBI. External SEO editing and Google Search Console connection are separate permissions.</p>
      <a href="https://vercel.com/docs/domains/managing-dns-records" target="_blank" rel="noopener noreferrer"
        className="mt-3 inline-flex items-center gap-1 text-[#B65D12] underline underline-offset-2">
        Vercel DNS instructions <ExternalLink size={13}/>
      </a>
    </footer>
  </section>;
}
