'use client';
/* eslint-disable @next/next/no-img-element */
import {useEffect,useState} from 'react';
import {loadLinkedPoster,validHandoffId} from '@/lib/marketing/caption-poster-handoff';
import {privatePosterUrl} from '@/lib/marketing/saved-poster-cloud-client';

/** Legacy drafts still support two-hour browser handoff. New Caption Lab drafts
 * use a PRIVATE, owner-scoped cloud PNG ID linked in marketing_campaigns. No
 * public URL, no signed cross-business image and no automatic publishing. */
export default function LinkedCaptionPoster({localKey,businessId,assetId}:{
  localKey?:string|null;businessId:string|null;assetId?:string|null;
}){
  const [src,setSrc]=useState('');
  useEffect(()=>{
    if(assetId||!validHandoffId(localKey)||!businessId)return;
    let mounted=true;let url='';
    void loadLinkedPoster(localKey).then(found=>{
      if(!mounted||!found||found.context.businessId!==businessId)return;
      url=URL.createObjectURL(found.image);setSrc(url);
    }).catch(()=>{});
    return()=>{mounted=false;if(url)URL.revokeObjectURL(url);};
  },[localKey,businessId,assetId]);
  let cloudSrc='';
  try{if(businessId&&assetId)cloudSrc=privatePosterUrl(businessId,assetId);}
  catch{/* Reject forged/non-UUID data rather than constructing an open path. */}
  if(!cloudSrc&&!validHandoffId(localKey))return null;
  const imageSrc=cloudSrc||src;
  return <div className="mt-3 flex items-center gap-3 rounded-xl border border-[#F0E7DF] bg-[#FFFBF8] p-2.5">
    {imageSrc?<img src={imageSrc} alt={cloudSrc?'Private saved campaign PNG':'Legacy local poster'}
      className="h-20 w-16 rounded-lg border border-[#E5E7EB] bg-white object-contain"/>:
      <span className="flex h-20 w-16 items-center justify-center rounded-lg border border-dashed border-[#DDD5CD] text-[9px] text-[#9F8C7D]">
        Image expired
      </span>}
    <div className="min-w-0 text-[10px] leading-5 text-[#6B625C]">
      <p className="font-extrabold text-[#8E4F24]">
        {cloudSrc?'Private saved poster':'Linked from AI Poster Studio'}
      </p>
      <p>{cloudSrc?'Owner-only PNG saved in your SLBI private library.':
        src?'Temporary PNG on this browser (legacy draft).':
          'Temporary image is unavailable. Saved caption remains available.'}</p>
      {cloudSrc&&<a href={cloudSrc} download={'slbi-campaign-poster-'+assetId+'.png'}
        className="mt-1 inline-block font-bold text-[#9A3412] underline">
        Download saved PNG
      </a>}
    </div>
  </div>;
}
