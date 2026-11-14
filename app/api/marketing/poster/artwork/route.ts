import {createClient as createAdminClient} from '@supabase/supabase-js';
import {createClient} from '@/lib/supabase/server';
import {getMarketingAccessForUser,rejectMarketingAccess} from '@/lib/marketing/pro-access-server';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const BUCKET='slbi-poster-ai-private';
const noStore={'Cache-Control':'private, no-store, max-age=0','X-Content-Type-Options':'nosniff'};
const fail=(status:number,error:string)=>Response.json({error},{status,headers:noStore});
export async function GET(request:Request){
  const jobId=new URL(request.url).searchParams.get('jobId');
  if(!jobId||!UUID.test(jobId))return fail(400,'Invalid poster artwork ID.');
  const client=await createClient();
  const {data:{user},error:authError}=await client.auth.getUser();
  if(authError||!user)return fail(401,'Sign in to view your artwork.');
  const denied=rejectMarketingAccess(await getMarketingAccessForUser(user.id,client));
  if(denied)return denied;

  // Browser RLS confines visibility to this owner + owned business.
  const {data:job,error}=await client.from('marketing_poster_jobs')
    .select('id,user_id,business_id,state,storage_path')
    .eq('id',jobId).eq('user_id',user.id).maybeSingle();
  if(error)return fail(503,'Private artwork is not available.');
  if(!job||job.state!=='completed'||!job.storage_path)return fail(404,'Artwork is not available.');
  const expected=user.id+'/'+job.business_id+'/'+jobId+'.png';
  if(job.storage_path!==expected)return fail(503,'Artwork ownership metadata is invalid.');
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY;
  if(!url||!key)return fail(503,'Private storage is not configured.');
  const admin=createAdminClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:blob,error:downloadError}=await admin.storage.from(BUCKET).download(expected);
  if(downloadError||!blob)return fail(503,'Artwork download unavailable.');
  if(blob.size<64||blob.size>12000000)return fail(503,'Artwork payload exceeds safe bounds.');
  const binary=new Uint8Array(await blob.arrayBuffer());
  if(binary[0]!==137||binary[1]!==80||binary[2]!==78||binary[3]!==71)
    return fail(503,'Stored artwork is not a PNG.');
  return new Response(binary,{status:200,headers:{...noStore,'Content-Type':'image/png',
    'Content-Disposition':'inline; filename="slbi-poster-artwork.png"'}});
}
