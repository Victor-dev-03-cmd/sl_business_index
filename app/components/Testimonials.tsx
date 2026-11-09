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
            <p className="mb-5 inline-flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.17em] text-[#34688C]">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] border border-[#D8E5EF] bg-[#F4F8FC] text-[#245A80]">
                <Quote size={17} strokeWidth={1.8} />
              </span>
              Community voices
            </p>
            <h2 id="community-stories-title" className="text-balance text-[clamp(2.7rem,5vw,5.1rem)] font-semibold leading-[1.08] tracking-[-0.065em] text-[#102B4E]">
              Stories that connect<span className="text-[#4085B6]">.</span>
            </h2>
            <p className="mt-5 max-w-[610px] text-[15px] leading-[1.8] text-slate-500 sm:text-[17px]">
              Hear from the people and businesses who are part of our growing local community.
            </p>
          </div>
          <p className="text-[12px] font-medium text-[#7792A5]">Real experiences, shared by the community.</p>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" aria-label="Loading community stories">
            {[0, 1, 2].map(index => (
              <div key={index} className="min-h-[280px] animate-pulse rounded-[24px] border border-[#E4EBF2] bg-[#F5F8FB] p-7">
                <div className="h-8 w-8 rounded-xl bg-[#DFE8F0]" />
                <div className="mt-10 h-4 w-full rounded-md bg-[#DFE8F0]" />
                <div className="mt-3 h-4 w-4/5 rounded-md bg-[#DFE8F0]" />
                <div className="mt-12 h-9 w-2/5 rounded-md bg-[#DFE8F0]" />
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
                  className="group relative min-h-[320px] overflow-hidden rounded-[24px] border border-[#E1EAF1] bg-[#153A59] sm:min-h-[360px]"
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
                    <div className="absolute inset-0 bg-gradient-to-br from-[#215778] to-[#0F2D4D]" />
                  )}
                  {item.name && (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#071C30]/90 to-transparent px-6 pb-6 pt-16">
                      <p className="text-[17px] font-semibold text-white">{item.name}</p>
                      {item.role && <p className="mt-1 text-[12px] text-[#D4E9F7]">{item.role}</p>}
                    </div>
                  )}
                </div>
              ) : (
                <figure
                  key={item.id}
                  className={
                    "flex min-h-[300px] flex-col justify-between rounded-[24px] border p-6 sm:p-8 " +
                    (prominent
                      ? "border-[#153E62] bg-[#0E3152] text-white md:col-span-2 lg:col-span-2"
                      : "border-[#E0E9F1] bg-[#F8FBFD] text-[#133754]")
                  }
                >
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <Quote size={26} strokeWidth={1.6} className={prominent ? "text-[#A7D6F4]" : "text-[#367DA9]"} />
                      {rating > 0 && (
                        <div aria-label={rating + " out of 5 stars"} className="flex gap-0.5">
                          {Array.from({ length: rating }, (_, i) => (
                            <Star key={i} size={14} className={prominent ? "fill-[#A9DCF7] text-[#A9DCF7]" : "fill-[#3686B8] text-[#3686B8]"} />
                          ))}
                        </div>
                      )}
                    </div>
                    <blockquote className={"mt-8 text-pretty font-medium leading-[1.65] tracking-[-0.035em] " + (prominent ? "max-w-2xl text-[23px] sm:text-[28px]" : "text-[19px] sm:text-[20px]")}>
                      {item.quote || ""}
                    </blockquote>
                  </div>

                  <figcaption className={"mt-10 flex items-center gap-3 border-t pt-5 " + (prominent ? "border-white/20" : "border-[#E3EAF0]")}>
                    {item.image_url ? (
                      <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border border-white/25 bg-[#DDECF6]">
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
                      <div className={"flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[16px] font-semibold " + (prominent ? "bg-white/15 text-white" : "bg-[#DCEAF4] text-[#275F83]")}>
                        {(item.name || "C").slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-[13px] font-semibold">{item.name || "Community member"}</span>
                        {item.is_verified && <CheckCircle2 size={14} aria-label="Verified" className={prominent ? "text-[#A9DCF7]" : "text-[#2D83B8]"} />}
                      </div>
                      {item.role && <p className={"mt-1 truncate text-[12px] " + (prominent ? "text-[#A8C7DD]" : "text-slate-500")}>{item.role}</p>}
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
