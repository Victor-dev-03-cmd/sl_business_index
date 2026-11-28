/** Render instantly when navigating to an owner or visitor Business Details
 * route. Does not wait for the listing/gallery Supabase response. */
export default function BusinessDetailsLoading(){
  return <div data-slbi-business-route-skeleton="true" role="status"
    aria-label="Opening business profile"
    className="mx-auto min-h-[75dvh] max-w-[1480px] px-4 pb-20 pt-6 sm:px-6 lg:px-10">
    <div aria-hidden="true" className="space-y-6 motion-safe:animate-pulse">
      <div className="h-4 w-40 rounded-md bg-neutral-200"/>
      <div className="grid grid-cols-2 items-start gap-3 sm:grid-cols-[144px_minmax(0,1fr)] sm:gap-4">
        <div className="aspect-square w-full rounded-xl bg-neutral-100"/>
        <div className="min-w-0 flex-1 space-y-3 pt-2">
          <div className="h-4 w-3/4 rounded bg-neutral-200"/>
          <div className="h-7 w-4/5 max-w-[330px] rounded-lg bg-neutral-200"/>
          <div className="h-5 w-4/5 rounded bg-neutral-100"/>
          <div className="h-4 w-3/4 rounded bg-neutral-100"/>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 rounded-xl border border-neutral-100 p-3 sm:hidden"><div className="h-10 rounded-full bg-neutral-200"/><div className="h-10 rounded-full bg-neutral-100"/></div>
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
