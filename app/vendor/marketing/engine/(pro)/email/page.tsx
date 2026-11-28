import MarketingModuleFrame from '@/app/vendor/marketing/engine/components/MarketingModuleFrame';
import EmailMarketingWorkbench from '@/app/vendor/marketing/engine/components/EmailMarketingHub';
import type {
  EmailStudioBusiness,EmailStudioConnection,
} from '@/app/vendor/marketing/engine/components/EmailMarketingWorkbench';
import {isPosterInternalQAAccount} from '@/lib/marketing/poster-review-access-server';
import GoogleMailInboxPreview,{type GmailMailboxPreviewConnection} from '@/app/vendor/marketing/engine/components/GoogleMailInboxPreview';
import {getGoogleConnectorConfig} from '@/lib/marketing/oauth-runtime';
import {createClient} from '@/lib/supabase/server';
import {normalizeLocalCampaign,type LocalEmailCampaign} from '@/lib/marketing/email-hub-contract';

export const dynamic='force-dynamic';

/**
 * Email Studio is an owner-scoped, read-only composition workspace. Never return
 * lead email addresses, OAuth credentials or marketing recipients in page props.
 * Existing Pro route layout enforces entitlement; this query additionally
 * scopes every business, brand and sender to the authenticated user.
 */
export default async function MarketingEmail(){
  const client=await createClient();
  const {data:{user},error:authError}=await client.auth.getUser();
  const config=getGoogleConnectorConfig();
  let businesses:EmailStudioBusiness[]=[];
  let connections:EmailStudioConnection[]=[];
  let previews:GmailMailboxPreviewConnection[]=[];
  let verifiedCounts:Record<string,number>={};
  let emailAiAllowed=false;
  let serverDrafts:Array<{draft:LocalEmailCampaign;revision:number}>=[];
  let serverStorageReady=false;
  if(user&&!authError){
    if(process.env.SLBI_MARKETING_AI_ENABLED==='true'&&
       process.env.SLBI_MARKETING_EMAIL_AI_ENABLED==='true'&&
       Boolean(process.env.GEMINI_API_KEY)){
      // The endpoint is still owner-only internal QA. Do not expose a
      // broken Generate button to all paying vendors.
      emailAiAllowed=await isPosterInternalQAAccount(user.id,client);
    }
    const owned=await client.from('businesses')
      .select('id,name,logo_url,city,address,slug,website_url,status')
      .eq('owner_id',user.id).eq('status','approved').order('name').limit(50);
    const rows=owned.error?[]:owned.data||[];
    const ids=rows.map(b=>b.id);
    if(ids.length){
      const [profiles,linked]=await Promise.all([
        client.from('social_brand_profiles')
          .select('business_id,brand_name,slogan,primary_color,accent_color,tone')
          .eq('owner_id',user.id).in('business_id',ids).limit(50),
        client.from('marketing_connections')
          .select('id,business_id,account_display_name,provider,status,granted_scopes')
          .eq('user_id',user.id).eq('provider','google_mail').eq('status','connected')
          .in('business_id',ids).limit(25),
      ]);
      const brandMap=new Map((profiles.error?[]:profiles.data||[]).map(p=>[p.business_id,p]));
      businesses=rows.map(b=>{
        const brand=brandMap.get(b.id);
        return {id:b.id,name:b.name,logoUrl:b.logo_url,city:b.city||'',
          address:b.address||'',slug:b.slug,websiteUrl:b.website_url||null,
          brandName:brand?.brand_name||null,slogan:brand?.slogan||null,
          primaryColor:brand?.primary_color||null,accentColor:brand?.accent_color||null,
          tone:brand?.tone||null};
      });
      // Exact verified recipient counts are shown only if the reviewed
      // opt-in ledger actually exists and responds under authenticated RLS.
      // Missing tables fail closed (no invented zero or subscriber total).
      const optins=await client.from('marketing_email_optins')
        .select('business_id').in('business_id',ids)
        .eq('confirmation_status','confirmed').is('revoked_at',null).limit(5001);
      if(!optins.error&&optins.data&&optins.data.length<5001){
        verifiedCounts=Object.fromEntries(ids.map(id=>[id,0]));
        for(const row of optins.data){
          if(typeof row.business_id==='string'&&ids.includes(row.business_id))
            verifiedCounts[row.business_id]=(verifiedCounts[row.business_id]||0)+1;
        }
      }
      const stored=await client.from('marketing_email_campaign_drafts')
        .select('draft,revision').eq('owner_id',user.id)
        .in('business_id',ids)
        .order('updated_at',{ascending:false}).limit(150);
      serverStorageReady=!stored.error;
      if(!stored.error){
        serverDrafts=(stored.data||[]).flatMap(row=>{
          const valid=normalizeLocalCampaign(row.draft,user.id,ids);
          return valid&&Number.isInteger(row.revision)?
            [{draft:valid,revision:row.revision}]:[];
        });
      }
      if(!linked.error){
        const ownerIds=new Set(ids);
        const verified=(linked.data||[]).filter(c=>ownerIds.has(c.business_id)&&
          c.provider==='google_mail'&&c.status==='connected');
        connections=verified.map(c=>({id:c.id,businessId:c.business_id,
          accountDisplayName:c.account_display_name||'Connected Gmail',
          provider:'google_mail',status:'connected'}));
        previews=verified.map(c=>({id:c.id,business_id:c.business_id,
          account_display_name:c.account_display_name,
          status:c.status,granted_scopes:Array.isArray(c.granted_scopes)?c.granted_scopes:[]}));
      }
    }
  }
  return <MarketingModuleFrame module="email"
    description="A branded workspace to plan, review and preview multilingual email campaigns, with your verified Google sender and approved business assets.">
    <EmailMarketingWorkbench businesses={businesses} connections={connections}
      ownerScope={user?.id||''} verifiedCounts={verifiedCounts}
      serverDrafts={serverDrafts} serverStorageReady={serverStorageReady}
      emailAiEnabled={emailAiAllowed}
      inboxPreview={Boolean(config?.gmailReadEnabled)?
        <GoogleMailInboxPreview connections={previews}
          readEnabled={Boolean(config?.gmailReadEnabled)}/>:undefined}/>
  </MarketingModuleFrame>;
}
