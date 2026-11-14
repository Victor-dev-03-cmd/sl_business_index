import Link from 'next/link';
import IconsaxIcon from '@/app/vendor/components/IconsaxIcon';
export default function MarketingLeadsBridge(){
 return <main className="mx-auto max-w-[1150px] space-y-5 rounded-xl border border-[#E8E8ED] bg-white p-6 text-[#242429] sm:p-8">
  <Link href="/vendor/marketing-engine" className="inline-flex items-center gap-1 text-xs font-bold text-[#B6621F]"><IconsaxIcon name="arrow-left-2" size={14}/> Marketing Engine</Link>
  <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#B6611E]">Pro · Customer acquisition</p>
  <h1 className="text-[27px] font-extrabold">Leads & customer conversations</h1>
  <p className="max-w-2xl text-xs leading-6 text-[#767681]">Keep using the existing owner-scoped Leads CRM for contact and follow-up records. Automatic WhatsApp, email or call transcripts are not connected here until provider authorization, privacy rules and customer consent pass testing.</p>
  <div className="grid gap-3 sm:grid-cols-2">
   <Link href="/vendor/leads" className="rounded-xl border border-[#ECECF0] bg-[#FFF9F2] p-5"><h2 className="text-sm font-bold">Existing Leads CRM</h2><p className="mt-2 text-xs text-[#81818A]">View real enquiries and follow-ups</p><span className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-[#B55B14]">Open leads <IconsaxIcon name="arrow-right-2" size={13}/></span></Link>
   <Link href="/vendor/marketing-engine/agent" className="rounded-xl border border-[#ECECF0] p-5"><h2 className="text-sm font-bold">Calls & Messages Agent</h2><p className="mt-2 text-xs text-[#81818A]">Local rule-based triage, no real incoming account connection</p><span className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-[#B55B14]">Review agent <IconsaxIcon name="arrow-right-2" size={13}/></span></Link>
  </div>
 </main>
}
