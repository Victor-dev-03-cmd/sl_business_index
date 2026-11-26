import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import WhatsAppConnectionLab,{type WhatsAppOwnedBusiness} from '../components/WhatsAppConnectionLab';
import WhatsAppGrowthOperator from '../components/WhatsAppGrowthOperator';

export const dynamic='force-dynamic';

/** Authenticated, read-only vendor test UI. No Meta or marketing provider action. */
export default async function VendorWhatsAppConnectionPage(){
  const client=await createClient();
  const {data:{user},error:authError}=await client.auth.getUser();
  if(authError||!user)redirect('/login?redirect=/vendor/marketing/whatsapp');
  let businesses:WhatsAppOwnedBusiness[]=[];
  let ownershipReady=false;
  try{
    const {data,error}=await client.from('businesses')
      .select('id,name,status').eq('owner_id',user.id).order('name').limit(50);
    if(!error){
      businesses=(data||[]).map(b=>({id:b.id,name:b.name,status:b.status??null}));
      ownershipReady=true;
    }
  }catch{
    // Fail closed. No fallback to client-provided business IDs or service-role.
  }
  return <main className="mx-auto w-full max-w-[1470px] space-y-7 pb-12 text-[#242428]">
    <WhatsAppGrowthOperator businesses={businesses} ownershipReady={ownershipReady}/>
    <details className="rounded-2xl border border-[#E9E9EC] bg-white px-4 pb-4 sm:px-6">
      <summary className="cursor-pointer py-4 text-xs font-semibold text-[#777780]">
        Reference: previous WhatsApp setup walkthrough (preview only)
      </summary>
      <WhatsAppConnectionLab businesses={businesses} ownershipReady={ownershipReady}/>
    </details>
  </main>;
}
