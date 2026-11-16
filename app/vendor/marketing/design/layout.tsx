import {createClient} from '@/lib/supabase/server';
import MarketingProOnly from '@/app/vendor/marketing/components/MarketingProOnly';
import {isPosterReviewAccount} from '@/lib/marketing/poster-review-access-server';

export default async function PosterDesignStudioLayout({children}:{children:React.ReactNode}){
  const client=await createClient();
  const {data:{user},error}=await client.auth.getUser();
  const reviewer=Boolean(!error&&user&&await isPosterReviewAccount(user.id,client));
  if(reviewer)return <>{children}</>;
  return <MarketingProOnly>{children}</MarketingProOnly>;
}
