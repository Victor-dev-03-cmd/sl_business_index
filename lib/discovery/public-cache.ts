import 'server-only';
import {unstable_cache} from 'next/cache';
import {createClient} from '@supabase/supabase-js';

// Only anonymous public RLS reads enter the shared data cache.
// Never forward cookies, authorization headers or a service-role key.
function publicClient(){
 return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
}
export const getPublicCategories=unstable_cache(async()=>{
 const {data,error}=await publicClient().from('categories')
  .select('id,name,icon,parent_id,image_url').order('name',{ascending:true});
 if(error)throw new Error('Public categories unavailable');
 return {rows:data??[],fetchedAt:Date.now()};
},['slbi-public-categories-v1'],{revalidate:120,tags:['slbi-public-categories']});

// Featured moderation-sensitive data is deliberately NOT put into a persistent
// shared cache: revocation must be checked against current approved rows.
export async function getPublicFeatured(){
 const {data,error}=await publicClient().from('featured_listings')
 .select('business_id,businesses!inner(id,slug,name,category,address,detailed_address,city,image_url,logo_url,rating,is_verified,status,can_show_badge)')
 .eq('businesses.status','approved').order('order_index',{ascending:true}).limit(18);
 if(error)throw new Error('Featured listings unavailable');
 return (data??[]).map((item:any)=>item.businesses).filter((b:any)=>b?.status==='approved');
}
