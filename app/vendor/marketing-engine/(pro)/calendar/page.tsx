import Link from 'next/link';
import IconsaxIcon from '@/app/vendor/components/IconsaxIcon';
export default function MarketingCalendar(){
 return <main className="mx-auto max-w-[1150px] space-y-5 rounded-xl border border-[#E8E8ED] bg-white p-6 text-[#242429] sm:p-8">
  <Link href="/vendor/marketing-engine" className="inline-flex items-center gap-1 text-xs font-bold text-[#B6621F]"><IconsaxIcon name="arrow-left-2" size={14}/> Marketing Engine</Link>
  <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#B6611E]">P2-06 · Scheduler foundation</p>
  <h1 className="text-[27px] font-extrabold">Content Calendar</h1>
  <p className="max-w-2xl text-xs leading-6 text-[#767681]">Campaign dates currently represent planning records only. They do not create queued publishing jobs or send mail. A durable lease/retry worker, provider permissions and proof of publication are required before real scheduling can be enabled.</p>
  <div className="grid gap-3 sm:grid-cols-3">
   {[
    ['1','Plan','Create a draft and choose a proposed date'],
    ['2','Approve','Check business facts, content and consent'],
    ['3','Publish later','Durable queue and provider receipts not yet enabled'],
   ].map(([num,title,desc])=><div key={num} className="rounded-xl border border-[#ECECF0] bg-[#FCFCFD] p-5"><p className="text-xs font-extrabold text-[#B45F1B]">{num}</p><h2 className="mt-3 text-sm font-bold">{title}</h2><p className="mt-2 text-xs leading-6 text-[#888891]">{desc}</p></div>)}
  </div>
  <Link href="/vendor/marketing-engine/campaigns" className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#222225] px-4 text-xs font-bold text-white">Open campaign planning <IconsaxIcon name="arrow-right-2" size={14} color="white"/></Link>
 </main>
}
