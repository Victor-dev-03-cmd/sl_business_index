'use client';
import type {PosterFormat} from '@/lib/marketing/poster-design';
import {POSTER_FORMATS} from '@/lib/marketing/poster-design';

/** Compact version of Campaign Planner's four SVG picture silhouettes.
 * Keeps the familiar dark-green canvas, apricot guide lines and orange CTA.
 * Distinct dimensions are UI labels; PNG export uses POSTER_FORMATS directly.
 */
const names:Record<PosterFormat,string>={
  square:'Square',portrait:'Portrait',story:'Story',landscape:'Wide',
};
const silhouettes:Record<PosterFormat,{w:number;h:number}>={
  square:{w:70,h:70},portrait:{w:57,h:76},
  story:{w:43,h:76},landscape:{w:78,h:43},
};
const order:PosterFormat[]=['story','portrait','square','landscape'];

export default function PuterCompactFormatSelector({
  selected,onChange,disabled=false,
}:{
  selected:PosterFormat;onChange:(value:PosterFormat)=>void;disabled?:boolean;
}){
  return <div role="radiogroup" aria-label="Poster export format"
    className="grid grid-cols-4 gap-1.5">
    {order.map(type=>{
      const dimension=POSTER_FORMATS[type];
      const shape=silhouettes[type];
      const active=selected===type;
      const x=(104-shape.w)/2,y=(94-shape.h)/2;
      return <button key={type} type="button" role="radio" aria-checked={active}
        aria-label={names[type]+': '+dimension.width+' by '+dimension.height+' pixels'}
        disabled={disabled} title={names[type]+' — '+dimension.width+' × '+dimension.height}
        onClick={()=>onChange(type)}
        className={'group flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl border px-1 py-1.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF7900] disabled:cursor-not-allowed disabled:opacity-50 '+
          (active?'border-[#FB790B] bg-[#FFF3E7] shadow-[inset_0_0_0_1px_rgba(251,121,11,.15)]':
            'border-[#E6E1DE] bg-white hover:border-[#E9AD72] hover:bg-[#FFFBF7]')}>
        <svg viewBox="0 0 104 94" className="h-[43px] w-[49px] max-w-full shrink-0"
          aria-hidden="true" focusable="false">
          <rect x={x} y={y} width={shape.w} height={shape.h} rx="5" fill="#1E4535"
            stroke={active?'#FB790B':'#7AA18A'} strokeWidth={active?3:1}/>
          <rect x={x+7} y={y+9} width={Math.max(8,shape.w-14)} height="5" rx="2" fill="#B6D9BE"/>
          <rect x={x+7} y={y+19} width={Math.max(10,shape.w-21)} height="4" rx="2" fill="#F8FBF8"/>
          <rect x={x+7} y={y+27} width={Math.max(8,shape.w-29)} height="4" rx="2" fill="#F8FBF8"/>
          <rect x={x+7} y={y+shape.h-16} width={Math.max(13,shape.w-14)}
            height="8" rx="3" fill="#FB790B"/>
        </svg>
        <span className={'text-[10px] font-bold leading-3 '+(active?'text-[#A3521B]':'text-[#4F494A]')}>
          {names[type]}
        </span>
      </button>;
    })}
  </div>;
}
