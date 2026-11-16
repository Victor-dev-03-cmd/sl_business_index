'use client';
/* eslint-disable @next/next/no-img-element */
import {useEffect,useState} from 'react';
import {loadLinkedPoster,validHandoffId} from '@/lib/marketing/caption-poster-handoff';

/**
 * An image link saved to Campaign Planner is a same-device temporary asset,
 * never a publicly retrievable URL. If it expires, the saved caption remains.
 */
export default function LinkedCaptionPoster({localKey,businessId}:{
  localKey:string|undefined|null;businessId:string|null;
}){
  const [src,setSrc]=useState('');
  useEffect(()=>{
    if(!validHandoffId(localKey)||!businessId)return;
    let mounted=true;let url='';
    void loadLinkedPoster(localKey).then(found=>{
      if(!mounted||!found||found.context.businessId!==businessId)return;
      url=URL.createObjectURL(found.image);setSrc(url);
    }).catch(()=>{});
    return()=>{mounted=false;if(url)URL.revokeObjectURL(url);};
  },[localKey,businessId]);
  if(!validHandoffId(localKey))return null;
  return <div className="mt-3 flex items-center gap-3 rounded-xl border border-[#F0E7DF] bg-[#FFFBF8] p-2.5">
    {src?<img src={src} alt="Linked Poster Studio PNG on this device"
      className="h-20 w-16 rounded-lg border border-[#E5E7EB] bg-white object-contain"/>:
      <span className="flex h-20 w-16 items-center justify-center rounded-lg border border-dashed border-[#DDD5CD] text-[9px] text-[#9F8C7D]">Image expired</span>}
    <div className="text-[10px] leading-5 text-[#6B625C]">
      <p className="font-extrabold text-[#8E4F24]">Linked from AI Poster Studio</p>
      <p>{src?'Original PNG stored temporarily in this browser.':
        'Original PNG is unavailable on this device. Saved caption remains available.'}</p>
    </div>
  </div>;
}
