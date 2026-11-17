import 'server-only';
import {createClient as createAdminClient} from '@supabase/supabase-js';
import {createClient} from '@/lib/supabase/server';
import {isSameOrigin} from '@/lib/growth/ingestion-contract';
import {getMarketingAccessForUser,rejectMarketingAccess} from '@/lib/marketing/pro-access-server';
import {isPosterInternalQAAccount} from '@/lib/marketing/poster-review-access-server';

export const runtime='nodejs';
export const dynamic='force-dynamic';

const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const BUCKET='slbi-poster-ai-private';
const MAX_IMAGE_BYTES=12_000_000;
const MAX_SAVED_PER_BUSINESS=50;
const PNG_MAGIC=[137,80,78,71,13,10,26,10];
const json=(status:number,value:unknown)=>Response.json(value,{status,
  headers:{'Cache-Control':'private, no-store, max-age=0','X-Content-Type-Options':'nosniff'}});
const path=(uid:string,bid:string,assetId:string)=>
  'saved/'+uid+'/'+bid+'/'+assetId+'.png';

function service(){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY;
  if(!url||!key)return null;
  return createAdminClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}

/** Both sides of this owner check are trusted server/database fields. Every
 * list/read/write is scoped by auth.uid + a currently owned business. Storage
 * bucket is PRIVATE and explicitly denies direct anon/authenticated access. */
async function scope(businessId:string){
  if(!UUID.test(businessId))return {denied:json(400,{error:'Choose a valid business.'})};
  const client=await createClient();
  const {data:{user},error:authError}=await client.auth.getUser();
  if(authError||!user)return {denied:json(401,{error:'Sign in to save private posters.'})};
  const denied=rejectMarketingAccess(await getMarketingAccessForUser(user.id,client));
  if(denied)return {denied};
  if(!await isPosterInternalQAAccount(user.id,client))
    return {denied:json(403,{error:'Private image library is currently limited to approved Studio QA vendors.'})};
  const {data:business,error}=await client.from('businesses').select('id')
    .eq('id',businessId).eq('owner_id',user.id).maybeSingle();
  if(error)return {denied:json(503,{error:'Business ownership verification is unavailable.'})};
  if(!business)return {denied:json(404,{error:'The selected business does not belong to your account.'})};
  const admin=service();
  if(!admin)return {denied:json(503,{error:'Private image storage is not configured.'})};
  return {uid:user.id,businessId,admin};
}

export async function GET(request:Request){
  const query=new URL(request.url).searchParams;
  const businessId=query.get('businessId')||'';
  const ctx=await scope(businessId);
  if(ctx.denied)return ctx.denied;
  const admin=ctx.admin!;
  const assetId=query.get('assetId');
  if(assetId!==null){
    if(!UUID.test(assetId))return json(400,{error:'Invalid private image identifier.'});
    const {data,error}=await admin.storage.from(BUCKET)
      .download(path(ctx.uid!,businessId,assetId));
    if(error||!data)return json(404,{error:'Private poster is unavailable to this business.'});
    if(data.size>MAX_IMAGE_BYTES)return json(413,{error:'Saved poster exceeds private download limit.'});
    return new Response(data,{status:200,headers:{
      'Content-Type':'image/png',
      'Content-Length':String(data.size),
      'Cache-Control':'private, no-store, max-age=0',
      'X-Content-Type-Options':'nosniff',
      'Content-Disposition':'inline; filename="slbi-saved-poster.png"',
    }});
  }
  const prefix='saved/'+ctx.uid+'/'+businessId+'/';
  const {data,error}=await admin.storage.from(BUCKET).list(prefix,{
    limit:MAX_SAVED_PER_BUSINESS,offset:0,
    sortBy:{column:'created_at',order:'desc'},
  });
  if(error)return json(503,{error:'Saved poster library cannot be listed right now.'});
  const assets=(data||[]).filter(file=>UUID.test(file.name.replace(/\.png$/i,''))&&
    file.name.toLowerCase().endsWith('.png')).map(file=>({
      id:file.name.slice(0,-4),createdAt:file.created_at||null,
    }));
  return json(200,{assets,limit:MAX_SAVED_PER_BUSINESS});
}

export async function POST(request:Request){
  if(!isSameOrigin(request.url,request.headers.get('origin')))
    return json(403,{error:'Cross-origin private poster uploads are blocked.'});
  const len=Number(request.headers.get('content-length')||0);
  if(len>MAX_IMAGE_BYTES+100_000)return json(413,{error:'Poster exceeds the 12 MB limit.'});
  if(!request.headers.get('content-type')?.toLowerCase().startsWith('multipart/form-data'))
    return json(415,{error:'Upload a PNG image.'});
  let form:FormData;
  try{form=await request.formData();}catch{return json(400,{error:'Could not read the poster image.'});}
  const businessId=form.get('businessId');
  const image=form.get('image');
  if(typeof businessId!=='string'||!UUID.test(businessId))
    return json(400,{error:'Select a valid business.'});
  if(!(image instanceof Blob)||image.type!=='image/png'||image.size<100||
     image.size>MAX_IMAGE_BYTES)
    return json(400,{error:'Choose a composed PNG poster (100 B–12 MB).'});
  const header=new Uint8Array(await image.slice(0,8).arrayBuffer());
  if(!PNG_MAGIC.every((byte,i)=>header[i]===byte))
    return json(400,{error:'The uploaded poster is not a valid PNG file.'});
  const ctx=await scope(businessId);
  if(ctx.denied)return ctx.denied;
  const admin=ctx.admin!;
  const prefix='saved/'+ctx.uid+'/'+businessId+'/';
  const {data:files,error:listError}=await admin.storage.from(BUCKET)
    .list(prefix,{limit:MAX_SAVED_PER_BUSINESS,offset:0});
  if(listError)return json(503,{error:'Private poster storage quota cannot be verified.'});
  if((files||[]).filter(x=>x.name.endsWith('.png')).length>=MAX_SAVED_PER_BUSINESS)
    return json(409,{error:'This business has reached 50 saved posters. Contact support before adding more.'});
  const assetId=crypto.randomUUID();
  // Fail closed. A server-owned service role is required to write this locked
  // bucket; never issue a public URL or grant client Storage write permission.
  const {error}=await admin.storage.from(BUCKET).upload(
    path(ctx.uid!,businessId,assetId),image,{
      contentType:'image/png',cacheControl:'0',upsert:false,
    });
  if(error)return json(503,{error:'Private poster upload failed. Please retry; your local PNG is unchanged.'});
  return json(201,{assetId,saved:true});
}

/** Explicit deletion only. Never delete a poster still linked to a Planner
 * campaign, because that would silently break existing published drafts. */
export async function DELETE(request:Request){
  if(!isSameOrigin(request.url,request.headers.get('origin')))
    return json(403,{error:'Cross-origin private poster deletion is blocked.'});
  if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))
    return json(415,{error:'Expected a JSON image deletion request.'});
  let input:unknown;
  try{input=await request.json();}catch{return json(400,{error:'Invalid image deletion request.'});}
  if(!input||typeof input!=='object'||Array.isArray(input))
    return json(400,{error:'Invalid image deletion request.'});
  const {businessId,assetId}=input as Record<string,unknown>;
  if(typeof businessId!=='string'||typeof assetId!=='string'||
     !UUID.test(businessId)||!UUID.test(assetId))
    return json(400,{error:'Choose a valid private poster.'});
  const ctx=await scope(businessId);
  if(ctx.denied)return ctx.denied;
  const admin=ctx.admin!;
  // Server-verified business ownership is enforced above. Do not silently
  // break posters that Caption Lab already attached to a Planner campaign.
  const {data:linked,error:linkError}=await admin.from('marketing_campaigns')
    .select('id').eq('business_id',businessId).eq('poster_asset_id',assetId).limit(1);
  if(linkError)return json(503,{error:'Could not check campaign image references. Nothing was deleted.'});
  if(linked?.length)return json(409,{error:'This image is linked to a saved Campaign Planner draft. Keep the image until that campaign no longer uses it.'});
  const {error}=await admin.storage.from(BUCKET)
    .remove([path(ctx.uid!,businessId,assetId)]);
  if(error)return json(503,{error:'Private image deletion failed. Please try again.'});
  return json(200,{deleted:true,assetId});
}
