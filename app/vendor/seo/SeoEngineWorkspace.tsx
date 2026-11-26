'use client';

import {useMemo,useState} from 'react';
import Link from 'next/link';
import {ArrowRight,ArrowUpRight,Check,CheckCircle2,Clipboard,Globe2,Info,Link2,
  ListChecks,LockKeyhole,Search,ShieldCheck,Sparkles,XCircle} from 'lucide-react';
import {getPublicBusinessSEO} from '@/lib/seo/public-business';
import {getSeoPreparation,getWebsiteGuideHostname,type SeoOwnedListing} from '@/lib/seo/owner-readiness';
import {neo} from '../components/neumorphic';

type Props={listings:SeoOwnedListing[]};
type View='listing'|'website';

const providers=['GoDaddy','Namecheap','Cloudflare','Hostinger','Other provider'] as const;

export default function SeoEngineWorkspace({listings}:Props){
  const [selectedId,setSelectedId]=useState(String(listings[0]?.id??''));
  const [view,setView]=useState<View>('listing');
  const [website,setWebsite]=useState('');
  const [provider,setProvider]=useState<(typeof providers)[number]>('Other provider');
  const [showGuide,setShowGuide]=useState(false);
  const [badgePreview,setBadgePreview]=useState(false);
  const [copied,setCopied]=useState(false);
  const listing=useMemo(()=>listings.find(b=>String(b.id)===selectedId)??listings[0], [listings,selectedId]);
  const readiness=listing?getSeoPreparation(listing):null;
  const seo=listing?getPublicBusinessSEO(listing):null;
  const hostname=getWebsiteGuideHostname(website);
  const isPublished=readiness?.published===true;

  const copyLink=async()=>{
    if(!isPublished||!seo)return;
    try {
      await navigator.clipboard.writeText(seo.canonical);
      setCopied(true);
    }catch {setCopied(false)}
  };

  return <main data-slbi-seo-engine="true" className={neo.page+' mx-auto max-w-[1420px] space-y-5 pb-12'}>
    <header className="relative overflow-hidden rounded-[22px] bg-[#1E1E22] p-6 text-white sm:p-9">
      <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[#FF7900]/20 blur-[70px]"/>
      <div className="relative">
        <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.15em] text-[#FFAB6B]">
          <Sparkles size={16}/> SLBI SEO Engine
        </p>
        <h1 className="mt-4 max-w-[790px] text-[30px] font-bold leading-tight tracking-tight sm:text-[43px]">
          Help people find <span className="text-[#FF953C]">your business.</span>
        </h1>
        <p className="mt-3 max-w-[740px] text-[13px] leading-6 text-[#CBCBD0]">
          Improve your SLBI profile or prepare your own website for search. Choose your business and follow simple steps — no SEO knowledge needed.
        </p>
        <div className="mt-5 flex flex-wrap gap-2 text-[11px]">
          <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5">Available to all registered owners</span>
          <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5">Verified badge not required</span>
          <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5">Safe, review-first guidance</span>
        </div>
      </div>
    </header>

    {!listing ? <section className={neo.card+' px-6 py-10 text-center'}>
      <Globe2 size={31} className="mx-auto text-[#FF7900]"/>
      <h2 className="mt-3 text-xl font-bold">Start with your business</h2>
      <p className="mx-auto mt-2 max-w-xl text-[13px] leading-6 text-[#75757C]">Register your business first. Once you submit it, the SEO checklist helps you prepare the profile. Public search discovery starts only after listing approval.</p>
      <Link href="/register-business" className={neo.primary+' mt-6'}>Register a business <ArrowRight size={16}/></Link>
    </section> : <>
      <section className={neo.card+' space-y-4 p-4 sm:p-6'} aria-label="Select a business for SEO">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-[16px] font-bold">Your business</h2>
            <p className="mt-1 text-[12px] text-[#72727B]">SEO is available for ordinary listings and verified businesses alike.</p>
          </div>
          <span className="rounded-full bg-[#FFF2E7] px-3 py-1.5 text-[11px] font-bold text-[#BA5807]">Free SEO foundation</span>
        </div>
        <label htmlFor="seo-business-select" className="block text-[11px] font-semibold text-[#46464D]">Choose business</label>
        <select id="seo-business-select" value={String(listing.id)} onChange={event=>{setSelectedId(event.target.value);setCopied(false)}}
          className={neo.input} data-testid="seo-business-select">
          {listings.map(item=><option key={String(item.id)} value={String(item.id)}>{item.name||'Unnamed business'} — {item.status==='approved'?'Published':item.status==='rejected'?'Rejected':item.status==='suspended'?'Suspended':'Awaiting review'}</option>)}
        </select>
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span data-testid="seo-publication-status" className={'rounded-md px-2.5 py-1.5 font-bold '+(isPublished?'bg-[#E9F7EE] text-[#18683B]':'bg-[#FFF2DE] text-[#975200]')}>
            {isPublished?'Published on SLBI':'Not publicly published yet'}
          </span>
          {listing.is_verified===true?<span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2.5 py-1.5 font-semibold text-blue-700"><ShieldCheck size={14}/> Verified badge</span>
            :<span className="rounded-md border border-[#E6E6EB] px-2.5 py-1.5 text-[#686872]">Badge optional — SEO still available</span>}
        </div>
      </section>

      <nav aria-label="SEO Engine sections" className="grid grid-cols-2 gap-2 rounded-xl border border-[#EBEBEE] bg-[#FAFAFB] p-1.5">
        <button type="button" onClick={()=>setView('listing')} aria-current={view==='listing'?'page':undefined}
          className={'flex min-h-11 items-center justify-center gap-2 rounded-lg px-2 text-[12px] font-bold focus-visible:outline-2 focus-visible:outline-[#FF7900] '+(view==='listing'?'bg-[#FF7900] text-[#1D1D1F] shadow-sm':'text-[#626269] hover:bg-white')}>
          <Search size={17}/> My SLBI profile
        </button>
        <button type="button" onClick={()=>setView('website')} aria-current={view==='website'?'page':undefined}
          className={'flex min-h-11 items-center justify-center gap-2 rounded-lg px-2 text-[12px] font-bold focus-visible:outline-2 focus-visible:outline-[#FF7900] '+(view==='website'?'bg-[#FF7900] text-[#1D1D1F] shadow-sm':'text-[#626269] hover:bg-white')}>
          <Globe2 size={17}/> My own website
        </button>
      </nav>

      {view==='listing'?<div data-testid="seo-listing-tab" className="space-y-5">
        <div className="grid gap-3 md:grid-cols-3">
          <div className={neo.card+' p-5'}>
            <p className="text-[11px] font-semibold text-[#77777E]">Profile completeness — not a Google ranking</p>
            <p className="mt-2 text-[33px] font-extrabold text-[#1F1F24]">{readiness!.score}<span className="text-[16px] text-[#86868E]">/100</span></p>
            <div className="mt-3 h-2 rounded-full bg-[#F0F0F3]"><div className="h-2 rounded-full bg-[#FF7900]" style={{width:readiness!.score+'%'}}/></div>
          </div>
          <div className={neo.card+' p-5'}>
            <p className="text-[11px] font-semibold text-[#77777E]">SLBI listing discovery</p>
            <p className="mt-3 text-lg font-bold text-[#202024]">{isPublished?'Public sitemap eligible':'Waiting for publication'}</p>
            <p className="mt-1 text-[11px] leading-5 text-[#7D7D86]">{isPublished?'Published listings are included when the sitemap refreshes.':'Your private listing is not in Google’s public sitemap.'}</p>
          </div>
          <div className={neo.card+' p-5'}>
            <p className="text-[11px] font-semibold text-[#77777E]">Google indexing</p>
            <p className="mt-3 text-lg font-bold text-[#202024]">Not yet verified</p>
            <p className="mt-1 text-[11px] leading-5 text-[#7D7D86]">Search Console data is not connected. We do not claim that Google has indexed this page.</p>
          </div>
        </div>

        {!isPublished&&<div role="status" className="flex items-start gap-3 rounded-xl border border-[#F1DBAD] bg-[#FFFAED] p-4 text-[#76501F]">
          <Info size={18} className="mt-0.5 shrink-0"/>
          <div className="text-[12px] leading-6"><strong>SEO preparation is available now.</strong> Your business must pass SLBI publication review before the public profile is listed for search. A paid plan or blue verification badge is not required.</div>
        </div>}

        <section className={neo.card+' p-5 sm:p-7'} aria-label="Business listing improvements">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[.12em] text-[#E76B05]">Guided optimization</p>
              <h2 className="mt-2 text-[21px] font-bold">Make your profile stronger</h2>
              <p className="mt-1 text-[12px] leading-6 text-[#77777F]">Checks use your actual business details. No invented services, reviews or AI-generated claims.</p>
            </div>
            <Link href={'/vendor/my-businesses/'+encodeURIComponent(String(listing.id))+'/edit'} className={neo.primary}>Edit business <ArrowUpRight size={15}/></Link>
          </div>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {readiness!.checks.map(item=><div key={item.key} className="flex gap-3 rounded-xl border border-[#ECECF0] bg-[#FAFAFC] p-3.5">
              <span className={'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full '+(item.complete?'bg-[#E7F5EA] text-[#20783F]':'bg-[#FFF1E5] text-[#B95A05]')}>
                {item.complete?<Check size={16}/>:<ListChecks size={16}/>}
              </span>
              <div className="min-w-0">
                <p className="text-[12px] font-bold text-[#29292D]">{item.label}</p>
                <p className="mt-1 text-[11px] leading-5 text-[#797983]">{item.why}</p>
              </div>
            </div>)}
          </div>
        </section>

        <section className={neo.card+' p-5 sm:p-7'} aria-label="Google search preview">
          <div className="flex items-center gap-2 text-[#27272C]"><Search size={18} className="text-[#FF7900]"/><h2 className="text-[18px] font-bold">Google search preview</h2></div>
          <p className="mt-2 text-[11px] leading-5 text-[#85858D]">Illustration only — Google may choose a different title, description or position.</p>
          <div className="mt-4 rounded-[14px] border border-[#ECECF0] bg-white p-4 sm:p-5">
            <p className="max-w-full break-all text-[11px] text-[#236944]">{seo!.canonical}</p>
            <p className="mt-1 text-[17px] font-medium leading-6 text-[#204EA4]">{seo!.title}</p>
            <p className="mt-2 text-[12px] leading-5 text-[#55545C]">{seo!.description}</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {isPublished&&<><a href={seo!.canonical} target="_blank" rel="noopener noreferrer" className={neo.primary}>
              Open public profile <ArrowUpRight size={15}/>
            </a><button onClick={()=>void copyLink()} type="button" className={neo.button}>
              {copied?<CheckCircle2 size={15}/>:<Clipboard size={15}/>} {copied?'Copied':'Copy profile link'}
            </button></>}
            {!isPublished&&<span className="text-[11px] text-[#8A682E]">The URL preview is not public until your listing is approved.</span>}
          </div>
        </section>

        <section className={neo.card+' p-5 sm:p-7'} aria-label="Automatic listing discovery steps">
          <h2 className="text-[18px] font-bold">How automatic discovery works</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {[
              {name:'1. Submit',body:'Create or update your business profile.'},
              {name:'2. Publish',body:'SLBI reviews it. Ordinary approved businesses qualify — no blue badge needed.'},
              {name:'3. Discover',body:'SLBI keeps public URLs in its sitemap. Google decides if and when to index them.'}
            ].map(item=><div key={item.name} className="rounded-xl bg-[#F8F8FA] p-4">
              <p className="text-[12px] font-bold text-[#C45B00]">{item.name}</p>
              <p className="mt-1 text-[11px] leading-5 text-[#686871]">{item.body}</p>
            </div>)}
          </div>
        </section>
      </div>:<div data-testid="seo-website-tab" className="space-y-5">
        <section className={neo.card+' p-5 sm:p-7'}>
          <div className="flex items-center gap-2"><Globe2 size={20} className="text-[#F5790A]"/><h2 className="text-[20px] font-bold">Connect your own website</h2></div>
          <p className="mt-2 max-w-2xl text-[12px] leading-6 text-[#71717A]">
            You do not need to understand DNS. Start by entering your website address. We will guide you through ownership verification before any connection or SEO edits.
          </p>
          <p role="status" data-testid="seo-domain-state" className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[#E8E8ED] bg-[#FAFAFB] px-3 py-2 text-[11px] font-bold text-[#66666C]">
            <LockKeyhole size={14}/> Guide preview only — no domain is connected
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-[minmax(0,1fr)_240px]">
            <div>
              <label htmlFor="seo-website-address" className="mb-2 block text-[12px] font-bold">1. Your website address</label>
              <input id="seo-website-address" type="text" inputMode="url" autoComplete="url" maxLength={250}
                value={website} onChange={event=>{setWebsite(event.target.value);setShowGuide(false)}}
                placeholder="example.lk" className={neo.input}/>
              {listing.website_url&&<button type="button" className="mt-2 text-left text-[11px] text-[#B25608] underline underline-offset-2" onClick={()=>{setWebsite(listing.website_url||'');setShowGuide(false)}}>
                Use the website listed on my business profile
              </button>}
            </div>
            <div>
              <label htmlFor="seo-dns-provider" className="mb-2 block text-[12px] font-bold">2. Where did you buy your domain?</label>
              <select id="seo-dns-provider" value={provider} onChange={event=>setProvider(event.target.value as (typeof providers)[number])} className={neo.input}>
                {providers.map(name=><option key={name}>{name}</option>)}
              </select>
              <p className="mt-2 text-[11px] leading-4 text-[#86868E]">Not sure? Choose “Other provider”.</p>
            </div>
          </div>
          <button type="button" className={neo.primary+' mt-5'} onClick={()=>setShowGuide(true)}>
            Show my setup steps <ArrowRight size={16}/>
          </button>
          {showGuide&&!hostname&&<p role="alert" className="mt-3 text-[12px] text-[#AF3E26]">Please enter a normal public domain, such as yourbusiness.lk, without a path, password or port.</p>}

          {showGuide&&hostname&&<div data-testid="seo-domain-steps" className="mt-6 space-y-3 rounded-xl border border-[#F6D6B9] bg-[#FFFCF8] p-4 sm:p-6">
            <h3 className="text-[15px] font-bold text-[#2C2C31]">Your setup guide for {hostname}</h3>
            <p className="text-[11px] text-[#787881]">Domain provider: {provider}. These are preparation instructions, not a completed connection.</p>
            {[
              {step:'Step 1',title:'Open your domain account',text:'Sign in where you manage this domain. Find “DNS settings” or “Manage DNS”. You do not need to share your password with SLBI.'},
              {step:'Step 2',title:'Prove the website belongs to you',text:'When SLBI domain verification becomes available, the app will give you a unique DNS TXT value or a website-file option. Add only that issued value, then return here to verify.'},
              {step:'Step 3',title:'Choose what SEO can change',text:'After ownership is verified, connect a supported website platform separately, review suggested SEO updates and approve them. No automatic editing without authorization.'},
            ].map(item=><div key={item.step} className="flex gap-3 rounded-xl bg-white p-4">
              <span className="mt-0.5 shrink-0 rounded-md bg-[#FFF0E1] px-2 py-1 text-[10px] font-bold text-[#C45D00]">{item.step}</span>
              <div><p className="text-[12px] font-bold">{item.title}</p><p className="mt-1 text-[11px] leading-5 text-[#777780]">{item.text}</p></div>
            </div>)}
            <div className="flex items-start gap-2 text-[11px] leading-5 text-[#82642B]"><Info size={16} className="shrink-0"/> A verification token and a real “Connect” action will appear only after the secure domain connector backend is enabled.</div>
          </div>}
        </section>
        <section className={neo.card+' p-5 sm:p-7'}>
          <div className="flex items-center gap-2"><Link2 className="text-[#F5790A]" size={18}/><h2 className="text-[18px] font-bold">Powered by SLBI</h2></div>
          <p className="mt-2 text-[12px] leading-6 text-[#77777F]">You may choose to display a small SLBI credit on your own website after it is safely connected. It is optional and will not automatically appear under your website in Google Search.</p>
          <label className="mt-4 flex cursor-pointer items-center gap-2 text-[12px] font-semibold text-[#424249]">
            <input type="checkbox" checked={badgePreview} onChange={e=>setBadgePreview(e.target.checked)} className="h-4 w-4 accent-[#FF7900]"/> Show badge preview
          </label>
          {badgePreview&&<div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[#E8E8EC] bg-white p-3 text-[12px] font-bold"><ShieldCheck size={16} className="text-[#FF7900]"/> Powered by SLBI <span className="text-[10px] font-normal text-[#8B8B91]">(preview only)</span></div>}
        </section>
      </div>}
      <p className="flex items-start gap-2 text-[11px] leading-5 text-[#85858E]"><LockKeyhole size={15} className="mt-0.5 shrink-0"/> SLBI SEO Engine currently provides factual, rule-based guidance. No external website edits, Google API submissions, domain verification or automatic AI publishing are performed here.</p>
    </>}
  </main>;
}
