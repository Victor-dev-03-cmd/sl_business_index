import 'server-only';
import {createClient as createServiceClient} from '@supabase/supabase-js';
import {createClient} from '@/lib/supabase/server';
import {getMarketingAccessForUser,rejectMarketingAccess} from '@/lib/marketing/pro-access-server';
import {createOAuthState,createPkceVerifier,stateDigest} from '@/lib/marketing/oauth-provider-contract';
import {encryptPreviewValue,exactOAuthRequestOrigin,getGooglePreviewConfig,
  makeGooglePreviewAuthUrl,validateOAuthStartBody} from '@/lib/marketing/oauth-runtime';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const reply=(status:number,error:string)=>Response.json({error},{status,
  headers:{'cache-control':'private, no-store','referrer-policy':'no-referrer'}});
export async function POST(request:Request){
  const config=getGooglePreviewConfig();
  if(!config)return reply(503,'OAuth connector is not enabled in this environment.');
  if(!exactOAuthRequestOrigin(request.url,request.headers.get('origin'),config.origin))
    return reply(403,'OAuth connection must start from this site.');
  if(!(request.headers.get('content-type')||'').toLowerCase().startsWith('application/json'))
    return reply(415,'JSON body required.');
  const len=Number(request.headers.get('content-length')||'0');
  if(!Number.isFinite(len)||len>1024)return reply(413,'Request too large.');
  let body:unknown;
  try{
    const raw=await request.text();
    if(Buffer.byteLength(raw,'utf8')>1024)return reply(413,'Request too large.');
    body=JSON.parse(raw);
  }catch{return reply(400,'Invalid request.');}
  const businessId=validateOAuthStartBody(body);
  if(!businessId)return reply(400,'Select a valid business.');
  try{
    const client=await createClient();
    const {data:{user},error:authError}=await client.auth.getUser();
    if(authError||!user)return reply(401,'Sign in to connect a provider.');
    const denied=rejectMarketingAccess(await getMarketingAccessForUser(user.id,client));
    if(denied)return denied;
    const {data:business,error:businessError}=await client.from('businesses')
      .select('id').eq('id',businessId).eq('owner_id',user.id).maybeSingle();
    if(businessError)return reply(503,'Business ownership could not be verified.');
    if(!business)return reply(404,'Business is not owned by this vendor.');
    const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
    const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
    if(!url||!serviceKey)return reply(503,'Connector database is unavailable.');
    const service=createServiceClient(url,serviceKey,{
      auth:{autoRefreshToken:false,persistSession:false},
    });
    const state=createOAuthState(),verifier=createPkceVerifier();
    const digest=stateDigest(state,config.stateSecret);
    const ciphertext=encryptPreviewValue(verifier,config.encryptionKey,{
      ownerId:user.id,businessId,provider:'google_mail',purpose:'pkce',subject:digest,
    });
    const {data:stored,error}=await service.rpc('slbi_begin_marketing_oauth_intent',{
      p_owner_id:user.id,p_business_id:businessId,p_provider:'google_mail',
      p_state_digest:digest,p_pkce_ciphertext:ciphertext,
      p_redirect_uri:config.redirectUri,
      p_expires_at:new Date(Date.now()+10*60*1000).toISOString(),
    });
    if(error?.code==='P0001')return reply(429,'Too many connection attempts. Try later.');
    if(error||!stored)return reply(503,'Connector authorization storage is not ready.');
    return Response.json({authorizationUrl:makeGooglePreviewAuthUrl(config,state,verifier)},{
      status:200,headers:{'cache-control':'private, no-store','referrer-policy':'no-referrer',
        'x-content-type-options':'nosniff'},
    });
  }catch{
    return reply(503,'OAuth authorization could not be started.');
  }
}
