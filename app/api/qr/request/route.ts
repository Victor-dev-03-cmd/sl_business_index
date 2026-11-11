import {randomBytes} from 'node:crypto';
import {createClient} from '@/lib/supabase/server';
import {isSameOrigin} from '@/lib/growth/ingestion-contract';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const json=(data:Record<string,unknown>,status:number)=>
  Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;

export async function POST(request:Request){
  if(!isSameOrigin(request.url,request.headers.get('origin')))
    return json({success:false,error:'invalid-origin'},403);
  if(!(request.headers.get('content-type')||'').startsWith('application/json'))
    return json({success:false,error:'invalid-content-type'},415);
  const length=Number(request.headers.get('content-length')||0);
  if(!Number.isFinite(length)||length>512)
    return json({success:false,error:'payload-too-large'},413);

  let body:unknown;
  try{
    const raw=await request.text();
    if(Buffer.byteLength(raw,'utf8')>512)return json({success:false,error:'payload-too-large'},413);
    body=JSON.parse(raw);
  }catch{return json({success:false,error:'invalid-json'},400);}
  const id=body&&typeof body==='object'&&!Array.isArray(body)
    ?(body as Record<string,unknown>).business_id:null;
  if(typeof id!=='string'||!uuid.test(id))return json({success:false,error:'invalid-business'},400);

  const supabase=await createClient();
  const {data:{user},error:authError}=await supabase.auth.getUser();
  if(authError||!user)return json({success:false,error:'authentication-required'},401);
  const {data:business,error:ownerError}=await supabase.from('businesses')
    .select('id,status').eq('id',id).eq('owner_id',user.id).maybeSingle();
  if(ownerError)return json({success:false,error:'lookup-failed'},503);
  if(!business)return json({success:false,error:'business-not-owned'},403);
  if(business.status!=='approved')return json({success:false,error:'business-not-approved'},403);

  const {data:existing,error:existingError}=await supabase.from('qr_inventory')
    .select('id,serial_id,short_link,business_id,status,created_at')
    .eq('business_id',id).eq('status','assigned')
    .order('created_at',{ascending:false}).limit(1).maybeSingle();
  if(existingError)return json({success:false,error:'qr-lookup-unavailable'},503);
  if(existing)return json({success:true,qr:existing,existing:true},200);

  // No administrator privilege or server-side secret is required; the
  // logged-in user and ownership are checked again by Supabase RLS.
  // A cryptographically generated serial avoids guessable numeric codes.
  const serial='SLBI-'+randomBytes(12).toString('hex').toUpperCase();
  const {data:created,error:insertError}=await supabase.from('qr_inventory')
    .insert({
      serial_id:serial,short_link:'/q/'+serial,business_id:id,
      status:'assigned',batch_name:'VENDOR_STUDIO',
    })
    .select('id,serial_id,short_link,business_id,status,created_at').single();
  if(insertError||!created){
    console.error('QR assignment failed',insertError?.code||'unknown');
    return json({success:false,error:'assignment-unavailable'},503);
  }
  return json({success:true,qr:created,existing:false},201);
}
export async function GET(){return json({success:false,error:'method-not-supported'},405);}
