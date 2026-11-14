'use client';

import {useMemo,useState} from 'react';
import Link from 'next/link';
import IconsaxIcon from '@/app/vendor/components/IconsaxIcon';
import {
  calendarDays,calendarMonthTitle,colomboDateKey,formatColomboTime,
  shiftCalendarMonth,
  type CalendarBusiness,type CalendarCampaign,
} from '@/lib/marketing/calendar-model';

type Props={
  month:string;nowIso:string;
  businesses:CalendarBusiness[];
  campaigns:CalendarCampaign[];
  drafts:CalendarCampaign[];
  dataError:boolean;
};
const weekdays=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

function statusLabel(status:string|null):string {
  if(status==='posted')return 'Marked posted (unverified)';
  if(status==='scheduled')return 'Planning date';
  return 'Draft with date';
}
function statusColor(status:string|null):string {
  return status==='posted'?'border-[#F3D7B6] bg-[#FFF6E9] text-[#B36A26]'
    :status==='scheduled'?'border-[#E8CEB7] bg-[#FFF0E2] text-[#AE5C19]'
    :'border-[#DDE3E9] bg-[#F5F7FA] text-[#687787]';
}
function compact(value:string,max=115):string{
  const trimmed=value.trim();
  return trimmed.length<=max?trimmed:trimmed.slice(0,max-1)+'…';
}
export default function CalendarWorkspace({month,nowIso,businesses,campaigns,drafts,dataError}:Props){
  const nowKey=colomboDateKey(nowIso)??month+'-01';
  const [selectedDate,setSelectedDate]=useState(()=>nowKey.startsWith(month)?nowKey:month+'-01');
  const [businessId,setBusinessId]=useState('all');
  const [search,setSearch]=useState('');
  const days=useMemo(()=>calendarDays(month),[month]);
  const names=useMemo(()=>new Map(businesses.map(b=>[b.id,b.name])),[businesses]);
  const needle=search.trim().toLowerCase();
  const visible=useMemo(()=>campaigns.filter(item=>
    (businessId==='all'||item.business_id===businessId) &&
    (!needle||[item.banner_text,item.status??'',names.get(item.business_id)??'',(item.platforms??[]).join(' ')]
      .join(' ').toLowerCase().includes(needle))
  ),[campaigns,businessId,needle,names]);
  const visibleDrafts=useMemo(()=>drafts.filter(item=>
    (businessId==='all'||item.business_id===businessId) &&
    (!needle||[item.banner_text,names.get(item.business_id)??'']
      .join(' ').toLowerCase().includes(needle))
  ),[drafts,businessId,needle,names]);
  const byDate=useMemo(()=>{
    const result=new Map<string,CalendarCampaign[]>();
    for(const item of visible){
      const key=item.scheduled_at?colomboDateKey(item.scheduled_at):null;
      if(!key)continue;
      const collection=result.get(key)??[];
      collection.push(item);
      result.set(key,collection);
    }
    return result;
  },[visible]);
  const selected=byDate.get(selectedDate)??[];
  const inMonth=visible.filter(item=>
    item.scheduled_at && colomboDateKey(item.scheduled_at)?.startsWith(month));
  const planned=inMonth.filter(item=>item.status==='scheduled').length;
  const historical=inMonth.filter(item=>item.status==='posted').length;
  const upcoming=visible.filter(item=>
    item.scheduled_at&&item.status==='scheduled'&&
    new Date(item.scheduled_at).getTime()>=new Date(nowIso).getTime())
    .slice().sort((a,b)=>String(a.scheduled_at).localeCompare(String(b.scheduled_at))).slice(0,5);
  const selectedLabel=new Intl.DateTimeFormat('en-GB',{
    timeZone:'UTC',day:'numeric',month:'long',year:'numeric',
  }).format(new Date(selectedDate+'T00:00:00.000Z'));

  return <main className="mx-auto w-full max-w-[1540px] space-y-5 pb-12 text-[#25242A]">
    <header className="relative overflow-hidden rounded-[22px] bg-[#1E1D20] p-6 text-white shadow-[0_24px_60px_rgba(30,28,32,.13)] sm:p-8">
      <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-36 h-[360px] w-[390px] rounded-full bg-[#FF7900]/[.17] blur-[85px]"/>
      <div className="relative flex flex-wrap items-start justify-between gap-5">
        <div>
          <Link href="/vendor/marketing" prefetch={false}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#FFAD6C] hover:underline">
            <IconsaxIcon name="arrow-left-2" size={15} color="#FFAD6C"/> Marketing Studio
          </Link>
          <div className="mt-5 inline-flex rounded-full border border-[#FFBE8B]/25 bg-[#FF7900]/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.13em] text-[#FFB57B]">
            App 10 / 12 · P2-06 · Planning workspace
          </div>
          <h1 className="mt-3 text-[29px] font-extrabold tracking-[-.04em] sm:text-[38px]">Content Calendar<span className="text-[#FF8A31]">.</span></h1>
          <p className="mt-2 max-w-[670px] text-[12px] leading-6 text-white/65">
            Your actual business campaign planning dates in one place. Filter, review and prepare content.
            No automatic publishing, email sending or scheduled provider jobs.
          </p>
        </div>
        <Link href="/vendor/marketing/campaigns" prefetch={false}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#FF850F] px-4 text-[12px] font-extrabold text-[#1F1C1B] transition hover:bg-[#FFAE62]">
          <IconsaxIcon name="add" size={18} color="#1F1C1B"/> New campaign plan
        </Link>
      </div>
    </header>

    <section aria-label="Calendar statistics" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {[
        {label:'Plans this month',value:inMonth.length,sub:'Actual saved dated records',icon:'calendar'},
        {label:'Scheduled for review',value:planned,sub:'Planning only · no auto-post',icon:'clock'},
        {label:'Unscheduled drafts',value:visibleDrafts.length,sub:'Up to 50 recent draft records',icon:'document'},
        {label:'Unverified posted labels',value:historical,sub:'Not confirmed by any provider',icon:'shield-tick'},
      ].map(item=><article key={item.label}
        className="rounded-2xl border border-[#ECEAE8] bg-white p-5 shadow-[0_3px_15px_rgba(40,32,25,.035)]">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold text-[#77767E]">{item.label}</p>
          <span className="rounded-xl bg-[#FFF1E4] p-2 text-[#B9601D]"><IconsaxIcon name={item.icon} size={17}/></span>
        </div>
        <p className="mt-3 text-[29px] font-extrabold tabular-nums tracking-tight">{dataError?'—':item.value}</p>
        <p className="mt-1 text-[10px] text-[#9B989D]">{item.sub}</p>
      </article>)}
    </section>

    {dataError&&<section role="alert"
      className="rounded-xl border border-[#EBCBA8] bg-[#FFF7EC] p-4 text-[12px] text-[#945616]">
      Marketing records could not be loaded securely. Reload the page; no missing records have been inferred.
    </section>}
    {!dataError&&businesses.length===0&&<section className="rounded-xl border border-[#DDE7DF] bg-[#F7FBF7] p-5">
      <p className="text-[13px] font-bold">No owned businesses found</p>
      <p className="mt-2 text-[12px] text-[#788077]">Create or claim a business listing before planning a campaign.</p>
      <Link href="/vendor/my-business" className="mt-3 inline-flex text-xs font-bold text-[#AB581D] underline">Open My Business</Link>
    </section>}

    <section className="rounded-[18px] border border-[#ECE9E7] bg-white p-4 shadow-[0_8px_30px_rgba(36,32,32,.035)] sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-[23px] font-extrabold tracking-[-.04em]">{calendarMonthTitle(month)}</h2>
          <p className="mt-1 text-[11px] text-[#8B8990]">Monday–Sunday · Sri Lanka time (Asia/Colombo)</p>
        </div>
        <div className="flex items-center gap-2">
          <Link prefetch={false} href={'/vendor/marketing-engine/calendar?month='+shiftCalendarMonth(month,-1)}
            aria-label="Previous month" className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#EAE7E5] hover:bg-[#FFF5EB]">
            <IconsaxIcon name="arrow-left-2" size={18}/>
          </Link>
          <Link prefetch={false} href="/vendor/marketing-engine/calendar"
            className="inline-flex h-10 items-center rounded-xl border border-[#EAE7E5] px-3 text-xs font-bold hover:bg-[#FFF5EB]">Today</Link>
          <Link prefetch={false} href={'/vendor/marketing-engine/calendar?month='+shiftCalendarMonth(month,1)}
            aria-label="Next month" className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#EAE7E5] hover:bg-[#FFF5EB]">
            <IconsaxIcon name="arrow-right-2" size={18}/>
          </Link>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
        <label className="relative block">
          <span className="sr-only">Search calendar campaigns</span>
          <input type="search" value={search} onChange={e=>setSearch(e.target.value)}
            maxLength={120} placeholder="Search by campaign, business or channel"
            className="h-11 w-full rounded-xl border border-[#E8E6E6] bg-[#FBFBFC] px-4 text-[12px] outline-none focus:border-[#ED9A4C] focus:ring-2 focus:ring-[#FF7900]/10"/>
        </label>
        <label className="block">
          <span className="sr-only">Filter by owned business</span>
          <select value={businessId} onChange={e=>setBusinessId(e.target.value)}
            className="h-11 w-full rounded-xl border border-[#E8E6E6] bg-[#FBFBFC] px-3 text-[12px] font-semibold outline-none focus:border-[#ED9A4C]">
            <option value="all">All my businesses</option>
            {businesses.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </label>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 overflow-hidden rounded-xl border border-[#ECEAEC]">
          <div className="grid grid-cols-7 border-b border-[#ECEAEC] bg-[#FAFAFB]">
            {weekdays.map(day=><div key={day} className="py-3 text-center text-[10px] font-extrabold uppercase tracking-wide text-[#85838A]">{day}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {days.map((day,i)=>{
              const records=byDate.get(day.dateKey)??[];
              const chosen=selectedDate===day.dateKey;
              const today=nowKey===day.dateKey;
              return <button key={day.dateKey} type="button"
                aria-label={day.dateKey+' — '+records.length+' campaigns'}
                aria-pressed={chosen}
                onClick={()=>setSelectedDate(day.dateKey)}
                className={'relative min-h-[76px] min-w-0 border-b border-r border-[#F0EEF0] p-1 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#FF8D24] sm:min-h-[112px] sm:p-2 '+
                  (chosen?'bg-[#FFF0E2]':day.inMonth?'bg-white hover:bg-[#FFFAF4]':'bg-[#FAFAFB] hover:bg-[#F6F5F6]')}>
                <span className={'inline-flex h-6 min-w-6 items-center justify-center rounded-full text-[10px] font-bold sm:h-7 sm:min-w-7 sm:text-[11px] '+
                  (today?'bg-[#242326] text-white':day.inMonth?'text-[#3C3A3E]':'text-[#BAB7BC]')}>{day.day}</span>
                {records.length>0&&<div className="mt-1 flex items-center gap-1.5 sm:hidden">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#FF7900]"/>
                  <span className="text-[10px] font-extrabold text-[#9D581B]">{records.length}</span>
                </div>}
                <div className="mt-1 hidden space-y-1 sm:block">
                  {records.slice(0,2).map(record=><p key={record.id}
                    className={'truncate rounded border px-1.5 py-1 text-[9px] font-semibold '+statusColor(record.status)}
                    title={record.banner_text}>{compact(record.banner_text,40)}</p>)}
                  {records.length>2&&<span className="text-[9px] font-semibold text-[#AB651F]">+{records.length-2} more</span>}
                </div>
                {i%7===6&&<span className="sr-only">End of calendar week</span>}
              </button>;
            })}
          </div>
        </div>
        <aside className="min-w-0 space-y-4">
          <section className="rounded-2xl border border-[#F0E4D8] bg-[#FFFBF7] p-4">
            <p className="text-[10px] font-extrabold uppercase tracking-[.12em] text-[#B36929]">Selected date</p>
            <h3 className="mt-1 text-[17px] font-extrabold">{selectedLabel}</h3>
            <p className="mt-1 text-[11px] text-[#88848B]">{selected.length} saved campaign{selected.length===1?'':'s'}</p>
            <div className="mt-4 max-h-[340px] space-y-2 overflow-y-auto">
              {selected.map(item=><article key={item.id} className="rounded-xl border border-[#EDE5DC] bg-white p-3">
                <span className={'inline-flex max-w-full rounded-md border px-2 py-1 text-[9px] font-bold '+statusColor(item.status)}>
                  {statusLabel(item.status)}
                </span>
                <p className="mt-2 text-[12px] font-bold text-[#28262A]">{compact(item.banner_text)}</p>
                <p className="mt-2 text-[10px] text-[#89848A]">{names.get(item.business_id)||'Owned business'}
                  {item.scheduled_at?' · '+formatColomboTime(item.scheduled_at):''}</p>
              </article>)}
              {!selected.length&&<p className="rounded-xl border border-dashed border-[#E8D6C6] bg-white p-4 text-[11px] leading-5 text-[#8D8380]">
                No planning dates for this day. Create a campaign brief to record one.
              </p>}
            </div>
            <Link prefetch={false} href="/vendor/marketing/campaigns"
              className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#242326] text-[11px] font-bold text-white hover:bg-[#4A3530]">
              Open campaign planner <IconsaxIcon name="arrow-right-2" size={15} color="white"/>
            </Link>
          </section>
          <section className="rounded-2xl border border-[#ECEAEC] bg-white p-4">
            <h3 className="text-[12px] font-extrabold">Upcoming plans</h3>
            <p className="mt-1 text-[10px] leading-5 text-[#9A969C]">Only planning dates in the loaded calendar window</p>
            <div className="mt-3 space-y-2">
              {upcoming.map(item=><button type="button" key={item.id}
                onClick={()=>{const key=item.scheduled_at?colomboDateKey(item.scheduled_at):null;if(key)setSelectedDate(key);}}
                className="w-full rounded-lg border border-[#EDEBEB] p-3 text-left hover:border-[#F2BE8F] hover:bg-[#FFFAF5]">
                <p className="text-[10px] font-bold text-[#B36223]">{item.scheduled_at?colomboDateKey(item.scheduled_at):'No date'}</p>
                <p className="mt-1 truncate text-[11px] font-bold">{compact(item.banner_text,75)}</p>
              </button>)}
              {!upcoming.length&&<p className="text-[11px] text-[#929096]">No upcoming planning records in this view.</p>}
            </div>
          </section>
        </aside>
      </div>
      {(campaigns.length>=1000||drafts.length>=50)&&<p className="mt-4 text-[11px] text-[#A7632C]">
        Showing a capped number of records. Narrow your business or monthly view if your account has many campaigns.
      </p>}
    </section>

    <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="rounded-2xl border border-[#ECE9EA] bg-white p-5">
        <h2 className="text-[15px] font-extrabold">Drafts without a planning date</h2>
        <p className="mt-1 text-[11px] leading-5 text-[#99959C]">Create a dated plan using the existing campaign editor. No browser-side status updates.</p>
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {visibleDrafts.slice(0,8).map(item=><article key={item.id}
            className="rounded-xl border border-[#EDEBEC] bg-[#FDFDFD] p-4">
            <p className="text-[10px] font-semibold text-[#B36B2F]">{names.get(item.business_id)||'Owned business'}</p>
            <p className="mt-2 line-clamp-2 text-[12px] font-semibold leading-6">{item.banner_text}</p>
          </article>)}
          {!visibleDrafts.length&&<p className="col-span-full rounded-xl border border-dashed border-[#E8E7EA] p-5 text-[11px] text-[#98969B]">No unscheduled drafts match this filter.</p>}
        </div>
      </div>
      <div className="rounded-2xl border border-[#E7E3E2] bg-[#F9F8F7] p-5">
        <span className="inline-flex rounded-lg bg-[#FFF0E2] p-2 text-[#AE642C]"><IconsaxIcon name="shield-tick" size={20}/></span>
        <h3 className="mt-3 text-[14px] font-extrabold">No automatic publishing</h3>
        <p className="mt-2 text-[11px] leading-6 text-[#868188]">
          A scheduled campaign is a saved planning date — not a social post, email job or verified publication.
          The historical “posted” status is an unverified database marker. Actual publishing will require
          consent, approved provider credentials, an audited queue and provider receipts.
        </p>
      </div>
    </section>
  </main>;
}
