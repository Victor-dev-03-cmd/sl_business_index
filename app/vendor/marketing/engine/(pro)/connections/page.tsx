import MarketingModuleFrame from '@/app/vendor/marketing/engine/components/MarketingModuleFrame';
import ConnectorGrid from '@/app/vendor/marketing/engine/components/ConnectorGrid';
import type {ConnectorBusiness} from '@/app/vendor/marketing/engine/components/WhatsAppConnectorSetup';
import {createClient} from '@/lib/supabase/server';
import {getGooglePreviewConfig} from '@/lib/marketing/oauth-runtime';
import GoogleMailPreviewConnect,{
 type GoogleMailOwnedBusiness,type GoogleMailConnectionSummary,
} from '@/app/vendor/marketing/engine/components/GoogleMailPreviewConnect';

export const dynamic='force-dynamic';

export default async function MarketingConnections(){
 // Preserve existing preview-only Google OAuth. It must NOT activate on production.
 const previewConfig=getGooglePreviewConfig();
 // Scope the setup selector to the authenticated, RLS-owned businesses.
 // This is not a provider onboarding entitlement or a verified WhatsApp link.
 let connectorBusinesses:ConnectorBusiness[]=[];
 try{
  const ownerClient=await createClient();
  const {data:{user},error:authError}=await ownerClient.auth.getUser();
  if(user&&!authError){
   const {data,error}=await ownerClient.from('businesses')
    .select('id,name,status').eq('owner_id',user.id).order('name').limit(50);
   if(!error)connectorBusinesses=(data||[]).map(b=>({id:b.id,name:b.name,status:b.status}));
  }
 }catch{/* Owner verification unavailable: fail closed with no selectable business. */}
 let googleReady=false;
 let owned:GoogleMailOwnedBusiness[]=[];
 let connectionSummaries:GoogleMailConnectionSummary[]=[];
 if(previewConfig&&process.env.SUPABASE_SERVICE_ROLE_KEY){
  try{
   const client=await createClient();
   const {data:{user},error:authError}=await client.auth.getUser();
   if(user&&!authError){
    const [businesses,connections]=await Promise.all([
     client.from('businesses').select('id,name').eq('owner_id',user.id).order('name').limit(50),
     client.from('marketing_connections').select('id,business_id,account_display_name,status,connected_at')
      .eq('user_id',user.id).eq('provider','google_mail').limit(25),
    ]);
    if(!businesses.error&&!connections.error){
     owned=(businesses.data||[]).map(b=>({id:b.id,name:b.name}));
     const ids=new Set(owned.map(b=>b.id));
     connectionSummaries=(connections.data||[]).filter(c=>ids.has(c.business_id))
      .map(c=>({id:c.id,business_id:c.business_id,account_display_name:c.account_display_name,
       status:c.status,connected_at:c.connected_at}));
     googleReady=owned.length>0;
    }
   }
  }catch{/* Missing RLS/config never counts as connected. */}
 }
 const googleConnected=googleReady&&connectionSummaries.some(c=>c.status==='connected');
 return <MarketingModuleFrame module="connections"
  description="Choose the app you want to connect. Check the requirements, then authorize it when its official connection is available.">
  <ConnectorGrid googleReady={googleReady} googleConnected={googleConnected} businesses={connectorBusinesses}
   gmailPreview={<GoogleMailPreviewConnect ready={googleReady} businesses={owned}
    connections={connectionSummaries}/>}/>
 </MarketingModuleFrame>;
}
