/** Fast route-level streaming boundary for public and vendor navigation.
 * Keep the shell visible while server-side data is loading; no DB fetches. */
export default function GlobalRouteLoading(){
  return <section aria-label="Loading page" role="status"
    className="mx-auto min-h-[56dvh] w-full max-w-[1280px] px-4 pb-20 pt-7 sm:px-8">
    <div className="space-y-4 motion-safe:animate-pulse" aria-hidden="true">
      <div className="h-5 w-36 rounded-lg bg-neutral-200"/>
      <div className="h-9 w-3/5 max-w-[480px] rounded-xl bg-neutral-200"/>
      <div className="h-4 w-4/5 max-w-[560px] rounded-md bg-neutral-100"/>
      <div className="grid gap-4 pt-5 sm:grid-cols-3">
        <div className="h-48 rounded-2xl border border-neutral-100 bg-neutral-100"/>
        <div className="h-48 rounded-2xl border border-neutral-100 bg-neutral-100"/>
        <div className="h-48 rounded-2xl border border-neutral-100 bg-neutral-100"/>
      </div>
    </div>
    <span className="sr-only">Loading page content…</span>
  </section>;
}
