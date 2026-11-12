"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ChevronDown, CircleHelp, Search, X } from "lucide-react";
import { FAQS, FAQ_CATEGORIES, type FaqCategory } from "./faqData";

export default function FAQExplorer() {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<"All topics" | FaqCategory>("All topics");
  const [opened, setOpened] = useState<string | null>("growth-os");

  const filtered = useMemo(() => {
    const text = query.trim().toLocaleLowerCase();
    return FAQS.filter(item => {
      if (active !== "All topics" && item.category !== active) return false;
      return !text || [item.question, item.answer, item.category, ...(item.tags || [])]
        .some(value => value.toLocaleLowerCase().includes(text));
    });
  }, [query, active]);

  return (
    <div className="w-full">
      <div className="relative rounded-[16px] border border-[#e0e8df] bg-white p-2 shadow-[0_10px_30px_rgba(26,75,42,.045)]">
        <Search aria-hidden="true" size={21} className="pointer-events-none absolute left-6 top-[27px] text-[#72a080]"/>
        <input
          type="search"
          aria-label="Search frequently asked questions"
          placeholder="Search questions, business verification, GrowthOS, billing…"
          value={query}
          onChange={event => setQuery(event.target.value)}
          className="min-h-[58px] w-full rounded-[11px] border border-transparent bg-[#f8faf6] py-4 pl-13 pr-12 text-[13px] font-medium text-[#264432] outline-none placeholder:text-[#9aa99b] focus:border-[#87b89b] focus:bg-white focus:ring-2 focus:ring-[#dcefe0] sm:text-[14px]"
        />
        {query && (
          <button type="button" onClick={() => setQuery("")}
            aria-label="Clear FAQ search" className="absolute right-5 top-[24px] grid h-8 w-8 place-items-center rounded-lg text-[#7d9981] hover:bg-[#e9f2e8]">
            <X size={17}/>
          </button>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="FAQ categories">
        {(["All topics", ...FAQ_CATEGORIES] as const).map(category => (
          <button key={category} type="button" aria-pressed={active === category}
            onClick={() => { setActive(category); setOpened(null); }}
            className={"min-h-10 rounded-full border px-4 py-2 text-[11px] font-bold transition-colors sm:text-[12px] " +
              (active === category ? "border-[#276247] bg-[#245d41] text-white" : "border-[#dae6db] bg-white text-[#537563] hover:border-[#9ebfa7] hover:bg-[#f1f7f0]")}>
            {category}
          </button>
        ))}
      </div>

      <div className="mt-9 flex flex-wrap items-center justify-between gap-3 border-b border-[#e1e9e0] pb-4">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-[#aa885c]">Knowledge base</p>
          <h2 className="mt-2 text-[22px] font-extrabold tracking-[-.045em] text-[#244734]">Answers that help you move forward.</h2>
        </div>
        <span aria-live="polite" className="rounded-full bg-[#eef6eb] px-3 py-1.5 text-[11px] font-semibold text-[#5d8267]">
          {filtered.length} {filtered.length === 1 ? "answer" : "answers"}
        </span>
      </div>

      {filtered.length ? (
        <div className="mt-2 divide-y divide-[#e5ebe4]">
          {filtered.map((faq, index) => (
            <details key={faq.id}
              open={opened === faq.id}
              onToggle={event => {
                if (event.currentTarget.open) setOpened(faq.id);
                else if (opened === faq.id) setOpened(null);
              }}
              className="group scroll-mt-[145px] py-1">
              <summary className="flex min-h-[81px] cursor-pointer list-none items-center gap-4 rounded-[11px] px-2 py-4 text-left outline-none transition-colors hover:bg-[#f6faf4] focus-visible:ring-2 focus-visible:ring-[#69a782] [&::-webkit-details-marker]:hidden sm:px-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] border border-[#dceade] bg-[#f0f7ef] text-[#3b8c5c]">
                  <CircleHelp size={18}/>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[10px] font-extrabold uppercase tracking-[.12em] text-[#a38d68]">{faq.category}</span>
                  <span className="mt-1.5 block text-[14px] font-bold leading-[1.5] tracking-[-.025em] text-[#264735] sm:text-[15px]">{faq.question}</span>
                </span>
                <ChevronDown aria-hidden="true" size={18} className="shrink-0 text-[#739881] transition-transform duration-150 group-open:rotate-180 motion-reduce:transition-none"/>
              </summary>
              <div className="pb-7 pl-4 pr-5 sm:pl-[78px] sm:pr-12">
                <p className="max-w-[790px] text-[13px] leading-[1.95] text-[#687e6d] sm:text-[14px]">{faq.answer}</p>
                {faq.relatedHref && (
                  <Link href={faq.relatedHref}
                    className="mt-4 inline-flex min-h-9 items-center gap-2 text-[12px] font-bold text-[#358258] underline decoration-[#b5d8bf] underline-offset-4 hover:text-[#20533a]">
                    {faq.relatedLabel || "Learn more"} <ArrowUpRight size={14}/>
                  </Link>
                )}
              </div>
            </details>
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-[19px] border border-dashed border-[#d9e5d9] bg-white px-6 py-14 text-center">
          <CircleHelp className="mx-auto text-[#a0bbaa]" size={34}/>
          <h3 className="mt-4 text-[19px] font-bold text-[#2b553a]">No matching answers yet</h3>
          <p className="mt-3 text-[13px] leading-6 text-[#839385]">Try a different keyword or clear your filters.</p>
          <button type="button" onClick={() => {setQuery("");setActive("All topics");}}
            className="mt-5 rounded-[11px] bg-[#205f41] px-5 py-3 text-[12px] font-bold text-white">Show all questions</button>
        </div>
      )}
    </div>
  );
}
