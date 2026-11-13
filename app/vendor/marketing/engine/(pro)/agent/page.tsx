'use client';
import {useMemo,useState} from 'react';
import Link from 'next/link';
import MarketingModuleFrame from '@/app/vendor/marketing/engine/components/MarketingModuleFrame';
import IconsaxIcon from '@/app/vendor/components/IconsaxIcon';
import {triageMarketingEnquiry} from '@/lib/marketing/agent-rules';

const examples=[
  {label:'English — location',text:'Where is your shop located? Please share the address.'},
  {label:'தமிழ் — opening hours',text:'உங்கள் கடை எத்தனை மணிக்கு திறந்திருக்கும்?'},
  {label:'සිංහල — price',text:'මේකේ මිල කීයද?'},
  {label:'Complaint / refund',text:'I need a refund; there is a problem with my order.'},
] as const;
const labels={
  opening_hours:'Opening hours',
  location:'Location and directions',
  contact:'Contact information',
  pricing:'Pricing or discounts',
  booking:'Booking request',
  complaint:'Complaint or refund',
  general:'Unclassified enquiry',
} as const;
const actions={
  human_review:'Human review required',
  faq_lookup:'Verified business FAQ lookup',
  create_lead:'Create lead for manual confirmation',
} as const;
export default function CallsAndMessagesAgent(){
  const [message,setMessage]=useState('');
  const [show,setShow]=useState(false);
  const result=useMemo(()=>triageMarketingEnquiry(message),[message]);
  const sample=(text:string)=>{setMessage(text);setShow(true)};
  return <MarketingModuleFrame module="agent"
    description="Pro-only customer support agent foundation for incoming WhatsApp, Messenger, business DMs and routed voice calls. Start with low-cost multilingual rules, use business facts and escalate uncertain requests.">
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(310px,.8fr)]">
      <div className="rounded-xl border border-[#E8E8ED] bg-white p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><p className="text-[10px] font-bold uppercase tracking-wider text-[#BD651C]">Rules-first algorithm · Local test</p>
            <h2 className="mt-2 text-[18px] font-extrabold">Customer enquiry classifier</h2>
            <p className="mt-1 text-[11px] leading-6 text-[#808089]">Try English, Tamil or Sinhala. This runs in the browser only: it neither sends replies nor stores customer data or consumes AI credits.</p></div>
          <span className="rounded-full bg-[#FFF2E7] px-3 py-1.5 text-[10px] font-bold text-[#A95C20]">Safe demo · not connected</span>
        </div>
        <div className="mt-5 space-y-3">
          <label htmlFor="marketing-agent-message" className="text-xs font-bold">Example incoming customer message</label>
          <textarea id="marketing-agent-message" rows={5} maxLength={1200} value={message}
            onChange={e=>{setMessage(e.target.value);setShow(false)}} placeholder="Ask about opening hours, directions, prices, bookings or a complaint..."
            className="w-full resize-y rounded-lg border border-[#E4E4E9] bg-[#FCFCFD] p-3.5 text-xs leading-6 outline-none focus:border-[#FF7900]"/>
          <div className="flex flex-wrap gap-2">
            {examples.map(e=><button type="button" key={e.label} onClick={()=>sample(e.text)}
              className="rounded-lg border border-[#E7E7EB] px-3 py-2 text-[11px] font-semibold text-[#71717A] hover:border-[#F8B57F] hover:bg-[#FFF9F4]">{e.label}</button>)}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#EFEFF1] pt-4">
            <p className="text-[11px] text-[#92929B]">Deterministic keyword/intent routing, not a trained neural network yet.</p>
            <button type="button" disabled={!message.trim()} onClick={()=>setShow(true)}
              className="h-10 rounded-lg bg-[#202024] px-4 text-xs font-bold text-white disabled:opacity-40">Classify locally</button>
          </div>
          {show&&<div aria-live="polite" className="rounded-xl border border-[#E6E6EB] bg-[#FBFBFC] p-5">
            <p className="text-[10px] font-bold uppercase tracking-[.1em] text-[#B0611E]">Algorithm result</p>
            <h3 className="mt-2 text-[16px] font-extrabold">{labels[result.intent]}</h3>
            <p className="mt-2 text-xs font-semibold text-[#45454D]">{actions[result.action]}</p>
            <p className="mt-2 text-[11px] leading-5 text-[#888890]">{result.reason}</p>
            <span className="mt-3 inline-flex rounded-full border border-[#EAEAEA] bg-white px-2.5 py-1 text-[10px] font-bold text-[#787882]">
              {result.risk==='requires_human'?'Human checkpoint mandatory':'FAQ lookup candidate only'}
            </span>
          </div>}
        </div>
      </div>
      <aside className="space-y-4">
        <div className="rounded-xl border border-[#E8E8ED] bg-white p-5 sm:p-6">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#AF5C19]">Agent activation</p>
          <h2 className="mt-2 text-[17px] font-extrabold">Inbound AI Customer Agent</h2>
          <div className="mt-4 flex items-center justify-between rounded-xl border border-[#E7E7EC] bg-[#FAFAFB] px-4 py-3">
            <div><p className="text-xs font-bold">Automatic replies</p><p className="mt-1 text-[11px] text-[#888890]">Currently disabled</p></div>
            <span aria-label="Automatic replies disabled" className="flex h-6 w-11 items-center rounded-full bg-[#D7D7DE] p-1"><span className="h-4 w-4 rounded-full bg-white shadow"/></span>
          </div>
          <p className="mt-3 text-[11px] leading-6 text-[#85858E]">No direct inbound call number, provider webhook, official messaging account or audited reply permissions are configured yet. This switch cannot enable live replies until those release gates exist.</p>
          <Link href="/vendor/marketing/engine/connections" className="mt-4 flex h-10 items-center justify-center gap-2 rounded-lg bg-[#202024] px-4 text-[11px] font-bold text-white">
            See provider requirements <IconsaxIcon name="arrow-right-2" size={15} color="white"/>
          </Link>
        </div>
        <div className="rounded-xl border border-[#E8E8ED] bg-white p-5 sm:p-6">
          <h3 className="text-sm font-extrabold">Human-in-the-loop leads</h3>
          <p className="mt-2 text-[11px] leading-6 text-[#81818A]">Bookings, prices, complaints and uncertain messages are escalated, not answered with invented facts. Real enquiries continue in the existing owner-scoped Leads workspace.</p>
          <Link href="/vendor/leads" className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[#A95A1C]">Open Leads CRM <IconsaxIcon name="arrow-right-2" size={14}/></Link>
        </div>
      </aside>
    </section>
    <section className="rounded-xl border border-[#ECECF0] bg-white p-5 sm:p-7">
      <h2 className="text-[16px] font-extrabold">Next release gates for live calls & messages</h2>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['01','Authorized provider','WhatsApp Business, Messenger/Instagram Business or a real telephony provider.'],
          ['02','Approved business facts','Real opening times, contacts, locations, offers and FAQ revision controls.'],
          ['03','Consent & human review','Opt-out, opening-hours policy, uncertain-answer escalation and audit history.'],
          ['04','Measured AI efficiency','Validate multilingual intent model vs rules, then reserve LLM credits only for hard requests.'],
        ].map(([id,title,desc])=><div key={id} className="rounded-xl border border-[#EAEAF0] bg-[#FCFCFD] p-4">
          <p className="text-xs font-extrabold text-[#B76120]">{id}</p><h3 className="mt-3 text-xs font-extrabold">{title}</h3>
          <p className="mt-2 text-[11px] leading-5 text-[#898991]">{desc}</p>
        </div>)}
      </div>
    </section>
  </MarketingModuleFrame>;
}
