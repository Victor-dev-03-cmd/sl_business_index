import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUpRight, BookOpen, CheckCircle2, CircleHelp, Mail, MessageCircle, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";
import FAQExplorer from "./FAQExplorer";
import { FAQS } from "./faqData";

const schema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "@id": "https://www.slbusinessindex.com/faq#faqs",
  mainEntity: FAQS.map(faq => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: { "@type": "Answer", text: faq.answer },
  })),
};

function FAQArtwork() {
  return (
    <svg viewBox="0 0 540 365" xmlns="http://www.w3.org/2000/svg" role="img"
      aria-labelledby="faq-hero-illustration" className="h-auto w-full">
      <title id="faq-hero-illustration">Questions leading to helpful business discovery and growth answers</title>
      <defs>
        <linearGradient id="faq-panel" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#f3f9ef"/><stop offset="1" stopColor="#e1f0e1"/>
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="540" height="365" rx="26" fill="url(#faq-panel)"/>
      <g stroke="#b7d5bd" fill="none" strokeWidth="1">
        <circle cx="271" cy="181" r="156" strokeDasharray="4 9"/>
        <circle cx="271" cy="181" r="124"/>
      </g>
      <rect x="55" y="79" width="338" height="188" rx="22" fill="#fff" stroke="#c7decc" strokeWidth="2"/>
      <g>
        <rect x="79" y="103" width="117" height="29" rx="14.5" fill="#e4f2e5"/>
        <text x="137" y="123" textAnchor="middle" fontSize="11" fontWeight="800" fill="#3f8360">SLBI 2.0 HELP</text>
        <text x="81" y="163" fontSize="23" fontWeight="800" fill="#1d4933">How can we help?</text>
        <rect x="81" y="180" width="242" height="8" rx="4" fill="#d6e7d8"/>
        <rect x="81" y="199" width="214" height="8" rx="4" fill="#e5eee4"/>
        <rect x="81" y="227" width="94" height="23" rx="7" fill="#225b40"/>
        <text x="128" y="242" textAnchor="middle" fontSize="10" fontWeight="750" fill="#fff">Find answers</text>
      </g>
      <g>
        <rect x="338" y="37" width="140" height="95" rx="18" fill="#1f533b" stroke="#568568" strokeWidth="2"/>
        <circle cx="373" cy="74" r="19" fill="#e5d2a0"/>
        <text x="373" y="81" textAnchor="middle" fontSize="22" fontWeight="800" fill="#275b41">?</text>
        <rect x="402" y="64" width="53" height="7" rx="3.5" fill="#a6c6a5"/>
        <rect x="402" y="79" width="42" height="6" rx="3" fill="#6f9e7a"/>
        <text x="359" y="112" fontSize="10" fontWeight="700" fill="#d4e5cc">Discover</text>
      </g>
      <g>
        <rect x="354" y="239" width="150" height="86" rx="18" fill="#fff" stroke="#c2dcc8" strokeWidth="2"/>
        <circle cx="387" cy="272" r="18" fill="#e4f1e6"/>
        <path d="M378 272l7 7 12-15" fill="none" stroke="#358459" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        <rect x="416" y="263" width="68" height="7" rx="3.5" fill="#376b4c"/>
        <rect x="416" y="279" width="47" height="6" rx="3" fill="#bdd7c2"/>
        <text x="370" y="308" fontSize="10" fontWeight="700" fill="#649274">Grow with clarity</text>
      </g>
      <path d="M393 132l-15 33 25 74" stroke="#e5b979" strokeWidth="3" fill="none" strokeDasharray="5 6"/>
    </svg>
  );
}

export default function FAQPage() {
  return (
    <main className="min-h-screen bg-[#fbfcf8] font-[family-name:var(--font-inter)] text-[#1b402f]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }}/>
      <section className="relative overflow-hidden border-b border-[#e3ebdf] bg-[radial-gradient(ellipse_at_80%_25%,#ebf5e9_0%,#fbfcf8_57%)]">
        <div className="mx-auto grid max-w-[1440px] items-center gap-10 px-5 pb-16 pt-14 sm:px-8 sm:pt-20 lg:grid-cols-[1fr_.86fr] lg:gap-14 lg:px-12 lg:py-24">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-[#d7e7d8] bg-white px-4 py-2 text-[10px] font-extrabold uppercase tracking-[.18em] text-[#41805d]">
              <CircleHelp size={15}/> Help center · SLBI 2.0
            </p>
            <h1 className="mt-7 text-[clamp(3.15rem,5.65vw,6rem)] font-extrabold leading-[1.065] tracking-[-.075em] text-[#183d2d]">
              Good questions.<br/><span className="text-[#5d9876]">Clear answers.</span>
            </h1>
            <p className="mt-6 max-w-[650px] text-[14px] leading-[1.95] text-[#6a806f] sm:text-[16px]">
              Everything you need to discover local businesses, manage your listing, understand your Vendor Workspace and explore what's coming with SLBI 2.0.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a href="#faq-answers" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[12px] bg-[#205b40] px-6 text-[12px] font-extrabold text-white hover:bg-[#2e7752]">
                Explore answers <ArrowDown size={17}/>
              </a>
              <Link href="/contact" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[12px] border border-[#d2e2d4] bg-white px-6 text-[12px] font-bold text-[#386a4b] hover:bg-[#f3f9f2]">
                Contact support <ArrowUpRight size={17}/>
              </Link>
            </div>
          </div>
          <div className="min-w-0"><FAQArtwork/></div>
        </div>
      </section>

      <section className="border-b border-[#e2eae2] bg-white">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-5 py-6 sm:px-8 lg:px-12">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#edf5eb] text-[#40865d]"><Sparkles size={19}/></div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#a4895c]">Introducing SLBI 2.0</p>
              <p className="mt-0.5 text-[12px] font-semibold text-[#45684d]">A new chapter for discovery, business growth and trust.</p>
            </div>
          </div>
          <Link href="/about" className="inline-flex items-center gap-2 text-[12px] font-bold text-[#3c8159] hover:underline">See our GrowthOS vision <ArrowRight size={15}/></Link>
        </div>
      </section>

      <section id="faq-answers" className="mx-auto grid max-w-[1440px] scroll-mt-[125px] gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[minmax(0,1fr)_285px] lg:gap-12 lg:px-12">
        <div className="min-w-0"><FAQExplorer/></div>
        <aside className="min-w-0 space-y-5 lg:pt-2" aria-label="Helpful resources">
          <div className="overflow-hidden rounded-[20px] border border-[#346748] bg-[#183c2c] p-7 text-white">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.16em] text-[#e9cc92]"><TrendingUp size={16}/> What's next</div>
            <h2 className="mt-5 text-[28px] font-extrabold leading-[1.16] tracking-[-.05em]">Meet the next chapter of SLBI.</h2>
            <p className="mt-4 text-[12px] leading-[1.9] text-[#c1d7c8]">SLBI 2.0 brings a renewed product experience and a roadmap toward the Growth &amp; Security OS. Advanced services will be released as they're ready.</p>
            <Link href="/about" className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] bg-[#eacb94] px-4 text-[12px] font-bold text-[#254e37] hover:bg-[#ffe0ad]">
              About the vision <ArrowUpRight size={16}/>
            </Link>
          </div>
          <nav className="rounded-[18px] border border-[#e0e9de] bg-white p-6" aria-label="Related help links">
            <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-[#aa8c5f]">Useful links</p>
            <div className="mt-5 space-y-4">
              {[
                {name:"List your business",href:"/register-business",icon:BookOpen},
                {name:"Vendor dashboard",href:"/vendor/dashboard",icon:TrendingUp},
                {name:"Privacy Policy",href:"/privacy-policy",icon:ShieldCheck},
                {name:"Terms of Service",href:"/terms-of-service",icon:CheckCircle2},
              ].map(item => {
                const Icon = item.icon;
                return <Link key={item.href} href={item.href} className="flex items-center gap-3 text-[12px] font-semibold text-[#547662] hover:text-[#23593f]">
                  <Icon size={17} className="text-[#79a583]"/>{item.name}<ArrowUpRight size={13} className="ml-auto"/>
                </Link>;
              })}
            </div>
          </nav>
          <div className="rounded-[18px] border border-[#e5eadd] bg-[#f3f8ef] p-6">
            <p className="inline-flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.16em] text-[#ad8a5e]"><MessageCircle size={16}/> Need personal help?</p>
            <h3 className="mt-3 text-[19px] font-bold text-[#274831]">Our team can help.</h3>
            <p className="mt-2 text-[12px] leading-[1.8] text-[#778a79]">Get support for listings, account access, billing questions and platform issues.</p>
            <Link href="/contact" className="mt-4 inline-flex items-center gap-2 text-[12px] font-bold text-[#367754] hover:underline">Contact SLBI <Mail size={15}/></Link>
          </div>
        </aside>
      </section>
      <section className="border-t border-[#e4ebe0] bg-white px-5 py-12 text-center sm:px-8">
        <h2 className="text-[23px] font-extrabold tracking-[-.04em] text-[#244632]">Discover. Connect. Grow.</h2>
        <p className="mx-auto mt-3 max-w-[540px] text-[12px] leading-6 text-[#788b7e]">SLBI 2.0 is a phased evolution. This FAQ describes current workflows separately from future roadmap ideas.</p>
      </section>
    </main>
  );
}
