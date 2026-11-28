'use client';

import {useEffect,useState} from 'react';
import {usePathname} from 'next/navigation';
import {mobileDaypart} from '@/lib/ui/mobile-daypart';

type Props={loading?:boolean;username?:string|null;fullName?:string|null;email?:string|null};

/** Public mobile header only; no extra account fetch or render-time clock
 * drift. React SSR and initial client output match before the first effect. */
export default function MobileGreeting({username,fullName,email,loading=false}:Props){
  const [greeting,setGreeting]=useState(()=>mobileDaypart(-1));
  const isMobileHome=usePathname()==='/';
  useEffect(()=>{
    const update=()=>setGreeting(mobileDaypart(new Date().getHours()));
    update();
    const timer=window.setInterval(update,60_000);
    document.addEventListener('visibilitychange',update);
    return()=>{
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange',update);
    };
  },[]);
  const fromProfile=(username?.trim()||fullName?.trim()||'');
  const name=(fromProfile||email?.split('@')[0]?.trim()||'Explorer').slice(0,90);
  return <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 sm:hidden"
    aria-label="Welcome to SL Business Index">
    <span data-slbi-mobile-username="true" className="block truncate text-[15px] font-semibold leading-[1.3] tracking-[-.025em] text-[#172D27]"
      title={isMobileHome ? 'Welcome, '+name : 'Hello, '+name}>
      {loading ? <span aria-label="Loading account" className="inline-block h-4 w-28 animate-pulse rounded bg-neutral-200"/> : isMobileHome ? <>Welcome, {name}</> : <>Hello, {name}</>}
    </span>
    <span className="block text-[12px] font-medium leading-[1.4] text-[#6A766D]">
      {greeting.label} <span aria-hidden="true">{greeting.emoji}</span>
    </span>
  </div>;
}
