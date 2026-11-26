import Link from 'next/link';
import {redirect} from 'next/navigation';
import {ArrowLeft,CheckCircle2,LockKeyhole,MessageCircle,ShieldAlert} from 'lucide-react';
import {createClient} from '@/lib/supabase/server';

export const dynamic='force-dynamic';

/** One provider setup page. AI prompts belong in the Growth operator, not Connectors. */
export default async function VendorWhatsAppConnectionPage(){
 const client=await createClient();
 const {data:{user},error:authError}=await client.auth.getUser();
 if(authError||!user)redirect('/login?redirect=/vendor/marketing/whatsapp');
 const {data:businesses,error}=await client.from('businesses')
  .select('id,status').eq('owner_id',user.id).limit(50);
 const approved=Boolean(!error&&businesses?.some(b=>b.status==='approved'));
 return <main className="mx-auto w-full max-w-[920px] space-y-5 pb-12 text-[#252529]">
  <Link href="/vendor/marketing-engine/connections"
   className="inline-flex min-h-10 items-center gap-2 text-xs font-semibold text-[#A95416] hover:underline">
   <ArrowLeft size={15}/> All connectors
  </Link>
  <header className="rounded-[22px] border border-[#EAE8E9] bg-white p-6 sm:p-9">
   <div className="flex flex-wrap items-start justify-between gap-3">
    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFF0E5] text-[#C15F0D]">
     <MessageCircle size={28}/>
    </span>
    <span className="rounded-full border border-[#E8E6E8] bg-[#F7F7F8] px-3 py-1.5 text-[11px] font-bold text-[#77747B]">Not connected</span>
   </div>
   <h1 className="mt-5 text-2xl font-extrabold tracking-tight sm:text-3xl">WhatsApp Business</h1>
   <p className="mt-2 text-sm text-[#707079]">Connect your business WhatsApp account to SLBusinessIndex when official vendor onboarding is enabled.</p>
  </header>
  <section className="rounded-[20px] border border-[#EAE8E9] bg-white p-6 sm:p-8">
   <h2 className="text-lg font-extrabold">What you need</h2>
   <div className="mt-5 space-y-4">
    <div className="flex items-start gap-3">
     <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#B45E1C]"/>
     <div><p className="text-sm font-bold">An approved business in SLBI</p>
      <p className="mt-1 text-xs leading-5 text-[#727078]">{approved?'Your account has an approved listing.':'An approved listing is required before linking a number.'}</p></div>
    </div>
    <div className="flex items-start gap-3">
     <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#B45E1C]"/>
     <div><p className="text-sm font-bold">Your WhatsApp Business number</p>
      <p className="mt-1 text-xs leading-5 text-[#727078]">A phone number you control and can verify with Meta.</p></div>
    </div>
    <div className="flex items-start gap-3">
     <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#B45E1C]"/>
     <div><p className="text-sm font-bold">Official Meta authorization</p>
      <p className="mt-1 text-xs leading-5 text-[#727078]">SLBI must finish Meta Tech Provider/App permissions and secure per-vendor account linking before a live connection can start.</p></div>
    </div>
   </div>
   <button type="button" disabled aria-disabled="true"
    className="mt-7 flex min-h-12 w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-[#E7E7EA] bg-[#F3F3F5] px-5 text-sm font-extrabold text-[#777780]">
    <LockKeyhole size={17}/> Connect · awaiting official approval
   </button>
   <p className="mt-3 text-center text-[11px] leading-5 text-[#88838B]">You do not need to enter a prompt or share any password, token or verification code here.</p>
  </section>
  <p className="flex items-start gap-2 rounded-xl border border-[#F1DBBF] bg-[#FFFAF5] p-4 text-xs leading-6 text-[#855B3D]">
   <ShieldAlert className="mt-1 h-4 w-4 shrink-0"/>
   The existing SLBI Meta test-number webhook is for sandbox testing only. It is not your vendor WhatsApp connection. No messages are sent from this page.
  </p>
 </main>;
}
