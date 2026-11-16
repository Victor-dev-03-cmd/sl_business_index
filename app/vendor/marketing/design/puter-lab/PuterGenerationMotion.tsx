'use client';
/* eslint-disable @next/next/no-img-element */
import {Sparkles,WandSparkles,Type,Check} from 'lucide-react';
import type {PosterReferenceStyle} from '@/lib/marketing/poster-reference-library';
export type PosterGenerationStage='idle'|'connecting'|'artwork'|'typography'|'ready'|'error';

export default function PuterGenerationMotion({
  stage,percentage,reference,
}:{
  stage:PosterGenerationStage;percentage:number;
  reference?:PosterReferenceStyle;
}){
  const progress=Math.max(2,Math.min(100,Math.round(percentage)));
  const artwork=stage==='artwork';
  const title=stage==='connecting'?'Connecting to Puter…':
    artwork?'Creating your artwork…':
    stage==='typography'?'Composing exact typography…':
    stage==='ready'?'Artwork complete':'Preparing poster…';
  const hint=artwork?'Image model inference time varies; percentage is estimated.':
    stage==='typography'?'Applying approved business copy and preparing full-size PNG.':
    'Validating your selected style and provider session.';
  return <div role="status" aria-live="polite"
    className="absolute inset-0 z-10 flex flex-col items-center justify-center overflow-hidden rounded-xl bg-[#101622]/95 px-5 py-4 text-white">
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="puter-loader-aurora absolute -left-1/4 -top-1/4 h-3/4 w-3/4 rounded-full bg-[#EF9F4B]/20 blur-3xl"/>
      <div className="puter-loader-aurora puter-loader-delay absolute -bottom-1/4 -right-1/4 h-3/4 w-3/4 rounded-full bg-[#4C73C5]/20 blur-3xl"/>
      <div className="puter-loader-grid absolute inset-0 opacity-25"/>
    </div>
    <div className="relative flex max-h-full w-full max-w-[310px] flex-col items-center gap-3">
      <div className="relative aspect-[4/5] h-[min(35dvh,205px)] shrink-0 overflow-hidden rounded-2xl border border-white/25 bg-[#17243A] shadow-[0_22px_75px_rgba(0,0,0,.45)]">
        {reference?<img src={reference.thumbnail} alt="" className="absolute inset-0 h-full w-full object-cover opacity-55"/>:
          <div className="absolute inset-0 bg-gradient-to-br from-[#263F6C] via-[#171D39] to-[#251831]"/>}
        <div className="puter-loader-shine absolute inset-0 bg-gradient-to-r from-transparent via-[#FFFFFF]/25 to-transparent"/>
        <div className="absolute inset-x-5 bottom-6 flex flex-col gap-2">
          <span className="h-2 w-2/3 rounded bg-[#F2D08B]/80"/>
          <span className="h-2 w-full rounded bg-white/65"/>
          <span className="h-2 w-3/4 rounded bg-white/35"/>
        </div>
        <div className="absolute left-1/2 top-1/3 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full border border-white/30 bg-black/25 backdrop-blur-sm">
          {stage==='typography'?<Type size={23} className="text-[#FFD298]"/>:
            stage==='ready'?<Check size={23} className="text-[#A7EDB8]"/>:
              <WandSparkles size={24} className="puter-loader-spark text-[#FFD298]"/>}
        </div>
      </div>
      <div className="w-full space-y-2 text-center">
        <p className="text-[13px] font-extrabold tracking-tight">{title}</p>
        <p className="text-[10px] leading-4 text-[#D7D5D6]">{hint}</p>
        <div className="relative h-1.5 overflow-hidden rounded-full bg-white/20" role="progressbar"
          aria-label="Estimated poster creation progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
          <div className="h-full rounded-full bg-gradient-to-r from-[#F0A451] to-[#FFE4A6] transition-[width] duration-700"
            style={{width:progress+'%'}}/>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 text-[10px] text-[#CFCDD1]">
            <Sparkles size={11}/> {reference?.name||'Custom artwork'}
          </span>
          <span className="text-[11px] font-bold tabular-nums text-[#FFD298]">
            {progress}% <span className="font-normal text-[#C6C3C9]">{stage==='ready'?'complete':'estimated'}</span>
          </span>
        </div>
      </div>
    </div>
  </div>;
}
