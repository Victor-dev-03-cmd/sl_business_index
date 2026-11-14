import {createClient} from '@/lib/supabase/server';
import Link from 'next/link';
import CalendarWorkspace from './CalendarWorkspace';
import {
  calendarQueryBounds, currentColomboMonth, validCalendarMonth,
  type CalendarBusiness, type CalendarCampaign,
} from '@/lib/marketing/calendar-model';

export const dynamic = 'force-dynamic';

type PageProps = {searchParams: Promise<{month?: string}>};
export default async function MarketingContentCalendar({searchParams}: PageProps) {
  const params = await searchParams;
  const nowIso = new Date().toISOString();
  const month = validCalendarMonth(params?.month, currentColomboMonth(nowIso));
  const supabase = await createClient();
  const {data:{user},error:authError} = await supabase.auth.getUser();
  if(authError || !user) {
    return <section className="rounded-xl border border-[#ECE8E7] bg-white p-8">
      <h1 className="text-xl font-bold">Content Calendar</h1>
      <p className="mt-2 text-sm text-slate-600">Sign in to view your business planning records.</p>
      <Link href="/login?redirect=/vendor/marketing-engine/calendar" className="mt-4 inline-flex rounded-lg bg-[#242326] px-4 py-2 text-xs font-semibold text-white">Sign in</Link>
    </section>;
  }

  // The enclosing premium layout already checks verified Professional/Enterprise.
  // This query additionally binds every campaign to an actually owned business
  // and continues to depend on Supabase per-request RLS. No service role.
  const {data:owned,error:businessError} = await supabase.from('businesses')
    .select('id,name').eq('owner_id',user.id).order('name').limit(1000);
  const businesses:CalendarBusiness[] = businessError ? [] : (owned || [])
    .filter(v => typeof v.id === 'string' && typeof v.name === 'string')
    .map(v => ({id:v.id,name:v.name}));
  const ids=businesses.map(b=>b.id);
  let campaigns:CalendarCampaign[]=[];
  let drafts:CalendarCampaign[]=[];
  let dataError=Boolean(businessError);
  if(ids.length && !dataError) {
    const {from,to} = calendarQueryBounds(month);
    const baseSelect = 'id,business_id,banner_text,scheduled_at,created_at,status,platforms';
    const [scheduled,draftResults]=await Promise.all([
      supabase.from('marketing_campaigns').select(baseSelect)
        .in('business_id',ids).gte('scheduled_at',from).lt('scheduled_at',to)
        .order('scheduled_at',{ascending:true}).limit(1000),
      supabase.from('marketing_campaigns').select(baseSelect)
        .in('business_id',ids).is('scheduled_at',null).eq('status','drafted')
        .order('created_at',{ascending:false}).limit(50),
    ]);
    if(scheduled.error || draftResults.error) {
      dataError=true;
    } else {
      campaigns=(scheduled.data || []) as CalendarCampaign[];
      drafts=(draftResults.data || []) as CalendarCampaign[];
    }
  }
  return <CalendarWorkspace month={month} nowIso={nowIso}
    businesses={businesses} campaigns={campaigns} drafts={drafts}
    dataError={dataError} />;
}
