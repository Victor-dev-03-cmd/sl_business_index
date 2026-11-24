import {createClient} from '@/lib/supabase/server';
import {createG1IsolatedSSRReadPort,type G1SSRReadOnlyClient} from '@/lib/growth/g1/isolated-ssr-read-adapter';
import {resolveG1ReadOnlyKnowledge} from '@/lib/growth/g1/knowledge-resolver-contract';

export const runtime='nodejs';
export const dynamic='force-dynamic';

const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const reply=(status:number,body:Record<string,unknown>)=>Response.json(body,{
  status,
  headers:{
    'Cache-Control':'private, no-store, max-age=0',
    'Vary':'Cookie',
    'X-Content-Type-Options':'nosniff',
  },
});

/**
 * Owner-authenticated G1 facts only. No service role, writes, AI/provider
 * execution or user-provided ownerId. The resolver checks owner_id & status
 * before reading brand and gallery; existing Supabase RLS is enforced.
 */
export async function GET(request:Request){
  const businessId=new URL(request.url).searchParams.get('businessId')||'';
  if(!UUID.test(businessId))return reply(400,{error:'Select a valid business.'});
  try{
    const client=await createClient();
    const reader=createG1IsolatedSSRReadPort(client as unknown as G1SSRReadOnlyClient);
    const result=await resolveG1ReadOnlyKnowledge(businessId,reader);
    if(!result.ok)return result.reason==='source_unavailable'
      ?reply(503,{error:'Knowledge sources are temporarily unavailable.'})
      :reply(404,{error:'Knowledge is not available for this account or listing.'});
    return reply(200,{context:result.context});
  }catch{
    return reply(503,{error:'Business knowledge is temporarily unavailable.'});
  }
}
