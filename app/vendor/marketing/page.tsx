import Link from 'next/link';
import {createClient} from '@/lib/supabase/server';
import {getMarketingAccessForUser} from '@/lib/marketing/pro-access-server';
import IconsaxIcon from '../components/IconsaxIcon';
import MarketingAppStore from './components/MarketingAppStore';
import type {MarketingStudioLaunchStatuses} from '@/lib/marketing/studio-apps';

export const dynamic='force-dynamic';
const panel='rounded-xl border border-[#ECECF0] bg-white shadow-[0_10px_30px_rgba(17,17,20,.035)]';

function Counter({label,value,caption,icon}:{
  label:string;value:number|string;caption:string;icon:string;
}){
  return <div className={panel+' min-h-[132px] p-5'}>
    <div className="flex items-center justify-between gap-2">
      <p className="text-[11px] font-semibold text-[#7C7C84]">{label}</p>
      <span className="rounded-lg bg-[#FFF2E6] p-2 text-[#BB5E12]"><IconsaxIcon name={icon} size={17}/></span>
    </div>
    <p className="mt-2.5 text-[25px] font-extrabold tabular-nums tracking-tight text-[#202024]">{value}</p>
    <p className="mt-1 text-[11px] leading-5 text-[#85858C]">{caption}</p>
  </div>;
}
export default async function MarketingOverview(){
  const client=await createClient();
  const {data:{user},error:authError}=await client.auth.getUser();
  if(authError||!user){
    return <main className="mx-auto w-full max-w-[1480px] pb-12">
      <section className="rounded-[22px] border border-[#343136] bg-[#1C1B1F] p-8 text-white sm:p-12">
        <p className="text-[11px] font-bold uppercase tracking-[.15em] text-[#FFAA65]">GrowthOS · Marketing Studio</p>
        <h1 className="mt-3 text-3xl font-extrabold">One studio. Every marketing app.</h1>
        <p className="mt-3 max-w-xl text-sm leading-7 text-white/60">Sign in to explore your marketing apps and owned business campaigns.</p>
        <Link href="/login?redirect=/vendor/marketing" className="mt-6 inline-flex rounded-lg bg-[#FF7900] px-5 py-3 text-xs font-bold text-[#19191B]">Sign in</Link>
      </section>
    </main>;
  }

  // Independent, authenticated RLS reads run concurrently.
  const [{data:owned,error:ownedError},access]=await Promise.all([
    client.from('businesses').select('id').eq('owner_id',user.id).limit(1000),
    getMarketingAccessForUser(user.id,client),
  ]);
  const businessIds=(owned||[]).map(b=>b.id);
  // Release state is DB-owned, read-only to authenticated vendors.
  // Fail closed to Coming Soon if schema or RLS is unavailable.
  const launchStatuses:MarketingStudioLaunchStatuses={};
  try{
    const {data,error}=await client.from('marketing_studio_app_rollouts')
      .select('app_id,launch_status').limit(100);
    if(!error){
      for(const item of data||[]){
        if(typeof item.app_id==='string'&&
          (item.launch_status==='coming_soon'||item.launch_status==='preview'||
           item.launch_status==='live')){
          launchStatuses[item.app_id]=item.launch_status;
        }
      }
    }
  }catch{/* No launch is inferred when release governance is unavailable. */}

  const count=async(status?:string):Promise<number|null>=>{
    if(ownedError)return null;
    if(!businessIds.length)return 0;
    let q=client.from('marketing_campaigns')
      .select('id',{count:'exact',head:true}).in('business_id',businessIds);
    if(status)q=q.eq('status',status);
    const r=await q;
    return r.error?null:(r.count??0);
  };
  const [total,drafts,planned]=await Promise.all([count(),count('drafted'),count('scheduled')]);
  const show=(v:number|null)=>v===null?'—':new Intl.NumberFormat('en-LK').format(v);
  const paid=access.allowed;
  return <main className="mx-auto w-full max-w-[1540px] space-y-6 pb-12 text-[#202024]">
    <header className="relative isolate overflow-hidden rounded-[22px] border border-[#2B292E] bg-[#1D1D20] p-6 text-white shadow-[0_24px_55px_rgba(24,24,30,.13)] sm:p-9 lg:p-10">
      <div className="pointer-events-none absolute -right-16 -top-24 h-[340px] w-[340px] rounded-full bg-[#FF7900]/[.15] blur-[90px]" aria-hidden="true"/>
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-[120px] w-[240px] rounded-full bg-[#F7A552]/[.06] blur-[65px]" aria-hidden="true"/>
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-8">
        <div className="max-w-[740px]">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/[.12] bg-white/[.06] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[.17em] text-[#FFB177]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#FF7900]"/> SLBI GrowthOS / Marketing Studio
          </div>
          <h1 className="mt-5 text-[31px] font-extrabold tracking-[-.045em] text-white sm:text-[42px]">
            Your marketing apps. <span className="text-[#FF9A4E]">All in one place.</span>
          </h1>
          <p className="mt-3 max-w-[670px] text-[13px] leading-7 text-white/[.68]">
            Your first-party marketing app store: social, email, creative design, AI agents, business leads and official plugin connections — each with its own workspace.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <a href="#marketing-app-store" className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#FF7900] px-5 text-[12px] font-extrabold text-[#1C1A1B] transition hover:bg-[#FFA14D]">
              Explore apps <IconsaxIcon name="arrow-right-2" size={16} color="#1C1A1B"/>
            </a>
            <span className="inline-flex h-11 items-center gap-2 rounded-lg border border-white/[.14] bg-white/[.07] px-4 text-[11px] font-bold text-white/[.85]">
              <IconsaxIcon name={paid?'tick-circle':'shield-tick'} size={15} color="#FFAE76"/>
              {paid?'Verified '+access.plan+' access':access.reason==='unavailable'?'Plan verification unavailable':'Free essentials · Pro app collection'}
            </span>
          </div>
        </div>
        <div aria-hidden="true" className="hidden shrink-0 rotate-[-7deg] grid-cols-2 gap-3 lg:grid">
          {[
            {name:'flash',color:'text-[#E57721]',bg:'bg-[#FFF1E5]',border:'border-[#FAD7B5]'},
            {name:'sms',color:'text-[#3F76C5]',bg:'bg-[#E9F2FF]',border:'border-[#C5DCFA]'},
            {name:'document',color:'text-[#8251BB]',bg:'bg-[#F3EAFD]',border:'border-[#E1D1F4]'},
            {name:'global',color:'text-[#248E72]',bg:'bg-[#E5F6F0]',border:'border-[#C6E9DE]'},
          ].map(app=><div key={app.name} className={'flex h-[91px] w-[91px] items-center justify-center rounded-[23px] border shadow-[0_18px_30px_rgba(0,0,0,.25)] '+app.bg+' '+app.border+' '+app.color}>
            <IconsaxIcon name={app.name} size={43} variant="bulk"/>
          </div>)}
        </div>
      </div>
    </header>
    <section aria-label="Real marketing statistics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Counter label="Owned businesses" value={ownedError?'—':show(businessIds.length)}
        caption={ownedError?'Could not verify businesses.':'Listings belonging to this account'} icon="shop"/>
      <Counter label="Saved campaigns" value={show(total)}
        caption="Existing drafts and planning records" icon="document-download"/>
      <Counter label="Campaign drafts" value={show(drafts)}
        caption="Records in drafted status" icon="document"/>
      <Counter label="Planning dates" value={show(planned)}
        caption="Planning records — not queued publishing jobs" icon="calendar"/>
    </section>
    {ownedError&&<p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-xs text-red-800">Business records could not be loaded. Campaign counts are hidden rather than guessed.</p>}
    <MarketingAppStore proEnabled={paid} launchStatuses={launchStatuses}/>
    <p className="text-[11px] leading-6 text-[#96969D]">
      App cards describe existing workspaces and planned integration capabilities. Provider authorization, real sending and publishing, AI credit usage and background scheduling require separate enablement and review. Growth Credits remain metered independently.
    </p>
  </main>;
}
