/** Render instantly when navigating to an owner or visitor Business Details
 * route. Does not wait for the listing/gallery Supabase response. */
export default function BusinessDetailsLoading(){
  return <div data-slbi-business-route-skeleton="true" role="status"
    aria-label="Opening business profile"
    className="mx-auto min-h-[75dvh] max-w-[1480px] px-4 pb-20 pt-6 sm:px-6 lg:px-10">
    <div aria-hidden="true" className="space-y-6 motion-safe:animate-pulse">
      <div className="h-4 w-40 rounded-md bg-neutral-200"/>
      <div className="flex items-start gap-4 border-b border-neutral-100 pb-6">
        <div className="h-[104px] w-[104px] shrink-0 rounded-xl bg-neutral-100"/>
        <div className="min-w-0 flex-1 space-y-3 pt-2">
          <div className="h-4 w-28 rounded bg-neutral-200"/>
          <div className="h-7 w-4/5 max-w-[330px] rounded-lg bg-neutral-200"/>
          <div className="h-5 w-44 rounded bg-neutral-100"/>
          <div className="h-4 w-32 rounded bg-neutral-100"/>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="aspect-[4/3] rounded-xl bg-neutral-100"/>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-neutral-100"/>
          <div className="rounded-xl bg-neutral-100"/>
        </div>
      </div>
      <div className="h-24 rounded-xl bg-neutral-100"/>
    </div>
    <span className="sr-only">Business information is loading…</span>
  </div>;
}
