/** Shared Tailwind-only visual tokens for the SLBI owner portal.
 * Preserve a soft-neumorphic surface while keeping text, controls and tables accessible.
 * Do not add page-version selectors or per-route stylesheets here.
 */
export const neo = {
  page: 'mx-auto min-h-full w-full max-w-[1660px] min-w-0 space-y-6 pb-10 text-[#202024] [&_h1]:tracking-[-.045em] [&_h2]:tracking-[-.025em] motion-reduce:scroll-auto',
  hero: 'relative isolate overflow-hidden rounded-[26px] border border-[#ececf0] border-l-[3px] border-l-[#ff7900] bg-white px-6 py-7 shadow-[8px_9px_24px_#e7e7ec,-7px_-7px_24px_#ffffff] sm:px-8 sm:py-8',
  heroDark: 'relative isolate overflow-hidden rounded-[26px] border border-[#36363c] border-l-[3px] border-l-[#ff7900] bg-[linear-gradient(125deg,#1d1d20,#29292e)] px-6 py-8 text-white shadow-[0_12px_25px_rgba(28,28,32,0.13)] sm:px-8 sm:py-9',
  card: 'min-w-0 rounded-[22px] border border-[#ededf0] bg-white shadow-[7px_8px_19px_#e7e7eb,-7px_-7px_19px_#ffffff] motion-reduce:transition-none',
  tile: 'min-w-0 rounded-[18px] border border-[#ededf0] bg-white shadow-[5px_6px_13px_#e9e9ed,-5px_-5px_13px_#ffffff] transition-colors duration-150 hover:border-[#ffc48e] hover:bg-[#fffdfb] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff7900] motion-reduce:transition-none',
  inset: 'rounded-[17px] border border-[#ececef] bg-[#fafafb] shadow-[inset_3px_3px_8px_#e8e8eb,inset_-3px_-3px_8px_#ffffff]',
  input: 'min-h-11 min-w-0 w-full rounded-[13px] border border-[#dedee3] bg-white px-3.5 py-2.5 text-xs font-medium text-[#303035] shadow-[inset_2px_2px_5px_#ededf0,inset_-2px_-2px_5px_#ffffff] outline-none placeholder:text-[#777780] focus:border-[#ff7900] focus:ring-2 focus:ring-[#ff7900]/20 disabled:cursor-not-allowed disabled:opacity-50',
  button: 'inline-flex min-h-10 items-center justify-center gap-2 rounded-[13px] border border-[#e6e6ea] bg-white px-4 py-2 text-xs font-bold text-[#333338] shadow-[4px_5px_11px_#e9e9ed,-4px_-4px_11px_#ffffff] transition-colors hover:border-[#ffba80] hover:bg-[#fff8f2] hover:text-[#c55d04] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff7900] disabled:cursor-not-allowed disabled:opacity-45 motion-reduce:transition-none',
  primary: 'inline-flex min-h-10 items-center justify-center gap-2 rounded-[13px] bg-[#ff7900] px-5 py-2 text-xs font-extrabold text-white shadow-[0_7px_17px_rgba(255,121,0,0.19)] transition-colors hover:bg-[#e66d00] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff7900] disabled:cursor-not-allowed disabled:opacity-45 motion-reduce:transition-none',
} as const;
