import type {Metadata} from 'next';
import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import type {SeoOwnedListing} from '@/lib/seo/owner-readiness';
import SeoEngineWorkspace from './SeoEngineWorkspace';

export const dynamic='force-dynamic';
export const metadata:Metadata={
  title:'SEO Engine | SL Business Index Owner Portal',
  robots:{index:false,follow:false},
};

export default async function VendorSEOEngine(){
  const client=await createClient();
  const {data:{user},error:authError}=await client.auth.getUser();
  if(authError||!user)redirect('/login?redirect=/vendor/seo');

  // Owner-bound RLS read. The selected ID always comes from these records,
  // never from user-controlled search parameters or untrusted AI suggestions.
  const {data,error}=await client.from('businesses')
    .select('id,slug,name,status,category,description,address,phone,logo_url,image_url,working_hours,website_url,is_verified')
    .eq('owner_id',user.id)
    .order('created_at',{ascending:false})
    .limit(100);
  if(error){
    return <main className="mx-auto max-w-[1100px] rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-900" role="alert">
      Your business listings could not be verified. SEO information is hidden until access is available. Please refresh or check your account.
    </main>;
  }
  // Live domain states are protected by table RLS and selected owned business.
  // Fail closed if storage/schema is unavailable; never show a fake connected state.
  const ids=(data||[]).map(b=>b.id);
  const domainResult=ids.length
    ?await client.from('seo_domain_connections')
      .select('business_id,hostname,provider,state,verification_token,txt_record_name,verified_at,verification_expires_at')
      .in('business_id',ids).limit(100)
    :{data:[],error:null};
  return <SeoEngineWorkspace
    listings={(data||[]) as SeoOwnedListing[]}
    connections={domainResult.error?[]:(domainResult.data||[])}
    domainServiceReady={!domainResult.error}
  />;
}
