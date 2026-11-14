import {createClient} from '@/lib/supabase/server';
import {isSameOrigin} from '@/lib/growth/ingestion-contract';
import {getMarketingAccessForUser,rejectMarketingAccess} from '@/lib/marketing/pro-access-server';
import {buildPosterCreativePrompt,validatePosterCreativeInput} from '@/lib/marketing/poster-creative-engine';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const reply=(status:number,body:Record<string,unknown>)=>
  Response.json(body,{status,headers:{'Cache-Control':'private, no-store, max-age=0','X-Content-Type-Options':'nosniff'}});
/** This endpoint prepares a premium creative brief, but NEVER triggers paid image generation. */
export async function POST(request:Request){
  if(!isSameOrigin(request.url,request.headers.get('origin')))
    return reply(403,{error:'Cross-origin creative requests are blocked.'});
  if(!(request.headers.get('content-type')||'').toLowerCase().startsWith('application/json'))
    return reply(415,{error:'JSON is required.'});
  if(Number(request.headers.get('content-length')||0)>6500)
    return reply(413,{error:'Creative brief is too large.'});
  let parsed:unknown;
  try{
    const body=await request.text();
    if(Buffer.byteLength(body,'utf8')>6500)return reply(413,{error:'Creative brief is too large.'});
    parsed=JSON.parse(body);
  }catch{return reply(400,{error:'Invalid JSON brief.'});}
  const check=validatePosterCreativeInput(parsed);
  if(!check.ok)return reply(400,{error:check.error});
  try{
    const client=await createClient();
    const {data:{user},error:authError}=await client.auth.getUser();
    if(authError||!user)return reply(401,{error:'Sign in to create a poster creative brief.'});
    const denied=rejectMarketingAccess(await getMarketingAccessForUser(user.id,client));
    if(denied)return denied;
    const {data:business,error:bError}=await client.from('businesses')
      .select('id,name,category,city').eq('id',check.value.businessId)
      .eq('owner_id',user.id).maybeSingle();
    if(bError)return reply(503,{error:'Business ownership check unavailable.'});
    if(!business)return reply(404,{error:'This business is not owned by your account.'});
    const {data:brand,error:pError}=await client.from('social_brand_profiles')
      .select('brand_name,primary_color,accent_color,tone,guidelines')
      .eq('business_id',business.id).eq('owner_id',user.id).maybeSingle();
    if(pError)return reply(503,{error:'Brand Kit could not be verified.'});
    if(!brand)return reply(409,{error:'Complete the business Brand Kit before using AI art direction.'});
    const draft=buildPosterCreativePrompt(check.value,{
      businessName:business.name,category:business.category||'',city:business.city||'',
      brandName:brand.brand_name||business.name,
      primaryColor:brand.primary_color||'',accentColor:brand.accent_color||'',
      tone:brand.tone||'',guidelines:brand.guidelines||'',
    });
    return reply(200,{creative:draft});
  }catch{
    return reply(503,{error:'Creative brief service is temporarily unavailable.'});
  }
}
