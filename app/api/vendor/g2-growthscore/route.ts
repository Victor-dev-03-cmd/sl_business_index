import {createClient} from '@/lib/supabase/server';
import {createG1IsolatedSSRReadPort,type G1SSRReadOnlyClient} from '@/lib/growth/g1/isolated-ssr-read-adapter';
import {resolveG1ReadOnlyKnowledge} from '@/lib/growth/g1/knowledge-resolver-contract';
import {ownerContactEvidence,type G2OwnerContactRow} from '@/lib/growth/g2/contact-evidence';
import {buildG2GrowthScore} from '@/lib/growth/g2/growth-score';

export const runtime='nodejs';
export const dynamic='force-dynamic';

const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const CONTACT_PROJECTION='id,owner_id,status,phone,address,latitude,longitude,working_hours,website_url,logo_url';
const reply=(status:number,body:Record<string,unknown>)=>Response.json(body,{
  status,headers:{
    'Cache-Control':'private, no-store, max-age=0',
    Vary:'Cookie',
    'X-Content-Type-Options':'nosniff',
  },
});

/**
 * Read-only GrowthScore endpoint.
 * 1. Reject malformed identifiers before any reads.
 * 2. Existing G1 SSR resolver authenticates via getUser and validates an
 *    approved business owned under user-scoped RLS.
 * 3. Use the same SSR client and re-check auth.getUser, owner_id/status for
 *    narrow contact/location projections. Never use service role or cache.
 * 4. Return deterministic scores and owner edit links, NOT raw phone/address.
 */
export async function GET(request:Request){
  const businessId=new URL(request.url).searchParams.get('businessId')||'';
  if(!UUID.test(businessId))return reply(400,{error:'Select a valid business.'});
  try{
    const client=await createClient();
    const reader=createG1IsolatedSSRReadPort(client as unknown as G1SSRReadOnlyClient);
    const knowledge=await resolveG1ReadOnlyKnowledge(businessId,reader);
    if(!knowledge.ok)return knowledge.reason==='source_unavailable'
      ?reply(503,{error:'Growth evidence is temporarily unavailable.'})
      :reply(404,{error:'This business is unavailable for this account.'});

    const {data:{user},error:authError}=await client.auth.getUser();
    if(authError||!user)return reply(404,{error:'This business is unavailable for this account.'});
    const {data,error}=await client.from('businesses')
      .select(CONTACT_PROJECTION)
      .eq('id',businessId)
      .eq('owner_id',user.id)
      .eq('status','approved')
      .maybeSingle();
    if(error)return reply(503,{error:'Growth evidence is temporarily unavailable.'});
    const evidence=ownerContactEvidence(data as G2OwnerContactRow|null,user.id,businessId);
    if(!evidence)return reply(404,{error:'This business is unavailable for this account.'});
    const growthScore=buildG2GrowthScore(knowledge.context,evidence);
    if(!growthScore)return reply(503,{error:'Growth evidence could not be validated.'});
    return reply(200,{growthScore});
  }catch{
    return reply(503,{error:'Growth evidence is temporarily unavailable.'});
  }
}
