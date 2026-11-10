import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { type Metadata } from "next";
import Link from "next/link";
import { cache } from "react";
import { ArrowUpRight, ChevronRight, Compass, MapPin, Search, ShieldCheck } from "lucide-react";
import CategoryIcon from "@/app/components/CategoryIcon";
import CategoryContent, { type CategoryInfo } from "./CategoryContent";

export const revalidate = 600;

type Props = { params: Promise<{ slug: string }> };

const slugify = (name: string) =>
  name.toLowerCase().trim().replace(/ & /g, "-").replace(/ /g, "-").replace(/,/g, "").replace(/[^\w-]+/g, "");

const loadCategories = cache(async (): Promise<CategoryInfo[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, icon, parent_id")
    .order("name", { ascending: true });
  if (error) {
    console.error("Unable to read categories:", error.message);
    return [];
  }
  return (data ?? []) as CategoryInfo[];
});

async function getCategory(slug: string): Promise<CategoryInfo | null> {
  const categories = await loadCategories();
  const knownCategory = categories.find((item) => slugify(item.name) === slug);
  if (knownCategory) return knownCategory;

  // Preserve legacy category links for approved business categories that
  // aren't present in the curated category table.
  const supabase = await createClient();
  const { data: businesses } = await supabase
    .from("businesses")
    .select("category")
    .eq("status", "approved");

  const matched = Array.from(new Set((businesses ?? []).map((item) => item.category).filter(Boolean)))
    .find((name) => slugify(String(name)) === slug);
  return matched ? { id: null, name: String(matched), icon: null, parent_id: null } : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategory(slug);
  if (!category) return { title: "Category not found | SL Business Index" };
  return {
    title: category.name + " in Sri Lanka | SL Business Index",
    description: "Discover " + category.name + " businesses across Sri Lanka. Refine results by town, distance, rating and verification on SL Business Index.",
  };
}

export default async function CategoryDetailPage({ params }: Props) {
  const { slug } = await params;
  const [category, allCategories] = await Promise.all([getCategory(slug), loadCategories()]);
  if (!category) notFound();

  const parent = category.parent_id
    ? allCategories.find((item) => item.id === category.parent_id)
    : undefined;
  const relatedServices = category.id
    ? allCategories.filter((item) => item.parent_id === category.id).slice(0, 5)
    : [];

  return (
    <div className="min-h-[100dvh] bg-[#FAFBF8]">
      <section className="relative isolate overflow-hidden bg-[#193B2F] text-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.17]"
          style={{
            backgroundImage: "linear-gradient(rgba(211,233,215,.11) 1px, transparent 1px), linear-gradient(90deg, rgba(211,233,215,.11) 1px, transparent 1px)",
            backgroundSize: "38px 38px",
          }}
        />
        <div className="relative mx-auto max-w-[1440px] px-5 py-11 sm:px-8 sm:py-14 lg:px-12 lg:py-16">
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-[11px] font-semibold tracking-wide text-[#B2D2BE]">
            <Link href="/" className="hover:text-white">Home</Link>
            <ChevronRight size={13} aria-hidden="true" />
            <Link href="/category" className="hover:text-white">Categories</Link>
            {parent && (
              <>
                <ChevronRight size={13} aria-hidden="true" />
                <Link href={"/category/" + slugify(parent.name)} className="hover:text-white">{parent.name}</Link>
              </>
            )}
            <ChevronRight size={13} aria-hidden="true" />
            <span className="font-semibold text-[#F0D9AC]" aria-current="page">{category.name}</span>
          </nav>

          <div className="mt-11 grid gap-8 lg:grid-cols-[minmax(0,1fr)_330px] lg:items-center xl:grid-cols-[minmax(0,1fr)_370px]">
            <div className="max-w-[820px]">
              <div className="mb-5 inline-flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[8px] border border-[#86B89D]/35 bg-[#2D5946] text-[#C7F1D6]">
                  <CategoryIcon name={category.icon ?? null} categoryName={category.name} size={26} />
                </span>
                <span className="text-[10px] font-bold uppercase tracking-[0.17em] text-[#F0D9AC]">
                  {parent ? "Explore a service" : "Explore an industry"}
                </span>
              </div>

              <h1 className="max-w-[850px] text-balance text-[clamp(2.7rem,5.5vw,5.2rem)] font-semibold leading-[1.065] tracking-[-0.065em]">
                {category.name}
                <span className="text-[#E3C58D]">.</span>
              </h1>
              <p className="mt-5 max-w-[650px] text-pretty text-[14px] leading-[1.85] text-[#C6DED0] sm:text-[16px]">
                Discover local businesses in Sri Lanka. Compare options, explore their services,
                and use the filters below to find the right match for you.
              </p>

              {relatedServices.length > 0 && (
                <div className="mt-7 flex flex-wrap items-center gap-2">
                  <span className="mr-1 text-[11px] font-semibold text-[#AFD2BB]">Explore services:</span>
                  {relatedServices.map((item) => (
                    <Link
                      key={item.id}
                      href={"/category/" + slugify(item.name)}
                      className="rounded-[6px] border border-white/20 bg-white/[0.06] px-3 py-2 text-[11px] font-semibold text-[#E4F1E6] transition-colors hover:border-[#B8D5BA]/60 hover:bg-white/10"
                    >
                      {item.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="hidden lg:block" aria-hidden="true">
              <div className="rounded-[11px] border border-[#90BDA0]/30 bg-[#244C3D]/80 p-6">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#F0D9AC]">Find with confidence</span>
                  <Compass size={18} className="text-[#A2E9BD]" />
                </div>
                <div className="space-y-5 pt-5">
                  <div className="flex gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-[#33654F] text-[#C8EFD3]"><Search size={19} /></span>
                    <div>
                      <p className="text-[13px] font-semibold text-white">Discover local businesses</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-[#BED8C9]">Search by name and browse related services.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-[#33654F] text-[#C8EFD3]"><MapPin size={19} /></span>
                    <div>
                      <p className="text-[13px] font-semibold text-white">Search around a town</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-[#BED8C9]">Filter by distance without sharing live location.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-[#33654F] text-[#C8EFD3]"><ShieldCheck size={19} /></span>
                    <div>
                      <p className="text-[13px] font-semibold text-white">Refine your choices</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-[#BED8C9]">Filter verified listings and customer ratings.</p>
                    </div>
                  </div>
                </div>
                <Link href="/category" className="mt-6 inline-flex items-center gap-2 text-[11px] font-bold text-[#F0D9AC] hover:text-white">
                  All categories <ArrowUpRight size={15} aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main>
        <CategoryContent category={category} allCategories={allCategories} />
      </main>
    </div>
  );
}
