'use client';

import {useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import Link from 'next/link';
import {BookOpen,CheckCircle2,Images,RefreshCw,ShieldCheck,ArrowUpRight} from 'lucide-react';
import type {G1ReadOnlyKnowledge,G1Field} from '@/lib/growth/g1/read-only-knowledge';

export type G1BusinessChoice={id:string;name:string;status?:string|null};
type ContextResponse={context:G1ReadOnlyKnowledge};
const fieldText=(field:G1Field<string>):string=>
  field.state==='missing'||field.value===null?'Not provided':field.value;
const label='text-[10px] font-semibold uppercase tracking-[.10em] text-neutral-500';
const panel='rounded-xl border border-[#E9E6E4] bg-white p-4 shadow-[0_4px_20px_rgba(20,20,25,0.035)] sm:p-5';

export default function G1BusinessKnowledgePanel({
  businesses,businessId,location='business',
}:{
  businesses:G1BusinessChoice[];
  businessId?:string;
  location?:'business'|'gallery'|'marketing';
}){
  const [chosenId,setChosenId]=useState('');
  const approved=businesses.filter(b=>b.status==='approved');
  const active=businessId
    ?approved.find(b=>b.id===businessId)
    :approved.find(b=>b.id===chosenId)||approved[0];
  const id=active?.id||'';
  const {data,isFetching,isPending,error,refetch}=useQuery({
    queryKey:['g1-owned-business-knowledge',id],
    enabled:Boolean(id),
    retry:false,
    staleTime:30_000,
    refetchOnWindowFocus:false,
    queryFn:async({signal}):Promise<G1ReadOnlyKnowledge>=>{
      const response=await fetch('/api/vendor/g1-knowledge?businessId='+encodeURIComponent(id),{
        method:'GET',credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'},signal,
      });
      if(!response.ok)throw new Error('Knowledge summary unavailable. Please try again.');
      const result=await response.json() as ContextResponse;
      if(result?.context?.schemaVersion!=='g1-knowledge-preview-v0'||result.context.businessId!==id){
        throw new Error('The returned business information did not match your selection.');
      }
      return result.context;
    },
  });
  return <section aria-label="GrowthOS Business Knowledge" className={panel}>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <div className="flex items-center gap-2"><BookOpen size={18} className="text-[#E36F0B]"/>
          <h2 className="text-[16px] font-bold tracking-tight text-[#202024]">Business Knowledge</h2>
          <span className="rounded-md bg-[#FFF1E6] px-2 py-1 text-[10px] font-bold text-[#AC5410]">G1 · Live read-only</span>
        </div>
        <p className="mt-1 text-[12px] leading-5 text-neutral-500">
          {location==='marketing'?'Review your approved business facts before preparing campaign content.':
            location==='gallery'?'See which approved listing details are available for GrowthOS.':
            'Check the approved facts your GrowthOS tools can safely reference.'}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {!businessId&&approved.length>1&&<label className="text-[11px] font-semibold text-neutral-600">
          <span className="sr-only">Choose approved business</span>
          <select aria-label="Choose approved business" value={id} onChange={e=>setChosenId(e.target.value)}
            className="h-9 max-w-[220px] rounded-md border border-[#e8e1db] bg-white px-2 text-[11px]">
            {approved.map(b=><option value={b.id} key={b.id}>{b.name}</option>)}
          </select>
        </label>}
        {!!id&&<button type="button" onClick={()=>void refetch()} disabled={isFetching}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-[#e7e2df] px-3 text-[11px] font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50">
          <RefreshCw size={13} className={isFetching?'animate-spin':''}/> Refresh
        </button>}
      </div>
    </div>
    {!id?<div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-[12px] text-amber-950">
      {businessId?'This business is not published yet. Its G1 knowledge becomes available after approval.':
        'No approved business yet. Publish a business listing first to see its GrowthOS knowledge.'}
    </div>:error?<div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-[12px] text-red-800">
      We could not verify this business knowledge. Your private data was not displayed. Select Refresh to try again.
    </div>:isPending||!data?<p role="status" className="mt-4 rounded-lg bg-neutral-50 p-4 text-[12px] text-neutral-500">
      Checking your approved business and brand information…
    </p>:<div className="mt-4 space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-[#FAF8F6] p-3"><p className={label}>Business</p>
          <p className="mt-1 break-words text-[13px] font-semibold text-[#262426]">{fieldText(data.listing.name)}</p>
          <p className="mt-1 text-[11px] text-neutral-500">{fieldText(data.listing.category)}</p></div>
        <div className="rounded-lg bg-[#FAF8F6] p-3"><p className={label}>Brand profile</p>
          <p className="mt-1 break-words text-[13px] font-semibold text-[#262426]">{fieldText(data.brand.name)}</p>
          <p className="mt-1 break-words text-[11px] text-neutral-500">{fieldText(data.brand.slogan)}</p></div>
        <div className="rounded-lg bg-[#FAF8F6] p-3"><p className={label}>Services</p>
          <p className="mt-1 text-[20px] font-bold text-[#262426]">
            {data.services.value===null?'—':data.services.value.length}
          </p>
          <p className="mt-1 break-words text-[11px] text-neutral-500">{data.services.value?.join(' · ')||'No services recorded'}</p></div>
        <div className="rounded-lg bg-[#FAF8F6] p-3"><p className={label}>Gallery images</p>
          <p className="mt-1 text-[20px] font-bold text-[#262426]">{data.galleryImageCount.value??'—'}</p>
          <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-neutral-600">
            {data.listing.verification.value?<><CheckCircle2 size={12} className="text-blue-600"/>Verified business</>:
              <><ShieldCheck size={12}/>Verification not confirmed</>}
          </p></div>
      </div>
      <div className="flex flex-wrap items-start justify-between gap-3 border-t border-[#f0ece9] pt-3">
        <p className="max-w-xl text-[11px] leading-5 text-neutral-500">
          <ShieldCheck size={13} className="mr-1 inline text-[#DE741B]"/>
          Read-only owner information. Offers and private guidelines are withheld; nothing is automatically sent to an AI or published.
          {data.brand.languages.value?.length?' Languages: '+data.brand.languages.value.join(', ').toUpperCase()+'.':''}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={'/vendor/my-businesses/'+encodeURIComponent(id)+'/edit'}
            className="inline-flex items-center gap-1 rounded-md border border-[#e8e0da] px-3 py-2 text-[11px] font-semibold text-[#3c3531] hover:bg-[#FFF6ED]">
            Edit business <ArrowUpRight size={12}/>
          </Link>
          {location!=='gallery'&&<Link href={'/vendor/gallery-services?business='+encodeURIComponent(id)}
            className="inline-flex items-center gap-1 rounded-md bg-[#242428] px-3 py-2 text-[11px] font-semibold text-white hover:bg-[#E97817]">
            <Images size={12}/> Gallery &amp; Services
          </Link>}
          {location!=='marketing'&&<Link href="/vendor/marketing"
            className="inline-flex items-center gap-1 rounded-md border border-[#e8e0da] px-3 py-2 text-[11px] font-semibold text-[#3c3531] hover:bg-[#FFF6ED]">
            Marketing Studio <ArrowUpRight size={12}/>
          </Link>}
        </div>
      </div>
    </div>}
  </section>;
}
