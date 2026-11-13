import Link from 'next/link';
import {createClient} from '@/lib/supabase/server';
import {getMarketingAccessForUser} from '@/lib/marketing/pro-access-server';
import IconsaxIcon from '../components/IconsaxIcon';

export const dynamic='force-dynamic';
const panel='rounded-xl border border-[#ECECF0] bg-white shadow-[0_10px_30px_rgba(17,17,20,.035)]';
const tools=[
  {title:'Marketing Engine',href:'/vendor/marketing/engine',icon:'flash',desc:'One workspace for social, email, calls & messages, connected channels and automations.',tag:'Main workspace'},
  {title:'Business Brand Profile',href:'/vendor/marketing/brand',icon:'shop',desc:'Reusable brand colors, audiences, languages, factual offers and guidelines.',tag:'P2-01 · Pro'},
  {title:'AI Caption Lab',href:'/vendor/marketing/captions',icon:'message-text',desc:'Multilingual drafts with editable text and explicit human review.',tag:'P2-02 · Gated'},
  {title:'Editable Poster Studio',href:'/vendor/marketing/design',icon:'document',desc:'Original layouts, editable text layers and high-resolution PNG export.',tag:'P2-04 · Pro'},
  {title:'Campaign Workspace',href:'/vendor/marketing/campaigns',icon:'calendar',desc:'Existing owner draft composer, artwork export and planning calendar.',tag:'P2-05 · Pro'},
  {title:'Business Leads',href:'/vendor/leads',icon:'people',desc:'Track customer enquiries and follow-ups. AI agent connection is a separate workflow.',tag:'Existing CRM'},
] as const;

function Counter({label,value,caption,icon}:{
  label:string;value:number|string;caption:string;icon:string;
}){
  return <div className={panel+' min-h-[145px] p-5'}>
    <div className="flex items-center justify-between">
      <p className="text-[11px] font-semibold text-[#7C7C84]">{label}</p>
      <span className="rounded-lg bg-[#FFF2E6] p-2 text-[#BB5E12]"><IconsaxIcon name={icon} size={17}/></span>
    </div>
    <p className="mt-3 text-[27px] font-extrabold tabular-nums tracking-tight text-[#202024]">{value}</p>
    <p className="mt-1 text-[11px] leading-5 text-[#85858C]">{caption}</p>
  </div>;
}
export default async function MarketingOverview(){
  const client=await createClient();
  const {data:{user},error:authError}=await client.auth.getUser();
  if(authError||!user){
    return <main className="mx-auto max-w-[1200px]">
      <section className={panel+' p-8'}>
        <p className="text-[11px] font-bold uppercase tracking-[.15em] text-[#BB5E12]">GrowthOS · Marketing Studio</p>
        <h1 className="mt-2 text-3xl font-extrabold">Your marketing overview</h1>
        <p className="mt-3 text-sm text-[#777781]">Sign in to view your businesses and campaign activity.</p>
        <Link href="/login?redirect=/vendor/marketing" className="mt-5 inline-flex rounded-lg bg-[#202024] px-5 py-3 text-xs font-bold text-white">Sign in</Link>
      </section>
    </main>;
  }

  const {data:owned,error:ownedError}=await client.from('businesses')
    .select('id').eq('owner_id',user.id).limit(1000);
  const businessIds=(owned||[]).map(b=>b.id);
  const access=await getMarketingAccessForUser(user.id,client);
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
  return <main className="mx-auto w-full max-w-[1480px] space-y-5 pb-12 text-[#202024]">
    <header className={panel+' relative overflow-hidden p-6 sm:p-8'}>
      <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-[#FF7900]/[.065] blur-2xl" aria-hidden="true"/>
      <div className="relative flex flex-wrap items-end justify-between gap-5">
        <div>
          <div className="inline-flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.17em] text-[#BD5F15]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#FF7900]"/> SLBI GrowthOS
          </div>
          <h1 className="mt-3 text-[29px] font-extrabold tracking-tight sm:text-[36px]">Marketing Studio</h1>
          <p className="mt-2 max-w-[750px] text-[13px] leading-6 text-[#777780]">
            Your marketing overview: genuine campaign counts, a clear plan status and one place to reach every specialist tool.
            Editing, publishing and customer automation live in the separate Marketing Engine.
          </p>
        </div>
        <Link href="/vendor/marketing/engine" className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#202024] px-5 text-[12px] font-extrabold text-white transition hover:bg-[#38383E]">
          Open Marketing Engine <IconsaxIcon name="arrow-right-2" color="white" size={17}/>
        </Link>
      </div>
    </header>
    <section aria-label="Real marketing statistics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Counter label="Owned businesses" value={ownedError?'—':show(businessIds.length)}
        caption={ownedError?'Could not verify businesses.':'Listings belonging to this account'} icon="shop"/>
      <Counter label="Saved campaigns" value={show(total)}
        caption="Existing campaign records, not verified publications" icon="document-download"/>
      <Counter label="Campaign drafts" value={show(drafts)}
        caption="Records in drafted status" icon="document"/>
      <Counter label="Planning dates" value={show(planned)}
        caption="Planning records — not queued publishing jobs" icon="calendar"/>
    </section>
    {ownedError&&<p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-xs text-red-800">Business records could not be loaded. Campaign counts are hidden rather than guessed.</p>}
    <section className={panel+' flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6'}>
      <div>
        <p className="text-xs font-bold">Marketing Engine access</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span className={'inline-flex rounded-full px-2.5 py-1 text-[10px] font-extrabold '+(paid?'bg-[#E9F6ED] text-[#2C7950]':'bg-[#FFF2E6] text-[#AB5715]')}>
            {paid?'Pro enabled':access.reason==='unavailable'?'Verification unavailable':'Pro required'}
          </span>
          <span className="text-[11px] text-[#74747C]">
            {paid?'Verified '+access.plan+' entitlement':'Advanced connectors, agents and automations require verified Pro or Enterprise'}
          </span>
        </div>
      </div>
      {!paid&&<Link href="/vendor/billing" className="rounded-lg border border-[#E7C9AC] bg-[#FFF7EF] px-4 py-2.5 text-xs font-bold text-[#A55513]">View Pro plans</Link>}
    </section>
    <section aria-label="Marketing workspace shortcuts" className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div><h2 className="text-[19px] font-extrabold">Your marketing tools</h2>
          <p className="mt-1 text-xs text-[#85858C]">Dedicated workflows, not embedded editors inside your overview.</p></div>
        <Link href="/vendor/marketing/engine/connections" className="text-xs font-bold text-[#B75D15] hover:underline">Explore official connectors</Link>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {tools.map(tool=><Link key={tool.href} href={tool.href}
          className={panel+' group flex min-h-[182px] flex-col p-5 transition hover:border-[#EFB782] hover:shadow-[0_16px_36px_rgba(255,121,0,.06)]'}>
          <div className="flex items-center justify-between">
            <span className="rounded-lg bg-[#FFF2E7] p-2.5 text-[#BB641C]"><IconsaxIcon name={tool.icon} size={20}/></span>
            <span className="text-[10px] font-semibold text-[#919198]">{tool.tag}</span>
          </div>
          <h3 className="mt-4 text-[14px] font-bold">{tool.title}</h3>
          <p className="mt-1 text-[11px] leading-5 text-[#797983]">{tool.desc}</p>
          <span className="mt-auto inline-flex items-center gap-1 pt-3 text-[11px] font-bold text-[#B55C17]">Open workspace <IconsaxIcon name="arrow-right-2" size={13}/></span>
        </Link>)}
      </div>
    </section>
    <p className="text-[11px] leading-6 text-[#96969D]">AI-generated posts, connected accounts, confirmed social publication and automatic replies will only be reported after official provider authorization and verified server-side execution. Growth Credits remain a separate metered resource.</p>
  </main>;
}
