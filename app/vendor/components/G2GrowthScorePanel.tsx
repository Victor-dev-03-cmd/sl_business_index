'use client';

import Link from 'next/link';
import {useQuery} from '@tanstack/react-query';
import {ArrowUpRight,CheckCircle2,Gauge,RefreshCw,ShieldAlert} from 'lucide-react';
import {
  G2_GROWTH_SCORE_VERSION,
  type G2GrowthScore,
  type G2ScoreSummary,
} from '@/lib/growth/g2/growth-score';

type ResponseBody={growthScore:G2GrowthScore};
const scoreLabel=(score:number|null)=>score===null?'—':String(score);
const percent=(num:number)=>Math.max(0,Math.min(100,num))+'%';
function Dimension({item}:{item:G2ScoreSummary}){
  return <div className="min-w-0 rounded-lg border border-[#EBE6E1] bg-white px-3 py-3">
    <div className="flex items-center justify-between gap-2">
      <span className="min-w-0 text-[11px] font-semibold text-[#4E4B4A]">{item.label}</span>
      <span className="shrink-0 text-[11px] font-extrabold tabular-nums text-[#242226]">
        {scoreLabel(item.score)}{item.score===null?'':'%'}
      </span>
    </div>
    <div className="mt-2 h-[6px] overflow-hidden rounded-full bg-[#EEE9E4]" role="progressbar"
      aria-label={item.label+' readiness'} aria-valuemin={0} aria-valuemax={100}
      aria-valuenow={item.score??undefined}>
      <div className="h-full rounded-full bg-[#F47A1B] transition-[width] duration-300"
        style={{width:percent(item.score??0)}}/>
    </div>
    <p className="mt-1.5 text-[10px] text-[#807871]">
      {item.observedWeight} / {item.totalWeight} evidence points observed
    </p>
  </div>;
}

/** Same read-only GrowthScore panel on Dashboard and all three G1 live pages.
 * No raw tenant data, mutations, AI, paid plan checks or background polling. */
export default function G2GrowthScorePanel({businessId,variant='full'}:{businessId:string;variant?:'full'|'compact'}){
  const {data,isPending,isFetching,error,refetch}=useQuery({
    queryKey:['g2-owner-growthscore',businessId],
    enabled:Boolean(businessId),
    retry:false,
    staleTime:60_000,
    refetchOnWindowFocus:false,
    queryFn:async({signal}):Promise<G2GrowthScore>=>{
      const response=await fetch('/api/vendor/g2-growthscore?businessId='+encodeURIComponent(businessId),{
        method:'GET',credentials:'same-origin',cache:'no-store',
        headers:{Accept:'application/json'},signal,
      });
      if(!response.ok)throw new Error('Growth evidence unavailable');
      const payload=await response.json() as ResponseBody;
      const result=payload?.growthScore;
      if(!result||result.version!==G2_GROWTH_SCORE_VERSION||
        result.businessId!==businessId||
        !Array.isArray(result.dimensions)||!Array.isArray(result.recommendations)||
        (result.score!==null && (!Number.isInteger(result.score)||result.score<0||result.score>100))||
        !Number.isInteger(result.evidenceCoveragePercent)||
        result.evidenceCoveragePercent<0||result.evidenceCoveragePercent>100){
        throw new Error('Growth evidence did not match selected business');
      }
      return result;
    },
  });
  if(variant==='compact'){
    return <section data-g3-growth-score="compact" aria-label="Business readiness GrowthScore"
      className="vendor-mobile-safe min-w-0 rounded-xl border border-[#F0DED0] bg-white p-3 sm:p-4">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Gauge size={17} className="shrink-0 text-[#D96B0D]" aria-hidden="true"/>
          <h3 className="min-w-0 text-[14px] font-extrabold text-[#252328]">GrowthScore</h3>
          <span className="vendor-status-badge rounded-md bg-[#FFF0E2] px-2 py-1 text-[11px] font-semibold text-[#9F4812]">Readiness v1</span>
        </div>
        <button type="button" aria-label="Refresh business readiness evidence"
          onClick={()=>void refetch()} disabled={!businessId||isFetching}
          className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-md border border-[#F2E1D3] bg-white px-2.5 text-[12px] font-semibold text-[#765544] hover:bg-[#FFF7EF] disabled:opacity-50">
          <RefreshCw size={14} className={isFetching?'animate-spin':''} aria-hidden="true"/> Refresh
        </button>
      </div>
      {!businessId||isPending?
        <div role="status" className="mt-3 h-24 animate-pulse rounded-lg bg-[#F4EDE6]" aria-label="Loading readiness evidence"/>:
      error||!data?
        <p role="alert" className="mt-3 rounded-lg bg-[#FFF5EB] p-3 text-[12px] leading-5 text-[#965221]">
          Readiness evidence is unavailable. Refresh to try again.
        </p>:
        <div className="mt-3 space-y-3">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <span className="shrink-0 text-[34px] font-extrabold leading-none tabular-nums tracking-tight text-[#262226]">
              {scoreLabel(data.score)}
              <span className="ml-1 text-[12px] font-semibold text-[#93857A]">/ 100</span>
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold leading-5 text-[#363039]">
                {data.status==='insufficient_data'?'Insufficient evidence':'Observed listing readiness'}
              </p>
              <p className="text-[12px] leading-5 text-[#766E67]">
                {data.evidenceCoveragePercent}% evidence coverage
                {data.status==='insufficient_data'?' · at least 75% required':''}
              </p>
            </div>
          </div>
          <div className="grid min-w-0 grid-cols-1 gap-2 min-[390px]:grid-cols-3">
            {data.dimensions.map(item=><div key={item.dimension} className="min-w-0 rounded-lg bg-[#FBF8F5] px-2.5 py-2">
              <div className="flex min-w-0 items-center justify-between gap-2">
                <span className="min-w-0 text-[11px] font-semibold leading-4 text-[#56504D]">{item.label}</span>
                <span className="shrink-0 text-[11px] font-bold tabular-nums text-[#252327]">
                  {scoreLabel(item.score)}{item.score===null?'':'%'}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#EEE2D8]" role="progressbar"
                aria-label={item.label+' evidence score'}
                aria-valuemin={0} aria-valuemax={100} aria-valuenow={item.score??undefined}>
                <div className="h-full rounded-full bg-[#F47A1B]" style={{width:percent(item.score??0)}}/>
              </div>
            </div>)}
          </div>
          {data.recommendations.length>0?
            <div className="flex min-w-0 flex-wrap items-center gap-2 border-t border-[#F0E5DA] pt-3">
              <span className="text-[11px] font-semibold text-[#6A605B]">Improve next:</span>
              {data.recommendations.slice(0,2).map(action=><Link href={action.href} key={action.key}
                className="vendor-status-badge inline-flex min-h-10 items-center gap-1 rounded-lg bg-[#292729] px-3 py-2 text-[12px] font-semibold text-white hover:bg-[#D96A11]">
                {action.actionLabel}<ArrowUpRight size={13} aria-hidden="true"/>
              </Link>)}
            </div>:
            <p className="text-[11px] leading-5 text-[#686158]">
              All observed listing-readiness tasks are complete.
            </p>}
        </div>}
    </section>;
  }
  return <section aria-label="GrowthScore and recommended next actions"
    className="min-w-0 rounded-xl border border-[#F2DAC3] bg-[#FFFAF6] p-4 sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Gauge size={18} className="text-[#D96B0D]" aria-hidden="true"/>
          <h3 className="text-[16px] font-extrabold tracking-tight text-[#222226]">GrowthScore</h3>
          <span className="rounded-md bg-[#FFF0E2] px-2 py-1 text-[10px] font-bold text-[#9F4812]">
            G2 · Readiness v1
          </span>
        </div>
        <p className="mt-1 max-w-xl text-[11px] leading-5 text-[#655D56]">
          Evidence-backed business readiness, not sales results, search ranking or a prediction of growth.
        </p>
      </div>
      <button type="button" disabled={!businessId||isFetching} onClick={()=>void refetch()}
        className="inline-flex min-h-10 items-center gap-1.5 rounded-md border border-[#EED9C8] bg-white px-3 py-2 text-[11px] font-semibold text-[#4A3730] transition hover:border-[#D77F3F] disabled:opacity-50"
        aria-label="Refresh GrowthScore evidence">
        <RefreshCw size={13} className={isFetching?'animate-spin':''}/> Refresh
      </button>
    </div>
    {!businessId||isPending?<div role="status" className="mt-4 space-y-3" aria-label="Loading GrowthScore">
      <div className="h-16 w-full animate-pulse rounded-lg bg-[#F2E9E1]"/>
      <div className="grid gap-2 sm:grid-cols-3">
        {[0,1,2].map(i=><div key={i} className="h-16 animate-pulse rounded-lg bg-[#F2E9E1]"/>)}
      </div>
    </div>:error||!data?<div role="alert" className="mt-4 rounded-lg border border-amber-200 bg-white p-4">
      <p className="flex items-center gap-2 text-[12px] font-semibold text-[#8C4814]">
        <ShieldAlert size={16}/> Could not verify this business's GrowthScore evidence.
      </p>
      <p className="mt-1 text-[11px] text-[#766B63]">No score has been estimated. Select Refresh to try again.</p>
    </div>:<div className="mt-4 space-y-4">
      <div className="grid items-center gap-4 rounded-lg border border-[#F2E2D4] bg-white p-4 sm:grid-cols-[auto_1fr]">
        <div className="flex items-end gap-1">
          <span className="text-[50px] font-extrabold tabular-nums leading-none tracking-[-.065em] text-[#202023]">
            {scoreLabel(data.score)}
          </span>
          <span className="pb-1 text-[12px] font-semibold text-[#9B8B80]">/ 100</span>
        </div>
        <div className="min-w-0">
          <p className="text-[12px] font-bold text-[#2E2926]">
            {data.status==='insufficient_data'?'Insufficient data for a reliable score':'Observed readiness score'}
          </p>
          <p className="mt-1 text-[11px] leading-5 text-[#756E69]">
            Evidence coverage: <strong className="text-[#35302C]">{data.evidenceCoveragePercent}%</strong>.
            {' '}Unknown fields are excluded, not treated as failures.
            {data.status==='insufficient_data'?' At least 75% coverage is required to show a score.':''}
          </p>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {data.dimensions.map(item=><Dimension key={item.dimension} item={item}/>)}
      </div>
      <div className="border-t border-[#F1E3D8] pt-3">
        <p className="text-[12px] font-extrabold text-[#302926]">Recommended next actions</p>
        {data.recommendations.length===0?<p className="mt-2 flex items-center gap-2 text-[11px] text-[#4F624C]">
          <CheckCircle2 size={15} aria-hidden="true"/> All observed readiness tasks are complete.
          {data.evidenceCoveragePercent<100?' Some source fields are still unavailable.':''}
        </p>:<div className="mt-2 grid gap-2 sm:grid-cols-2">
          {data.recommendations.slice(0,4).map((action,index)=><div key={action.key}
            className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-lg border border-[#EEE4DB] bg-white px-3 py-3">
            <div className="min-w-0">
              <span className="text-[11px] font-bold text-[#302926]">{index+1}. {action.title}</span>
              <p className="mt-1 text-[10px] text-[#786F67]">
                Missing · {action.weight} readiness points · {action.source}
              </p>
            </div>
            <Link href={action.href} className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-md bg-[#272428] px-3 py-2 text-[11px] font-bold text-white transition hover:bg-[#D66B17] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D66B17]">
              {action.actionLabel}<ArrowUpRight size={13} aria-hidden="true"/>
            </Link>
          </div>)}
        </div>}
      </div>
      <p className="text-[10px] leading-5 text-[#7A736C]">
        <ShieldAlert size={12} className="mr-1 inline" aria-hidden="true"/>
        No paid-plan or verification-badge boost. No private customer data, analytics traffic,
        credits or automatic publication are used. This is a diagnostic readiness estimate.
      </p>
    </div>}
  </section>;
}
