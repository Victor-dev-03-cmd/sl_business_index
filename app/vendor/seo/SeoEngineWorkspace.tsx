'use client';

import {useMemo,useState} from 'react';
import Link from 'next/link';
import {ArrowUpRight,Check,CheckCircle2,Clipboard,ExternalLink,Globe2,Info,LockKeyhole,Search,ShieldCheck} from 'lucide-react';
import {getPublicBusinessSEO} from '@/lib/seo/public-business';
import {getSeoPreparation,type SeoOwnedListing} from '@/lib/seo/owner-readiness';
import SeoDomainConnector,{type DomainConnection} from './SeoDomainConnector';

type Props={
  listings:SeoOwnedListing[];
  connections:DomainConnection[];
  domainServiceReady:boolean;
};
const surface='rounded-2xl border border-[#E7E7ED] bg-white shadow-[0_6px_25px_rgba(28,28,32,.035)]';
const secondaryButton='inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#DFDFE4] bg-white px-4 text-[12px] font-medium text-[#38383F] hover:border-[#FFB87C] focus-visible:outline-2 focus-visible:outline-[#FF7900]';
const primaryButton='inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#FF7900] px-4 text-[12px] font-medium text-[#231A12] hover:bg-[#FF983C] focus-visible:outline-2 focus-visible:outline-[#FF7900]';

export default function SeoEngineWorkspace({listings,connections,domainServiceReady}:Props){
  const [selectedId,setSelectedId]=useState(String(listings[0]?.id||''));
  const [copied,setCopied]=useState(false);
  const listing=useMemo(()=>listings.find(b=>String(b.id)===selectedId)||listings[0],[listings,selectedId]);
  const preparation=listing?getSeoPreparation(listing):null;
  const seo=listing?getPublicBusinessSEO(listing):null;
  const published=preparation?.published===true;
  const currentConnection=connections.find(c=>c.business_id===String(listing?.id));

  const copyProfile=async()=>{
    if(!published||!seo)return;
    try{await navigator.clipboard.writeText(seo.canonical);setCopied(true)}
    catch{setCopied(false)}
  };

  return <main data-slbi-seo-engine="true" className="mx-auto w-full max-w-[1340px] space-y-5 pb-10 font-[family-name:var(--font-inter)] text-[#26262C]">
    <header className="flex flex-col justify-between gap-4 border-b border-[#ECECEF] pb-5 sm:flex-row sm:items-end">
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-[.13em] text-[#BD620E]">GrowthOS / Search visibility</p>
        <h1 className="mt-2 text-[29px] font-semibold tracking-tight text-[#242429] sm:text-[34px]">SEO Engine</h1>
        <p className="mt-2 max-w-[660px] text-[13px] leading-6 text-[#76767F]">
          Improve your SLBI profile and verify your own domain. Real business details, real DNS checks, no complex SEO setup.
        </p>
      </div>
      <Link href="/vendor/my-businesses" className={secondaryButton}>
        My businesses <ArrowUpRight size={15}/>
      </Link>
    </header>

    {!listing?<section className={surface+' p-6 sm:p-9'}>
      <h2 className="text-[18px] font-medium">Add your first business</h2>
      <p className="mt-2 max-w-xl text-[13px] leading-6 text-[#74747B]">Once you register, SEO preparation is available immediately. Public search discovery begins when your listing is approved for publication; the blue Verified badge is optional.</p>
      <Link href="/register-business" className={primaryButton+' mt-5'}>Register business <ArrowUpRight size={16}/></Link>
    </section>:<>
      <section className={surface+' p-5'} aria-label="Business selection">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div className="min-w-0">
            <label htmlFor="seo-business-select" className="mb-2 block text-[12px] font-medium text-[#62626B]">Business profile</label>
            <select id="seo-business-select" value={String(listing.id)} onChange={e=>{setSelectedId(e.target.value);setCopied(false)}}
              data-testid="seo-business-select" className="min-h-11 w-full rounded-lg border border-[#DDDDE3] bg-white px-3 text-[13px] font-medium text-[#2A2A31] focus:outline-2 focus:outline-[#FF7900]">
              {listings.map(item=><option key={String(item.id)} value={String(item.id)}>{item.name||'Unnamed business'}</option>)}
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-2 md:justify-end">
            <span data-testid="seo-publication-status" className={'rounded-full px-3 py-1.5 text-[11px] font-medium '+(published?'bg-[#E6F5EB] text-[#236A47]':'bg-[#FFF2E1] text-[#965317]')}>
              {published?'Published on SLBI':'Awaiting publication'}
            </span>
            {listing.is_verified?<span className="inline-flex items-center gap-1 rounded-full bg-[#EAF2FF] px-3 py-1.5 text-[11px] font-medium text-[#2D64B2]"><ShieldCheck size={14}/> Verified badge</span>
              :<span className="rounded-full border border-[#E7E7EB] px-3 py-1.5 text-[11px] text-[#777780]">Ordinary listing · SEO available</span>}
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        <section className={surface+' p-4'} aria-label="Listing completeness">
          <p className="text-[11px] text-[#787881]">Profile completeness</p>
          <div className="mt-2 flex items-baseline gap-1 text-[#26262B]"><span className="text-[27px] font-medium tabular-nums">{preparation!.score}</span><span className="text-[12px] text-[#818189]">/100</span></div>
          <div className="mt-2 h-1.5 rounded-full bg-[#ECECF0]"><div className="h-1.5 rounded-full bg-[#FF7900]" style={{width:preparation!.score+'%'}}/></div>
          <p className="mt-2 text-[10px] text-[#8A8A92]">Based on actual profile fields, not a Google ranking</p>
        </section>
        <section className={surface+' p-4'} aria-label="Search publication status">
          <p className="text-[11px] text-[#787881]">Directory discovery</p>
          <div className="mt-3 flex items-start gap-2">
            {published?<CheckCircle2 size={20} className="shrink-0 text-[#248255]"/>:<LockKeyhole size={20} className="shrink-0 text-[#C77C2F]"/>}
            <span className="text-[14px] font-medium leading-5">{published?'Eligible in public sitemap':'Preparing private listing'}</span>
          </div>
          <p className="mt-2 text-[11px] leading-5 text-[#85858D]">{published?'Approved listings are discovered automatically after sitemap refresh.':'Waiting for SLBI listing publication review.'}</p>
        </section>
        <section className={surface+' p-4'} aria-label="Google indexing state">
          <p className="text-[11px] text-[#787881]">Google indexing</p>
          <p className="mt-3 text-[15px] font-medium text-[#313139]">Not yet measured</p>
          <p className="mt-2 text-[11px] leading-5 text-[#85858D]">Search Console is not connected. No indexed or ranking claim is made.</p>
        </section>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(270px,.7fr)]">
        <section className={surface+' p-5 sm:p-6'} aria-label="Profile optimization tasks">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-[18px] font-medium">Profile improvements</h2>
              <p className="mt-1 text-[12px] text-[#85858C]">These tasks are calculated from your saved business details.</p>
            </div>
            <Link href={'/vendor/my-businesses/'+encodeURIComponent(String(listing.id))+'/edit'} className={primaryButton}>
              Update profile <ArrowUpRight size={15}/>
            </Link>
          </div>
          {!published&&<p role="status" className="mt-4 rounded-lg border border-[#F0D8AD] bg-[#FFF9ED] px-3 py-3 text-[12px] leading-5 text-[#84531D]">
            Complete this checklist now. SLBI publishes an eligible page only after listing approval. A Pro plan or Verified badge is not required.
          </p>}
          <ul className="mt-5 divide-y divide-[#F0F0F2]">
            {preparation!.checks.map(item=><li key={item.key} className="flex items-start gap-3 py-3">
              <span className={'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full '+(item.complete?'bg-[#E8F5ED] text-[#2C8154]':'bg-[#FFF3E9] text-[#BC6C25]')}>
                {item.complete?<Check size={15}/>:<Info size={14}/>}
              </span>
              <div>
                <p className="text-[12px] font-medium text-[#35353B]">{item.label}</p>
                {!item.complete&&<p className="mt-1 text-[11px] leading-5 text-[#808089]">{item.why}</p>}
              </div>
              <span className="ml-auto shrink-0 pt-1 text-[11px] text-[#9B9BA3]">{item.complete?'Done':'To do'}</span>
            </li>)}
          </ul>
        </section>

        <section className={surface+' p-5 sm:p-6'} aria-label="Search result preview">
          <div className="flex items-center gap-2"><Search size={17} className="text-[#E87512]"/><h2 className="text-[18px] font-medium">Search appearance</h2></div>
          <p className="mt-1 text-[12px] leading-5 text-[#85858D]">Your site's current SEO metadata. Google may display a different snippet.</p>
          <div className="mt-5 rounded-xl border border-[#ECECF0] bg-[#FAFAFB] p-4">
            <p className="break-all text-[11px] text-[#24724B]">{seo!.canonical}</p>
            <h3 className="mt-2 text-[16px] font-medium leading-6 text-[#2659A6]">{seo!.title}</h3>
            <p className="mt-2 text-[12px] leading-5 text-[#64646F]">{seo!.description}</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {published?<><a href={seo!.canonical} target="_blank" rel="noopener noreferrer" className={secondaryButton}>Open published page <ExternalLink size={15}/></a>
            <button type="button" onClick={()=>void copyProfile()} className={secondaryButton}>
              {copied?<CheckCircle2 size={15}/>:<Clipboard size={15}/>} {copied?'Copied':'Copy link'}
            </button></>:<p className="text-[11px] leading-5 text-[#85632E]">This profile is not publicly indexed until SLBI approves publication.</p>}
          </div>
          <div className="mt-6 border-t border-[#F0F0F2] pt-4">
            <h3 className="text-[12px] font-medium">Automatic SLBI discovery</h3>
            <p className="mt-2 text-[11px] leading-6 text-[#85858D]">Approved profile → public canonical URL → updated sitemap → search-engine discovery. Repeated submissions do not guarantee search ranking.</p>
          </div>
        </section>
      </div>

      <section id="seo-domain-connection" className={surface+' scroll-mt-5 p-5 sm:p-7'} aria-label="Connect your own website">
        <div className="mb-6 flex items-center gap-3 border-b border-[#EFEFF2] pb-5">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#FFF1E6] text-[#B65B12]"><Globe2 size={20}/></span>
          <div>
            <h2 className="text-[17px] font-medium">Your own website</h2>
            <p className="mt-1 text-[12px] text-[#86868E]">Separate from your SLBI directory listing</p>
          </div>
        </div>
        <SeoDomainConnector key={String(listing.id)} businessId={String(listing.id)}
          initialConnection={currentConnection} domainServiceReady={domainServiceReady}/>
      </section>
      <p className="flex items-start gap-2 text-[11px] leading-5 text-[#898992]">
        <Info size={15} className="mt-0.5 shrink-0"/>
        Domain proof verifies DNS control. Google Search Console access, website metadata edits and any optional “Powered by SLBI” credit require separate explicit authorization; they are not silently activated.
      </p>
    </>}
  </main>;
}
