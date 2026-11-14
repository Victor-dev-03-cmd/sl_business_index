/** Layout-shaped fallback during the first account context request. */
export default function VendorBootSkeleton(){
  const pulse='bg-[#E8E6E9] motion-safe:animate-pulse motion-reduce:animate-none';
  return <div role="status" aria-label="Loading vendor workspace" aria-busy="true"
    className="vendor-workspace vendor-workspace-v6 flex h-[100dvh] min-w-0 flex-col overflow-hidden bg-white text-[#242428]">
    <span className="sr-only">Preparing your vendor workspace</span>
    <header aria-hidden="true" className="shrink-0 border-b border-[#EEECEF] bg-white px-4 py-4 sm:px-7">
      <div className="mx-auto flex max-w-[1760px] items-center justify-between gap-4">
        <div className="flex items-center gap-3"><span className={'h-10 w-10 rounded-xl '+pulse}/>
          <div className="space-y-2"><div className={'h-3 w-32 rounded-md '+pulse}/><div className={'h-2 w-20 rounded '+pulse}/></div>
        </div>
        <div className="hidden items-center gap-3 lg:flex">{Array.from({length:4},(_,i)=><span key={i} className={'h-8 w-20 rounded-lg '+pulse}/>)}</div>
        <span className={'h-9 w-28 rounded-lg '+pulse}/>
      </div>
    </header>
    <main aria-hidden="true" className="min-h-0 flex-1 overflow-hidden px-4 py-7 sm:px-7">
      <div className="mx-auto max-w-[1480px] space-y-5">
        <div className="space-y-3 rounded-[20px] border border-[#EDEBED] p-6">
          <div className={'h-3 w-24 rounded '+pulse}/><div className={'h-8 w-56 max-w-full rounded-lg '+pulse}/>
          <div className={'h-3 w-[65%] rounded '+pulse}/>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({length:4},(_,i)=><div key={i} className="space-y-4 rounded-xl border border-[#EDEBED] p-5">
            <div className={'h-3 w-20 rounded '+pulse}/><div className={'h-7 w-14 rounded-md '+pulse}/>
            <div className={'h-2 w-[70%] rounded '+pulse}/>
          </div>)}
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {Array.from({length:3},(_,i)=><div key={i} className="space-y-4 rounded-xl border border-[#EDEBED] p-5">
            <div className={'h-10 w-10 rounded-xl '+pulse}/><div className={'h-4 w-2/3 rounded '+pulse}/>
            <div className={'h-3 w-full rounded '+pulse}/><div className={'h-3 w-3/4 rounded '+pulse}/>
          </div>)}
        </div>
      </div>
    </main>
  </div>;
}
