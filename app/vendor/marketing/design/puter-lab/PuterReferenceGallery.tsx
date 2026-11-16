'use client';
/* eslint-disable @next/next/no-img-element */
import {Check,Images,Sparkles} from 'lucide-react';
import {
  POSTER_REFERENCE_STYLES,suggestedPosterStyles,
  type PosterReferenceStyle,type PosterStyleId,
} from '@/lib/marketing/poster-reference-library';

export default function PuterReferenceGallery({
  chosen,onChoose,showAll,onToggleAll,
}:{
  chosen:PosterStyleId|null;
  onChoose:(style:PosterReferenceStyle)=>void;
  showAll:boolean;
  onToggleAll:()=>void;
}){
  const displayed=showAll?POSTER_REFERENCE_STYLES:suggestedPosterStyles(new Date());
  return <div className="flex h-full min-h-0 w-full flex-col gap-3 overflow-y-auto p-1 sm:p-2">
    <div className="flex shrink-0 items-start justify-between gap-2">
      <div>
        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.11em] text-[#B56B32]">
          <Sparkles size={13}/> Curated for the season
        </span>
        <h3 className="mt-0.5 text-sm font-extrabold text-[#31282A]">Start with a visual reference</h3>
        <p className="text-[10px] leading-4 text-[#94837F]">
          Choose a look. Your exact business text stays editable.
        </p>
      </div>
      <button type="button" onClick={onToggleAll}
        aria-expanded={showAll}
        className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[#DBD5D1] bg-white px-2 py-1.5 text-[10px] font-semibold text-[#705A50] hover:border-[#D5A57F]">
        <Images size={13}/>{showAll?'Seasonal':'All styles'}
      </button>
    </div>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {displayed.map(style=>{
        const selected=chosen===style.id;
        return <button key={style.id} type="button"
          aria-label={'Use '+style.name+' poster reference style'}
          aria-pressed={selected} onClick={()=>onChoose(style)}
          className={'group relative flex min-w-0 flex-col overflow-hidden rounded-xl border text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 '+
            (selected?'border-[#F17B28] bg-[#FFF5EB] ring-1 ring-[#F5AF70]':'border-[#E4DCD7] bg-white hover:border-[#DDB188]')}>
          <div className="relative w-full overflow-hidden bg-[#132B30]">
            <img src={style.thumbnail} alt={style.name+' original SLBI style artwork'}
              className="aspect-[5/4] w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"/>
            {selected&&<span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#F07723] text-white shadow-lg">
              <Check size={13}/></span>}
          </div>
          <div className="flex w-full items-center justify-between gap-1 px-2 py-1.5">
            <span className="truncate text-[10px] font-bold text-[#353032]">{style.name}</span>
            <span className="shrink-0 text-[9px] text-[#968883]">{style.category==='Evergreen'?'Anytime':'Seasonal'}</span>
          </div>
        </button>;
      })}
    </div>
    <div className="mt-auto shrink-0 text-center text-[10px] leading-4 text-[#9A8E86]">
      Original SLBI visual references · No external stock images · No image generated until you click Generate
    </div>
  </div>;
}
