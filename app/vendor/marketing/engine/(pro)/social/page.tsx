import Link from 'next/link';
import MarketingModuleFrame from '@/app/vendor/marketing-engine/components/MarketingModuleFrame';
import IconsaxIcon from '@/app/vendor/components/IconsaxIcon';
import {MARKETING_CONNECTORS} from '@/lib/marketing/engine-registry';

const flow=[
 ['01','Authorize a Page','Account owner completes official Meta or provider OAuth; personal profiles are not assumed publishable'],
 ['02','Prepare campaign','Select an owned business, approved Brand Profile, captions and editable media assets'],
 ['03','Approve content','Review original artwork, factual prices, dates, audience and channel-specific requirements'],
 ['04','Queue & publish','Durable jobs check Pro access and provider permissions before any external sending'],
 ['05','Verify results','Store real provider receipt, status, failure reason and available performance analytics'],
] as const;
export default function SocialMarketingPage(){
  const choices=MARKETING_CONNECTORS.filter(c=>c.group==='social'||c.id==='whatsapp_business');
  return <MarketingModuleFrame module="social"
    description="Social content, original assets and multi-channel publishing through official authorization. A connected Facebook login does not grant unrestricted control of personal profiles.">
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(270px,.8fr)]">
      <div className="rounded-xl border border-[#E9E9EE] bg-white p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="text-[16px] font-extrabold">Available social channels</h2>
            <p className="mt-1 text-[11px] leading-5 text-[#82828A]">Provider adapters are in the roadmap. None are silently connected or capable of publishing yet.</p></div>
          <Link href="/vendor/marketing-engine/connections" className="rounded-lg bg-[#1F1F22] px-4 py-2.5 text-xs font-bold text-white">
            Explore plugin catalogue
          </Link>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {choices.map(c=><div key={c.id} className="rounded-xl border border-[#ECECF0] bg-[#FCFCFD] p-4">
            <div className="flex items-start justify-between gap-2">
              <span className="rounded-lg bg-[#FFF0E4] p-2.5 text-[#BA5E16]"><IconsaxIcon name={c.icon} size={19}/></span>
              <span className="rounded-full bg-[#F0F0F2] px-2.5 py-1 text-[10px] font-bold text-[#75757B]">
                {c.status==='research'?'Research':'Not connected'}
              </span>
            </div>
            <h3 className="mt-3 text-[13px] font-bold">{c.name}</h3>
            <p className="mt-1 text-[11px] leading-5 text-[#81818A]">{c.account}</p>
            <p className="mt-3 text-[10px] leading-5 text-[#8F8F97]">{c.requirements}</p>
          </div>)}
        </div>
      </div>
      <aside className="space-y-4">
        <div className="rounded-xl border border-[#E9E9EE] bg-white p-6">
          <p className="text-[10px] font-extrabold uppercase tracking-[.1em] text-[#B85F16]">Current creative tools</p>
          <h2 className="mt-2 text-[17px] font-extrabold">Create before connecting</h2>
          <p className="mt-2 text-xs leading-6 text-[#85858B]">Create real campaigns now using approved business details. Provider publishing remains disabled until official API integration.</p>
          <div className="mt-5 flex flex-col gap-2">
            {[
              ['Brand Profile','/vendor/marketing/brand','shop'],
              ['Multilingual Caption Lab','/vendor/marketing/captions','message-text'],
              ['Editable Poster Studio','/vendor/marketing/design','document'],
              ['Manual Campaign Workspace','/vendor/marketing/campaigns','calendar'],
            ].map(([name,href,icon])=><Link key={href} href={href}
              className="inline-flex min-h-11 items-center justify-between rounded-lg border border-[#ECECF0] px-3 text-[11px] font-bold hover:border-[#FFCA97]">
              <span className="inline-flex items-center gap-2"><IconsaxIcon name={icon} size={16}/>{name}</span><IconsaxIcon name="arrow-right-2" size={13}/>
            </Link>)}
          </div>
        </div>
        <div className="rounded-xl border border-[#F4DDC7] bg-[#FFFAF4] p-5">
          <h3 className="text-sm font-bold text-[#A75A1E]">No automated posting yet</h3>
          <p className="mt-2 text-xs leading-6 text-[#81674E]">Saved campaign planning dates are not background jobs. Official OAuth, scoped permissions, reviewed content and verified provider receipts are release gates.</p>
        </div>
      </aside>
    </section>
    <section className="rounded-xl border border-[#ECECF0] bg-white p-5 sm:p-7">
      <h2 className="text-[17px] font-extrabold">Publishing workflow</h2>
      <div className="mt-5 grid gap-3 md:grid-cols-5">
        {flow.map(([n,title,desc])=><div key={n} className="rounded-xl border border-[#EDEDF0] p-4">
          <span className="text-[12px] font-extrabold text-[#B9621B]">{n}</span>
          <h3 className="mt-3 text-xs font-extrabold">{title}</h3>
          <p className="mt-2 text-[11px] leading-5 text-[#85858C]">{desc}</p>
        </div>)}
      </div>
    </section>
  </MarketingModuleFrame>;
}
