import Link from "next/link";
import {
  ArrowDown, ArrowRight, ArrowUpRight, CheckCircle2, ExternalLink,
  Headphones, Landmark, Mail, MapPin, MessageCircle, PhoneCall, Search, ShieldCheck, Zap,
} from "lucide-react";
import ContactInquiryForm from "./ContactInquiryForm";
import PublicContactDirectory from "./PublicContactDirectory";
import { CONTACTS, DISTRICTS, SLBI_EMAIL, SLBI_WHATSAPP } from "./publicContacts";

const phone = "+94 76 920 0572";
const whatsappUrl = "https://wa.me/" + SLBI_WHATSAPP;
const topActions = [
  {number:"1990",label:"Emergency ambulance",kind:"Medical support"},
  {number:"119",label:"Police emergency",kind:"Immediate police help"},
  {number:"1987",label:"EDL electricity hotline",kind:"Power failures / bills"},
  {number:"1939",label:"Water Board support",kind:"Water supply / complaints"},
];

const contactPageSchema = {
  "@context":"https://schema.org",
  "@graph":[
    {
      "@type":"ContactPage",
      "@id":"https://www.slbusinessindex.com/contact#webpage",
      name:"Contact SL Business Index & Sri Lanka Public Service Directory",
      url:"https://www.slbusinessindex.com/contact",
      description:"Contact SL Business Index support and browse source-linked Sri Lankan electricity, emergency, banking, water and public office contacts.",
      about:{"@id":"https://www.slbusinessindex.com/#organization"},
      dateModified:"2026-11-12",
    },
    {
      "@type":"Organization",
      "@id":"https://www.slbusinessindex.com/#organization",
      name:"SL Business Index",
      url:"https://www.slbusinessindex.com",
      logo:"https://www.slbusinessindex.com/slbi-logo.svg",
      email:SLBI_EMAIL,
      contactPoint:[{"@type":"ContactPoint",contactType:"customer support",telephone:"+94-76-920-0572",email:SLBI_EMAIL,availableLanguage:["English","Tamil","Sinhala"]}],
    },
  ],
};

const whatsappCard = "inline-flex min-h-12 items-center justify-center gap-2 rounded-[12px] bg-[#e9cb93] px-6 text-[13px] font-bold text-[#223f2d] transition-colors hover:bg-[#ffddab] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f0d8a3]";

export default function ContactPage() {
  return <main className="min-h-screen bg-[#fcfbf7] font-[family-name:var(--font-inter)] text-[#1b3929]">
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(contactPageSchema)}}/>
    <section className="relative isolate overflow-hidden border-b border-[#d9e7d8] bg-[#15392b]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-25 [background-image:radial-gradient(#8ebda0_1px,transparent_1px)] [background-size:28px_28px]"/>
      <div aria-hidden="true" className="pointer-events-none absolute -right-32 -top-64 h-[650px] w-[650px] rounded-full border-[95px] border-[#36764f]/40"/>
      <div className="relative mx-auto grid max-w-[1420px] items-center gap-12 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1.03fr_.97fr] lg:px-12 lg:py-24">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#7bb48c]/50 bg-[#ffffff]/[.065] px-4 py-2 text-[10px] font-extrabold uppercase tracking-[.17em] text-[#d6e8d7]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#e1bd87]"/> SL Business Index · Support &amp; public contacts
          </div>
          <h1 className="mt-7 text-[clamp(2.9rem,5.9vw,6.3rem)] font-extrabold leading-[1.05] tracking-[-.072em] text-white">
            Good connections<br/>start <span className="text-[#e6c996]">here.</span>
          </h1>
          <p className="mt-7 max-w-[600px] text-[14px] leading-[1.9] text-[#c4dac9] sm:text-[16px]">
            Reach the SLBI team for your listing, account or partnership—or find official public service numbers by category and Sri Lankan district.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className={whatsappCard}>
              <MessageCircle size={18}/> WhatsApp SLBI <ArrowUpRight size={17}/>
            </a>
            <a href="#public-directory" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[12px] border border-[#71957c] px-6 text-[13px] font-bold text-white transition-colors hover:bg-white/10">
              Find public contacts <ArrowDown size={16}/>
            </a>
          </div>
          <p className="mt-7 flex flex-wrap items-center gap-2 text-[11px] font-medium text-[#a1bca9]"><ShieldCheck size={16}/> Independent directory · Official-source references · No government affiliation</p>
        </div>
        <div className="relative overflow-hidden rounded-[24px] border border-[#567f62]/70 bg-[#ffffff]/[.055] p-5 shadow-[0_23px_55px_rgba(0,0,0,.12)] backdrop-blur-[4px] sm:p-7">
          <div className="mb-6 flex items-center justify-between gap-2 border-b border-[#789481]/35 pb-5">
            <div><span className="text-[10px] font-bold uppercase tracking-[.17em] text-[#d3c4a5]">Frequently needed</span>
              <h2 className="mt-1 text-[20px] font-bold tracking-[-.045em] text-white">Essential hotlines</h2></div>
            <PhoneCall size={23} className="text-[#c2d7be]"/>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {topActions.map(a => <a key={a.number} href={"tel:" + a.number} className="group rounded-[15px] border border-[#739279]/50 bg-[#ffffff]/[.075] p-5 transition-colors hover:bg-[#ffffff]/[.15]">
              <span className="block text-[34px] font-extrabold tracking-[-.07em] text-white">{a.number}</span>
              <span className="mt-1 block text-[12px] font-bold text-[#d6e6d5]">{a.label}</span>
              <span className="mt-2 flex items-center gap-1.5 text-[10px] text-[#aac8b3]">{a.kind} <ArrowUpRight size={12} className="opacity-60 group-hover:opacity-100"/></span>
            </a>)}
          </div>
          <p className="mt-5 text-[11px] leading-5 text-[#b9cbbb]">For emergencies call the relevant service directly. SLBI does not dispatch emergency help.</p>
        </div>
      </div>
    </section>

    <section id="contact-slbi" aria-labelledby="contact-slbi-title" className="scroll-mt-[120px] border-b border-[#e2e9de] bg-white py-16 sm:py-24">
      <div className="mx-auto grid max-w-[1420px] gap-10 px-5 sm:px-8 lg:grid-cols-[.85fr_1.15fr] lg:gap-16 lg:px-12">
        <div className="max-w-[560px]">
          <p className="text-[11px] font-extrabold uppercase tracking-[.2em] text-[#a78251]">Talk to our team</p>
          <h2 id="contact-slbi-title" className="mt-5 text-[clamp(2.2rem,4.1vw,4rem)] font-extrabold leading-[1.12] tracking-[-.067em]">We're here to <span className="text-[#619578]">help you move forward.</span></h2>
          <p className="mt-6 text-[14px] leading-[1.9] text-[#718275]">Need help creating a business listing, correcting information, reporting a technical issue or discussing a collaboration? Contact SL Business Index directly.</p>
          <div className="mt-9 space-y-3">
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 rounded-[16px] border border-[#dce9dd] bg-[#f4f9f2] p-5 transition-colors hover:border-[#b6d6bb]">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[13px] bg-[#dcefe0] text-[#347b53]"><MessageCircle size={23}/></span>
              <span className="min-w-0 flex-1"><span className="block text-[11px] font-semibold text-[#688772]">SLBI WhatsApp</span><span className="mt-1 block text-[18px] font-extrabold tracking-[-.035em] text-[#1b5133]">{phone}</span></span>
              <ArrowUpRight size={19} className="text-[#4a8760]"/>
            </a>
            <a href={"mailto:" + SLBI_EMAIL} className="flex items-center gap-4 rounded-[16px] border border-[#e3e9e2] bg-white p-5 transition-colors hover:border-[#bdcfbe]">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[13px] bg-[#f2f4ed] text-[#557562]"><Mail size={22}/></span>
              <span className="min-w-0 flex-1"><span className="block text-[11px] font-semibold text-[#819183]">Email support</span><span className="mt-1 block break-all text-[14px] font-bold text-[#315642]">{SLBI_EMAIL}</span></span>
              <ArrowUpRight size={19} className="shrink-0 text-[#70967b]"/>
            </a>
          </div>
          <p className="mt-7 flex items-start gap-2 text-[11px] leading-6 text-[#819184]"><CheckCircle2 size={16} className="mt-1 shrink-0 text-[#619478]"/> Messages are handled by SLBI; government, banking and electricity enquiries must go directly to the respective organizations below.</p>
        </div>
        <div className="rounded-[22px] border border-[#dfe9dd] bg-[#fcfdfa] p-5 shadow-[0_14px_40px_rgba(24,64,35,.045)] sm:p-8">
          <div className="mb-7 border-b border-[#e4eae2] pb-5">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.16em] text-[#7a9a82]"><Headphones size={15}/> Inquiry form</div>
            <h3 className="mt-2 text-[24px] font-bold tracking-[-.045em] text-[#264634]">Send us a message</h3>
            <p className="mt-1.5 text-[12px] leading-6 text-[#809182]">A simple way to reach our team. No location permission required.</p>
          </div>
          <ContactInquiryForm/>
        </div>
      </div>
    </section>

    <PublicContactDirectory/>

    <section aria-labelledby="region-guide-heading" className="border-y border-[#e4e8de] bg-[#f1f5ed] py-16 sm:py-20">
      <div className="mx-auto max-w-[1420px] px-5 sm:px-8 lg:px-12">
        <p className="text-[11px] font-extrabold uppercase tracking-[.18em] text-[#a48454]">Local service discovery</p>
        <h2 id="region-guide-heading" className="mt-4 max-w-[880px] text-[clamp(1.85rem,3.3vw,3.1rem)] font-extrabold leading-[1.19] tracking-[-.055em] text-[#1d422d]">
          From Jaffna and Kilinochchi to Batticaloa, Colombo and beyond.
        </h2>
        <p className="mt-5 max-w-[840px] text-[13px] leading-7 text-[#77887a]">The directory includes all 25 Sri Lankan districts as search filters. National hotlines work island-wide; regional offices serve multiple districts; direct local-office numbers appear only when supported by an official provider listing. Select your district above to see the most relevant contacts.</p>
        <div className="mt-7 flex flex-wrap gap-2">
          {DISTRICTS.map(d => <span key={d} className="rounded-full border border-[#d9e4d8] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#64816b]">{d}</span>)}
        </div>
      </div>
    </section>

    <section aria-labelledby="contact-answers" className="mx-auto max-w-[1120px] px-5 py-16 sm:px-8 sm:py-24">
      <p className="text-[11px] font-extrabold uppercase tracking-[.19em] text-[#af8a5d]">Useful answers</p>
      <h2 id="contact-answers" className="mt-4 text-[clamp(2rem,3.6vw,3.6rem)] font-extrabold tracking-[-.065em] text-[#234332]">Finding the right number.</h2>
      <div className="mt-9 divide-y divide-[#dfe7df] border-y border-[#dfe7df]">
        <div className="py-6"><h3 className="text-[16px] font-bold text-[#234632]">What is the Jaffna electricity board contact number?</h3>
          <p className="mt-2 text-[13px] leading-7 text-[#708374]">For electricity outages in Jaffna, call <a href="tel:1987" className="font-bold text-[#377955] underline">1987</a>. The EDL Northern regional director's office in Jaffna lists <a href="tel:0212220496" className="font-bold text-[#377955] underline">021 222 0496</a> for administrative enquiries. This is not a separate confirmed Jaffna City breakdown number. <a target="_blank" rel="noopener noreferrer" href="https://edl.lk/contact" className="font-semibold text-[#347653] underline">Official EDL contact information</a>.</p></div>
        <div className="py-6"><h3 className="text-[16px] font-bold text-[#234632]">Which electricity number covers Batticaloa?</h3>
          <p className="mt-2 text-[13px] leading-7 text-[#708374]">Use the island-wide electricity hotline <a href="tel:1987" className="font-bold text-[#377955] underline">1987</a> for faults. EDL's Eastern provincial office lists <a href="tel:0262222666" className="font-bold text-[#377955] underline">026 222 2666</a> for regional enquiries; it is not labeled as a Batticaloa branch line. <a target="_blank" rel="noopener noreferrer" href="https://edl.lk/EDL-division-2" className="font-semibold text-[#347653] underline">EDL Eastern Division source</a>.</p></div>
        <div className="py-6"><h3 className="text-[16px] font-bold text-[#234632]">What about Kilinochchi, Mullaitivu or Vavuniya?</h3>
          <p className="mt-2 text-[13px] leading-7 text-[#708374]">Start with <a href="tel:1987" className="font-bold text-[#377955] underline">1987</a> for a power interruption. The Northern regional EDL office can be contacted at <a href="tel:0212220496" className="font-bold text-[#377955] underline">021 222 0496</a>. Local direct lines are not shown where we could not verify an up-to-date office listing.</p></div>
        <div className="py-6"><h3 className="text-[16px] font-bold text-[#234632]">Can I find government offices and bank branch telephone numbers here?</h3>
          <p className="mt-2 text-[13px] leading-7 text-[#708374]">Yes. Filter by district and category to find published numbers for immigration offices, police operations desks, regional banking offices and supported bank branches. Each result links to an official source, while national customer-care lines remain available.</p></div>
        <div className="py-6"><h3 className="text-[16px] font-bold text-[#234632]">Is SL Business Index an official government helpline?</h3>
          <p className="mt-2 text-[13px] leading-7 text-[#708374]">No. SL Business Index is an independent business information platform. To make a complaint or request a service, contact the relevant authority directly. Our own contact form is for SLBI enquiries only.</p></div>
      </div>
      <div className="mt-9 flex flex-wrap gap-3">
        <a href="#public-directory" className="inline-flex min-h-11 items-center gap-2 rounded-[11px] bg-[#20543b] px-5 text-[12px] font-bold text-white hover:bg-[#326a4c]">Browse official-source contacts <Search size={15}/></a>
        <Link href="/nearby" className="inline-flex min-h-11 items-center gap-2 rounded-[11px] border border-[#d6e2d6] bg-white px-5 text-[12px] font-bold text-[#3b7855] hover:bg-[#f4f9f3]">Discover nearby businesses <ArrowRight size={15}/></Link>
      </div>
      <p className="mt-7 flex items-start gap-2 text-[11px] leading-5 text-[#8a988d]"><ExternalLink size={13} className="mt-0.5 shrink-0"/> Source links and dates are provided for reference; official phone numbers and administrative office responsibilities can change. <span className="sr-only">{CONTACTS.length} source-linked directory entries.</span></p>
    </section>
  </main>;
}
