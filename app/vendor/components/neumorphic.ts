/** Shared Tailwind-only visual tokens for the SLBI owner portal.
 * Preserve a soft-neumorphic surface while keeping text, controls and tables accessible.
 * Do not add page-version selectors or per-route stylesheets here.
 */
export const neo = {
  page: 'mx-auto min-h-full w-full max-w-[1660px] min-w-0 space-y-6 pb-10 text-[#2c3240] [&_h1]:tracking-[-.045em] [&_h2]:tracking-[-.025em] motion-reduce:scroll-auto',
  hero: 'relative isolate overflow-hidden rounded-[28px] border border-white/60 bg-[#e9edf4] px-6 py-7 shadow-[11px_11px_27px_#c9ced7,-11px_-11px_27px_#ffffff] sm:px-8 sm:py-8',
  heroDark: 'relative isolate overflow-hidden rounded-[28px] border border-[#454651] bg-[linear-gradient(125deg,#20232d,#33353f)] px-6 py-8 text-white shadow-[11px_11px_25px_#bfc3cb,-10px_-10px_24px_#ffffff] sm:px-8 sm:py-9',
  card: 'min-w-0 rounded-[24px] border border-white/65 bg-[#e9edf4] shadow-[8px_8px_20px_#c9ced7,-8px_-8px_20px_#ffffff] motion-reduce:transition-none',
  tile: 'min-w-0 rounded-[20px] border border-white/50 bg-[#e9edf4] shadow-[5px_5px_13px_#c7ccd6,-5px_-5px_13px_#ffffff] transition-[box-shadow,transform] duration-150 hover:shadow-[inset_3px_3px_8px_#c5cad4,inset_-3px_-3px_8px_#ffffff] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff7900] motion-reduce:transition-none',
  inset: 'rounded-[18px] border border-white/50 bg-[#e9edf4] shadow-[inset_5px_5px_10px_#c8cdd7,inset_-5px_-5px_10px_#ffffff]',
  input: 'min-h-11 min-w-0 w-full rounded-[15px] border border-[#d5dbe5] bg-[#e9edf4] px-3.5 py-2.5 text-xs font-medium text-[#353b49] shadow-[inset_3px_3px_7px_#ccd1db,inset_-3px_-3px_7px_#ffffff] outline-none placeholder:text-[#979dad] focus:border-[#ff7900] focus:ring-2 focus:ring-[#ff7900]/20 disabled:cursor-not-allowed disabled:opacity-50',
  button: 'inline-flex min-h-10 items-center justify-center gap-2 rounded-[14px] border border-white/70 bg-[#e9edf4] px-4 py-2 text-xs font-bold text-[#555d6a] shadow-[4px_4px_9px_#c8cdd6,-4px_-4px_9px_#ffffff] transition-colors hover:text-[#d9670c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff7900] disabled:cursor-not-allowed disabled:opacity-45 motion-reduce:transition-none',
  primary: 'inline-flex min-h-10 items-center justify-center gap-2 rounded-[14px] bg-[#ff7900] px-5 py-2 text-xs font-extrabold text-white shadow-[5px_5px_12px_#c6cbd4,-4px_-4px_10px_#ffffff] transition-colors hover:bg-[#e66d00] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff7900] disabled:cursor-not-allowed disabled:opacity-45 motion-reduce:transition-none',
} as const;
