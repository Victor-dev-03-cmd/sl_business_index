import 'server-only';
import {createClient} from '@/lib/supabase/server';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HEADERS={'Cache-Control':'private, no-store, max-age=0',
 'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
const reply=(status:number,code:string)=>Response.json({ok:false,code},{status,headers:HEADERS});
export async function GET(request:Request){
 const url=new URL(request.url);
 const businessId=url.searchParams.get('businessId');
 if(url.searchParams.size!==1||!businessId||!UUID.test(businessId))
  return reply(400,'invalid_business');
 try{
  const client=await createClient();
  const {data:{user},error:authError}=await client.auth.getUser();
  if(authError||!user)return reply(401,'sign_in_required');
  const {data:business,error:ownerError}=await client.from('businesses')
   .select('id,name,status').eq('owner_id',user.id).eq('id',businessId).maybeSingle();
  if(ownerError)return reply(503,'ownership_unavailable');
  if(!business)return reply(404,'business_not_owned');
  // RLS-verified connector metadata only. This does NOT certify that Meta
  // approved Embedded Signup or that a working vendor access token exists.
  const {data:connections,error:readError}=await client.from('marketing_connections')
   .select('id,status,account_display_name,connected_at')
   .eq('user_id',user.id).eq('business_id',businessId)
   .eq('provider','whatsapp_business').limit(5);
  const listed=readError?[]:(connections||[]).map(c=>({
   id:c.id,status:c.status,displayName:c.account_display_name??null,
   connectedAt:c.connected_at??null,
  }));
  // Global test-number webhook status MUST NOT be treated as a vendor link.
  return Response.json({ok:true,business:{id:business.id,name:business.name,
    approved:business.status==='approved'},
    sandboxTestWebhookConfigured:process.env.SLBI_WA_SANDBOX_WEBHOOK_ENABLED==='true',
    vendorOnboardingAvailable:false,
    vendorOnboardingBlocker:'meta_tech_provider_advanced_access_and_persisted_binding',
    providerMetadataReadable:!readError,
    connections:listed,
    automatedRepliesAvailable:false,marketingSendsAvailable:false,
    requiresIndividualOwnerApproval:true,
  },{headers:HEADERS});
 }catch{return reply(503,'connection_status_unavailable');}
}
