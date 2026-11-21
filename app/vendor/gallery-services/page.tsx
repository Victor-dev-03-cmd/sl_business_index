import {createClient} from '@/lib/supabase/server';
import {redirect} from 'next/navigation';
import Link from 'next/link';
import GalleryServicesWorkspace from './GalleryServicesWorkspace';
export const dynamic='force-dynamic';

export default async function GalleryServicesPage({searchParams}:{searchParams:Promise<{business?:string|string[]}>}){
 const supabase=await createClient();
 const {data:{user},error:authError}=await supabase.auth.getUser();
 if(authError||!user)redirect('/login?next=%2Fvendor%2Fgallery-services');
 const {data,error}=await supabase.from('businesses').select('id,name,slug,category,logo_url,status').eq('owner_id',user.id).order('name');
 if(error)return <section role="alert" className="mx-auto max-w-3xl rounded-xl border border-neutral-200 p-6"><h1 className="text-xl font-semibold">Gallery &amp; Services</h1><p className="mt-3 text-sm text-neutral-600">Unable to load your businesses.</p><Link href="/vendor/gallery-services" className="mt-4 inline-block text-sm font-semibold underline">Try again</Link></section>;
 const params=await searchParams;
 const requested=typeof params.business==='string'?params.business:'';
 const owned=data||[];
 const initial=owned.find(b=>b.id===requested)?.id||owned[0]?.id||'';
 return <GalleryServicesWorkspace key={user.id+':'+requested} businesses={owned} initialId={initial} unavailable={Boolean(requested&&!owned.some(b=>b.id===requested))}/>;
}
