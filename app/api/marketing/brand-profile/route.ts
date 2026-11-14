import { createClient } from '@/lib/supabase/server';
import { isSameOrigin } from '@/lib/growth/ingestion-contract';
import { validateBrandProfile } from '@/lib/marketing/brand-profile';
import {getMarketingAccessForUser,rejectMarketingAccess} from '@/lib/marketing/pro-access-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const response = (status: number, body: Record<string, unknown>) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'private, no-store, max-age=0' } });
const tableMissing = (code?: string) =>
  code === '42P01' || code === 'PGRST205' || code === 'PGRST202';
const unavailable = { error: 'Brand Profiles are not enabled in this environment yet.' };

/** Brand identities are per-business, never shared across a vendor's listings. */
export async function GET(request: Request) {
  const businessId = new URL(request.url).searchParams.get('businessId');
  if (!businessId || !UUID.test(businessId)) return response(400,{error:'Select a valid business.'});
  try {
    const client = await createClient();
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) return response(401,{error:'Sign in to access Brand Profiles.'});
    const proDenied=rejectMarketingAccess(await getMarketingAccessForUser(user.id,client));
    if(proDenied)return proDenied;
    const { data: business, error: businessError } = await client.from('businesses')
      .select('id,name,logo_url,category,city,status')
      .eq('id', businessId).eq('owner_id',user.id).maybeSingle();
    if (businessError) return response(503,{error:'Unable to verify your business.'});
    if (!business) return response(404,{error:'Business not found for this account.'});

    const { data: profile, error } = await client.from('social_brand_profiles')
      .select('business_id,brand_name,slogan,primary_color,secondary_color,accent_color,audience,tone,languages,guidelines,offers,updated_at')
      .eq('business_id',businessId).eq('owner_id',user.id).maybeSingle();
    if (error) {
      if (tableMissing(error.code)) return response(503,unavailable);
      console.error('Brand profile read failed:', error.code);
      return response(503,{error:'Unable to load your Brand Profile.'});
    }
    return response(200,{ business, profile:profile || null });
  } catch {
    return response(503,{error:'Brand Profile service is temporarily unavailable.'});
  }
}

/** Writes require fresh SSR session + owner check + database-enforced RLS. */
export async function PUT(request: Request) {
  if (!isSameOrigin(request.url,request.headers.get('origin'))) {
    return response(403,{error:'Cross-origin changes are not permitted.'});
  }
  if (!(request.headers.get('content-type') || '').toLowerCase().startsWith('application/json')) {
    return response(415,{error:'JSON is required.'});
  }
  const length = Number(request.headers.get('content-length') || 0);
  if (!Number.isFinite(length) || length > 16000) {
    return response(413,{error:'Brand Profile request exceeds size limits.'});
  }
  let parsed: unknown;
  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw,'utf8') > 16000) return response(413,{error:'Brand Profile is too large.'});
    parsed = JSON.parse(raw);
  } catch { return response(400,{error:'Invalid JSON request.'}); }
  const validated = validateBrandProfile(parsed);
  if (!validated.ok) return response(400,{error:validated.error});

  try {
    const client = await createClient();
    const { data:{ user },error:authError } = await client.auth.getUser();
    if (authError || !user) return response(401,{error:'Sign in to save a Brand Profile.'});
    const proDenied=rejectMarketingAccess(await getMarketingAccessForUser(user.id,client));
    if(proDenied)return proDenied;
    const v = validated.value;
    const { data: business,error:ownershipError } = await client.from('businesses')
      .select('id').eq('id',v.businessId).eq('owner_id',user.id).maybeSingle();
    if (ownershipError) return response(503,{error:'Unable to verify business ownership.'});
    if (!business) return response(404,{error:'Business not found for this account.'});

    const { data: existing, error:readError } = await client.from('social_brand_profiles')
      .select('business_id').eq('business_id',v.businessId)
      .eq('owner_id',user.id).maybeSingle();
    if (readError) {
      if (tableMissing(readError.code)) return response(503,unavailable);
      return response(503,{error:'Unable to verify existing Brand Profile.'});
    }
    const fields = {
      brand_name:v.brandName,
      slogan:v.slogan,
      primary_color:v.primaryColor,
      secondary_color:v.secondaryColor,
      accent_color:v.accentColor,
      audience:v.audience,
      tone:v.tone,
      languages:v.languages,
      guidelines:v.guidelines,
      offers:v.offers,
    };
    const operation = existing
      ? client.from('social_brand_profiles').update(fields)
        .eq('business_id',v.businessId).eq('owner_id',user.id)
      : client.from('social_brand_profiles').insert({
        business_id:v.businessId,owner_id:user.id,...fields,
      });
    const { data: saved,error } = await operation.select('business_id,updated_at').single();
    if (error) {
      if (tableMissing(error.code)) return response(503,unavailable);
      if (error.code === '23505') return response(409,{error:'Brand Profile was saved elsewhere. Refresh and retry.'});
      if (error.code === '42501') return response(403,{error:'You cannot edit this Brand Profile.'});
      console.error('Brand profile save failed:',error.code);
      return response(503,{error:'Brand Profile could not be saved.'});
    }
    if (!saved?.business_id) return response(503,{error:'Save verification failed.'});
    return response(200,{success:true,businessId:saved.business_id,updatedAt:saved.updated_at});
  } catch {
    return response(503,{error:'Brand Profile service is temporarily unavailable.'});
  }
}
