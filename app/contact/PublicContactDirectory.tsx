"use client";

import { useMemo, useState } from "react";
import {
  ArrowUpRight, Building2, CheckCircle2, ChevronDown, Droplets, ExternalLink,
  Landmark, MapPin, Phone, Search, ShieldAlert, Zap,
} from "lucide-react";
import { CATEGORIES, CONTACTS, DISTRICTS, LAST_REVIEWED, type PublicContact, type PublicContactCategory } from "./publicContacts";

const categoryIcons = {
  Emergency: ShieldAlert,
  Electricity: Zap,
  Water: Droplets,
  Banking: Landmark,
  Government: Building2,
} as const;
const scopes = { District: 0, Regional: 1, National: 2 } as const;
const input = "h-12 min-w-0 w-full rounded-xl border border-[#dde5dc] bg-white px-4 text-[13px] font-medium text-[#224331] outline-none transition-colors placeholder:text-[#99a79b] focus:border-[#62a47f] focus:ring-2 focus:ring-[#dcece0]";

export default function PublicContactDirectory() {
  const [query, setQuery] = useState("");
  const [district, setDistrict] = useState("All districts");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("All services");

  const filtered = useMemo(() => {
    const needle = query.toLocaleLowerCase("en").trim().replace(/\s+/g, " ");
    return CONTACTS.filter(entry => {
      if (category !== "All services" && entry.category !== category) return false;
      if (district !== "All districts" && !entry.coverage.includes(district)) return false;
      if (!needle) return true;
      const aliases = entry.category === "Electricity" ? " ceb electricity board power eb current breakdown electric board " :
        entry.category === "Banking" ? " bank bank branch cash " :
        entry.category === "Emergency" ? " police emergency hospital ambulance " : "";
      return [entry.name, entry.area, entry.category, entry.scope, entry.description, entry.phone,
        ...entry.coverage, aliases].join(" ").toLocaleLowerCase("en").includes(needle);
    }).sort((a, b) => scopes[a.scope] - scopes[b.scope] || a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
  }, [query, district, category]);

  const groups = useMemo(() => CATEGORIES.filter((x): x is PublicContactCategory => x !== "All services")
    .map(name => ({name, entries: filtered.filter(x => x.category === name)}))
    .filter(group => group.entries.length > 0), [filtered]);
  const clear = () => { setQuery(""); setDistrict("All districts"); setCategory("All services"); };

  return (
    <section id="public-directory" aria-labelledby="public-directory-heading" className="scroll-mt-[125px] py-16 sm:py-24">
      <div className="mx-auto max-w-[1420px] px-5 sm:px-8 lg:px-12">
        <div className="flex flex-col justify-between gap-7 lg:flex-row lg:items-end">
          <div className="max-w-[740px]">
            <p className="inline-flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[.17em] text-[#b08455]"><span className="h-1.5 w-1.5 rounded-full bg-[#a77942]"/> Independent community reference</p>
            <h2 id="public-directory-heading" className="mt-4 text-[clamp(2.1rem,4vw,4rem)] font-extrabold leading-[1.12] tracking-[-.07em] text-[#1b3b2d]">
              Find the right<br/><span className="text-[#5a9375]">public service contact.</span>
            </h2>
            <p className="mt-5 max-w-[660px] text-[13px] leading-7 text-[#728477]">
              Electricity offices, banks, police desks, immigration, water and government services in Sri Lanka. Every published phone has an official source; regional numbers are labeled honestly.
            </p>
          </div>
          <div className="inline-flex w-fit shrink-0 items-center gap-2 rounded-xl border border-[#dfe9dd] bg-[#f5f9f3] px-4 py-3 text-[11px] font-semibold text-[#547862]">
            <CheckCircle2 size={17} className="text-[#4b9b70]"/> Sources reviewed {LAST_REVIEWED}
          </div>
        </div>

        <div className="mt-9 grid gap-3 rounded-[20px] border border-[#e2e8e0] bg-[#f3f7f1] p-4 shadow-[0_6px_23px_rgba(29,68,43,.035)] sm:p-5 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <label className="relative block">
            <span className="sr-only">Search by office, service, town or phone number</span>
            <Search aria-hidden="true" size={17} className="pointer-events-none absolute left-4 top-[16px] text-[#6e8b74]"/>
            <input type="search" value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Search CEB / EDL, Jaffna, banks, police…" aria-label="Search public service contacts"
              className={input + " pl-11"}/>
          </label>
          <label className="relative block">
            <span className="sr-only">Filter by Sri Lankan district</span>
            <MapPin aria-hidden="true" size={16} className="pointer-events-none absolute left-4 top-[17px] text-[#6e8b74]"/>
            <select value={district} onChange={e => setDistrict(e.target.value)} aria-label="Filter contacts by district"
              className={input + " appearance-none pl-10 pr-10"}>
              <option>All districts</option>{DISTRICTS.map(d => <option key={d}>{d}</option>)}
            </select>
            <ChevronDown aria-hidden="true" size={16} className="pointer-events-none absolute right-3 top-[17px] text-[#809889]"/>
          </label>
          <label className="relative block">
            <span className="sr-only">Filter by type of public service</span>
            <select value={category} onChange={e => setCategory(e.target.value as (typeof CATEGORIES)[number])}
              aria-label="Filter by public service category" className={input + " appearance-none pr-10"}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <ChevronDown aria-hidden="true" size={16} className="pointer-events-none absolute right-3 top-[17px] text-[#809889]"/>
          </label>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-[12px]">
          <p aria-live="polite" className="font-semibold text-[#607867]">
            {filtered.length} {filtered.length === 1 ? "contact" : "contacts"}
            {district !== "All districts" && <span> relevant to {district}</span>}
          </p>
          {(district !== "All districts" || category !== "All services" || query.trim()) &&
            <button type="button" onClick={clear} className="rounded-lg px-3 py-2 font-bold text-[#2e7652] hover:bg-[#eaf4eb]">Clear filters</button>}
        </div>

        {district !== "All districts" && <div className="mt-4 flex items-start gap-3 rounded-[13px] border border-[#e6e1d4] bg-[#fffaf0] px-4 py-3 text-[12px] leading-6 text-[#7a715d]">
          <MapPin className="mt-1 shrink-0 text-[#af905b]" size={17}/>
          <p><strong>{district}:</strong> District-specific office numbers appear where independently listed. National hotlines and responsible regional offices remain visible; those are not presented as direct district branch lines.</p>
        </div>}

        {groups.length ? <div className="mt-10 space-y-12">
          {groups.map(group => {
            const Icon = categoryIcons[group.name];
            return <div key={group.name} id={"directory-" + group.name.toLowerCase()} className="scroll-mt-[125px]">
              <div className="mb-5 flex items-center gap-3 border-b border-[#e0e8df] pb-4">
                <div className="grid h-10 w-10 place-items-center rounded-xl border border-[#d8e5da] bg-white text-[#397b55]"><Icon size={20}/></div>
                <h3 className="text-[20px] font-bold tracking-[-.04em] text-[#1f4632]">{group.name} contacts</h3>
                <span className="ml-auto text-[11px] font-medium text-[#8a9d8f]">{group.entries.length} listed</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {group.entries.map(entry => <ContactCard key={entry.id} contact={entry}/>)}
              </div>
            </div>;
          })}
        </div> : <div role="status" className="mt-10 rounded-[18px] border border-dashed border-[#d7e2d8] bg-white px-6 py-16 text-center">
          <Search className="mx-auto text-[#a4b7a6]" size={34}/>
          <h3 className="mt-4 text-[19px] font-bold text-[#244d35]">No matching contact listed yet</h3>
          <p className="mt-2 text-[13px] text-[#839184]">Try a different district or call the published nationwide service hotline.</p>
          <button onClick={clear} type="button" className="mt-5 rounded-xl bg-[#20563e] px-5 py-3 text-[12px] font-bold text-white">Show all contacts</button>
        </div>}
        <div className="mt-12 rounded-[18px] border border-[#dce6db] bg-[#f1f6ef] p-5 text-[12px] leading-[1.85] text-[#657969] sm:p-7">
          <strong className="block text-[14px] text-[#21452f]">Important about this directory</strong>
          <p className="mt-1">SL Business Index is an independent information directory, not a government, electricity provider, emergency service or bank. Telephone details can change. We link each listing to the publishing organization so you can recheck it. For urgent emergencies, use the national emergency service directly. Do not send passwords, OTPs, account numbers or card details through general support channels.</p>
        </div>
      </div>
    </section>
  );
}

function ContactCard({ contact }: { contact: PublicContact }) {
  const dial = contact.phone.replace(/[^\d+]/g, "");
  return <article className="flex h-full min-w-0 flex-col rounded-[18px] border border-[#e1e8e0] bg-white p-5 shadow-[0_5px_20px_rgba(24,58,34,.035)] transition-colors hover:border-[#aacdb5]">
    <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-[.11em]">
      <span className="text-[#9a7c53]">{contact.scope} contact</span>
      <span className="text-[#879c8d]">{contact.area}</span>
    </div>
    <h4 className="mt-3 min-w-0 text-[16px] font-bold leading-[1.4] tracking-[-.03em] text-[#21432f]">{contact.name}</h4>
    <p className="mt-2 flex-1 text-[12px] leading-[1.75] text-[#77867a]">{contact.description}</p>
    <a href={"tel:" + dial} aria-label={"Call " + contact.name + " on " + contact.phone}
      className="mt-5 flex min-h-11 w-fit items-center gap-2 rounded-lg bg-[#ecf6ee] px-4 py-2 text-[16px] font-extrabold tracking-[-.035em] text-[#206443] hover:bg-[#d8ecdd]">
      <Phone size={17}/> {contact.phone}
    </a>
    <a href={contact.sourceUrl} target="_blank" rel="noopener noreferrer"
      className="mt-4 inline-flex min-h-9 w-fit items-center gap-2 text-[11px] font-semibold text-[#5a8770] underline decoration-[#b9d4c1] underline-offset-4 hover:text-[#24553a]">
      Official source: {contact.sourceName} <ExternalLink size={12}/>
    </a>
  </article>;
}
