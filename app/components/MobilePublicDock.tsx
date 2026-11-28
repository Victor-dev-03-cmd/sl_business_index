'use client';

import {useEffect,useLayoutEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import BrandIcon from './BrandIcon';
import {useSession} from './SessionContext';
import {supabase} from '@/lib/supabaseClient';

/** Five mobile destinations; the last is role-aware after trusted RLS reads. */
export const mobilePublicTabs=[
  {href:'/',label:'Explore',icon:'home-2'},
  {href:'/category',label:'Categories',icon:'category-2'},
  {href:'/nearby',label:'Nearby',icon:'location'},
  {href:'/business-news',label:'Business News',icon:'note-2'},
  {href:'/about',label:'About',icon:'info-circle'},
] as const;

/**
 * Mobile viewport dock:
 *
 * Render the nav into document.body, completely outside site wrappers whose
 * stacking contexts, overflow, transformations, and streaming updates can
 * change the containing block of a normal position:fixed descendant.
 *
 * Use an EXPLICIT viewport-width-constrained size with left/right:0 and
 * auto margins rather than width:auto or a transform for centering.
 *
 * The dock is never gated on scrolling, input focus, media queries in JS,
 * page data or current scroll position. Mount during the first hydration
 * layout pass and leave it in place through scrolls and route changes.
 */
export default function MobilePublicDock({role='nav'}:{role?:'nav'|'spacer'}){
  const pathname=usePathname();
  const [portalRoot,setPortalRoot]=useState<HTMLElement|null>(null);

  const {user,loading:sessionLoading}=useSession();
  const [vendorIdentity,setVendorIdentity]=useState<{uid:string;isVendor:boolean;href:string}|null>(null);

  // The fifth tab stays About for visitors and ordinary users. We do not
  // trust user_metadata/app_metadata or a hard-coded email for vendor status.
  // A vendor account role or an already-owned listing qualifies. We link to
  // the actual owned Business Details page, never the vendor dashboard.
  // Supabase RLS still protects the underlying business/verification data.
  useEffect(()=>{
    // Root layout mounts a second spacer copy; it must not fetch twice.
    if(role!=='nav'||sessionLoading)return;
    let active=true;
    setVendorIdentity(null);
    if(!user?.id)return;
    const uid=user.id;
    const checkVendor=async()=>{
      try{
        const {data:profile}=await supabase.from('profiles')
          .select('role').eq('id',uid).maybeSingle();
        const accountRole=typeof profile?.role==='string'?profile.role.toLowerCase():'';
        // Staff keep the public About tab. They do not impersonate vendors.
        if(accountRole==='admin'||accountRole==='ceo'){
          if(active)setVendorIdentity({uid,isVendor:false,href:'/about'});
          return;
        }
        // Pick the oldest approved owned listing first, then the oldest other
        // listing. The public Business Details route supports slug and ID.
        // Never send the fifth tab to the vendor dashboard/settings.
        const {data:owned,error}=await supabase.from('businesses')
          .select('id,slug,status')
          .eq('owner_id',uid)
          .order('status',{ascending:true})
          .order('created_at',{ascending:true})
          .limit(1);
        const primary=!error&&Array.isArray(owned)?owned[0]:null;
        const isVendor=accountRole==='vendor'||Boolean(primary);
        const href=primary
          ?'/business/'+encodeURIComponent(String(primary.slug||primary.id))
          :'/register-business';
        if(active)setVendorIdentity({uid,isVendor,href});
      }catch{
        if(active)setVendorIdentity({uid,isVendor:false,href:'/about'});
      }
    };
    void checkVendor();
    return()=>{active=false};
  },[role,user?.id,sessionLoading]);

  const vendorTab=Boolean(user?.id && vendorIdentity?.uid===user.id && vendorIdentity.isVendor);

  useLayoutEffect(()=>{
    if(role==='nav')setPortalRoot(document.body);
  },[role]);

  // Nearby is a focused explorer with its own Map / Listings / Filters
  // mobile navigator. Never stack the global five-tab bar above that navigator.
  const excluded=['/login','/signup','/forgot-password','/reset-password',
    '/update-password','/auth','/admin','/vendor','/nearby'];
  if(excluded.some(route=>pathname===route||pathname.startsWith(route+'/')))return null;

  // The end-of-document spacer stays inside the page, NOT inside the portal.
  if(role==='spacer')return <div aria-hidden="true" className="h-[94px] sm:hidden"/>;

  if(!portalRoot)return null;

  return createPortal(
    <nav
      aria-label="Mobile quick navigation"
      data-slbi-viewport-dock="true"
      style={{
        position:'fixed',
        left:0,
        right:0,
        bottom:'max(12px, env(safe-area-inset-bottom, 0px))',
        width:'min(420px, calc(100vw - 24px))',
        maxWidth:420,
        marginInline:'auto',
        boxSizing:'border-box',
        transform:'none',
      }}
      className="z-[1200] grid h-[66px] grid-cols-5 items-center gap-0.5 overflow-hidden rounded-[20px] border border-white/30 bg-[#29453E]/95 px-1.5 text-[#E5F1E9] shadow-[0_12px_36px_rgba(7,31,23,.30)] backdrop-blur-xl supports-[backdrop-filter]:bg-[#304D43]/85 sm:hidden">
      {mobilePublicTabs.map((tab,index)=>{
        const destination=index===4 && vendorTab
          ?{href:vendorIdentity?.href||'/register-business',label:'My Profile',icon:'profile-circle'}
          :tab;
        const active=destination.href==='/'?pathname==='/':
          destination.href==='/category'?pathname==='/category'||pathname.startsWith('/category/'):
          destination.href==='/business-news'?pathname==='/business-news'||pathname.startsWith('/business-news/'):
          pathname===destination.href;
        return <Link key={tab.href} href={destination.href}
          prefetch={destination.href==='/nearby'?false:null}
          aria-label={destination.label}
          aria-current={active?'page':undefined}
          title={destination.label}
          className={'relative flex h-[56px] w-full min-w-0 items-center justify-center rounded-[14px] outline-none transition-colors touch-manipulation focus-visible:ring-2 focus-visible:ring-[#F0D19D] '+
            (active?'text-[#F1D39A]':'text-[#CEDCD2] hover:bg-white/10')}>
          <BrandIcon name={destination.icon} size={23}
            variant={active?'bulk':'linear'} className="shrink-0"/>
          {active&&<span aria-hidden="true"
            className="absolute bottom-[4px] h-[5px] w-[5px] rounded-full bg-[#F2D79F]"/>}
        </Link>;
      })}
    </nav>,
    portalRoot
  );
}
