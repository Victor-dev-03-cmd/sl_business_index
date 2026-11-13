import Link from 'next/link';
import MarketingModuleFrame from '@/app/vendor/marketing/engine/components/MarketingModuleFrame';
import IconsaxIcon from '@/app/vendor/components/IconsaxIcon';

const stages=[
  {title:'Capture eligible interactions',desc:'Import verified provider webhooks and owner directory leads. Record consent and provider source.',icon:'message-text'},
  {title:'Classify with our rules',desc:'Deterministic intent/risk classification first; supervised small-model fallback only when evaluated.',icon:'flash'},
  {title:'Propose a next action',desc:'Use verified business knowledge, lead stage, quiet hours and vendor policies to suggest a response.',icon:'status-up'},
  {title:'Require approval',desc:'Human reviews high-stakes replies and all new outbound campaigns before any external action.',icon:'shield-tick'},
  {title:'Queue and recover',desc:'Persistent jobs, per-provider limits, idempotency, backoff and dead-letter recovery are required.',icon:'calendar'},
] as const;
export default function MarketingAutomationPage(){
  return <MarketingModuleFrame module="automation"
    description="Our own rules-first orchestration for business leads and approved marketing work. The current campaign calendar is planning-only, not a live delivery queue.">
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(290px,.8fr)]">
      <div className="rounded-xl border border-[#ECECF0] bg-white p-5 sm:p-7">
        <h2 className="text-[17px] font-extrabold">Lead-to-campaign automation</h2>
        <p className="mt-1 text-xs leading-6 text-[#88888F]">Safe automation is an event pipeline, not an LLM with unfettered permission to message customers.</p>
        <div className="mt-6 space-y-3">
          {stages.map((s,i)=><div key={s.title} className="flex items-start gap-4 rounded-xl border border-[#EDEDF0] bg-[#FCFCFD] p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF0E3] text-[#BD5F17]"><IconsaxIcon name={s.icon} size={19}/></span>
            <div><p className="text-[10px] font-bold uppercase tracking-wider text-[#AF692F]">Step {i+1}</p>
              <h3 className="mt-1 text-sm font-bold">{s.title}</h3>
              <p className="mt-1 text-[11px] leading-5 text-[#82828A]">{s.desc}</p></div>
          </div>)}
        </div>
      </div>
      <aside className="space-y-4">
        <div className="rounded-xl border border-[#ECECF0] bg-white p-5 sm:p-6">
          <h2 className="text-sm font-extrabold">Already available to use</h2>
          <p className="mt-2 text-xs leading-6 text-[#81818A]">Your existing owner-scoped Leads CRM and campaign draft composer are separate functioning components. Their integration into an automated job worker is still under development.</p>
          <div className="mt-5 space-y-2">
            <Link href="/vendor/leads" className="flex items-center justify-between rounded-lg border border-[#ECECF0] px-4 py-3 text-xs font-bold">
              Manage real leads <IconsaxIcon name="arrow-right-2" size={14}/>
            </Link>
            <Link href="/vendor/marketing/campaigns" className="flex items-center justify-between rounded-lg border border-[#ECECF0] px-4 py-3 text-xs font-bold">
              Campaign planning records <IconsaxIcon name="arrow-right-2" size={14}/>
            </Link>
          </div>
        </div>
        <div className="rounded-xl border border-[#F2D9C3] bg-[#FFFAF5] p-5">
          <h3 className="text-xs font-extrabold text-[#A45A1E]">Deployment gate</h3>
          <p className="mt-2 text-[11px] leading-6 text-[#8B7057]">No marketing jobs are queued automatically yet. Durable job schema, permission re-check at execution, provider webhook receipts and secure worker credentials must pass real tests before activating this feature.</p>
        </div>
      </aside>
    </section>
  </MarketingModuleFrame>;
}
