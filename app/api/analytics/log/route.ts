import { createHmac, randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { isPrivacyOptOut, isSameOrigin, validateGrowthEvent } from '@/lib/growth/ingestion-contract';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const json = (body: Record<string,unknown>, status:number) =>
  Response.json(body, {status,headers:{'Cache-Control':'no-store'}});

/**
 * No-op until the reviewed migration, private Supabase secret key, rotating
 * rate-limit secret, privacy notice and consent controls have been activated.
 * Legacy UI telemetry calls must never bypass the server-side validation.
 */
export async function POST(request:Request) {
  if (process.env.GROWTH_EVENT_INGESTION_ENABLED !== 'true') return json({recorded:false,reason:'disabled'},202);
  if (isPrivacyOptOut(request.headers)) return json({recorded:false,reason:'privacy-opt-out'},202);
  if (!isSameOrigin(request.url, request.headers.get('origin'))) return json({recorded:false,reason:'invalid-origin'},403);
  const type = request.headers.get('content-type') || '';
  if (!type.toLowerCase().startsWith('application/json')) return json({recorded:false,reason:'invalid-content-type'},415);
  const statedSize=Number(request.headers.get('content-length') || 0);
  if (!Number.isFinite(statedSize) || statedSize > 1024) return json({recorded:false,reason:'payload-too-large'},413);

  let input:unknown;
  try {
    const raw=await request.text();
    if (Buffer.byteLength(raw,'utf8') > 1024) return json({recorded:false,reason:'payload-too-large'},413);
    input=JSON.parse(raw);
  } catch {return json({recorded:false,reason:'invalid-json'},400);}
  const validated=validateGrowthEvent(input);
  if (!validated.ok) return json({recorded:false,reason:validated.reason},400);

  // No raw IP, query text, GPS, fingerprint or browser metadata is written.
  // Only Vercel's platform-managed forwarding header can define a rate bucket.
  // Never trust a client-supplied arbitrary IP or fallback to shared 'unknown'.
  if (process.env.VERCEL !== '1') return json({recorded:false,reason:'untrusted-proxy'},503);
  const ip=request.headers.get('x-vercel-forwarded-for')?.split(',').at(-1)?.trim();
  if (!ip || ip.length > 80 || !/^[0-9a-f:.]+$/i.test(ip)) return json({recorded:false,reason:'untrusted-client-ip'},503);
  const secret=process.env.GROWTH_RATE_LIMIT_SECRET;
  const supabaseSecret=process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!secret || secret.length < 32 || !supabaseSecret || !url) {
    return json({recorded:false,reason:'server-not-configured'},503);
  }

  const {businessId,eventType,channel,eventId}=validated.value;
  const hour=Math.floor(Date.now()/3600000);
  const bucket=createHmac('sha256',secret)
    .update(ip+'|'+businessId+'|'+eventType+'|'+hour).digest('hex');
  try {
    // Separate secret Supabase client. Never use the SSR cookie client here,
    // because user tokens can override a service credential and RLS context.
    const server=createClient(url,supabaseSecret,{
      auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false},
    });
    const {data,error}=await server.rpc('slbi_record_growth_event',{
      p_event_id:eventId || randomUUID(),
      p_business_id:businessId,
      p_event_type:eventType,
      p_channel:channel,
      p_rate_bucket:bucket,
    });
    if(error) {
      // Database can be missing the reviewed migration; fail closed.
      console.error('Growth analytics ingestion unavailable:',error.code || 'database');
      return json({recorded:false,reason:'ingestion-unavailable'},503);
    }
    return json({recorded:data===true,reason:data===true?'accepted':'rate-limited-or-ineligible'},data===true?200:429);
  } catch {
    return json({recorded:false,reason:'ingestion-unavailable'},503);
  }
}

export async function GET() {
  return json({recorded:false,reason:'method-not-supported'},405);
}
