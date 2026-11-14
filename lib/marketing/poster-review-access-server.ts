import 'server-only';
import {createClient} from '@/lib/supabase/server';

/**
 * Time-boxed, staff-only evaluation of the Poster Design Studio UI.
 * This is NOT an entitlement, cannot spend credits, cannot access other Pro apps,
 * and cannot bypass the separately authenticated AI image generation API.
 * The existing trusted DB role-escalation trigger protects profiles.role.
 */
export const POSTER_REVIEW_EXPIRES_AT='2026-11-21T18:30:00.000Z'; // 2026-11-22 00:00 Asia/Colombo
type Client=Awaited<ReturnType<typeof createClient>>;

export async function isPosterReviewAccount(userId:string,client:Client):Promise<boolean>{
  if(Date.now()>=Date.parse(POSTER_REVIEW_EXPIRES_AT))return false;
  if(!userId||typeof userId!=='string')return false;
  try{
    const {data:profile,error}=await client.from('profiles').select('role')
      .eq('id',userId).maybeSingle();
    if(error||!profile||!['admin','ceo'].includes(profile.role))return false;
    // Only existing staff with a real owned listing may enter this vendor preview.
    const {data:owned,error:businessError}=await client.from('businesses')
      .select('id').eq('owner_id',userId).limit(1);
    return !businessError&&Boolean(owned?.length);
  }catch{return false;}
}
