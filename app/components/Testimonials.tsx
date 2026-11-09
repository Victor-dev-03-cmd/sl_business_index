"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { CheckCircle2, Quote, Star } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

interface TestimonialItem {
  id: string | number;
  type: "testimonial" | "image";
  name?: string;
  role?: string;
  image_url: string;
  quote?: string;
  rating?: number;
  is_verified?: boolean;
}

export default function Testimonials() {
  const [items, setItems] = useState<TestimonialItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const fetchItems = async () => {
      try {
        const { data, error } = await supabase
          .from("testimonials")
          .select("*")
          .order("display_order", { ascending: true });

        if (error) throw error;
        if (active) setItems((data || []) as TestimonialItem[]);
      } catch (error) {
        if (active) console.error("Error fetching testimonials:", error);
      } finally {
        if (active) setLoading(false);
      }
    };

    void fetchItems();
    const channel = supabase
      .channel("testimonials_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "testimonials" },
        () => { void fetchItems(); },
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, []);

  if (!loading && items.length === 0) return null;

  return (
    <section aria-labelledby="community-stories-title" className="relative bg-white py-20 sm:py-24 lg:py-28">
      <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
        <div className="mb-10 flex flex-col justify-between gap-7 md:mb-12 lg:flex-row lg:items-end">
          <div className="max-w-[780px]">
            <p className="mb-5 inline-flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.17em] text-[#2B6552]">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] border border-[#E0EADB] bg-[#F8F7F2] text-[#2B6552]">
                <Quote size={17} strokeWidth={1.8} />
              </span>
              Community voices
            </p>
            <h2 id="community-stories-title" className="text-balance text-[clamp(2.7rem,5vw,5.1rem)] font-semibold leading-[1.08] tracking-[-0.065em] text-[#1B3430]">
              Stories that connect<span className="text-[#4A8C70]">.</span>
            </h2>
            <p className="mt-5 max-w-[610px] text-[15px] leading-[1.8] text-stone-500 sm:text-[17px]">
              Hear from the people and businesses who are part of our growing local community.
            </p>
          </div>
          <p className="text-[12px] font-medium text-[#75AB8D]">Real experiences, shared by the community.</p>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" aria-label="Loading community stories">
            {[0, 1, 2].map(index => (
              <div key={index} className="min-h-[280px] animate-pulse rounded-[24px] border border-[#F0F2E9] bg-[#F8F7F2] p-7">
                <div className="h-8 w-8 rounded-xl bg-[#E0EADB]" />
                <div className="mt-10 h-4 w-full rounded-md bg-[#E0EADB]" />
                <div className="mt-3 h-4 w-4/5 rounded-md bg-[#E0EADB]" />
                <div className="mt-12 h-9 w-2/5 rounded-md bg-[#E0EADB]" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid auto-rows-auto gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-5">
            {items.map((item, index) => {
              const prominent = index === 0 && item.type === "testimonial";
              const rating = typeof item.rating === "number" && Number.isFinite(item.rating)
                ? Math.max(0, Math.min(5, Math.round(item.rating)))
                : 0;
              return item.type === "image" ? (
                <div
                  key={item.id}
                  className="group relative min-h-[320px] overflow-hidden rounded-[24px] border border-[#F0F2E9] bg-[#1B3430] sm:min-h-[360px]"
                >
                  {item.image_url ? (
                    <Image
                      src={item.image_url}
                      alt={item.name || "SL Business Index community feature"}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-cover transition-transform duration-500 motion-safe:group-hover:scale-[1.035]"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-[#26483B] to-[#1B3430]" />
                  )}
                  {item.name && (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#152C25]/90 to-transparent px-6 pb-6 pt-16">
                      <p className="text-[17px] font-semibold text-white">{item.name}</p>
                      {item.role && <p className="mt-1 text-[12px] text-[#E0EADB]">{item.role}</p>}
                    </div>
                  )}
                </div>
              ) : (
                <figure
                  key={item.id}
                  className={
                    "flex min-h-[300px] flex-col justify-between rounded-[24px] border p-6 sm:p-8 " +
                    (prominent
                      ? "border-[#1B3430] bg-[#1B3430] text-white md:col-span-2 lg:col-span-2"
                      : "border-[#F0F2E9] bg-[#F8F7F2] text-[#1B3430]")
                  }
                >
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <Quote size={26} strokeWidth={1.6} className={prominent ? "text-[#F0D9AC]" : "text-[#36785E]"} />
                      {rating > 0 && (
                        <div aria-label={rating + " out of 5 stars"} className="flex gap-0.5">
                          {Array.from({ length: rating }, (_, i) => (
                            <Star key={i} size={14} className={prominent ? "fill-[#F0D9AC] text-[#F0D9AC]" : "fill-[#36785E] text-[#36785E]"} />
                          ))}
                        </div>
                      )}
                    </div>
                    <blockquote className={"mt-8 text-pretty font-medium leading-[1.65] tracking-[-0.035em] " + (prominent ? "max-w-2xl text-[23px] sm:text-[28px]" : "text-[19px] sm:text-[20px]")}>
                      {item.quote || ""}
                    </blockquote>
                  </div>

                  <figcaption className={"mt-10 flex items-center gap-3 border-t pt-5 " + (prominent ? "border-white/20" : "border-[#F0F2E9]")}>
                    {item.image_url ? (
                      <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border border-white/25 bg-[#F0F2E9]">
                        <Image
                          src={item.image_url}
                          alt=""
                          fill
                          sizes="44px"
                          className="object-cover"
                          unoptimized={item.image_url.includes("dicebear")}
                        />
                      </div>
                    ) : (
                      <div className={"flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[16px] font-semibold " + (prominent ? "bg-white/15 text-white" : "bg-[#E0EADB] text-[#2B6552]")}>
                        {(item.name || "C").slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-[13px] font-semibold">{item.name || "Community member"}</span>
                        {item.is_verified && <CheckCircle2 size={14} aria-label="Verified" className={prominent ? "text-[#F0D9AC]" : "text-[#36785E]"} />}
                      </div>
                      {item.role && <p className={"mt-1 truncate text-[12px] " + (prominent ? "text-[#B0CFB5]" : "text-stone-500")}>{item.role}</p>}
                    </div>
                  </figcaption>
                </figure>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
