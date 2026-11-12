import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight, ArrowUpRight, BarChart3, BrainCircuit, CheckCircle2,
  Compass, CreditCard, Eye, Globe2, LockKeyhole, MapPin, Megaphone,
  MessageCircle, MousePointerClick, Search, ShieldCheck, Sparkles,
  Target, TrendingUp, Users, WandSparkles,
} from "lucide-react";
import { GrowthConstellation, GrowthJourneyIllustration, PrivacyShieldIllustration } from "./AboutGraphics";

export const metadata: Metadata = {
  title: "About SL Business Index | Discover, Connect & Grow in Sri Lanka",
  description:
    "Learn how SL Business Index connects people with local businesses and our long-term vision for a privacy-conscious Sri Lankan Business Growth & Security OS.",
  openGraph: {
    title: "SL Business Index — More than a business directory",
    description: "Local discovery today. A connected, trustworthy business-growth platform for tomorrow.",
    url: "https://www.slbusinessindex.com/about",
    type: "website",
  },
};

const primaryButton =
  "inline-flex min-h-12 items-center justify-center gap-2.5 rounded-[12px] bg-[#1b4535] px-6 text-[13px] font-bold text-white shadow-[0_9px_20px_rgba(22,64,47,.14)] transition-colors hover:bg-[#28664d] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#4d9871]";
const secondaryButton =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-[12px] border border-[#d2e0d5] bg-white px-6 text-[13px] font-bold text-[#24533a] transition-colors hover:border-[#93b99d] hover:bg-[#f1f6ef] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#4d9871]";

const buildingBlocks = [
  {
    number: "01",
    icon: Search,
    title: "Be discovered",
    description: "Give customers a clearer way to find relevant local businesses, services and locations across Sri Lanka.",
    tag: "Directory & local search",
  },
  {
    number: "02",
    icon: MessageCircle,
    title: "Make a connection",
    description: "Turn a business profile into a practical next step: learn about the business, enquire, call or find directions.",
    tag: "Profiles & customer contact",
  },
  {
    number: "03",
    icon: TrendingUp,
    title: "Understand what matters",
    description: "Use business-owner tools and meaningful activity signals to focus on better listings and more useful customer interactions.",
    tag: "Vendor workspace & insights",
  },
];

const engines = [
  {
    index: "01", icon: Compass, name: "Discovery",
    line: "Smarter local relevance, categories and geolocation.",
    note: "Core product direction",
  },
  {
    index: "02", icon: BarChart3, name: "Growth",
    line: "Listing health, enquiries, reputation and next steps.",
    note: "Evolving workspace",
  },
  {
    index: "03", icon: WandSparkles, name: "Marketing",
    line: "Owner-approved creative content and campaigns.",
    note: "Phased roadmap",
  },
  {
    index: "04", icon: ShieldCheck, name: "Security",
    line: "Authorized website, domain and email safety checks.",
    note: "Planned expansion",
  },
  {
    index: "05", icon: CreditCard, name: "Revenue",
    line: "Clear plans, permissions, add-ons and usage controls.",
    note: "Foundational architecture",
  },
  {
    index: "06", icon: BrainCircuit, name: "Learning",
    line: "Evaluated recommendations, models and experiments.",
    note: "Long-term research",
  },
];

const principles = [
  {
    icon: MapPin,
    title: "Built for local reality",
    copy: "Sri Lankan places, business categories and practical ways of finding services should shape the experience—not assumptions imported from somewhere else.",
  },
  {
    icon: Eye,
    title: "Clear about what works",
    copy: "We distinguish live capabilities from features still being designed. A search result, contact click or impression is not automatically a completed sale.",
  },
  {
    icon: LockKeyhole,
    title: "Privacy is part of the design",
    copy: "Business information, consent, permissions and security operations deserve careful handling. Useful insights should not require covert personal profiling.",
  },
  {
    icon: Target,
    title: "Evidence over hype",
    copy: "We want to improve discovery and growth through testing, relevance, clear measurement and responsible use of AI—not empty performance guarantees.",
  },
];

const stages = [
  {
    number: "01",
    label: "FOUNDATION",
    heading: "Discover & establish trust",
    body: "Accurate listings, accessible local discovery, ownership and useful business profiles.",
  },
  {
    number: "02",
    label: "CONNECTED WORKSPACE",
    heading: "Build better relationships",
    body: "Business activity, customer enquiries, reviews and informed decisions inside one owner experience.",
  },
  {
    number: "03",
    label: "GROWTH SERVICES",
    heading: "Make marketing more useful",
    body: "A roadmap for SEO insights, owner-approved creative tools and consent-based campaigns.",
  },
  {
    number: "04",
    label: "LONG-TERM VISION",
    heading: "Grow with greater confidence",
    body: "Authorized digital protection, explainable intelligence and more mature business operations.",
  },
];

export default function AboutPage() {
  return (
    <main className="min-h-screen overflow-x-clip bg-[#fbfaf6] font-[family-name:var(--font-inter)] text-[#1b382c]">
      {/* HERO · product direction, illustrated with locally rendered SVG vectors */}
      <section className="relative isolate overflow-hidden border-b border-[#e4e9df] bg-[radial-gradient(ellipse_at_75%_28%,#ecf4e9_0%,#fbfaf6_52%,#fffdf9_100%)]">
        <div aria-hidden="true" className="pointer-events-none absolute left-0 top-0 h-full w-[40%] bg-[linear-gradient(90deg,rgba(224,237,222,.2),transparent)]"/>
        <div className="relative mx-auto grid max-w-[1520px] items-center gap-10 px-5 pb-16 pt-16 sm:px-8 sm:pb-20 sm:pt-20 lg:grid-cols-[.92fr_1.08fr] lg:gap-4 lg:px-12 lg:py-28">
          <div className="relative z-10 max-w-[675px]">
            <div className="inline-flex items-center gap-2.5 rounded-full border border-[#d8e7d8] bg-white/85 px-4 py-2 text-[10px] font-extrabold uppercase tracking-[.17em] text-[#347153] shadow-[0_3px_12px_rgba(28,83,53,.03)]">
              <span className="h-2 w-2 rounded-full bg-[#479975]"/>
              A better future for local business
            </div>
            <h1 className="mt-8 text-[clamp(3.2rem,5.8vw,6.75rem)] font-extrabold leading-[1.035] tracking-[-.075em] text-[#173c2c]">
              Local roots.<br/>
              <span className="text-[#529071]">Bigger</span><br/>
              possibilities.
            </h1>
            <p className="mt-7 max-w-[555px] text-[15px] font-medium leading-[1.9] text-[#657a6e] sm:text-[17px]">
              SL Business Index makes it easier to discover local businesses in Sri Lanka—and is growing toward a more connected way for owners to manage visibility, opportunities and digital growth.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link href="/category" className={primaryButton}>Explore local businesses <ArrowUpRight size={17}/></Link>
              <Link href="/register-business" className={secondaryButton}>List your business <ArrowRight size={16}/></Link>
            </div>
            <div className="mt-11 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-[#dfe9dc] pt-6 text-[11px] font-semibold text-[#708573]">
              <span className="inline-flex items-center gap-2"><CheckCircle2 size={15} className="text-[#4e9470]"/> Sri Lanka-focused</span>
              <span className="inline-flex items-center gap-2"><CheckCircle2 size={15} className="text-[#4e9470]"/> People-first discovery</span>
              <span className="inline-flex items-center gap-2"><CheckCircle2 size={15} className="text-[#4e9470]"/> Responsible growth vision</span>
            </div>
          </div>
          <div className="relative min-w-0">
            <div aria-hidden="true" className="pointer-events-none absolute -right-5 top-[12%] -z-10 h-[75%] w-[75%] rounded-full bg-[#d4e6d6]/50 blur-[70px]"/>
            <GrowthConstellation/>
          </div>
        </div>
      </section>

      {/* Compact thesis */}
      <section className="border-b border-[#e2e7dd] bg-white">
        <div className="mx-auto grid max-w-[1450px] gap-6 px-5 py-9 sm:px-8 sm:py-11 lg:grid-cols-[.75fr_1.25fr] lg:items-center lg:gap-16 lg:px-12">
          <p className="flex items-center gap-3 text-[11px] font-extrabold uppercase tracking-[.2em] text-[#b68c57]"><span className="h-px w-8 bg-[#c7a276]"/> The idea behind SLBI</p>
          <p className="text-[clamp(1.25rem,2.4vw,2.2rem)] font-semibold leading-[1.55] tracking-[-.04em] text-[#264939]">
            A business listing should be <span className="text-[#4e9373]">the beginning of an opportunity</span>, not the end of the experience.
          </p>
        </div>
      </section>

      {/* What is useful today */}
      <section id="what-we-do" className="mx-auto max-w-[1450px] px-5 py-20 sm:px-8 sm:py-28 lg:px-12">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div className="max-w-[760px]">
            <p className="flex items-center gap-2.5 text-[11px] font-extrabold uppercase tracking-[.16em] text-[#5c9173]"><span className="h-1.5 w-1.5 rounded-full bg-[#5c9173]"/> What we're building</p>
            <h2 className="mt-5 text-[clamp(2.15rem,4.2vw,4.2rem)] font-extrabold leading-[1.12] tracking-[-.065em] text-[#1b3c2e]">
              Built to turn discovery<br/>into <span className="text-[#5b9478]">connection.</span>
            </h2>
          </div>
          <p className="max-w-[370px] text-[13px] leading-[1.9] text-[#718277]">
            Search, business information and an owner workspace are the practical starting points. Our long-term Growth OS is designed to connect those moments more intelligently.
          </p>
        </div>
        <div className="mt-11 grid gap-4 md:grid-cols-3">
          {buildingBlocks.map(item => {
            const Icon = item.icon;
            return (
              <article key={item.number} className="group rounded-[23px] border border-[#e3eae0] bg-white p-6 shadow-[0_9px_28px_rgba(28,65,41,.035)] transition-[border-color,transform] duration-200 hover:-translate-y-1 hover:border-[#afcdb8] motion-reduce:transform-none sm:p-8">
                <div className="flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-[14px] border border-[#dce8dc] bg-[#f2f7f0] text-[#327655]"><Icon size={23} strokeWidth={1.8}/></div>
                  <span className="text-[36px] font-extrabold leading-none tracking-[-.09em] text-[#d6e2d6]">{item.number}</span>
                </div>
                <h3 className="mt-9 text-[22px] font-bold tracking-[-.045em] text-[#203e30]">{item.title}</h3>
                <p className="mt-3 min-h-[112px] text-[13px] leading-[1.85] text-[#738376]">{item.description}</p>
                <div className="mt-7 border-t border-[#e9eee6] pt-4 text-[11px] font-semibold text-[#599173]">{item.tag}</div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Native vector product journey */}
      <section className="border-y border-[#e4e8df] bg-[#f1f5ee]">
        <div className="mx-auto grid max-w-[1450px] items-center gap-12 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[.82fr_1.18fr] lg:px-12 lg:py-24">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[.18em] text-[#658c6e]">One connected experience</p>
            <h2 className="mt-5 text-[clamp(2.2rem,3.7vw,3.8rem)] font-extrabold leading-[1.15] tracking-[-.06em] text-[#1e4131]">
              Find. Connect.<br/><span className="text-[#599477]">Keep improving.</span>
            </h2>
            <p className="mt-6 max-w-[490px] text-[14px] leading-[1.9] text-[#698172]">
              Someone discovers a business. They understand what it offers. They choose to get in touch. The owner gains a chance to learn what information and interactions need attention.
            </p>
            <p className="mt-5 max-w-[495px] border-l-[3px] border-[#c49e6a] pl-4 text-[12px] leading-6 text-[#768577]">
              A view or contact-button click is an interaction signal, not proof of a completed transaction.
            </p>
            <Link href="/nearby" className="mt-8 inline-flex items-center gap-2 text-[13px] font-bold text-[#2e7953] hover:underline">See local discovery <ArrowUpRight size={17}/></Link>
          </div>
          <div className="overflow-hidden rounded-[22px] border border-[#dae6d9] bg-white p-3 shadow-[0_22px_50px_rgba(49,96,60,.06)] sm:p-5">
            <GrowthJourneyIllustration/>
          </div>
        </div>
      </section>

      {/* Six shared engines: concept diagram not represented as live */}
      <section id="growth-os" className="mx-auto max-w-[1450px] px-5 py-20 sm:px-8 sm:py-28 lg:px-12">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-[850px]">
            <p className="inline-flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[.17em] text-[#ae875b]"><Sparkles size={16}/> The product vision · Growth &amp; Security OS</p>
            <h2 className="mt-5 text-[clamp(2.15rem,4.3vw,4.35rem)] font-extrabold leading-[1.13] tracking-[-.07em] text-[#1c3b2d]">
              More than a directory.<br/>A <span className="text-[#599273]">connected system.</span>
            </h2>
            <p className="mt-6 max-w-[690px] text-[14px] leading-[1.9] text-[#6e8072]">
              The SLBI Growth &amp; Security OS roadmap describes six cooperating engines with a shared foundation for business context, permissions, evaluation and responsible data use.
            </p>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#e9ddc5] bg-[#fff9ec] px-4 py-2 text-[11px] font-bold text-[#976e3b]">
            <Target size={14}/> Product roadmap · Not all services live
          </span>
        </div>

        <div className="relative mt-12 overflow-hidden rounded-[25px] border border-[#335e49] bg-[#15382c] p-5 shadow-[0_22px_46px_rgba(25,61,43,.13)] sm:p-9 lg:p-12">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-30 [background-image:radial-gradient(#7cb697_1px,transparent_1px)] [background-size:25px_25px]"/>
          <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-40 h-[380px] w-[380px] rounded-full border-[75px] border-[#285841]/60"/>
          <div className="relative z-10 flex flex-col justify-between gap-6 border-b border-[#4c7158]/70 pb-8 sm:flex-row sm:items-center">
            <div><p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-[#c4b18b]">Shared intelligence architecture</p>
              <h3 className="mt-3 text-[clamp(1.6rem,2.5vw,2.6rem)] font-bold tracking-[-.05em] text-white">Six engines. One direction.</h3></div>
            <div className="grid w-fit grid-cols-2 gap-2 text-center">
              <div className="rounded-[11px] border border-[#5c826a] bg-[#ffffff]/[.06] px-5 py-3"><span className="block text-[27px] font-extrabold text-white">06</span><span className="text-[10px] text-[#bdcfbc]">Design engines</span></div>
              <div className="rounded-[11px] border border-[#5c826a] bg-[#ffffff]/[.06] px-5 py-3"><span className="block text-[27px] font-extrabold text-white">11</span><span className="text-[10px] text-[#bdcfbc]">Roadmap pillars</span></div>
            </div>
          </div>
          <div className="relative z-10 mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {engines.map(engine => {
              const Icon = engine.icon;
              return <article key={engine.index} className="rounded-[17px] border border-[#4c735b]/70 bg-[#ffffff]/[.065] px-5 py-6 transition-colors hover:bg-[#ffffff]/[.095] sm:px-6">
                <div className="flex items-start justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-[11px] border border-[#749e7b]/45 bg-[#6b936f]/20 text-[#d5ebd4]"><Icon size={20}/></span>
                  <span className="text-[11px] font-bold text-[#95b79b]">{engine.index}</span>
                </div>
                <h4 className="mt-6 text-[20px] font-bold tracking-[-.03em] text-white">{engine.name}</h4>
                <p className="mt-2 min-h-[61px] text-[12px] leading-6 text-[#c3d4c5]">{engine.line}</p>
                <div className="mt-5 border-t border-[#5a7a5f]/65 pt-3 text-[10px] font-semibold text-[#cbb68f]">{engine.note}</div>
              </article>;
            })}
          </div>
          <div className="relative z-10 mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[13px] border border-[#6a8b6c]/55 bg-[#ffffff]/[.08] px-5 py-4">
            <span className="inline-flex items-center gap-2 text-[12px] font-bold text-[#f4f6ec]"><ShieldCheck size={18} className="text-[#c9c591]"/> Shared trust, consent &amp; authorization</span>
            <span className="text-[11px] text-[#c7d8ca]">Evaluation · Observability · Owner identity · Permissions</span>
          </div>
        </div>
        <p className="mt-4 text-[11px] leading-5 text-[#8b9788]">
          Roadmap reference: SLBI Growth &amp; Security OS Master Baseline v1.0 (10 November 2026). These are architecture objectives; they are not claims that every engine or AI feature is running in production.
        </p>
      </section>

      {/* How we intend to expand, carefully labeled as roadmap */}
      <section id="roadmap" className="border-y border-[#e4e8df] bg-white">
        <div className="mx-auto max-w-[1450px] px-5 py-20 sm:px-8 sm:py-28 lg:px-12">
          <div className="max-w-[800px]">
            <p className="text-[11px] font-extrabold uppercase tracking-[.19em] text-[#ad885c]">The road ahead</p>
            <h2 className="mt-5 text-[clamp(2.15rem,4.2vw,4.2rem)] font-extrabold leading-[1.15] tracking-[-.07em] text-[#1d3d2c]">
              Ambitious by design.<br/><span className="text-[#5c9777]">Built in stages.</span>
            </h2>
            <p className="mt-5 text-[14px] leading-[1.95] text-[#708175]">Our plan is to strengthen the fundamentals first, then expand into richer marketing, visibility and security services as they are tested and ready.</p>
          </div>
          <div className="mt-11 grid gap-px overflow-hidden rounded-[22px] border border-[#e0e8dd] bg-[#e1e9df] md:grid-cols-2">
            {stages.map(stage => <article key={stage.number} className="flex flex-col gap-4 bg-[#fbfcf8] px-6 py-8 sm:px-9 sm:py-10">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[40px] font-extrabold leading-none tracking-[-.08em] text-[#c8dbc9]">{stage.number}</span>
                <span className="text-[10px] font-bold uppercase tracking-[.13em] text-[#a5845f]">{stage.label}</span>
              </div>
              <h3 className="text-[21px] font-bold tracking-[-.045em] text-[#244330]">{stage.heading}</h3>
              <p className="max-w-[490px] text-[13px] leading-[1.9] text-[#768477]">{stage.body}</p>
            </article>)}
          </div>
          <p className="mt-5 flex items-start gap-2 text-[11px] leading-6 text-[#8b9188]"><CheckCircle2 size={16} className="mt-1 shrink-0 text-[#668b71]"/> This is a phased direction, not a promise of launch dates, paid availability or guaranteed business results.</p>
        </div>
      </section>

      {/* Trust is foundational, not decorative */}
      <section className="mx-auto grid max-w-[1450px] items-center gap-10 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[1fr_.94fr] lg:gap-16 lg:px-12">
        <div className="max-w-[625px]">
          <p className="inline-flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[.16em] text-[#ab885f]"><ShieldCheck size={16}/> Trust is the infrastructure</p>
          <h2 className="mt-5 text-[clamp(2.2rem,4.2vw,4.1rem)] font-extrabold leading-[1.13] tracking-[-.07em] text-[#1e3d2d]">
            Good growth needs<br/><span className="text-[#60967a]">good boundaries.</span>
          </h2>
          <p className="mt-6 max-w-[545px] text-[14px] leading-[1.9] text-[#718175]">
            The roadmap calls for clear ownership checks, privacy-separated analytics, explicit permissions and explainable recommendations. Growth information should be useful without misrepresenting what the data proves.
          </p>
          <div className="mt-7 flex flex-wrap gap-2">
            {["Owner-controlled data", "Permissioned insights", "Responsible AI", "Transparent outcomes"].map(value =>
              <span key={value} className="rounded-full border border-[#dce7da] bg-white px-3 py-2 text-[11px] font-semibold text-[#53765e]">{value}</span>)}
          </div>
          <Link href="/privacy-policy" className="mt-8 inline-flex items-center gap-2 text-[13px] font-bold text-[#2d7854] hover:underline">Read our privacy policy <ArrowUpRight size={16}/></Link>
        </div>
        <div className="overflow-hidden rounded-[23px] border border-[#d9e7da] bg-[#f1f6ef] p-4 shadow-[0_15px_40px_rgba(33,72,44,.05)] sm:p-7"><PrivacyShieldIllustration/></div>
      </section>

      {/* Principles */}
      <section className="border-y border-[#e3e8df] bg-[#f0f4ed]">
        <div className="mx-auto max-w-[1450px] px-5 py-20 sm:px-8 sm:py-24 lg:px-12">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div><p className="text-[11px] font-extrabold uppercase tracking-[.2em] text-[#ab895c]">What guides our work</p>
              <h2 className="mt-4 text-[clamp(2rem,3.9vw,3.8rem)] font-extrabold tracking-[-.07em] text-[#1e402e]">Thoughtful by default.</h2></div>
            <p className="max-w-[355px] text-[13px] leading-[1.8] text-[#738477]">Technology should solve real problems and earn trust along the way.</p>
          </div>
          <div className="mt-11 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {principles.map(principle => {
              const Icon = principle.icon;
              return <article key={principle.title} className="rounded-[19px] border border-[#dee8dc] bg-white px-6 py-7">
                <Icon size={24} className="text-[#4b8663]" strokeWidth={1.75}/>
                <h3 className="mt-7 text-[17px] font-bold tracking-[-.035em] text-[#213f30]">{principle.title}</h3>
                <p className="mt-3 text-[12px] leading-[1.9] text-[#758276]">{principle.copy}</p>
              </article>;
            })}
          </div>
          <div className="mt-8 flex items-center gap-3 border-t border-[#dbe4d9] pt-7 text-[12px] font-medium text-[#627e69]">
            <Globe2 size={18} className="shrink-0"/> Shaped for multilingual Sri Lankan discovery — Tamil, Sinhala and English matter.
          </div>
        </div>
      </section>

      {/* Final conversion */}
      <section className="px-5 py-16 sm:px-8 sm:py-22 lg:px-12">
        <div className="relative mx-auto max-w-[1360px] overflow-hidden rounded-[27px] bg-[#173a2b] px-6 py-14 text-center sm:px-12 sm:py-20">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-25 [background-image:radial-gradient(#92c49b_1px,transparent_1px)] [background-size:27px_27px]"/>
          <div aria-hidden="true" className="pointer-events-none absolute -left-24 -bottom-36 h-[380px] w-[380px] rounded-full border-[75px] border-[#3b7950]/70"/>
          <div aria-hidden="true" className="pointer-events-none absolute -right-28 -top-40 h-[360px] w-[360px] rounded-full border-[65px] border-[#3b7950]/65"/>
          <div className="relative mx-auto max-w-[900px]">
            <p className="text-[11px] font-extrabold uppercase tracking-[.21em] text-[#dac18f]">Discover · Connect · Grow</p>
            <h2 className="mt-5 text-[clamp(2.4rem,5vw,5.3rem)] font-extrabold leading-[1.07] tracking-[-.075em] text-white">
              Every local business deserves a bigger opportunity.
            </h2>
            <p className="mx-auto mt-6 max-w-[570px] text-[14px] leading-[1.85] text-[#c5d8ca]">Explore the businesses around you, or build a clearer digital presence for your own.</p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Link href="/register-business" className="inline-flex min-h-12 items-center justify-center gap-2.5 rounded-[11px] bg-[#ecd3a3] px-6 text-[13px] font-extrabold text-[#274536] transition-colors hover:bg-[#ffebc9]">List your business <ArrowUpRight size={17}/></Link>
              <Link href="/category" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[11px] border border-[#719582] px-6 text-[13px] font-bold text-white transition-colors hover:bg-white/10">Explore the directory <ArrowRight size={17}/></Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
