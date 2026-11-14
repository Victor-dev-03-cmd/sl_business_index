import Link from 'next/link';
import IconsaxIcon from '@/app/vendor/components/IconsaxIcon';
import MarketingModuleFrame from '@/app/vendor/marketing/engine/components/MarketingModuleFrame';
import {MARKETING_CONNECTORS} from '@/lib/marketing/engine-registry';
import {createClient} from '@/lib/supabase/server';
import {getGooglePreviewConfig} from '@/lib/marketing/oauth-runtime';
import GoogleMailPreviewConnect,{
  type GoogleMailOwnedBusiness,type GoogleMailConnectionSummary,
} from '@/app/vendor/marketing/engine/components/GoogleMailPreviewConnect';

export const dynamic='force-dynamic';

const groups=[
 {id:'social',name:'Social Publishing',desc:'Managed pages and approved creator accounts.',icon:'flash'},
 {id:'messages',name:'Business Messaging',desc:'Company WhatsApp, Messenger and business DMs.',icon:'message-text'},
 {id:'email',name:'Email & Mailboxes',desc:'Consented Google/Microsoft mail and verified-domain delivery.',icon:'sms'},
 {id:'voice',name:'Business Voice',desc:'Real phone-line and telephony authorization.',icon:'call'},
] as const;
export default async function MarketingConnections(){
  // Expensive owner/table checks run ONLY on explicitly configured Preview.
  // Production never reads OAuth tables or queries a provider from this page.
  const previewConfig=getGooglePreviewConfig();
  let googleReady=false;
  let owned:GoogleMailOwnedBusiness[]=[];
  let connectionSummaries:GoogleMailConnectionSummary[]=[];
  if(previewConfig&&process.env.SUPABASE_SERVICE_ROLE_KEY){
    try{
      const client=await createClient();
      const {data:{user},error:authError}=await client.auth.getUser();
      if(user&&!authError){
        const [businesses,connections]=await Promise.all([
          client.from('businesses').select('id,name')
            .eq('owner_id',user.id).order('name').limit(50),
          client.from('marketing_connections')
            .select('id,business_id,account_display_name,status,connected_at')
            .eq('user_id',user.id).eq('provider','google_mail').limit(25),
        ]);
        if(!businesses.error&&!connections.error){
          owned=(businesses.data||[]).map(b=>({id:b.id,name:b.name}));
          const ownedIds=new Set(owned.map(b=>b.id));
          connectionSummaries=(connections.data||[])
            .filter(c=>ownedIds.has(c.business_id))
            .map(c=>({
              id:c.id,business_id:c.business_id,
              account_display_name:c.account_display_name,
              status:c.status,connected_at:c.connected_at,
            }));
          googleReady=owned.length>0;
        }
      }
    }catch{
      // Fail closed: missing table/RLS/config is not proof of a connection.
    }
  }
  const googleConnected=googleReady&&
    connectionSummaries.some(c=>c.status==='connected');
  return <MarketingModuleFrame module="connections"
    description="First-party plugin catalogue for official business account permissions. Google Mail consent can be tested only on an explicitly configured Preview. No production sending or third-party publishing is enabled.">
    <section className="rounded-xl border border-[#E9E9EC] bg-[#202024] p-5 text-white sm:p-7">
      <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
        <div><p className="text-[10px] font-extrabold uppercase tracking-[.11em] text-[#FFAF6F]">Plug & play architecture</p>
          <h2 className="mt-2 text-xl font-extrabold">Connect with official authorization.</h2>
          <p className="mt-2 max-w-[790px] text-[12px] leading-6 text-white/65">Your vendors will select a provider, authorize eligible business accounts, approve scopes and view connection health. SLBI will never ask for social account passwords, store tokens in the browser, or pretend an unreviewed personal profile can be controlled.</p></div>
        <div className="rounded-xl border border-white/15 bg-white/10 px-5 py-4">
          <p className="text-[10px] uppercase text-white/50">Connector catalogue</p>
          <p className="mt-1 text-3xl font-extrabold">{MARKETING_CONNECTORS.length}</p>
          <p className="text-[10px] text-white/60">Candidates · Production integrations disabled</p>
        </div>
      </div>
    </section>
    {groups.map(group=><section key={group.id} className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h2 className="flex items-center gap-2 text-[16px] font-extrabold">
          <span className="rounded-lg bg-[#FFF1E5] p-2 text-[#B86117]"><IconsaxIcon name={group.icon} size={17}/></span>
          {group.name}</h2><p className="mt-1 text-xs text-[#8E8E95]">{group.desc}</p></div>
        <Link href={group.id==='email'?'/vendor/marketing-engine/email':group.id==='social'?'/vendor/marketing-engine/social':'/vendor/marketing-engine/agent'}
          className="text-[11px] font-bold text-[#B75C14] hover:underline">View related workflow</Link>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {MARKETING_CONNECTORS.filter(p=>p.group===group.id).map(provider=><article key={provider.id}
          className="flex min-h-[210px] flex-col rounded-xl border border-[#E9E9ED] bg-white p-5">
          <div className="flex items-start justify-between gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#FFF2E8] text-[#B75E18]">
              <IconsaxIcon name={provider.icon} size={19}/>
            </span>
            <span className="rounded-full border border-[#E8E8EB] bg-[#FAFAFB] px-2.5 py-1 text-[10px] font-bold text-[#85858D]">{provider.id==='gmail'&&googleConnected?'Preview connected':provider.status==='research'?'Provider research':'Not connected'}</span>
          </div>
          <h3 className="mt-3 text-[13px] font-extrabold">{provider.name}</h3>
          <p className="mt-1 text-[10px] font-semibold text-[#B06328]">{provider.api}</p>
          <p className="mt-2 text-[11px] leading-5 text-[#81818A]">{provider.requirements}</p>
          {provider.id==='gmail'
            ?<GoogleMailPreviewConnect ready={googleReady} businesses={owned}
                connections={connectionSummaries}/>
            :<div className="mt-auto pt-4">
              <button type="button" disabled aria-disabled="true"
                title="Official provider registration and authorization are not enabled"
                className="w-full cursor-not-allowed rounded-lg border border-[#E5E5E8] bg-[#F5F5F6] px-4 py-2.5 text-[11px] font-bold text-[#96969D]">
                Connect · not available yet
              </button>
            </div>}
        </article>)}
      </div>
    </section>)}
    <section className="rounded-xl border border-[#F0DCC8] bg-[#FFFAF5] p-5">
      <h2 className="text-sm font-extrabold text-[#A75F25]">Platform restrictions we will respect</h2>
      <p className="mt-2 text-[11px] leading-6 text-[#896F59]">Facebook Login is not unrestricted personal-profile publishing. Instagram consumer accounts do not gain professional publishing API permissions. Personal WhatsApp cannot be controlled through an unofficial Web login. Each official connector will be enabled only after account ownership checks, provider permission review, signed webhooks, encrypted credentials and manual authorization.</p>
    </section>
  </MarketingModuleFrame>;
}
