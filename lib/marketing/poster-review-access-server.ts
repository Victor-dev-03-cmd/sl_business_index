import 'server-only';
import {createClient} from '@/lib/supabase/server';
import {evaluateMarketingEntitlement} from '@/lib/marketing/engine-registry';

/**
 * Time-boxed, staff-only evaluation of the Poster Design Studio UI.
 * This is NOT an entitlement, cannot spend credits, cannot access other Pro apps,
 * and cannot bypass the separately authenticated AI image generation API.
 * The existing trusted DB role-escalation trigger protects profiles.role.
 */
export const POSTER_REVIEW_EXPIRES_AT='2026-11-21T18:30:00.000Z'; // 2026-11-22 00:00 Asia/Colombo
type Client=Awaited<ReturnType<typeof createClient>>;

export async function isPosterReviewAccount(userId:string,client:Client):Promise<boolean>{
  if(Date.now()>=Date.parse(POSTER_REVIEW_EXPIRES_AT))return false;
  if(!userId||typeof userId!=='string')return false;
  try{
    const {data:profile,error}=await client.from('profiles').select('role')
      .eq('id',userId).maybeSingle();
    if(error||!profile||!['admin','ceo'].includes(profile.role))return false;
    // Only existing staff with a real owned listing may enter this vendor preview.
    const {data:owned,error:businessError}=await client.from('businesses')
      .select('id').eq('owner_id',userId).limit(1);
    return !businessError&&Boolean(owned?.length);
  }catch{return false;}
}


/**
 * Exact, trusted source-marker for owner-approved, no-payment Pro QA entitlements.
 * The row is already owned by an Auth UUID and cannot be created/edited by clients.
 * This lets the specific QA vendor open the Poster tile while marketplace rollout
 * stays coming_soon for every other Basic/Pro account.
 *
 * The grant lifetime comes from the database entitlement, not the staff expiry.
 * Only the verified Auth UUID and RLS-backed entitlement control this grant.
 */
const OWNER_QA_GRANT='SLBI_INTERNAL_QA_NO_PAYMENT_20261114';
export async function isPosterInternalQAAccount(userId:string,client:Client):Promise<boolean>{
  if(!userId)return false;
  try{
    const {data,error}=await client.from('growth_entitlements')
      .select('plan_name,payment_reference,verified_at,expires_at')
      .eq('user_id',userId).maybeSingle();
    if(error||data?.payment_reference!==OWNER_QA_GRANT)return false;
    return evaluateMarketingEntitlement(data);
  }catch{return false;}
}
