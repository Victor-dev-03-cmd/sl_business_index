type SkeletonVariant='store'|'module'|'editor';
const pulse='bg-[#E9E8EA] motion-safe:animate-pulse motion-reduce:animate-none';
/** Layout-sized placeholders prevent visual jumps while verified data loads. */
export default function MarketingRouteSkeleton({variant='store'}:{variant?:SkeletonVariant}){
  const isStore=variant==='store';
  return <main role="status" aria-label={isStore?'Loading Marketing Studio':'Loading marketing workspace'}
    aria-busy="true" className="mx-auto w-full max-w-[1540px] space-y-6 pb-12">
    <span className="sr-only">{isStore?'Loading marketing apps and campaign activity':'Preparing your marketing workspace'}</span>
    <header aria-hidden="true" className={'relative min-h-[226px] overflow-hidden rounded-[22px] border p-7 sm:p-10 '+
      (isStore?'border-[#29272C] bg-[#1D1D20]':'border-[#ECEBF0] bg-white')}>
      <div className="max-w-[740px] space-y-5">
        <div className={'h-4 w-36 rounded '+(isStore?'bg-white/20':pulse)}/>
        <div className={'h-10 w-3/4 max-w-[480px] rounded-lg '+(isStore?'bg-white/20':pulse)}/>
        <div className={'h-3 w-full rounded '+(isStore?'bg-white/15':pulse)}/>
        <div className={'h-3 w-2/3 rounded '+(isStore?'bg-white/15':pulse)}/>
      </div>
    </header>
    {isStore&&<section aria-hidden="true" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {Array.from({length:4},(_,i)=><div key={i} className="space-y-4 rounded-xl border border-[#ECEBF0] bg-white p-5">
        <div className={'h-3 w-28 max-w-full rounded '+pulse}/>
        <div className={'h-8 w-16 rounded '+pulse}/>
        <div className={'h-2 w-36 max-w-full rounded '+pulse}/>
      </div>)}
    </section>}
    <section aria-hidden="true" className="space-y-4">
      <div className={'h-7 w-60 max-w-full rounded '+pulse}/>
      <div className={'h-11 w-full rounded-xl '+pulse}/>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {Array.from({length:isStore?8:variant==='editor'?2:6},(_,i)=>
          <div key={i} className={'space-y-5 rounded-[18px] border border-[#E9E8EB] bg-white p-5 '+
            (variant==='editor'?'min-h-[320px]':'min-h-[225px]')}>
            <div className={'h-[62px] w-[62px] rounded-2xl '+pulse}/>
            <div className={'h-4 w-2/3 rounded '+pulse}/>
            <div className={'h-3 w-full rounded '+pulse}/>
            <div className={'h-3 w-4/5 rounded '+pulse}/>
            <div className={'h-3 w-1/2 rounded '+pulse}/>
          </div>)}
      </div>
    </section>
  </main>;
}
