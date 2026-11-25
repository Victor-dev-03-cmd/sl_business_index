'use client';

import {useMemo,useState} from 'react';
import Link from 'next/link';
import IconsaxIcon from '@/app/vendor/components/IconsaxIcon';

export type WhatsAppOwnedBusiness={id:string;name:string;status:string|null};

const safeguards=[
  {title:'Owner & business scope',desc:'Read-only, server-verified SLBI business ownership.'},
  {title:'Official Meta onboarding',desc:'Eligible WABA, business number and current Meta product approval required.'},
  {title:'Signed webhook & one-time link',desc:'Raw request signature, expiring server-side code and durable replay protection required.'},
  {title:'Granular vendor approvals',desc:'Post, email and settings changes need separate exact-content approvals.'},
] as const;

export default function WhatsAppConnectionLab({businesses,ownershipReady}:{
  businesses:readonly WhatsAppOwnedBusiness[];
  ownershipReady:boolean;
}){
  const [businessId,setBusinessId]=useState(businesses[0]?.id??'');
  const [demo,setDemo]=useState(false);
  const [request,setRequest]=useState('Christmas offerக்காக ஒரு poster, social captions, email campaign தயார் பண்ணு.');
  const chosen=useMemo(()=>businesses.find(b=>b.id===businessId),[businesses,businessId]);
  const canPreview=ownershipReady&&Boolean(chosen);
  const steps=[
    {step:'01',title:'Choose your business',detail:chosen?chosen.name:'Select an owned business',ready:canPreview},
    {step:'02',title:'Meta eligibility & business number',detail:'Not configured · official account approval needed',ready:false},
    {step:'03',title:'Secure WhatsApp verification',detail:'Not active · signed webhook and durable link store required',ready:false},
    {step:'04',title:'NeuroGrowth command approvals',detail:'Not active · no WhatsApp message or marketing campaign sent',ready:false},
  ];
  return <div className="space-y-6">
    <section aria-label="WhatsApp connector availability" className="overflow-hidden rounded-[22px] border border-[#2B2A30] bg-[#1E1D21] p-5 text-white shadow-[0_18px_45px_rgba(15,15,18,.12)] sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-[#FF7900]/15 text-[#FFA25A]"><IconsaxIcon name="message-text" size={26}/></span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.17em] text-[#FFAC71]">NeuroGrowth · WA-03 Connection Lab</p>
            <h1 className="mt-1 text-[24px] font-extrabold tracking-tight sm:text-[31px]">WhatsApp Business</h1>
            <p className="mt-2 max-w-[680px] text-[12px] leading-6 text-white/65">
              Review how your own business will be linked securely to the Growth AI operator. This is a live dashboard preview, not a connected WhatsApp account.
            </p>
          </div>
        </div>
        <span className="rounded-full border border-[#F2B77C]/30 bg-[#FF7900]/10 px-3 py-1.5 text-[10px] font-bold text-[#FFD1A6]">Not connected · Preview only</span>
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        <Link href="/vendor/marketing" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-4 text-[11px] font-bold text-white hover:bg-white/15"><IconsaxIcon name="arrow-left-2" size={14}/> Marketing Studio</Link>
        <Link href="/vendor/marketing-engine/connections" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#FFAF69]/40 bg-[#FF7900] px-4 text-[11px] font-extrabold text-[#1C1A1B] hover:bg-[#FF9C43]">Plugin & App Connectors <IconsaxIcon name="arrow-right-2" size={14}/></Link>
      </div>
    </section>

    <section className="grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
      <div className="rounded-[20px] border border-[#E7E7EB] bg-white p-5 shadow-[0_9px_30px_rgba(17,17,25,.04)] sm:p-7">
        <p className="text-[10px] font-extrabold uppercase tracking-[.12em] text-[#B9631F]">Secure connection overview</p>
        <h2 className="mt-2 text-[19px] font-extrabold text-[#242428]">Choose your owned business</h2>
        <p className="mt-2 text-xs leading-6 text-[#74747C]">Businesses are retrieved from your authenticated vendor account and filtered by owner ID on the server. Selecting one does not create a WhatsApp link.</p>
        <label htmlFor="wa03-business" className="mb-2 mt-5 block text-[11px] font-bold text-[#44444B]">Business to connect in the future</label>
        <select id="wa03-business" value={businessId} disabled={!canPreview&&!businesses.length}
          onChange={e=>{setBusinessId(e.target.value);setDemo(false);}}
          className="min-h-12 w-full rounded-xl border border-[#DEDEE3] bg-white px-3 text-[12px] font-semibold text-[#242428] focus:border-[#FF7900] focus:outline-none focus:ring-2 focus:ring-[#FF7900]/20">
          {businesses.length===0?<option value="">No owned businesses available</option>:
            businesses.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#E9E9ED] bg-[#FAFAFB] px-4 py-3 text-[11px]">
          <IconsaxIcon name="shield-tick" size={19} color={canPreview?'#B75C14':'#777780'}/>
          <p className="text-[#62626B]">{canPreview?'Owned business found · preview permitted. WhatsApp identity not verified.':
            ownershipReady?'No owned business is available for this preview.':'Business ownership could not be verified. The preview is blocked.'}</p>
        </div>
        <button type="button" disabled={!canPreview} onClick={()=>setDemo(true)}
          className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#FF7900] px-4 text-[12px] font-extrabold text-[#1B1B20] hover:bg-[#FF9B39] disabled:cursor-not-allowed disabled:bg-[#E7E7EA] disabled:text-[#94949D]">
          <IconsaxIcon name="eye" size={18}/> Preview secure setup flow
        </button>
        <p className="mt-3 text-center text-[10px] leading-5 text-[#898991]">No verification code is issued; no account, database record or WhatsApp message is created.</p>
      </div>

      <div className="rounded-[20px] border border-[#E7E7EB] bg-white p-5 shadow-[0_9px_30px_rgba(17,17,25,.04)] sm:p-7">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[18px] font-extrabold text-[#242428]">Connection readiness</h2>
          <span className="rounded-full bg-[#FFF3E9] px-2.5 py-1 text-[10px] font-bold text-[#A35C23]">Setup required</span>
        </div>
        <ol className="mt-5 space-y-4">
          {steps.map(s=><li key={s.step} className="flex items-start gap-3">
            <span className={'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[11px] font-extrabold '+(s.ready?'bg-[#FFF0E4] text-[#AC571B]':'bg-[#F2F2F4] text-[#888892]')}>{s.step}</span>
            <div className="min-w-0"><p className="text-[12px] font-bold text-[#303036]">{s.title}</p><p className="mt-1 text-[11px] leading-5 text-[#898992]">{s.detail}</p></div>
          </li>)}
        </ol>
      </div>
    </section>

    <section className="rounded-[20px] border border-[#E6E6EA] bg-white p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-[10px] font-extrabold uppercase tracking-[.12em] text-[#B9631F]">Visual demonstration</p>
          <h2 className="mt-1 text-[18px] font-extrabold">One WhatsApp message → reviewed marketing plan</h2></div>
        <span className="rounded-full border border-[#E5E5E9] bg-[#F7F7F8] px-3 py-1 text-[10px] font-bold text-[#777780]">Local UI demo · No AI run</span>
      </div>
      <p className="mt-2 text-xs leading-6 text-[#7A7A83]">Write a sample request to inspect the future flow. This text stays in your browser, is not submitted, and does not generate a real poster or campaign.</p>
      <label htmlFor="wa03-demo-request" className="mt-4 block text-[11px] font-bold text-[#494950]">Sample vendor request</label>
      <textarea id="wa03-demo-request" value={request} maxLength={280} rows={3} onChange={e=>{setRequest(e.target.value);setDemo(false);}}
        className="mt-2 w-full resize-y rounded-xl border border-[#DEDEE3] bg-[#FAFAFB] p-3 text-[12px] leading-6 text-[#27272C] focus:border-[#FF7900] focus:outline-none focus:ring-2 focus:ring-[#FF7900]/20"/>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" disabled={!canPreview||!request.trim()} onClick={()=>setDemo(true)}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#242428] px-5 text-[11px] font-extrabold text-white hover:bg-[#414046] disabled:cursor-not-allowed disabled:opacity-40">
          <IconsaxIcon name="play" size={16}/> Show sample workflow
        </button>
        {demo&&<button type="button" onClick={()=>setDemo(false)}
          className="min-h-11 rounded-xl border border-[#E5E5E9] px-4 text-[11px] font-bold text-[#676771] hover:bg-[#F8F8FA]">Reset preview</button>}
      </div>
      {demo&&canPreview&&<div role="status" aria-live="polite" className="mt-5 rounded-2xl border border-[#FFDDC0] bg-[#FFFAF5] p-4 sm:p-5">
        <p className="text-[10px] font-extrabold uppercase tracking-[.11em] text-[#AA5B22]">Demonstration only · No actual message received</p>
        <p className="mt-3 rounded-xl border border-[#E9E0D8] bg-white p-3 text-[12px] text-[#33333A]">{request}</p>
        <div className="mt-4 grid gap-2 md:grid-cols-3">
          {[
            ['Draft promotion','Future AI will prepare poster, captions and email preview.'],
            ['Ask for approval','Future WhatsApp preview will show exact content and individual approvals.'],
            ['Publish & summarize','Disabled until verified Meta account, provider consent and transactional audit.'],
          ].map((s,i)=><div key={s[0]} className="rounded-xl border border-[#EAE2DC] bg-white p-4">
            <p className="text-[10px] font-bold text-[#B76527]">STEP {i+1}</p>
            <p className="mt-2 text-[12px] font-extrabold text-[#29292F]">{s[0]}</p>
            <p className="mt-1 text-[11px] leading-5 text-[#81818A]">{s[1]}</p>
          </div>)}
        </div>
        <p className="mt-3 text-[11px] font-semibold text-[#9A5B2C]">Result: UI preview completed. WhatsApp connection remains NOT CONNECTED.</p>
      </div>}
    </section>

    <section className="rounded-[20px] border border-[#EEDBC9] bg-[#FFF9F3] p-5 sm:p-7">
      <h2 className="text-[15px] font-extrabold text-[#A65B21]">Before a real WhatsApp connection can be enabled</h2>
      <p className="mt-2 text-[11px] leading-6 text-[#826F60]">SLBI needs Meta eligibility confirmation for this business-specific AI service, an approved business account and phone number, permitted Embedded Signup, signed webhook, server-side owner linking, message replay storage and an audited consent/approval process. The WhatsApp Business Solution Terms restrict certain AI-provider uses, so live activation is blocked pending eligibility review.</p>
      <div className="mt-3 flex flex-wrap gap-3 text-[11px] font-bold text-[#A75C22]">
        <a target="_blank" rel="noopener noreferrer" className="underline underline-offset-4" href="https://www.whatsapp.com/legal/business-solution-terms/">Meta Business Solution Terms</a>
        <a target="_blank" rel="noopener noreferrer" className="underline underline-offset-4" href="https://www.postman.com/meta/whatsapp-business-platform/documentation/du6gzjv/embedded-signup">Official Embedded Signup documentation</a>
      </div>
    </section>
  </div>;
}
