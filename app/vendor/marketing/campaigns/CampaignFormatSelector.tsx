'use client';
import type { CampaignFormat,CampaignLanguage } from '@/lib/marketing/campaign-language';
import { FORMATS } from '@/lib/marketing/campaign-language';
const names:Record<CampaignFormat,string>={square:'Square',portrait:'Portrait',story:'Mobile Story',landscape:'Landscape'};
const shapes:Record<CampaignFormat,{w:number;h:number}> = {
  square:{w:70,h:70},portrait:{w:57,h:76},story:{w:43,h:76},landscape:{w:78,h:43},
};
export default function CampaignFormatSelector({selected,onChange,language}:{selected:CampaignFormat;onChange:(value:CampaignFormat)=>void;language:CampaignLanguage}){
  return <div role="radiogroup" aria-label="Social media picture dimensions" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
    {(Object.keys(FORMATS) as CampaignFormat[]).map(type=>{
      const item=FORMATS[type],shape=shapes[type],active=selected===type;
      return <button key={type} type="button" role="radio" aria-checked={active} onClick={()=>onChange(type)}
        className={'group flex min-h-[158px] flex-col items-center justify-between rounded-2xl border p-3 text-center transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF7900] '+(active?'border-[#FB790B] bg-[#FFF4E9] shadow-[0_0_0_2px_rgba(255,121,0,.15)]':'border-[#E5E3E3] bg-white hover:border-[#E9AD72]')}>
        <svg viewBox="0 0 104 94" className="h-[83px] w-full max-w-[110px]" role="img" aria-label={names[type]+' picture preview'}>
          <rect x={(104-shape.w)/2} y={(94-shape.h)/2} width={shape.w} height={shape.h} rx="5" fill="#1E4535" stroke={active?'#FB790B':'#7AA18A'} strokeWidth={active?2:1}/>
          <rect x={(104-shape.w)/2+7} y={(94-shape.h)/2+9} width={shape.w-14} height="5" rx="2" fill="#B6D9BE"/>
          <rect x={(104-shape.w)/2+7} y={(94-shape.h)/2+19} width={Math.max(12,shape.w-21)} height="4" rx="2" fill="#F8FBF8"/>
          <rect x={(104-shape.w)/2+7} y={(94-shape.h)/2+27} width={Math.max(10,shape.w-29)} height="4" rx="2" fill="#F8FBF8"/>
          <rect x={(104-shape.w)/2+7} y={(94+shape.h)/2-16} width={Math.max(18,shape.w-14)} height="8" rx="3" fill="#FB790B"/>
        </svg>
        <div className="space-y-1">
          <p className="text-[11px] font-extrabold text-[#29262B]">{names[type]}</p>
          <p className="text-[10px] font-medium text-[#77717A]">{item.w} × {item.h}</p>
          <p className="min-h-7 text-[10px] leading-4 text-[#77717A]">{item.hint[language]}</p>
        </div>
      </button>;
    })}
  </div>;
}
