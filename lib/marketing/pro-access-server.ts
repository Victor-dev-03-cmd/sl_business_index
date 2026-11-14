import 'server-only';
import {createClient} from '@/lib/supabase/server';
import {evaluateMarketingEntitlement} from '@/lib/marketing/engine-registry';

export type MarketingAccess={
  allowed:boolean;
  authenticated:boolean;
  plan:'Professional'|'Enterprise'|null;
  reason:'active'|'not_authenticated'|'upgrade_required'|'unavailable';
};

/**
 * Verified premium access from live DB, NEVER from client localStorage,
 * JWT user_metadata, active subscription request, or a frontend plan flag.
 * Existing growth_entitlements are issued by trusted billing workflow.
 */
export async function getMarketingAccess():Promise<MarketingAccess>{
  try{
    const client=await createClient();
    const {data:{user},error:authError}=await client.auth.getUser();
    if(authError||!user)return {allowed:false,authenticated:false,plan:null,reason:'not_authenticated'};
    return await getMarketingAccessForUser(user.id,client);
  }catch{
    return {allowed:false,authenticated:false,plan:null,reason:'unavailable'};
  }
}

type DbClient=Awaited<ReturnType<typeof createClient>>;
export async function getMarketingAccessForUser(
  userId:string,client:DbClient,
):Promise<MarketingAccess>{
  try{
    // The API is called as the authenticated vendor, so RLS also confines
    // entitlement rows to auth.uid(). Only a verified unexpired grant qualifies.
    const {data,error}=await client.from('growth_entitlements')
      .select('plan_name,payment_reference,verified_at,expires_at')
      .eq('user_id',userId).maybeSingle();
    if(error)return {allowed:false,authenticated:true,plan:null,reason:'unavailable'};
    if(!evaluateMarketingEntitlement(data))
      return {allowed:false,authenticated:true,plan:null,reason:'upgrade_required'};
    const plan=data!.plan_name as 'Professional'|'Enterprise';
    return {allowed:true,authenticated:true,plan,reason:'active'};
  }catch{
    return {allowed:false,authenticated:true,plan:null,reason:'unavailable'};
  }
}

export function rejectMarketingAccess(access:MarketingAccess):Response|null{
  if(access.allowed)return null;
  const status=!access.authenticated?401:access.reason==='unavailable'?503:403;
  const error=access.reason==='not_authenticated'?'Sign in to use Marketing Engine.'
    :access.reason==='unavailable'?'Premium access could not be verified. Please retry.'
    :'Verified Pro or Enterprise is required for Marketing Engine features.';
  return Response.json({error,reason:access.reason},
    {status,headers:{'Cache-Control':'private, no-store'}});
}
