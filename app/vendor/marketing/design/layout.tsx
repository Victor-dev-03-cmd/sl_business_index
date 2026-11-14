import {createClient} from '@/lib/supabase/server';
import MarketingProOnly from '@/app/vendor/marketing/components/MarketingProOnly';
import {isPosterReviewAccount,POSTER_REVIEW_EXPIRES_AT} from '@/lib/marketing/poster-review-access-server';

export default async function PosterDesignStudioLayout({children}:{children:React.ReactNode}){
  const client=await createClient();
  const {data:{user},error}=await client.auth.getUser();
  const reviewer=Boolean(!error&&user&&await isPosterReviewAccount(user.id,client));
  if(reviewer)return <div className="space-y-4">
    <div role="status" className="rounded-xl border border-[#F4C896] bg-[#FFF8EC] px-4 py-3 text-[12px] font-semibold text-[#835022]">
      Private staff review · Pro entitlement unchanged · AI image spending and external posting remain disabled.
      Review access automatically expires {new Date(POSTER_REVIEW_EXPIRES_AT).toLocaleDateString('en-LK',{timeZone:'Asia/Colombo',day:'numeric',month:'long',year:'numeric'})}.
    </div>
    {children}
  </div>;
  return <MarketingProOnly>{children}</MarketingProOnly>;
}
