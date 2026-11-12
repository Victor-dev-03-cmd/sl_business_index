import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowUpRight, CheckCircle2, FileText, Mail, ShieldCheck, Sparkles } from "lucide-react";

export type LegalSectionRef = { id: string; label: string };
export const legalBody = "text-[13px] leading-[1.95] text-[#5d6f63] sm:text-[14px]";
export const legalList = "mt-4 list-disc space-y-3 pl-5 text-[13px] leading-[1.95] text-[#5d6f63] sm:text-[14px]";
export const legalStrong = "font-bold text-[#264938]";

export function LegalSection({
  id, number, heading, children,
}: { id: string; number: number; heading: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={id + "-title"} className="scroll-mt-[138px] border-b border-[#e5eae3] py-10 first:pt-0 sm:py-12">
      <div className="flex items-start gap-4 sm:gap-5">
        <span aria-hidden="true" className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] border border-[#d9e8dd] bg-[#f0f7ef] text-[13px] font-extrabold text-[#4e8c68]">
          {String(number).padStart(2, "0")}
        </span>
        <div className="min-w-0 flex-1">
          <h2 id={id + "-title"} className="text-[clamp(1.32rem,2.4vw,1.85rem)] font-extrabold leading-[1.25] tracking-[-.048em] text-[#20402f]">{heading}</h2>
          <div className="mt-4 space-y-4">{children}</div>
        </div>
      </div>
    </section>
  );
}

function LegalVector({ mode }: { mode: "privacy" | "terms" }) {
  const privacy = mode === "privacy";
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 450 320" role="img"
      aria-labelledby={"legal-svg-title-" + mode} className="h-auto w-full">
      <title id={"legal-svg-title-" + mode}>{privacy ? "Illustrated security shield representing responsible data handling" : "Illustrated policy document representing clear user agreements"}</title>
      <defs>
        <linearGradient id={"legal-glow-" + mode} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#eef6e9"/><stop offset="1" stopColor="#e2efdf"/>
        </linearGradient>
      </defs>
      <rect width="450" height="320" rx="28" fill={"url(#legal-glow-" + mode + ")"}/>
      <g stroke="#aacbb0" fill="none" opacity=".7">
        <circle cx="225" cy="152" r="124" strokeDasharray="4 8"/>
        <circle cx="225" cy="152" r="92"/>
        <path d="M24 152h402M225 20v277" strokeDasharray="3 9"/>
      </g>
      <g fill="#d8e9d7" stroke="#8fbc96" strokeWidth="1.5">
        <circle cx="94" cy="77" r="8"/><circle cx="357" cy="82" r="8"/>
        <circle cx="92" cy="242" r="8"/><circle cx="355" cy="236" r="8"/>
      </g>
      {privacy ? (
        <g>
          <path d="M225 48L335 97v74c0 73-43 116-110 146-67-30-110-73-110-146V97Z"
            fill="#1d5138" stroke="#89b897" strokeWidth="4"/>
          <path d="M225 71l86 38v62c0 59-35 94-86 119-51-25-86-60-86-119v-62Z"
            fill="none" stroke="#b3dec0" strokeOpacity=".5" strokeWidth="2"/>
          <rect x="196" y="146" width="58" height="58" rx="10" fill="#eac990"/>
          <path d="M207 146v-18a18 18 0 0 1 36 0v18" fill="none" stroke="#eac990" strokeWidth="9" strokeLinecap="round"/>
          <circle cx="225" cy="173" r="5" fill="#244c36"/>
          <path d="M225 176v10" stroke="#244c36" strokeWidth="3"/>
          <text x="225" y="251" textAnchor="middle" fontSize="12" fontWeight="800" fill="#d8ecd6" letterSpacing="2">YOUR DATA</text>
        </g>
      ) : (
        <g>
          <rect x="131" y="45" width="188" height="246" rx="16" fill="#ffffff" stroke="#91b99b" strokeWidth="3"/>
          <rect x="155" y="77" width="136" height="14" rx="7" fill="#245d42"/>
          <rect x="155" y="110" width="123" height="6" rx="3" fill="#d3e3d3"/>
          <rect x="155" y="128" width="140" height="6" rx="3" fill="#d3e3d3"/>
          <rect x="155" y="146" width="111" height="6" rx="3" fill="#d3e3d3"/>
          <rect x="155" y="170" width="132" height="6" rx="3" fill="#d3e3d3"/>
          <rect x="155" y="188" width="119" height="6" rx="3" fill="#d3e3d3"/>
          <circle cx="256" cy="239" r="29" fill="#1f6042"/>
          <path d="M243 240l9 9 19-22" stroke="#eacd91" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          <text x="164" y="263" fontSize="10" fontWeight="700" letterSpacing="1" fill="#7b9b80">CLEAR TERMS</text>
        </g>
      )}
      <text x="22" y="300" fontSize="10.5" fontWeight="750" fill="#789780">SLBI 2.0 • TRUST BY DESIGN</text>
    </svg>
  );
}

export default function LegalPageShell({
  kind, eyebrow, title, summary, effectiveDate, sections, children,
}: {
  kind: "privacy" | "terms";
  eyebrow: string;
  title: string;
  summary: string;
  effectiveDate: string;
  sections: LegalSectionRef[];
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#fbfcf8] font-[family-name:var(--font-inter)] text-[#213e2d]">
      <header className="relative isolate overflow-hidden border-b border-[#e2eadf] bg-[radial-gradient(ellipse_at_80%_20%,#eaf3e8_0%,#fbfcf8_62%)]">
        <div className="mx-auto grid max-w-[1450px] items-center gap-10 px-5 pb-16 pt-12 sm:px-8 sm:pt-16 lg:grid-cols-[1fr_.67fr] lg:px-12 lg:py-20">
          <div className="max-w-[770px]">
            <Link href="/about" className="inline-flex items-center gap-2 text-[12px] font-semibold text-[#548469] transition-colors hover:text-[#24583d]">
              <ArrowLeft size={15}/> About SL Business Index
            </Link>
            <p className="mt-9 inline-flex items-center gap-2 rounded-full border border-[#d7e7d5] bg-white px-4 py-2 text-[10px] font-extrabold uppercase tracking-[.17em] text-[#47835f]">
              {kind === "privacy" ? <ShieldCheck size={15}/> : <FileText size={15}/>}
              {eyebrow} · SLBI 2.0
            </p>
            <h1 className="mt-6 text-[clamp(2.65rem,5.3vw,5.35rem)] font-extrabold leading-[1.09] tracking-[-.072em] text-[#173d2b]">{title}</h1>
            <p className="mt-6 max-w-[680px] text-[14px] leading-[1.95] text-[#687d6e] sm:text-[16px]">{summary}</p>
            <div className="mt-8 flex flex-wrap items-center gap-4 text-[11px] font-semibold text-[#688471]">
              <span className="inline-flex items-center gap-2"><CheckCircle2 size={15} className="text-[#53916e]"/> Policy effective {effectiveDate}</span>
              <span className="inline-flex items-center gap-2"><Sparkles size={15} className="text-[#a88558]"/> SLBI 2.0 page presentation</span>
            </div>
          </div>
          <div className="min-w-0"><LegalVector mode={kind}/></div>
        </div>
      </header>

      <section className="border-b border-[#e3eae0] bg-white">
        <div className="mx-auto flex max-w-[1450px] flex-wrap items-center justify-between gap-3 px-5 py-5 text-[12px] sm:px-8 lg:px-12">
          <p className="max-w-[780px] leading-6 text-[#6b7e70]">
            <strong className="text-[#24563b]">Introducing SLBI 2.0:</strong> our next chapter in business discovery and the Growth &amp; Security OS roadmap. Planned features roll out in phases; this announcement does not change the effective date of this policy.
          </p>
          <Link href="/faq" className="inline-flex shrink-0 items-center gap-1 font-bold text-[#387d55] hover:underline">Visit Help &amp; FAQ <ArrowRight size={15}/></Link>
        </div>
      </section>

      <div className="mx-auto grid max-w-[1450px] gap-8 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[268px_minmax(0,1fr)] lg:gap-16 lg:px-12">
        <nav aria-label={title + " sections"} className="h-fit rounded-[17px] border border-[#e0e9de] bg-white p-5 lg:sticky lg:top-[105px]">
          <p className="mb-4 text-[10px] font-extrabold uppercase tracking-[.17em] text-[#a18659]">On this page</p>
          <ol className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-1">
            {sections.map((item, index) => (
              <li key={item.id}>
                <a href={"#" + item.id}
                  className="flex items-start gap-3 rounded-[9px] px-3 py-2.5 text-[12px] font-semibold leading-5 text-[#627b68] transition-colors hover:bg-[#f0f7ef] hover:text-[#2c6546] focus-visible:outline-2 focus-visible:outline-[#3c825a]">
                  <span className="text-[10px] font-extrabold text-[#a2b6a2]">{String(index+1).padStart(2,"0")}</span>
                  <span>{item.label}</span>
                </a>
              </li>
            ))}
          </ol>
          <div className="mt-5 border-t border-[#e7ede5] pt-5">
            <Link href="/contact" className="inline-flex items-center gap-2 text-[12px] font-bold text-[#3c8057] hover:underline"><Mail size={15}/> Ask us a question <ArrowUpRight size={14}/></Link>
          </div>
        </nav>
        <article className="min-w-0 max-w-[900px] rounded-[21px] border border-[#e2eae0] bg-white px-5 py-7 shadow-[0_12px_30px_rgba(31,75,40,.035)] sm:px-9 sm:py-10 lg:px-12">
          {children}
          <div className="mt-10 rounded-[16px] border border-[#dce8dc] bg-[#f3f8f1] p-6 sm:p-7">
            <p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-[#a28250]">Need more clarity?</p>
            <h2 className="mt-2 text-[22px] font-extrabold tracking-[-.045em] text-[#224b36]">We are here to help.</h2>
            <p className={"mt-3 " + legalBody}>Contact SL Business Index if you have questions about this document or the use of your business information.</p>
            <Link href="/contact" className="mt-5 inline-flex items-center gap-2 text-[12px] font-bold text-[#2a7650] hover:underline">Contact our team <ArrowUpRight size={15}/></Link>
          </div>
        </article>
      </div>
    </main>
  );
}
