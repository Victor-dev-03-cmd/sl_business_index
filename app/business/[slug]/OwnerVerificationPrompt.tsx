'use client';

import {useEffect,useState} from 'react';
import Link from 'next/link';
import {ArrowUpRight,ShieldAlert,ShieldCheck} from 'lucide-react';
import {useSession} from '@/app/components/SessionContext';
import {supabase} from '@/lib/supabaseClient';
import type {Business} from '@/lib/types';

type EvidenceState='pending'|'approved'|'unverified'|'unavailable';
type Lookup=Readonly<{userId:string;businessId:string;state:EvidenceState}>;

/**
 * Only the authenticated listing owner can take verification action.
 * Other viewers see a neutral status, never an owner-only dashboard CTA.
 * A request already under review must not be advertised as a new submission.
 */
export default function OwnerVerificationPrompt({
  business,
}:{business:Pick<Business,'id'|'owner_id'|'verification_status'>}){
  const {user,loading:sessionLoading}=useSession();
  const [lookup,setLookup]=useState<Lookup|null>(null);
  const businessId=String(business.id);
  const isOwner=Boolean(user?.id && business.owner_id && user.id===business.owner_id);

  useEffect(()=>{
    if(!isOwner||!user?.id)return;
    let active=true;
    const userId=user.id;
    const check=async()=>{
      try{
        const {data,error}=await supabase.from('verifications')
          .select('status')
          .eq('business_id',businessId)
          .order('created_at',{ascending:false})
          .limit(1)
          .maybeSingle();
        if(!active)return;
        if(error){
          setLookup({userId,businessId,state:'unavailable'});
          return;
        }
        const latest=String(data?.status||business.verification_status||'').toLowerCase();
        const state:EvidenceState=
          latest==='pending'?'pending':
          latest==='approved'||latest==='verified'?'approved':'unverified';
        setLookup({userId,businessId,state});
      }catch{
        if(active)setLookup({userId,businessId,state:'unavailable'});
      }
    };
    void check();
    return()=>{active=false};
  },[businessId,business.verification_status,isOwner,user?.id]);

  if(sessionLoading||!isOwner||lookup?.userId!==user?.id||lookup.businessId!==businessId){
    return <span data-verification-public-status className="inline-flex items-center gap-2 text-xs font-medium text-neutral-500">
      <ShieldAlert size={16} aria-hidden="true"/> Not verified
    </span>;
  }

  const verificationHref='/vendor/settings?tab=verification&business='+encodeURIComponent(businessId);
  if(lookup.state==='pending'||lookup.state==='approved'||lookup.state==='unavailable'){
    return <Link href={verificationHref}
      aria-label={'Review verification status for '+businessId}
      className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 transition hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600">
      <ShieldCheck size={17} aria-hidden="true"/>
      <span>{lookup.state==='pending'?'Verification under review':'Check verification status'}</span>
      <ArrowUpRight size={15} aria-hidden="true"/>
    </Link>;
  }

  return <Link href={verificationHref}
    data-owner-verification-prompt="true"
    aria-label="Please verify your business"
    className="slbi-owner-verify-cta inline-flex min-h-11 max-w-full origin-left items-center gap-2 rounded-xl border-2 border-orange-500 bg-orange-50 px-3 py-2 text-xs font-extrabold text-[#A53F08] shadow-sm transition-colors hover:bg-orange-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-700">
    <ShieldAlert size={18} aria-hidden="true" className="shrink-0"/>
    <span>Please verify your business</span>
    <ArrowUpRight size={15} aria-hidden="true" className="shrink-0"/>
  </Link>;
}
