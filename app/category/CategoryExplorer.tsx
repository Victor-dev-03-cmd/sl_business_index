"use client";

import { useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  Compass,
  CornerDownRight,
  Layers3,
  MapPin,
  Search,
  X,
} from "lucide-react";
import CategoryIcon from "../components/CategoryIcon";

export type CategoryRecord = {
  id: string | number;
  name: string;
  icon: string | null;
  parent_id: string | number | null;
};

type CategoryGroup = {
  root: CategoryRecord;
  children: CategoryRecord[];
};

const INDUSTRY_PRIORITY = [
  "Events, Food & Leisure",
  "Care & Lifestyle",
  "Retail & Others",
  "Technical & Electronics",
  "Professional & Finance",
  "Construction & Industrial",
  "Manpower Services",
  "Travel & Transport",
];

const FEATURED_SERVICES = [
  { name: "Food & Dining", caption: "Food, cafés & dining" },
  { name: "Health & Medical", caption: "Care & wellbeing" },
  { name: "Shopping & Retail", caption: "Shops & essentials" },
  { name: "Hotels & Restaurants", caption: "Stays & hospitality" },
  { name: "Educational institutes & Services", caption: "Learning & training" },
];

const slugify = (name: string) =>
  name
    .toLowerCase()
    .trim()
    .replace(/ & /g, "-")
    .replace(/ /g, "-")
    .replace(/,/g, "")
    .replace(/[^\w-]+/g, "");

const categoryHref = (name: string) => "/category/" + slugify(name);
const categoryKey = (category: CategoryRecord) => String(category.id);
const cleanName = (name: string) => name.trim().toLowerCase();

function buildGroups(categories: CategoryRecord[]): CategoryGroup[] {
  const byId = new Map(categories.map((category) => [categoryKey(category), category]));
  const roots = categories.filter(
    (category) => category.parent_id == null || !byId.has(String(category.parent_id)),
  );

  const groups = roots.map((root) => ({
    root,
    children: categories
      .filter((category) => category.parent_id != null && String(category.parent_id) === categoryKey(root))
      .sort((a, b) => a.name.localeCompare(b.name)),
  }));

  const industryRank = (name: string) => {
    const index = INDUSTRY_PRIORITY.findIndex((industry) => cleanName(industry) === cleanName(name));
    return index === -1 ? INDUSTRY_PRIORITY.length : index;
  };

  return groups.sort(
    (a, b) =>
      industryRank(a.root.name) - industryRank(b.root.name) ||
      a.root.name.localeCompare(b.root.name),
  );
}

export default function CategoryExplorer({ categories }: { categories: CategoryRecord[] }) {
  const [searchTerm, setSearchTerm] = useState("");
  const deferredTerm = useDeferredValue(searchTerm);
  const [selectedIndustry, setSelectedIndustry] = useState("all");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const groups = useMemo(() => buildGroups(categories), [categories]);
  const popularServices = useMemo(
    () =>
      FEATURED_SERVICES.map((item) => ({
        ...item,
        category: categories.find((category) => cleanName(category.name) === cleanName(item.name)),
      })).filter(
        (item): item is { name: string; caption: string; category: CategoryRecord } =>
          item.category !== undefined,
      ),
    [categories],
  );

  const query = deferredTerm.trim().toLocaleLowerCase();
  const filteredGroups = useMemo(() => {
    return groups
      .filter((group) => selectedIndustry === "all" || categoryKey(group.root) === selectedIndustry)
      .map((group) => {
        if (!query || group.root.name.toLocaleLowerCase().includes(query)) return group;

        return {
          ...group,
          children: group.children.filter((child) => child.name.toLocaleLowerCase().includes(query)),
        };
      })
      .filter((group) => !query || group.root.name.toLocaleLowerCase().includes(query) || group.children.length > 0);
  }, [groups, query, selectedIndustry]);

  const activeFilter = selectedIndustry !== "all" || searchTerm.trim().length > 0;
  const clearFilters = () => {
    setSearchTerm("");
    setSelectedIndustry("all");
  };

  return (
    <div className="min-h-[100dvh] bg-[#FBFAF7] text-[#1B3430]">
      <section className="relative isolate overflow-hidden bg-[#1B3430] text-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage: "radial-gradient(rgba(240,217,172,0.16) 0.7px, transparent 0.7px)",
            backgroundSize: "30px 30px",
          }}
        />
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full border border-[#A6C8AC]/10" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-12 bottom-10 h-64 w-64 rounded-full border border-[#A6C8AC]/10" />

        <div className="relative mx-auto grid max-w-[1440px] gap-12 px-5 py-14 sm:px-8 sm:py-16 lg:grid-cols-[1.13fr_0.87fr] lg:items-center lg:gap-16 lg:px-12 lg:py-[76px]">
          <div className="min-w-0">
            <nav aria-label="Breadcrumb" className="mb-9 flex items-center gap-2 text-[12px] font-medium text-[#AFC9B8]">
              <Link href="/" className="transition-colors hover:text-white focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0D9AC]">
                Home
              </Link>
              <ChevronRight size={14} className="opacity-50" aria-hidden="true" />
              <span className="text-[#F0D9AC]" aria-current="page">Categories</span>
            </nav>

            <div className="mb-5 inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.17em] text-[#F0D9AC]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#9AE6B4]" aria-hidden="true" />
              Explore Sri Lanka by industry
            </div>

            <h1 className="max-w-[760px] text-balance text-[clamp(2.8rem,5.5vw,5.4rem)] font-semibold leading-[1.055] tracking-[-0.065em]">
              Every service.
              <span className="block text-[#F0D9AC]">One place to find it.</span>
            </h1>

            <p className="mt-6 max-w-[600px] text-pretty text-[15px] leading-[1.8] text-[#C9DDD0] sm:text-[17px]">
              From everyday essentials to specialist expertise, find what you need
              through a simpler, more organized directory of Sri Lankan businesses.
            </p>

            <div className="mt-8 max-w-[625px]">
              <label htmlFor="category-search" className="mb-2.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-[#B4CEBF]">
                Find a category or service
              </label>
              <div className="flex min-h-14 items-center gap-3 rounded-[16px] border border-white/20 bg-white px-4 shadow-[0_12px_36px_rgba(0,0,0,0.13)] focus-within:ring-2 focus-within:ring-[#A1E3C2]">
                <Search size={20} className="shrink-0 text-[#4A8C70]" aria-hidden="true" />
                <input
                  id="category-search"
                  type="search"
                  autoComplete="off"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Try food, healthcare, electrician..."
                  className="min-w-0 flex-1 bg-transparent py-3.5 text-[14px] font-medium text-[#1B3430] outline-none placeholder:font-normal placeholder:text-stone-400 sm:text-[15px]"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    aria-label="Clear category search"
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-stone-500 transition-colors hover:bg-stone-100 hover:text-[#1B3430] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#36785E]"
                  >
                    <X size={18} aria-hidden="true" />
                  </button>
                )}
              </div>
              <p className="mt-3 text-[12px] text-[#A7C5B5]">
                Search by industry or a specific service — no extra steps.
              </p>
            </div>
          </div>

          <div className="hidden lg:block" aria-hidden="true">
            <div className="relative mx-auto max-w-[490px] rounded-[28px] border border-white/15 bg-white/[0.07] p-5 shadow-[0_26px_90px_rgba(0,0,0,0.13)] xl:p-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#F0D9AC]">Directory overview</span>
                <span className="rounded-full border border-[#88CBAA]/30 bg-[#88CBAA]/10 px-3 py-1 text-[10px] font-semibold tracking-wide text-[#BFE8CE]">Sri Lanka</span>
              </div>
              <div className="grid grid-cols-2 gap-3 py-5">
                <div className="rounded-[18px] border border-white/10 bg-[#26483B] px-5 py-5">
                  <span className="text-[36px] font-semibold leading-none tracking-[-0.065em] text-white">{groups.length}</span>
                  <span className="mt-2 block text-[11px] font-medium text-[#BDD6C5]">Main industries</span>
                </div>
                <div className="rounded-[18px] border border-white/10 bg-[#26483B] px-5 py-5">
                  <span className="text-[36px] font-semibold leading-none tracking-[-0.065em] text-white">{categories.length}</span>
                  <span className="mt-2 block text-[11px] font-medium text-[#BDD6C5]">Total categories</span>
                </div>
              </div>
              <div className="space-y-2.5">
                {groups.slice(0, 3).map((group, index) => (
                  <div key={group.root.id} className="flex items-center gap-3 rounded-[15px] border border-white/10 bg-[#18372F] px-3.5 py-3">
                    <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] border border-[#A0CDB0]/15 bg-[#315A4A] text-[#D4F5D9]">
                      <CategoryIcon name={group.root.icon} categoryName={group.root.name} size={25} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-white">{group.root.name}</p>
                      <p className="mt-0.5 text-[11px] text-[#A8C9B7]">
                        {group.children.length > 0 ? group.children.length + " related services" : "Explore this industry"}
                      </p>
                    </div>
                    <span className="text-[11px] tabular-nums text-[#F0D9AC]">0{index + 1}</span>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex items-center gap-2 text-[11px] font-semibold text-[#C9DFCE]">
                <Compass size={16} className="text-[#F0D9AC]" aria-hidden="true" />
                Browse with clarity, discover with confidence.
              </div>
            </div>
          </div>
        </div>
      </section>

      <main>
        {popularServices.length > 0 && (
          <section aria-labelledby="popular-services-title" className="border-b border-[#E6EAE1] bg-white">
            <div className="mx-auto max-w-[1440px] px-5 py-14 sm:px-8 sm:py-16 lg:px-12 lg:py-[72px]">
              <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.17em] text-[#438065]">Popular starting points</p>
                  <h2 id="popular-services-title" className="text-[clamp(1.9rem,3.1vw,3rem)] font-semibold leading-[1.13] tracking-[-0.055em] text-[#1B3430]">
                    Find your next stop<span className="text-[#4A8C70]">.</span>
                  </h2>
                </div>
                <span className="text-[12px] font-medium text-stone-500">Handpicked paths into the directory</span>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 lg:gap-4">
                {popularServices.map((item) => (
                  <Link
                    key={item.category.id}
                    href={categoryHref(item.category.name)}
                    className="group flex min-h-[178px] flex-col justify-between rounded-[21px] border border-[#E0EADB] bg-[#F8F7F2] p-4 transition-[border-color,background-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-[#AECFB7] hover:bg-white hover:shadow-[0_12px_32px_rgba(25,52,40,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#36785E] sm:p-5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="inline-flex h-[62px] w-[62px] items-center justify-center rounded-[17px] border border-[#D7E6D7] bg-white text-[#36785E] transition-colors group-hover:bg-[#ECF4ED]">
                        <CategoryIcon name={item.category.icon} categoryName={item.category.name} size={34} />
                      </span>
                      <ArrowUpRight size={17} className="shrink-0 text-[#76A28C] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
                    </div>
                    <div className="pt-5">
                      <h3 className="text-[14px] font-bold leading-snug tracking-[-0.025em] text-[#1B3430] sm:text-[15px]">{item.category.name}</h3>
                      <p className="mt-1 text-[11px] leading-snug text-stone-500">{item.caption}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        <section id="category-directory" aria-labelledby="industry-directory-title" className="scroll-mt-20 bg-[#FBFAF7]">
          <div className="mx-auto max-w-[1440px] px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
              <div>
                <p className="mb-3 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.17em] text-[#438065]">
                  <Layers3 size={15} aria-hidden="true" />
                  The industry directory
                </p>
                <h2 id="industry-directory-title" className="text-[clamp(2.1rem,4vw,3.8rem)] font-semibold leading-[1.1] tracking-[-0.06em] text-[#1B3430]">
                  Explore by industry<span className="text-[#4A8C70]">.</span>
                </h2>
                <p className="mt-3 max-w-[650px] text-[14px] leading-[1.75] text-stone-500 sm:text-[15px]">
                  Start with a main industry, then explore the services within it.
                  Every category is just a click away.
                </p>
              </div>
              <div className="rounded-full border border-[#DBE8DA] bg-white px-4 py-2 text-[12px] font-semibold text-[#36785E]">
                {filteredGroups.length} {filteredGroups.length === 1 ? "industry" : "industries"} shown
              </div>
            </div>

            <div aria-label="Filter by industry" className="mb-8 flex gap-2 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <button
                type="button"
                aria-pressed={selectedIndustry === "all"}
                onClick={() => setSelectedIndustry("all")}
                className={"shrink-0 rounded-full border px-4 py-2.5 text-[12px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#36785E] " +
                  (selectedIndustry === "all" ? "border-[#1B3430] bg-[#1B3430] text-white" : "border-[#DCE8DC] bg-white text-[#416052] hover:border-[#91BA9D] hover:text-[#1B3430]")}
              >
                All industries
              </button>
              {groups.map((group) => (
                <button
                  key={group.root.id}
                  type="button"
                  aria-pressed={selectedIndustry === categoryKey(group.root)}
                  onClick={() => setSelectedIndustry(categoryKey(group.root))}
                  className={"shrink-0 rounded-full border px-4 py-2.5 text-[12px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#36785E] " +
                    (selectedIndustry === categoryKey(group.root) ? "border-[#1B3430] bg-[#1B3430] text-white" : "border-[#DCE8DC] bg-white text-[#416052] hover:border-[#91BA9D] hover:text-[#1B3430]")}
                >
                  {group.root.name}
                </button>
              ))}
            </div>

            {activeFilter && (
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-[#DCE8DC] bg-[#F1F6EE] px-4 py-3">
                <p className="text-[12px] font-medium text-[#365D4B]">
                  {query ? "Showing matching industries and services" : "Showing your selected industry"}
                </p>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-[12px] font-semibold text-[#2B6552] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#36785E]"
                >
                  <X size={15} aria-hidden="true" /> Clear filters
                </button>
              </div>
            )}

            {filteredGroups.length > 0 ? (
              <div className="grid items-start gap-4 md:grid-cols-2 lg:gap-5 xl:grid-cols-3">
                {filteredGroups.map((group, index) => {
                  const key = categoryKey(group.root);
                  const expanded = expandedGroups[key] || Boolean(query);
                  const children = expanded ? group.children : group.children.slice(0, 5);
                  const remaining = group.children.length - children.length;

                  return (
                    <article
                      key={key}
                      className="flex h-full min-w-0 flex-col overflow-hidden rounded-[23px] border border-[#E1E8DF] bg-white shadow-[0_3px_18px_rgba(23,54,40,0.025)] transition-[border-color,box-shadow] duration-200 hover:border-[#C7DDCB] hover:shadow-[0_12px_36px_rgba(23,54,40,0.065)]"
                    >
                      <div className="flex items-start gap-3.5 p-5 sm:p-6">
                        <span className="inline-flex h-[61px] w-[61px] shrink-0 items-center justify-center rounded-[17px] border border-[#DFE9DC] bg-[#F2F7F1] text-[#36785E]">
                          <CategoryIcon name={group.root.icon} categoryName={group.root.name} size={35} />
                        </span>
                        <div className="min-w-0 flex-1 pt-1">
                          <p className="text-[10px] font-semibold tracking-[0.14em] text-[#7AA48B]">INDUSTRY {String(index + 1).padStart(2, "0")}</p>
                          <h3 className="mt-1.5 text-[18px] font-semibold leading-[1.25] tracking-[-0.035em] text-[#1B3430] sm:text-[19px]">
                            <Link href={categoryHref(group.root.name)} className="rounded-sm transition-colors hover:text-[#36785E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#36785E]">
                              {group.root.name}
                            </Link>
                          </h3>
                          <p className="mt-1.5 text-[12px] text-stone-500">
                            {group.children.length > 0
                              ? group.children.length + (group.children.length === 1 ? " related service" : " related services")
                              : "Explore this industry"}
                          </p>
                        </div>
                        <Link
                          href={categoryHref(group.root.name)}
                          aria-label={"Open " + group.root.name}
                          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#E0EADB] text-[#548268] transition-colors hover:border-[#BAD5C1] hover:bg-[#EFF6F0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#36785E]"
                        >
                          <ArrowUpRight size={18} aria-hidden="true" />
                        </Link>
                      </div>

                      <div className="mx-5 border-t border-[#ECF0E9] sm:mx-6" />

                      <div className="flex-1 px-3 py-3 sm:px-4">
                        {children.length > 0 ? (
                          <div className="space-y-0.5">
                            {children.map((child) => (
                              <Link
                                key={child.id}
                                href={categoryHref(child.name)}
                                className="group/item flex min-h-11 items-center gap-2.5 rounded-[11px] px-2.5 py-2 text-[#436254] transition-colors hover:bg-[#F2F7F1] hover:text-[#1B3430] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#36785E]"
                              >
                                <CornerDownRight size={14} className="shrink-0 text-[#93B6A0]" aria-hidden="true" />
                                <span className="min-w-0 flex-1 text-[12px] font-medium leading-snug sm:text-[13px]">{child.name}</span>
                                <ChevronRight size={15} className="shrink-0 text-[#9AB9A5] transition-transform group-hover/item:translate-x-0.5" aria-hidden="true" />
                              </Link>
                            ))}
                          </div>
                        ) : (
                          <div className="flex min-h-20 items-center rounded-xl bg-[#F8F9F5] px-4 py-3 text-[12px] leading-relaxed text-stone-500">
                            Browse businesses and services in this industry.
                          </div>
                        )}

                        {remaining > 0 && !query && (
                          <button
                            type="button"
                            aria-expanded={Boolean(expandedGroups[key])}
                            onClick={() => setExpandedGroups((previous) => ({ ...previous, [key]: !previous[key] }))}
                            className="mt-2 flex w-full min-h-10 items-center justify-center gap-2 rounded-[10px] border border-[#DFE9DC] bg-[#F8FAF6] px-3 text-[12px] font-semibold text-[#36785E] transition-colors hover:bg-[#EDF5ED] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#36785E]"
                          >
                            <ChevronDown size={15} aria-hidden="true" />
                            Show {remaining} more {remaining === 1 ? "service" : "services"}
                          </button>
                        )}
                        {expandedGroups[key] && !query && group.children.length > 5 && (
                          <button
                            type="button"
                            onClick={() => setExpandedGroups((previous) => ({ ...previous, [key]: false }))}
                            className="mt-2 flex w-full min-h-10 items-center justify-center rounded-[10px] text-[12px] font-semibold text-[#36785E] hover:bg-[#F2F7F1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#36785E]"
                          >
                            Show fewer services
                          </button>
                        )}
                      </div>

                      <div className="mt-auto border-t border-[#ECF0E9] bg-[#FAFBF8] px-5 py-3.5 sm:px-6">
                        <Link href={categoryHref(group.root.name)} className="inline-flex min-h-7 items-center gap-2 rounded-sm text-[12px] font-bold text-[#285D46] transition-colors hover:text-[#1B3430] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#36785E]">
                          Explore industry <ArrowRight size={15} aria-hidden="true" />
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-[24px] border border-dashed border-[#CFDFD2] bg-white px-6 py-20 text-center">
                <span className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F2F7F1] text-[#36785E]"><Search size={29} aria-hidden="true" /></span>
                <h3 className="mt-5 text-[21px] font-semibold tracking-tight text-[#1B3430]">No matching categories</h3>
                <p className="mx-auto mt-2 max-w-sm text-[14px] leading-relaxed text-stone-500">Try a different keyword or clear your industry filter to explore more services.</p>
                <button type="button" onClick={clearFilters} className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#1B3430] px-5 text-[13px] font-bold text-white hover:bg-[#2E6A51] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#36785E]">
                  Show all categories <ArrowRight size={16} aria-hidden="true" />
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="border-t border-[#E6EAE1] bg-white py-12 sm:py-16">
          <div className="mx-auto flex max-w-[1440px] flex-col justify-between gap-6 px-5 sm:px-8 lg:flex-row lg:items-center lg:px-12">
            <div className="max-w-[650px]">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#438065]">For Sri Lankan businesses</p>
              <h2 className="text-[clamp(1.5rem,2.5vw,2.5rem)] font-semibold tracking-[-0.055em] text-[#1B3430]">Make it easier for customers to find you.</h2>
              <p className="mt-2 text-[13px] leading-relaxed text-stone-500">Create a listing and be part of Sri Lanka&apos;s growing business directory.</p>
            </div>
            <Link href="/register-business" className="inline-flex min-h-12 w-fit shrink-0 items-center gap-2 rounded-[12px] bg-[#1B3430] px-6 text-[13px] font-bold text-white transition-colors hover:bg-[#2F765C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#36785E]">
              List your business <ArrowUpRight size={17} aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
