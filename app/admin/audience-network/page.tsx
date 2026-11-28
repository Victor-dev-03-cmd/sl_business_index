import {notFound,redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import NetworkControl from './NetworkControl';
export const dynamic='force-dynamic';
export const metadata={title:'Audience Network | SLBI Admin',robots:{index:false,follow:false}};
export default async function AudienceNetworkPage(){
 const client=await createClient();const {data:{user},error}=await client.auth.getUser();
 if(error||!user)redirect('/login?next=%2Fadmin%2Faudience-network');
 const {data:profile}=await client.from('profiles').select('role').eq('id',user.id).maybeSingle();
 if(!profile||!['admin','ceo'].includes(profile.role))notFound();
 return <NetworkControl/>;
}
