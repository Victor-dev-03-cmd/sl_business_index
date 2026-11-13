import Link from 'next/link';
import {getMarketingAccess} from '@/lib/marketing/pro-access-server';

export function MarketingProNotice({authenticated,unavailable}:{
  authenticated:boolean;unavailable:boolean;
}){
  return <div role="region" aria-label="Marketing Engine access" className="mx-auto max-w-[1140px] space-y-5 rounded-2xl border border-[#E8E8EC] bg-white p-6 text-[#222226] shadow-[0_10px_38px_rgba(18,18,20,.05)] sm:p-9">
    <div className="inline-flex rounded-full border border-[#FFDBB9] bg-[#FFF6ED] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.13em] text-[#AE5614]">Marketing Engine · Pro access</div>
    <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
      {unavailable?'Premium access is temporarily unavailable':
        !authenticated?'Sign in to access Marketing Engine':'Unlock your Marketing Engine'}
    </h1>
    <p className="max-w-[680px] text-sm leading-7 text-[#74747C]">
      {unavailable?'Your access could not be verified securely. No premium actions have been started.'
        :!authenticated?'Sign in as a business owner to view your verified plan and connected tools.'
        :'Verified Professional (Pro) or Enterprise is required for connectors, AI customer agents, campaigns and automation. A plan request alone does not unlock access.'}
    </p>
    <div className="flex flex-wrap gap-3">
      <Link href={authenticated?'/vendor/billing':'/login?redirect=/vendor/marketing/engine'}
        className="inline-flex h-11 items-center rounded-lg bg-[#222225] px-5 text-xs font-bold text-white hover:bg-[#39393D]">
        {authenticated?'View billing & plans':'Sign in'}
      </Link>
      <Link href="/vendor/marketing" className="inline-flex h-11 items-center rounded-lg border border-[#E5E5EA] px-5 text-xs font-bold hover:bg-[#FFF7EE]">Marketing Studio overview</Link>
    </div>
    <p className="border-t border-[#EEEEF1] pt-4 text-[11px] leading-5 text-[#96969D]">Premium access is checked by the server against verified, unexpired entitlements. Your personal social accounts are not connected automatically.</p>
  </div>;
}

/** Server Component: prevents rendering premium child pages to Basic users. */
export default async function MarketingProOnly({children}:{children:React.ReactNode}){
  const access=await getMarketingAccess();
  if(!access.allowed)return <MarketingProNotice
    authenticated={access.authenticated}
    unavailable={access.reason==='unavailable'}/>;
  return <>{children}</>;
}
