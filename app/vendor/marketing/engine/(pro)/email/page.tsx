import Link from 'next/link';
import MarketingModuleFrame from '@/app/vendor/marketing-engine/components/MarketingModuleFrame';
import IconsaxIcon from '@/app/vendor/components/IconsaxIcon';
import {MARKETING_CONNECTORS} from '@/lib/marketing/engine-registry';

const phases=[
 {title:'Connect a mailbox',desc:'Sign in through Google/Microsoft OAuth; request the fewest necessary permissions.',ready:false},
 {title:'Verify consent',desc:'Marketing contacts need recorded opt-in, unsubscribe and suppression before a campaign.',ready:false},
 {title:'Prepare AI suggestions',desc:'Classify inbound business enquiries with rules first. Ask a model for optional draft wording.',ready:false},
 {title:'Review and queue',desc:'Vendor reviews content and audience. Durable sending and retries use a real server-side worker.',ready:false},
 {title:'Observe real delivery',desc:'Use provider message IDs, bounces and complaints; do not invent delivery statistics.',ready:false},
] as const;
export default function MarketingEmail(){
  const providers=MARKETING_CONNECTORS.filter(c=>c.group==='email');
  return <MarketingModuleFrame module="email"
    description="Plug-and-play business mail integration with explicit OAuth consent, AI-assisted drafting and opt-in campaign delivery. No mailbox is accessed until that mailbox owner authorizes it.">
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(300px,.8fr)]">
      <div className="rounded-xl border border-[#EBEBF0] bg-white p-5 sm:p-7">
        <h2 className="text-[16px] font-extrabold">Email provider plugins</h2>
        <p className="mt-2 text-xs leading-6 text-[#808089]">Official OAuth and verified-domain sending are different adapters. The plugin catalogue is informational until callback, credential storage, scopes and audited sending are implemented.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {providers.map(provider=><div key={provider.id} className="rounded-xl border border-[#EAEAF0] bg-[#FCFCFD] p-4">
            <div className="flex items-start justify-between">
              <span className="rounded-lg bg-[#FFF1E5] p-2.5 text-[#B65E16]"><IconsaxIcon name="sms" size={19}/></span>
              <span className="rounded-full bg-[#EFEFF2] px-2.5 py-1 text-[10px] font-bold text-[#85858D]">Not connected</span>
            </div>
            <h3 className="mt-4 text-sm font-bold">{provider.name}</h3>
            <p className="mt-1 text-[11px] leading-6 text-[#7D7D86]">{provider.requirements}</p>
            <p className="mt-3 text-[10px] font-bold text-[#9B5925]">{provider.api}</p>
          </div>)}
        </div>
        <Link href="/vendor/marketing-engine/connections" className="mt-5 inline-flex h-11 items-center gap-2 rounded-lg bg-[#202024] px-5 text-xs font-bold text-white">
          View connector requirements <IconsaxIcon name="arrow-right-2" color="white" size={15}/>
        </Link>
      </div>
      <aside className="space-y-4">
        <div className="rounded-xl border border-[#ECECF0] bg-white p-5 sm:p-6">
          <p className="text-[10px] font-extrabold uppercase tracking-[.1em] text-[#BC671C]">Cost-aware intelligence</p>
          <h2 className="mt-2 text-[17px] font-extrabold">Algorithms before LLMs</h2>
          <p className="mt-2 text-xs leading-6 text-[#777781]">Deterministic tags, consent filters, priority scores and message templates can run without a paid model. An LLM is an optional bounded drafting fallback for complex messages.</p>
          <div className="mt-4 space-y-2 text-[11px] text-[#676770]">
            <p>01 · Identify and classify the enquiry</p>
            <p>02 · Match business facts and verified offers</p>
            <p>03 · Draft a safe reply for human approval</p>
            <p>04 · Schedule according to consent and quiet hours</p>
          </div>
        </div>
        <div className="rounded-xl border border-[#F0D6BE] bg-[#FFF9F2] p-5">
          <h3 className="text-xs font-bold text-[#A45A21]">Consent is mandatory</h3>
          <p className="mt-2 text-[11px] leading-6 text-[#8B6E56]">Reading inbox messages does not imply permission to market to the contacts. Subscription consent, unsubscribe, suppression lists, sender authentication and provider complaint processing must be built first.</p>
        </div>
      </aside>
    </section>
    <section className="rounded-xl border border-[#ECECF0] bg-white p-5 sm:p-7">
      <h2 className="text-[16px] font-extrabold">Email automation release gates</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-5">
        {phases.map((item,index)=><div key={item.title} className="rounded-xl border border-[#EBEBEF] p-4">
          <span className="text-[11px] font-extrabold text-[#B76629]">{String(index+1).padStart(2,'0')}</span>
          <h3 className="mt-3 text-xs font-bold">{item.title}</h3>
          <p className="mt-2 text-[11px] leading-5 text-[#888890]">{item.desc}</p>
        </div>)}
      </div>
    </section>
  </MarketingModuleFrame>;
}
