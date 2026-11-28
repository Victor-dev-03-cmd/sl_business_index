import 'server-only';
import sharp from 'sharp';
import {createClient as createAdminClient} from '@supabase/supabase-js';
import {createClient} from '@/lib/supabase/server';
import {isSameOrigin} from '@/lib/growth/ingestion-contract';
import {getMarketingAccessForUser,rejectMarketingAccess} from '@/lib/marketing/pro-access-server';

export const dynamic='force-dynamic';
// Existing Sharp native image validation runs in the deployed Next runtime.
export const runtime='nodejs';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BUCKET='slbi-poster-ai-private';
const MAX_BYTES=3_000_000;
const LIMIT=50;
const MIME=['image/jpeg','image/png','image/webp'];
const reply=(status:number,body:unknown)=>Response.json(body,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
const prefix=(owner:string,business:string)=>'email-assets/'+owner+'/'+business+'/';
async function scope(businessId:string){
  if(!UUID.test(businessId))return {denied:reply(400,{error:'Invalid business.'})};
  const client=await createClient();
  const {data:{user},error:authError}=await client.auth.getUser();
  if(authError||!user)return {denied:reply(401,{error:'Sign in to manage email images.'})};
  const denied=rejectMarketingAccess(await getMarketingAccessForUser(user.id,client));
  if(denied)return {denied};
  const {data:business,error}=await client.from('businesses').select('id')
    .eq('id',businessId).eq('owner_id',user.id).eq('status','approved').maybeSingle();
  if(error)return {denied:reply(503,{error:'Business verification unavailable.'})};
  if(!business)return {denied:reply(403,{error:'Select an approved business you own.'})};
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY;
  if(!url||!key)return {denied:reply(503,{error:'Private storage unavailable.'})};
  const admin=createAdminClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  return {admin,folder:prefix(user.id,businessId)};
}
export async function GET(request:Request){
  const q=new URL(request.url).searchParams;
  const ctx=await scope(q.get('businessId')||'');
  if(ctx.denied)return ctx.denied;
  const asset=q.get('assetId');
  if(!asset||!UUID.test(asset))return reply(400,{error:'Invalid image identifier.'});
  const {data,error}=await ctx.admin!.storage.from(BUCKET).download(ctx.folder+asset+'.png');
  if(error||!data)return reply(404,{error:'Image unavailable.'});
  if(data.size>MAX_BYTES)return reply(413,{error:'Image too large.'});
  return new Response(data,{headers:{'Content-Type':'image/png','Content-Length':String(data.size),
    'Content-Disposition':'inline; filename="email-image.png"','Cache-Control':'private, no-store',
    'X-Content-Type-Options':'nosniff'}});
}
export async function POST(request:Request){
  if(!isSameOrigin(request.url,request.headers.get('origin')))return reply(403,{error:'Cross-origin upload rejected.'});
  const q=new URL(request.url).searchParams;
  const ctx=await scope(q.get('businessId')||'');
  if(ctx.denied)return ctx.denied;
  const mime=request.headers.get('content-type')||'';
  if(!MIME.includes(mime))return reply(415,{error:'Choose a JPG, PNG or WebP image.'});
  if(Number(request.headers.get('content-length')||0)>MAX_BYTES)return reply(413,{error:'Maximum upload size is 3 MB.'});
  const reader=request.body?.getReader();
  if(!reader)return reply(400,{error:'No image supplied.'});
  const chunks:Uint8Array[]=[];let size=0;
  try{
    while(true){const {done,value}=await reader.read();if(done)break;
      size+=value.byteLength;
      if(size>MAX_BYTES){await reader.cancel();return reply(413,{error:'Maximum upload size is 3 MB.'});}
      chunks.push(value);
    }
  }catch{return reply(400,{error:'Image upload interrupted.'});}
  if(!size)return reply(400,{error:'Empty image.'});
  let png:Buffer;
  try{
    const source=sharp(Buffer.concat(chunks),{limitInputPixels:16_000_000,failOn:'error'});
    const info=await source.metadata();
    if(!info.format||!['jpeg','png','webp'].includes(info.format)||(info.pages||1)>1)
      return reply(415,{error:'Choose a static JPG, PNG or WebP image.'});
    // Decode, resize and re-encode; never serve the original untrusted bytes or metadata.
    png=await source.rotate().resize({width:1200,height:1200,fit:'inside',withoutEnlargement:true}).png({compressionLevel:6,palette:true,quality:90}).toBuffer();
  }catch{return reply(400,{error:'Image is invalid or exceeds the 16 megapixel limit.'});}
  if(png.length>MAX_BYTES)return reply(413,{error:'Optimized image exceeds 3 MB.'});
  const storage=ctx.admin!.storage.from(BUCKET);
  const {data:files,error:listError}=await storage.list(ctx.folder!,{limit:LIMIT});
  if(listError)return reply(503,{error:'Image storage quota unavailable.'});
  if((files||[]).length>=LIMIT)return reply(409,{error:'This business has reached its 50-image library limit.'});
  const assetId=crypto.randomUUID();
  const {error}=await storage.upload(ctx.folder+assetId+'.png',png,{contentType:'image/png',cacheControl:'0',upsert:false});
  if(error)return reply(503,{error:'Private image upload failed.'});
  return reply(201,{assetId,saved:true});
}
