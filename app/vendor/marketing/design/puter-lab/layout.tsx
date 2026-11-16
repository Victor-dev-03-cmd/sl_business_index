import {notFound,redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import {isPosterInternalQAAccount} from '@/lib/marketing/poster-review-access-server';

// Private owner experiment. Reuse the exact trusted, time-verified database
// QA entitlement already used by the Poster Studio. No client-controlled
// account/email flags or production image-provider switches.
export default async function PuterLabLayout({children}:{children:React.ReactNode}){
  const client=await createClient();
  const {data:{user},error}=await client.auth.getUser();
  if(error||!user)redirect('/login?next=%2Fvendor%2Fmarketing%2Fdesign%2Fputer-lab');
  if(!await isPosterInternalQAAccount(user.id,client))notFound();
  return <>{children}</>;
}
