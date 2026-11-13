import Link from 'next/link';
import {getMarketingAccess} from '@/lib/marketing/pro-access-server';
import {ENGINE_MODULES,MARKETING_CONNECTORS} from '@/lib/marketing/engine-registry';
import IconsaxIcon from '../../components/IconsaxIcon';

export const dynamic='force-dynamic';
const panel='rounded-2xl border border-[#EAEAEE] bg-white shadow-[0_8px_30px_rgba(20,20,25,.035)]';
const links=[
 {label:'Brand Profile',href:'/vendor/marketing/brand',icon:'shop'},
 {label:'AI Captions',href:'/vendor/marketing/captions',icon:'message-text'},
 {label:'Poster Editor',href:'/vendor/marketing/design',icon:'document'},
 {label:'Manual Campaigns',href:'/vendor/marketing/campaigns',icon:'calendar'},
] as const;

export default async function MarketingEngineHome(){
  const access=await getMarketingAccess();
  const pro=access.allowed;
  return <main className="mx-auto w-full max-w-[1520px] space-y-5 pb-12 text-[#242429]">
    <header className={panel+' relative overflow-hidden bg-[#1D1D20] p-6 text-white sm:p-9'}>
      <div aria-hidden="true" className="pointer-events-none absolute -right-14 -top-24 h-80 w-80 rounded-full bg-[#FF7900]/20 blur-3xl"/>
      <div className="relative flex flex-wrap items-end justify-between gap-5">
        <div className="max-w-[740px]">
          <Link href="/vendor/marketing" className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-white/65 hover:text-white">
            <IconsaxIcon name="arrow-left-2" size={14} color="#FFB36E"/> Marketing Studio overview
          </Link>
          <p className="mt-5 text-[10px] font-extrabold uppercase tracking-[.17em] text-[#FF9A4C]">GrowthOS · Marketing Engine</p>
          <h1 className="mt-2 text-[32px] font-extrabold tracking-[-.035em] sm:text-[40px]">Your marketing operations hub.</h1>
          <p className="mt-3 text-[13px] leading-7 text-white/70">One business-aware platform for social content, connected email, customer enquiries, leads, automation and private brand intelligence. You control every external account and approval.</p>
        </div>
        <div className="rounded-xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
          <p className="text-[10px] font-bold uppercase tracking-[.1em] text-white/55">Your feature tier</p>
          <p className="mt-2 text-[19px] font-extrabold">{pro?'Pro features unlocked':'Pro access required'}</p>
          <p className="mt-1 text-[11px] text-white/65">{pro?'Verified '+access.plan:'Professional / Enterprise · verified billing only'}</p>
          {!pro&&<Link href="/vendor/billing" className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#FF7900] px-4 py-2.5 text-[11px] font-bold text-[#161619]">See available plans <IconsaxIcon name="arrow-right-2" size={13}/></Link>}
        </div>
      </div>
    </header>
    <section className="grid gap-3 md:grid-cols-3">
      <div className={panel+' p-5'}><p className="text-[10px] font-bold uppercase tracking-[.09em] text-[#A5612C]">01 · Identity</p>
        <h2 className="mt-2 text-sm font-extrabold">Business-aware by design</h2>
        <p className="mt-1 text-xs leading-6 text-[#797982]">Every module starts from one verified business profile, brand tone and factual product information.</p></div>
      <div className={panel+' p-5'}><p className="text-[10px] font-bold uppercase tracking-[.09em] text-[#A5612C]">02 · Connectors</p>
        <h2 className="mt-2 text-sm font-extrabold">{MARKETING_CONNECTORS.length} provider adapter candidates</h2>
        <p className="mt-1 text-xs leading-6 text-[#797982]">Discovery catalogue only; OAuth and provider account connections are not enabled yet.</p></div>
      <div className={panel+' p-5'}><p className="text-[10px] font-bold uppercase tracking-[.09em] text-[#A5612C]">03 · Automation</p>
        <h2 className="mt-2 text-sm font-extrabold">Algorithms first, AI where needed</h2>
        <p className="mt-1 text-xs leading-6 text-[#797982]">Rules and safe templates, then small ML models and budget-controlled LLM drafts with human review.</p></div>
    </section>
    <section aria-label="Marketing Engine modules" className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div><h2 className="text-xl font-extrabold">Marketing modules</h2>
          <p className="mt-1 text-xs text-[#83838A]">Separate spaces for every workflow, with provider capabilities shown truthfully.</p></div>
        <Link href="/vendor/marketing/engine/connections" className="text-xs font-bold text-[#B45A12] hover:underline">Browse connectors</Link>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {ENGINE_MODULES.map((module,index)=><Link key={module.slug}
          href={'/vendor/marketing/engine/'+module.slug}
          className={panel+' group flex min-h-[225px] flex-col p-5 transition hover:border-[#F3BB8B] hover:shadow-[0_18px_38px_rgba(216,112,34,.06)]'}>
          <div className="flex items-start justify-between">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FFF1E5] text-[#BD6015]">
              <IconsaxIcon name={module.icon} size={22}/></span>
            <span className="text-[10px] font-bold text-[#98989E]">{module.phase} · {String(index+1).padStart(2,'0')}</span>
          </div>
          <h3 className="mt-4 text-[15px] font-extrabold">{module.title}</h3>
          <p className="mt-1 text-[12px] leading-6 text-[#797982]">{module.description}</p>
          <div className="mt-auto flex items-center justify-between gap-2 pt-5">
            <span className="rounded-full border border-[#E9E9EC] bg-[#FAFAFB] px-2.5 py-1 text-[10px] font-bold text-[#777780]">
              {module.state==='catalogue'?'Connector catalogue':module.state==='foundation'?'Foundation in development':'Planned integration'}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#B15C19]">
              {pro?'Explore':'Pro only'} <IconsaxIcon name="arrow-right-2" size={14}/>
            </span>
          </div>
        </Link>)}
      </div>
    </section>
    <section className={panel+' space-y-4 p-5 sm:p-6'}>
      <div><h2 className="text-[17px] font-extrabold">Creative & campaign workspaces</h2>
        <p className="mt-1 text-xs text-[#7D7D84]">The existing tools stay intact while they are connected to the Marketing Engine.</p></div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {links.map(l=><Link key={l.href} href={l.href}
          className="flex min-h-14 items-center justify-between gap-2 rounded-lg border border-[#E8E8EB] bg-[#FCFCFD] px-4 text-[12px] font-bold hover:border-[#F4B57F]">
          <span className="flex items-center gap-2"><IconsaxIcon name={l.icon} size={17}/>{l.label}</span><IconsaxIcon name="arrow-right-2" size={13}/>
        </Link>)}
      </div>
    </section>
    <p className="text-[11px] text-[#8E8E94]">Access and provider connections are separate: an active Pro plan never grants permission to a Facebook account, WhatsApp number, mailbox, or phone line without that account owner's explicit provider authorization.</p>
  </main>;
}
