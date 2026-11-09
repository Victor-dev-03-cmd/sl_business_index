"use client";

import Link from "next/link";
import { ArrowRight, ArrowUpRight, Compass, LayoutGrid, X } from "lucide-react";

interface Category {
  id: string;
  name: string;
  parent_id: string | null;
}

interface CategorySubNavbarProps {
  isOpen: boolean;
  activeCategory: string | null;
  categories: Category[];
  onClose: () => void;
}

const FALLBACK_DATA: Record<string, string[]> = {
  "Manpower Services": ["Mason", "Painter", "Plumber", "Carpenter", "Welder", "Electrician", "Cleaner", "Laborer / Helper"],
  "Care & Lifestyle": ["Health & Medical", "Baby Care", "Pet Care", "Beauty & Health", "Religious Organization"],
  "Professional & Finance": ["Banking & Finance", "Insurance Services", "Financial Services", "Legal, Government & Services", "Media & Advertising", "Professional Services"],
  "Construction & Industrial": ["Construction Services", "Hardware Equipment", "Industry & Manufacturing", "Interior Design Services", "Office Equipment & Services"],
  "Technical & Electronics": ["Electronic Peripherals", "Electrical Equipment & Services", "Repairing & Services", "Media & Communications"],
  "Events, Food & Leisure": ["Event Planner", "Weddings Services", "Food & Dining", "Arts, Entertainment & Leisure", "Hotels & Restaurants"],
  "Travel & Transport": ["Travel & Tourism", "Travel & Transportation", "Vehicles & Automotive", "Telecommunication Services"],
  "Retail & Others": ["Shopping & Retail", "Agriculture Products", "Sports & Recreation", "Home Appliances & Services", "Educational Institutes & Services"],
};

const GROUP_DESCRIPTIONS: Record<string, string> = {
  "Manpower Services": "Discover skilled professionals and trusted service providers.",
  "Care & Lifestyle": "Find everyday care, wellness and lifestyle services.",
  "Professional & Finance": "Connect with professional expertise and financial services.",
  "Construction & Industrial": "Explore suppliers, construction services and industrial solutions.",
  "Technical & Electronics": "Discover technology, equipment, repairs and electronics.",
  "Events, Food & Leisure": "Find places, experiences and services for every occasion.",
  "Travel & Transport": "Explore transportation, travel and mobility services.",
  "Retail & Others": "Find local shops, products and everyday essentials.",
};

const slugify = (name: string) =>
  name.toLowerCase().trim()
    .replace(/ & /g, "-")
    .replace(/ /g, "-")
    .replace(/,/g, "")
    .replace(/[^\w-]+/g, "");

export default function CategorySubNavbar({
  isOpen,
  activeCategory,
  categories,
  onClose,
}: CategorySubNavbarProps) {
  if (!isOpen || !activeCategory) return null;

  const normalized = activeCategory.toLowerCase().trim();
  const parent = categories.find(category => {
    if (category.parent_id) return false;
    const name = category.name.toLowerCase().trim();
    return name === normalized || name.replace(/,/g, "") === normalized.replace(/,/g, "") ||
      normalized.includes(name) || name.includes(normalized);
  });

  const children = parent
    ? categories.filter(category => category.parent_id === parent.id)
    : [];
  const links = children.length > 0
    ? children.map(category => ({ id: category.id, name: category.name }))
    : (FALLBACK_DATA[activeCategory] || []).map(name => ({ id: name, name }));

  return (
    <section
      id="industry-mega-menu"
      aria-label={activeCategory + " business categories"}
      className="absolute inset-x-0 top-full z-[70] hidden border-t border-stone-100 bg-[#FCFAF6] shadow-[0_26px_65px_rgba(9,31,54,0.15)] lg:block"
    >
      <div className="mx-auto grid w-full max-w-[1440px] grid-cols-[280px_minmax(0,1fr)] px-6 py-5 xl:px-8">
        <div className="flex min-h-[290px] flex-col justify-between rounded-[18px] bg-[#1B3430] p-7 text-white">
          <div>
            <div className="mb-6 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-white/10">
              <Compass size={22} className="text-[#F0D9AC]" strokeWidth={1.7} />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#E7C58E]">Explore an industry</p>
            <h2 className="mt-3 text-[26px] font-semibold leading-[1.18] tracking-[-0.04em]">{activeCategory}</h2>
            <p className="mt-4 text-[13px] leading-6 text-[#CADDCB]">
              {GROUP_DESCRIPTIONS[activeCategory] || "Discover local businesses and services throughout Sri Lanka."}
            </p>
          </div>
          <Link
            href="/category"
            onClick={onClose}
            className="mt-7 inline-flex items-center gap-2 text-[13px] font-semibold text-[#F0F2E9] transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
          >
            Explore all categories <ArrowRight size={16} />
          </Link>
        </div>

        <div className="min-w-0 px-7 pb-4 pt-2 xl:px-10">
          <div className="flex items-start justify-between gap-4 border-b border-stone-100 pb-5">
            <div>
              <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#36785E]">
                <LayoutGrid size={14} /> Browse services
              </p>
              <h3 className="mt-2 text-[21px] font-semibold tracking-[-0.035em] text-[#1B3430]">
                Find what you need
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close industry mega menu"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-stone-200 text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <X size={18} />
            </button>
          </div>

          <div className="grid max-h-[min(52vh,390px)] grid-cols-2 gap-x-6 gap-y-1 overflow-y-auto py-5 pr-2 xl:grid-cols-3">
            {links.length > 0 ? links.map(item => (
              <Link
                key={item.id}
                href={"/category/" + slugify(item.name)}
                onClick={onClose}
                className="group flex min-h-12 items-center justify-between gap-3 rounded-xl px-3 py-3 text-[13px] font-medium text-stone-600 transition-colors duration-150 hover:bg-[#F8F7F2] hover:text-[#1B3430] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                <span className="min-w-0 leading-snug">{item.name}</span>
                <ArrowUpRight size={15} className="shrink-0 text-stone-300 transition-colors group-hover:text-[#36785E]" />
              </Link>
            )) : (
              <p className="col-span-full py-10 text-sm text-stone-500">
                No subcategories available for this industry yet.
              </p>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-stone-100 pt-5">
            <p className="text-[12px] text-stone-500">Connecting people with Sri Lankan businesses.</p>
            <Link
              href="/register-business"
              onClick={onClose}
              className="inline-flex shrink-0 items-center gap-1.5 text-[12px] font-semibold text-[#26483B] transition-colors hover:text-[#152C25]"
            >
              List your business <ArrowUpRight size={15} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
