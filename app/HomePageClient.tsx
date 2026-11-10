"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Building2,
  Star,
  Tags,
  Navigation,
  Search,
  MapPin,
  LayoutGrid,
  ArrowUpRight,
  ArrowRight,
} from "lucide-react";
import CategoryIcon from "./components/CategoryIcon";
import { Skeleton } from "@/components/ui/skeleton";
import dynamic from "next/dynamic";
import VerifiedBadge from "./components/VerifiedBadge";
import Testimonials from "./components/Testimonials";

// Server-render the visible search form: client-only 64px placeholder shifted
// the entire hero after hydration (a major mobile CLS source).
const HeroSearch = dynamic(() => import("./components/HeroSearch"), {
  loading: () => <div aria-hidden="true" className="min-h-[190px] w-full rounded-[14px] bg-white/10 sm:min-h-[72px]" />,
});

const EMPTY_ARRAY: any[] = [];

export default function HomePageClient() {
  const router = useRouter();

  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const featuredScrollRef = useRef<HTMLDivElement>(null);
  const [canFeaturedScrollLeft, setCanFeaturedScrollLeft] = useState(false);
  const [canFeaturedScrollRight, setCanFeaturedScrollRight] = useState(false);

  const { data: categories = EMPTY_ARRAY, isLoading: categoriesLoading } = useQuery({
    queryKey: ["categories-home"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select('id, name, icon, image_url, parent_id')
        .is("parent_id", null)
        .order("name", { ascending: true });
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: featuredBusinesses = EMPTY_ARRAY,
    isLoading: featuredLoading,
    error: featuredError,
  } = useQuery({
    queryKey: ["featured-businesses-home"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("featured_listings")
        .select(
          `
          business_id,
          businesses (
            id, slug, name, category, address, image_url, logo_url, rating, is_verified, status, can_show_badge
          )
        `,
        )
        .order("order_index", { ascending: true })
        .limit(18);

      if (error) {
        console.error("Featured listings fetch error:", error);
        throw error;
      }

      return (data as any[])
        .map((item) => item.businesses)
        .filter((b) => b && b.status === "approved") as any[];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Browse Categories uses manual navigation only: no perpetual animation loop.
  const updateScrollControls = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    setCanScrollLeft(container.scrollLeft > 8);
    setCanScrollRight(container.scrollLeft + container.clientWidth < container.scrollWidth - 8);
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    updateScrollControls();
    const observer = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(updateScrollControls)
      : null;
    observer?.observe(container);
    window.addEventListener("resize", updateScrollControls);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", updateScrollControls);
    };
  }, [categoriesLoading, categories.length, updateScrollControls]);

  const scroll = (direction: "left" | "right") => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const distance = Math.max(230, Math.round(container.clientWidth * 0.75));
    container.scrollBy({
      left: direction === "left" ? -distance : distance,
      behavior: "smooth",
    });
  };

  // Native snap scrolling; no autoplay, interval or animation loop.
  const updateFeaturedScrollControls = useCallback(() => {
    const container = featuredScrollRef.current;
    if (!container) return;
    setCanFeaturedScrollLeft(container.scrollLeft > 8);
    setCanFeaturedScrollRight(
      container.scrollLeft + container.clientWidth < container.scrollWidth - 8,
    );
  }, []);

  useEffect(() => {
    const container = featuredScrollRef.current;
    if (!container) return;
    updateFeaturedScrollControls();
    const observer = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(updateFeaturedScrollControls)
      : null;
    observer?.observe(container);
    window.addEventListener("resize", updateFeaturedScrollControls);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", updateFeaturedScrollControls);
    };
  }, [featuredLoading, featuredBusinesses.length, updateFeaturedScrollControls]);

  const scrollFeatured = (direction: "left" | "right") => {
    const container = featuredScrollRef.current;
    if (!container) return;
    const distance = Math.max(194, Math.round(container.clientWidth * 0.75));
    container.scrollBy({
      left: direction === "left" ? -distance : distance,
      behavior: "smooth",
    });
  };

  const handleUseCurrentLocation = (autoSearch: boolean = false) => {
    if (!navigator.geolocation) return;

    setIsFetchingLocation(true);

    // Hard cap: never show spinner longer than 6 s
    const timeoutId = setTimeout(() => setIsFetchingLocation(false), 6000);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(timeoutId);
        const { latitude, longitude } = position.coords;
        const coords = { lat: latitude, lng: longitude };
        setUserCoords(coords);
        setIsFetchingLocation(false);

        if (autoSearch) {
          const params = new URLSearchParams({
            lat: coords.lat.toString(),
            lng: coords.lng.toString(),
            radius: "5000",
          });
          router.push(`/nearby?${params.toString()}`);
        }
      },
      (err) => {
        clearTimeout(timeoutId);
        console.error("Error getting location: ", err.message);
        setIsFetchingLocation(false);
      },
      {
        enableHighAccuracy: false, // faster, good enough for search
        timeout: 5000,
        maximumAge: 60000, // reuse a cached fix up to 1 min old
      },
    );
  };

  const handleCategoryClick = (categoryName: string) => {
    const params = new URLSearchParams();
    if (userCoords) {
      params.set("lat", userCoords.lat.toString());
      params.set("lng", userCoords.lng.toString());
      params.set("radius", "5000");
    }
    params.set("q", categoryName);
    router.push(`/nearby?${params.toString()}`);
  };

  // Keep the homepage light; full category catalog lives at /category.
  const featuredCategories = categories.slice(0, 24);

  return (
    <div className="min-h-[100dvh] bg-white font-normal">

      {/* --- PHASE 3: Split editorial hero with accessible SVG product motion --- */}
      <section
        aria-labelledby="homepage-hero-title"
        className="relative isolate bg-[#1B3430] text-white"
      >
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute -left-56 top-0 h-[750px] w-[750px] rounded-full bg-[radial-gradient(circle,rgba(38,72,59,0.24)_0%,transparent_72%)]" />
            <div className="absolute -right-28 top-12 h-[740px] w-[740px] rounded-full bg-[radial-gradient(circle,rgba(54,120,94,0.20)_0%,transparent_72%)]" />
          </div>
          <div className="absolute inset-0 opacity-[0.16]" style={{ backgroundImage: "radial-gradient(rgba(234,194,133,0.22) 0.8px,transparent 0.8px)", backgroundSize: "32px 32px" }} />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#E7C58E]/40 to-transparent" />
        </div>

        <div className="relative mx-auto grid min-h-[540px] max-w-[1500px] items-center gap-7 px-5 pb-12 pt-14 sm:px-8 sm:pb-14 sm:pt-16 lg:min-h-[620px] lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-6 lg:px-12 lg:pb-14 lg:pt-14 xl:gap-10 xl:px-16">
          <div
            className="relative z-30 min-w-0 max-w-[790px] text-left"
          >
            <div
              className="mb-5 inline-flex max-w-full items-center gap-2.5 rounded-full border border-white/15 bg-white/[0.05] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#F0D9AC] sm:text-[11px]"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_14px_rgba(231,197,142,0.65)]" />
              Discover Sri Lanka, differently
            </div>

            <h1
              id="homepage-hero-title"
              className="text-balance text-[clamp(3.3rem,5.4vw,6.35rem)] font-medium leading-[1.055] tracking-[-0.065em] text-white"
            >
              Discover <span className="bg-gradient-to-r from-[#F8F7F2] via-[#F0D9AC] to-[#E7C58E] bg-clip-text text-transparent">better.</span>
              <br />
              Grow together.
            </h1>

            <p
              className="mt-5 max-w-[600px] text-pretty text-[15px] leading-[1.65] text-[#CADDCB] sm:text-[17px]"
            >
              Discover businesses, services and people worth knowing.
              Your connection to opportunities across Sri Lanka starts here.
            </p>

            {/* Unified search experience: one surface, clear primary and secondary actions. */}
            <div
              className="relative z-40 mt-6 w-full max-w-[680px]"
            >
              <div className="rounded-[22px] border border-white/[0.18] bg-white/[0.075] p-2.5 shadow-[0_22px_70px_rgba(0,0,0,0.23)]  sm:p-3">
                <div className="mb-2 flex items-center justify-between gap-3 px-2 sm:mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-[0.17em] text-[#CADDCB]">
                    What are you looking for?
                  </span>
                  <span className="hidden items-center gap-1.5 text-[11px] font-medium text-[#94BAA0] sm:inline-flex">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                    Search across Sri Lanka
                  </span>
                </div>
                <HeroSearch
                  categories={categories}
                  featuredBusinesses={featuredBusinesses}
                  userCoords={userCoords}
                  isFetchingLocation={isFetchingLocation}
                  handleUseCurrentLocation={handleUseCurrentLocation}
                />
                <div className="mt-2.5 flex flex-wrap items-center gap-2 border-t border-white/10 px-0.5 pt-2.5 sm:mt-3 sm:gap-3 sm:pt-3">
                  <button
                    type="button"
                    onClick={() => handleUseCurrentLocation(true)}
                    disabled={isFetchingLocation}
                    className="group inline-flex min-h-10 items-center justify-center gap-2 rounded-[11px] border border-[#E7C58E]/25 bg-[#F0F2E9]/[0.10] px-3.5 text-[12px] font-semibold text-[#F0F2E9] transition-all duration-200 hover:border-[#E7C58E]/50 hover:bg-[#F0F2E9]/[0.18] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 disabled:cursor-wait disabled:opacity-60 sm:px-4 sm:text-[13px]"
                  >
                    <Navigation size={15} className="text-[#F0D9AC] transition-transform group-hover:-translate-y-0.5" />
                    {isFetchingLocation ? "Finding location…" : "Explore near me"}
                  </button>
                  <Link
                    href="/category"
                    className="group inline-flex min-h-10 items-center justify-center gap-2 rounded-[11px] border border-white/[0.12] bg-white/[0.035] px-3.5 text-[12px] font-semibold text-[#E0EADB] transition-all duration-200 hover:border-white/30 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 sm:px-4 sm:text-[13px]"
                  >
                    <Tags size={15} className="text-[#CADDCB]" />
                    Browse categories
                    <ChevronRight size={15} className="text-[#CADDCB] transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>
              </div>
              <p className="mt-3 pl-1 text-[12px] text-[#94BAA0] sm:text-[13px]">
                Try “Restaurants in Colombo” or “Electrician in Jaffna”
              </p>
            </div>

            <p className="mt-5 text-[12px] font-medium tracking-wide text-[#75AB8D]">
              Built for discovery. Designed for connection.
            </p>
          </div>

          {/* Fully code-based vector scene: no stock imagery, GIF downloads or external animation service. */}
          <div
            className="relative z-10 mx-auto flex w-full max-w-[380px] items-center justify-center sm:max-w-[460px] lg:max-w-none"
            aria-label="Illustration of business discovery across Sri Lanka"
            role="img"
          >
            <div className="relative aspect-[1.03/1] w-full max-w-[550px]">
              <div className="absolute inset-[7%] rounded-full border border-[#94BAA0]/10 bg-[radial-gradient(circle,rgba(52,112,83,0.20)_0%,rgba(17,45,33,0.05)_67%,transparent_74%)]" />
              <div
                aria-hidden="true"
                className="absolute inset-[7%] rounded-full border border-dashed border-[#E7C58E]/20"
              />
              <div
                aria-hidden="true"
                className="absolute inset-[17%] rounded-full border border-[#94BAA0]/20"
              />
              <svg viewBox="0 0 600 600" fill="none" aria-hidden="true" className="absolute inset-0 h-full w-full">
                <defs>
                  <linearGradient id="hero-map-stroke" x1="140" y1="110" x2="460" y2="520" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#F0D9AC" stopOpacity="0.95" />
                    <stop offset="1" stopColor="#36785E" stopOpacity="0.55" />
                  </linearGradient>
                  <linearGradient id="hero-map-fill" x1="280" y1="125" x2="365" y2="510" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#26483B" stopOpacity="0.94" />
                    <stop offset="1" stopColor="#1B3430" stopOpacity="0.8" />
                  </linearGradient>
                </defs>
                <circle cx="300" cy="300" r="224" stroke="#E7C58E" strokeOpacity=".14" />
                <circle cx="300" cy="300" r="170" stroke="#E7C58E" strokeOpacity=".13" strokeDasharray="4 12" />
                <path d="M299 90C275 119 278 148 264 172C249 198 244 227 261 253C272 269 252 287 259 307C266 331 285 347 290 366C296 394 305 419 322 442C337 463 346 493 366 505C383 509 396 491 390 472C384 452 372 434 375 412C379 391 370 369 358 350C345 329 343 307 354 286C364 266 356 245 343 229C327 210 325 185 322 163C320 134 313 106 299 90Z" fill="url(#hero-map-fill)" stroke="url(#hero-map-stroke)" strokeWidth="2.5" strokeLinejoin="round" />
                <path d="M278 200L308 277L294 364L357 437M308 277L343 329M294 364L324 404" stroke="#DCB179" strokeOpacity=".38" strokeWidth="1.5" strokeDasharray="5 8" />
                <circle cx="278" cy="200" r="5" fill="#F0D9AC" />
                <circle cx="308" cy="277" r="5" fill="#F0D9AC" />
                <circle cx="294" cy="364" r="5" fill="#F0D9AC" />
                <circle cx="357" cy="437" r="5" fill="#F0D9AC" />
                <circle cx="308" cy="277" r="19" stroke="#F0D9AC" strokeWidth="2" />
                <circle cx="294" cy="364" r="19" stroke="#F0D9AC" strokeWidth="2" />
              </svg>

              <div
                className="absolute left-[1%] top-[24%] w-[45%] max-w-[225px] rounded-2xl border border-white/15 bg-[#1B3430]/90 p-4 shadow-[0_25px_55px_rgba(0,0,0,0.25)]  sm:p-5"
              >
                <div className="mb-3 flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-200"><Building2 size={18} /></span>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.12em] text-emerald-300">Find what matters</p>
                    <p className="text-sm font-semibold text-white">Local businesses</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-2 w-[82%] rounded-full bg-white/20" />
                  <div className="h-2 w-[60%] rounded-full bg-white/10" />
                </div>
              </div>

              <div
                className="absolute right-[0%] top-[53%] w-[46%] max-w-[236px] rounded-2xl border border-white/15 bg-[#1B3430]/95 p-4 shadow-[0_25px_60px_rgba(0,0,0,0.28)]  sm:p-5"
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E7C58E]/15 text-emerald-200"><MapPin size={19} /></span>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.12em] text-emerald-300">Explore nearby</p>
                    <p className="text-sm font-semibold text-white">Sri Lanka</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2 text-[11px] text-[#CADDCB]">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  Discover local opportunities
                </div>
              </div>

              <div
                className="absolute bottom-[8%] left-[19%] inline-flex items-center gap-2 rounded-full border border-[#E7C58E]/20 bg-[#152C25]/90 px-4 py-3 text-xs font-semibold text-[#E0EADB] shadow-xl "
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#E7C58E]/15"><Search size={14} /></span>
                Discover. Connect. Grow.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- BROWSE CATEGORIES: editorial, accessible, and lightweight --- */}
      <section
        aria-labelledby="browse-categories-heading"
        className="relative isolate border-b border-[#F0F2E9] bg-[#F8F7F2] py-20 sm:py-24 lg:py-28"
      >
        <div className="pointer-events-none absolute right-0 top-0 h-72 w-72 rounded-full bg-[#F0D9AC]/25 blur-[100px]" aria-hidden="true" />
        <div className="relative mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
          <div className="mb-10 flex flex-col justify-between gap-8 md:mb-12 lg:flex-row lg:items-end">
            <div className="max-w-[820px]">
              <p className="mb-5 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#2B6552]">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] border border-[#E0EADB] bg-white text-[#2B6552]">
                  <LayoutGrid size={16} strokeWidth={1.8} />
                </span>
                Explore Sri Lanka
              </p>
              <h2
                id="browse-categories-heading"
                className="text-balance text-[clamp(2.75rem,5vw,5.3rem)] font-semibold leading-[1.08] tracking-[-0.065em] text-[#1B3430]"
              >
                Browse categories<span className="text-[#4A8C70]">.</span>
              </h2>
              <p className="mt-5 max-w-[620px] text-pretty text-[15px] leading-[1.8] text-stone-500 sm:text-[17px]">
                From everyday essentials to specialized expertise. Explore local
                businesses and services across Sri Lanka, all in one place.
              </p>
            </div>
            <Link
              href="/category"
              className="group inline-flex h-12 w-fit shrink-0 items-center gap-3 rounded-xl border border-[#E0EADB] bg-white px-5 text-[13px] font-semibold text-[#1B3430] shadow-[0_5px_20px_rgba(15,47,74,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#B0CFB5] hover:shadow-[0_8px_24px_rgba(15,47,74,0.1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              Explore all categories
              <ArrowUpRight size={17} className="transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          </div>

          <div className="mb-5 flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-400">
              Discover by industry
            </p>
            <div className="hidden items-center gap-2 md:flex">
              <button
                type="button"
                aria-label="Scroll categories left"
                onClick={() => scroll("left")}
                disabled={!canScrollLeft}
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#E0EADB] bg-white text-[#26483B] transition-all duration-150 hover:border-[#B0CFB5] hover:bg-[#F0F2E9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:cursor-not-allowed disabled:opacity-35"
              >
                <ChevronLeft size={19} strokeWidth={1.8} />
              </button>
              <button
                type="button"
                aria-label="Scroll categories right"
                onClick={() => scroll("right")}
                disabled={!canScrollRight}
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#E0EADB] bg-white text-[#26483B] transition-all duration-150 hover:border-[#B0CFB5] hover:bg-[#F0F2E9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:cursor-not-allowed disabled:opacity-35"
              >
                <ChevronRight size={19} strokeWidth={1.8} />
              </button>
            </div>
          </div>

          <div
            ref={scrollContainerRef}
            onScroll={updateScrollControls}
            aria-label="Browse business categories"
            className="grid grid-cols-2 gap-3 sm:gap-4 md:flex md:snap-x md:snap-mandatory md:gap-4 md:overflow-x-auto md:overscroll-x-contain md:pb-6 md:scroll-smooth md:[scrollbar-width:none] md:[&::-webkit-scrollbar]:hidden"
          >
            {categoriesLoading ? (
              Array.from({ length: 8 }, (_, i) => (
                <div
                  key={i}
                  aria-hidden="true"
                  className="flex min-h-[182px] flex-col justify-between rounded-[22px] border border-[#F0F2E9] bg-white p-5 md:h-[228px] md:w-[232px] md:shrink-0"
                >
                  <Skeleton className="h-16 w-16 rounded-2xl" />
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-3/4 rounded-md" />
                    <Skeleton className="h-3 w-1/2 rounded-md" />
                  </div>
                </div>
              ))
            ) : featuredCategories.length > 0 ? (
              featuredCategories.map((cat, idx) => (
                <button
                  key={cat.id ?? idx}
                  type="button"
                  onClick={() => handleCategoryClick(cat.name)}
                  aria-label={"Browse " + cat.name}
                  className={
                    "group relative min-h-[182px] w-full flex-col justify-between overflow-hidden rounded-[22px] border border-[#E0EADB] bg-white p-4 text-left shadow-[0_3px_16px_rgba(15,40,67,0.025)] transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-1 hover:border-[#CADDCB] hover:shadow-[0_12px_30px_rgba(15,40,67,0.09)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 sm:p-5 md:h-[228px] md:w-[232px] md:shrink-0 md:snap-start " +
                    (!showAllCategories && idx >= 8 ? "hidden md:flex" : "flex")
                  }
                >
                  <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[#F0F2E9] opacity-70 transition-transform duration-300 group-hover:scale-110" />
                  <div className="relative flex w-full items-start justify-between gap-3">
                    <div className="relative flex h-[58px] w-[58px] shrink-0 items-center justify-center overflow-hidden rounded-[17px] border border-[#F0F2E9] bg-[#F8F7F2] text-[#2B6552] sm:h-[66px] sm:w-[66px]">
                      {cat.image_url ? (
                        <Image
                          src={encodeURI(cat.image_url)}
                          alt=""
                          fill
                          sizes="66px"
                          className="object-contain p-3"
                          draggable={false}
                          unoptimized={cat.image_url.includes("supabase.co")}
                        />
                      ) : (
                        <CategoryIcon name={cat.icon} className="h-7 w-7" />
                      )}
                    </div>
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#F0F2E9] bg-white text-[#75AB8D] transition-colors duration-200 group-hover:border-[#CADDCB] group-hover:bg-[#F0F2E9] group-hover:text-[#26483B]">
                      <ArrowUpRight size={16} strokeWidth={1.7} />
                    </span>
                  </div>
                  <div className="relative mt-6 w-full">
                    <span className="mb-2 block text-[10px] font-semibold tracking-[0.1em] text-[#75AB8D]">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <h3 className="line-clamp-2 text-[14px] font-semibold leading-[1.4] tracking-[-0.025em] text-[#1B3430] transition-colors group-hover:text-[#2B6552] sm:text-[17px]">
                      {cat.name}
                    </h3>
                  </div>
                </button>
              ))
            ) : (
              <div className="col-span-2 flex w-full flex-col items-center justify-center rounded-2xl border border-dashed border-[#E0EADB] bg-white px-6 py-14 text-center text-stone-500">
                <LayoutGrid size={26} className="mb-3 text-[#75AB8D]" />
                <p className="text-sm font-semibold">No categories available right now.</p>
                <Link href="/nearby" className="mt-3 text-xs font-semibold text-[#2B6552] hover:underline">
                  Explore businesses instead
                </Link>
              </div>
            )}
          </div>

          {!categoriesLoading && featuredCategories.length > 8 && (
            <button
              type="button"
              onClick={() => setShowAllCategories(value => !value)}
              className="mx-auto mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#E0EADB] bg-white px-5 text-[13px] font-semibold text-[#26483B] transition-colors hover:bg-[#F0F2E9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 md:hidden"
            >
              {showAllCategories ? "Show fewer categories" : "Show more categories"}
              <ChevronRight size={16} className={showAllCategories ? "-rotate-90" : "rotate-90"} />
            </button>
          )}

          <div className="mt-9 flex flex-col justify-between gap-4 border-t border-[#E0EADB] pt-6 sm:flex-row sm:items-center">
            <p className="flex items-center gap-2 text-[13px] text-stone-500">
              <MapPin size={16} className="shrink-0 text-[#4A8C70]" />
              Discover businesses wherever you are in Sri Lanka.
            </p>
            <Link
              href="/nearby"
              className="group inline-flex w-fit items-center gap-2 text-[13px] font-semibold text-[#26483B] transition-colors hover:text-[#1B3430] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              Find businesses near you
              <ArrowRight size={16} className="transition-transform duration-150 group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      {/* --- FEATURED LISTINGS: premium portrait business showcase --- */}
      <section
        aria-labelledby="featured-listings-title"
        className="relative isolate overflow-hidden border-b border-[#F0F2E9] bg-white py-20 sm:py-24 lg:py-28"
      >
        <div className="pointer-events-none absolute -left-48 top-0 h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle,rgba(224,234,219,0.32)_0%,transparent_72%)]" aria-hidden="true" />
        <div className="relative mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
          <div className="mb-9 flex flex-col justify-between gap-7 sm:mb-11 lg:flex-row lg:items-end">
            <div className="max-w-[780px]">
              <p className="mb-5 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#2B6552]">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] border border-[#E0EADB] bg-[#F8F7F2] text-[#2B6552]">
                  <Star size={16} strokeWidth={1.8} />
                </span>
                The spotlight
              </p>
              <h2
                id="featured-listings-title"
                className="text-balance text-[clamp(2.7rem,5vw,5.2rem)] font-semibold leading-[1.08] tracking-[-0.065em] text-[#1B3430]"
              >
                Featured listings<span className="text-[#4A8C70]">.</span>
              </h2>
              <p className="mt-5 max-w-[620px] text-pretty text-[15px] leading-[1.8] text-stone-500 sm:text-[17px]">
                Discover businesses and services across Sri Lanka,
                presented in a fresh perspective.
              </p>
            </div>
            <Link
              href="/nearby"
              className="group inline-flex h-12 w-fit shrink-0 items-center gap-3 rounded-xl border border-[#E0EADB] bg-[#F8F7F2] px-5 text-[13px] font-semibold text-[#1B3430] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#B0CFB5] hover:bg-white hover:shadow-[0_8px_22px_rgba(15,47,74,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              Explore businesses
              <ArrowUpRight size={17} className="transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          </div>

          <div className="mb-5 flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-400">
              Discover a business worth knowing
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => scrollFeatured("left")}
                disabled={!canFeaturedScrollLeft}
                aria-label="Scroll featured listings left"
                aria-controls="featured-listings-carousel"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#E0EADB] bg-white text-[#26483B] transition-colors hover:border-[#B0CFB5] hover:bg-[#F8F7F2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:cursor-not-allowed disabled:opacity-35 sm:h-11 sm:w-11"
              >
                <ChevronLeft size={19} strokeWidth={1.8} />
              </button>
              <button
                type="button"
                onClick={() => scrollFeatured("right")}
                disabled={!canFeaturedScrollRight}
                aria-label="Scroll featured listings right"
                aria-controls="featured-listings-carousel"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#E0EADB] bg-white text-[#26483B] transition-colors hover:border-[#B0CFB5] hover:bg-[#F8F7F2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:cursor-not-allowed disabled:opacity-35 sm:h-11 sm:w-11"
              >
                <ChevronRight size={19} strokeWidth={1.8} />
              </button>
            </div>
          </div>

          <div
            id="featured-listings-carousel"
            ref={featuredScrollRef}
            onScroll={updateFeaturedScrollControls}
            aria-label="Featured Sri Lankan business listings"
            className="flex gap-3 overflow-x-auto overscroll-x-contain pb-6 pr-2 snap-x snap-mandatory scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-4 lg:gap-5"
          >
            {featuredLoading ? (
              Array.from({ length: 6 }, (_, i) => (
                <div
                  key={i}
                  aria-hidden="true"
                  className="relative aspect-[9/16] w-[178px] shrink-0 snap-start overflow-hidden rounded-[22px] bg-stone-100 sm:w-[207px] lg:w-[229px]"
                >
                  <Skeleton className="absolute inset-0 h-full w-full rounded-none" />
                  <div className="absolute bottom-0 left-0 right-0 space-y-3 p-5">
                    <Skeleton className="h-4 w-4/5 bg-stone-200" />
                    <Skeleton className="h-3 w-1/2 bg-stone-200" />
                  </div>
                </div>
              ))
            ) : featuredError ? (
              <div className="flex min-h-[250px] w-full flex-col items-center justify-center rounded-[22px] border border-rose-100 bg-rose-50/40 px-6 text-center">
                <p className="text-sm font-semibold text-stone-800">Featured listings are unavailable right now.</p>
                <p className="mt-2 text-xs text-stone-500">Please refresh the page or try again shortly.</p>
              </div>
            ) : featuredBusinesses.length > 0 ? (
              featuredBusinesses.map((business) => (
                <Link
                  key={business.id}
                  href={`/business/${business.slug || business.id}`}
                  aria-label={`View ${business.name} business profile`}
                  className="group relative isolate block [contain:layout_paint] aspect-[9/16] w-[178px shrink-0 snap-start overflow-hidden rounded-[22px] border border-[#E0EADB] bg-[#1B3430] shadow-[0_6px_23px_rgba(15,40,67,0.07)] transition-[border-color,transform,box-shadow] duration-200 hover:-translate-y-1 hover:border-[#B0CFB5] hover:shadow-[0_16px_36px_rgba(15,40,67,0.19)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 sm:w-[207px] lg:w-[229px] xl:w-[237px]"
                >
                  {/* 9:16 visual works with landscape photos as well as portrait images. */}
                  <div className="absolute inset-0 overflow-hidden">
                    {business.image_url ? (
                      <Image
                        src={business.image_url}
                        alt={business.name}
                        fill
                        loading="lazy"
                        quality={65}
                        decoding="async"
                        sizes="(max-width: 640px) 178px, (max-width: 1024px) 207px, 237px"
                        className="object-cover transition-transform duration-500 motion-safe:group-hover:scale-[1.045]"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#26483B] via-[#1B3430] to-[#152C25]">
                        {business.logo_url ? (
                          <div className="relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-[24px] border border-white/15 bg-white/95 p-4 shadow-xl">
                            <Image src={business.logo_url} alt={business.name} fill loading="lazy" quality={65} sizes="112px" className="object-contain p-4" />
                          </div>
                        ) : (
                          <Building2 size={60} strokeWidth={1.1} className="text-[#F0D9AC]/75" />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Contrast stays legible without requiring hover or animation. */}
                  <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0D211B] via-[#0D211B]/65 via-[39%] to-transparent" />
                  <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/45 to-transparent" />

                  <div className="absolute inset-x-0 top-0 z-10 flex flex-wrap items-start justify-between gap-1.5 p-3 sm:p-4">
                    {business.is_verified && business.can_show_badge ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-[#F0F2E9]/95 px-2.5 py-1 text-[10px] font-bold text-[#26483B] shadow-sm">
                        <VerifiedBadge size={12} /> Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full border border-white/30 bg-black/25 px-2.5 py-1 text-[10px] font-semibold text-white">
                        Featured
                      </span>
                    )}
                    {typeof business.rating === "number" && business.rating > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-white/25 bg-black/35 px-2.5 py-1 text-[10px] font-semibold text-white">
                        <Star size={11} className="fill-amber-300 text-amber-300" />
                        {business.rating.toFixed(1)}
                      </span>
                    )}
                  </div>

                  <div className="absolute inset-x-0 bottom-0 z-10 p-3.5 text-white sm:p-5">
                    <span className="mb-2 inline-block max-w-full truncate rounded-full border border-white/20 bg-white/15 px-2.5 py-1 text-[10px] font-semibold text-[#F0F2E9]">
                      {business.category || "Local business"}
                    </span>
                    <h3 className="line-clamp-2 text-[17px] font-semibold leading-[1.25] tracking-[-0.035em] drop-shadow-sm sm:text-[20px]">
                      {business.name}
                    </h3>
                    {business.address && (
                      <p className="mt-2 flex min-w-0 items-center gap-1.5 text-[11px] font-medium text-[#E0EADB]">
                        <MapPin size={12} className="shrink-0" />
                        <span className="truncate">{business.address}</span>
                      </p>
                    )}
                    <div className="mt-4 flex items-center justify-between border-t border-white/20 pt-3 text-[11px] font-semibold text-white/90">
                      <span>View business</span>
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/25 bg-white/15 transition-colors group-hover:bg-white group-hover:text-[#1B3430]">
                        <ArrowUpRight size={15} />
                      </span>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="flex min-h-[270px] w-full flex-col items-center justify-center rounded-[22px] border border-dashed border-[#E0EADB] bg-[#F8F7F2] px-6 text-center">
                <Building2 size={30} className="text-[#75AB8D]" />
                <h3 className="mt-4 text-base font-semibold text-[#1B3430]">No featured businesses yet</h3>
                <p className="mt-2 max-w-sm text-sm text-stone-500">
                  Browse businesses across Sri Lanka while new listings are being added.
                </p>
                <Link href="/nearby" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#26483B] hover:underline">
                  Explore businesses <ArrowRight size={16} />
                </Link>
              </div>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[#F0F2E9] pt-6">
            <p className="text-[12px] text-stone-500">
              Swipe or use the arrows to explore featured businesses.
            </p>
            <Link href="/nearby" className="inline-flex items-center gap-2 text-[12px] font-semibold text-[#26483B] hover:text-[#1B3430]">
              Explore nearby listings <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>


      {/* --- HOW DISCOVERY WORKS --- */}
      <section aria-labelledby="discovery-process-heading" className="relative bg-[#F8F7F2] py-20 sm:py-24 lg:py-28">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
          <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
            <div className="max-w-[790px]">
              <p className="mb-5 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.17em] text-[#2B6552]">
                <span className="h-px w-9 bg-[#4A8C70]" />
                A simpler way to discover
              </p>
              <h2 id="discovery-process-heading" className="text-balance text-[clamp(2.65rem,5vw,5.1rem)] font-semibold leading-[1.08] tracking-[-0.065em] text-[#1B3430]">
                Find more. <span className="text-[#4A8C70]">Go further.</span>
              </h2>
              <p className="mt-5 max-w-[610px] text-[15px] leading-[1.8] text-stone-500 sm:text-[17px]">
                A thoughtful way to connect with the businesses, services and local expertise you need — wherever you are in Sri Lanka.
              </p>
            </div>
            <Link href="/nearby" className="group inline-flex h-12 w-fit shrink-0 items-center gap-2.5 rounded-xl bg-[#1B3430] px-5 text-[13px] font-semibold text-white transition-colors hover:bg-[#26483B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2">
              Start exploring <ArrowUpRight size={17} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-3 lg:mt-14 lg:gap-5">
            {[
              {
                index: "01",
                title: "Choose what matters",
                description: "Search for a service, business, or category — from everyday essentials to specialist support.",
                icon: Search,
              },
              {
                index: "02",
                title: "Explore your area",
                description: "Select a town or use your location to discover relevant listings on the map.",
                icon: MapPin,
              },
              {
                index: "03",
                title: "Make a connection",
                description: "Open a business profile, review its available details and reach out with confidence.",
                icon: Navigation,
              },
            ].map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.index} className="group relative flex min-h-[300px] flex-col overflow-hidden rounded-[26px] border border-[#E0EADB] bg-white p-7 shadow-[0_8px_24px_rgba(13,45,75,0.025)] transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-1 hover:border-[#CADDCB] hover:shadow-[0_16px_36px_rgba(13,45,75,0.08)] sm:p-8">
                  <div aria-hidden="true" className="pointer-events-none absolute -right-14 -top-16 h-44 w-44 rounded-full bg-[#F0F2E9] opacity-60" />
                  <div className="relative flex items-start justify-between">
                    <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-[#E0EADB] bg-[#F8F7F2] text-[#2B6552]">
                      <Icon size={25} strokeWidth={1.65} />
                    </span>
                    <span className="text-[12px] font-semibold tracking-[0.12em] text-[#94BAA0]">{step.index}</span>
                  </div>
                  <div className="relative mt-auto pt-12">
                    <h3 className="text-[22px] font-semibold leading-[1.25] tracking-[-0.04em] text-[#1B3430]">{step.title}</h3>
                    <p className="mt-3 max-w-[340px] text-[14px] leading-[1.75] text-stone-500">{step.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-3 text-[12px] font-medium text-[#4A8C70]">
            <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#75AB8D]" /> Explore categories</span>
            <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#75AB8D]" /> Discover nearby</span>
            <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#75AB8D]" /> Connect directly</span>
          </div>
        </div>
      </section>

      {/* --- DISCOVERY CTA: static, lightweight and functional --- */}
      <section aria-labelledby="discover-nearby-title" className="border-y border-[#F0F2E9] bg-white py-18 sm:py-20">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
          <div className="relative isolate grid items-center gap-9 overflow-hidden rounded-[30px] bg-[#1B3430] px-6 py-12 sm:px-10 sm:py-14 lg:grid-cols-[1fr_0.72fr] lg:gap-16 lg:px-14 lg:py-16">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute -left-28 -top-32 h-80 w-80 rounded-full bg-[#4A8C70]/15 blur-[85px]" />
              <div className="absolute -right-32 bottom-0 h-80 w-80 rounded-full bg-[#DCB179]/10 blur-[95px]" />
            </div>
            <div className="relative z-10">
              <p className="text-[11px] font-bold uppercase tracking-[0.19em] text-[#F0D9AC]">Explore around you</p>
              <h2 id="discover-nearby-title" className="mt-5 max-w-[650px] text-balance text-[clamp(2.4rem,4vw,4.4rem)] font-semibold leading-[1.09] tracking-[-0.06em] text-white">
                Discover more, right where you are.
              </h2>
              <p className="mt-5 max-w-[530px] text-[15px] leading-[1.8] text-[#CADDCB]">
                Search businesses, choose an area and explore local services in a few simple steps.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => handleUseCurrentLocation(true)}
                  disabled={isFetchingLocation}
                  className="inline-flex min-h-12 items-center justify-center gap-2.5 rounded-xl bg-white px-5 text-[13px] font-bold text-[#1B3430] transition-colors hover:bg-[#F0F2E9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 disabled:cursor-wait disabled:opacity-60"
                >
                  <Navigation size={17} />
                  {isFetchingLocation ? "Finding your location…" : "Explore near me"}
                </button>
                <Link href="/category" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/25 px-5 text-[13px] font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300">
                  Browse categories <ArrowUpRight size={16} />
                </Link>
              </div>
            </div>
            <div className="relative z-10 flex min-h-[220px] items-center justify-center overflow-hidden rounded-[24px] border border-white/15 bg-white/[0.06] p-6 sm:min-h-[270px]">
              <div aria-hidden="true" className="absolute -left-20 -top-20 h-56 w-56 rounded-full border border-[#E7C58E]/20" />
              <div aria-hidden="true" className="absolute -right-14 -bottom-28 h-72 w-72 rounded-full border border-[#E7C58E]/20" />
              <div className="relative w-full max-w-[350px] rounded-[22px] border border-[#94BAA0]/20 bg-[#1B3430] p-5 shadow-[0_24px_55px_rgba(0,0,0,0.2)]">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F0D9AC]/15 text-[#F0D9AC]"><MapPin size={21} /></span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[#B0CFB5]">Local discovery</p>
                    <p className="mt-1 text-[15px] font-semibold text-white">Made for Sri Lanka</p>
                  </div>
                </div>
                <div className="mt-6 space-y-3">
                  <div className="h-2.5 w-[85%] rounded-full bg-white/15" />
                  <div className="h-2.5 w-[63%] rounded-full bg-white/10" />
                  <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/15 pt-4">
                    <span className="text-xs font-medium text-[#F0D9AC]">Search · Explore · Connect</span>
                    <ArrowUpRight size={17} className="text-[#F0D9AC]" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- COMMON QUESTIONS: compact, semantic accordions --- */}
      <section aria-labelledby="homepage-faq-title" className="bg-[#F8F7F2] py-20 sm:py-24 lg:py-28">
        <div className="mx-auto grid max-w-[1440px] gap-10 px-5 sm:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20 lg:px-12">
          <div>
            <p className="mb-5 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.17em] text-[#2B6552]">
              <span className="h-px w-9 bg-[#4A8C70]" /> Good to know
            </p>
            <h2 id="homepage-faq-title" className="text-balance text-[clamp(2.5rem,4.4vw,4.5rem)] font-semibold leading-[1.1] tracking-[-0.065em] text-[#1B3430]">
              Questions, answered<span className="text-[#4A8C70]">.</span>
            </h2>
            <p className="mt-5 max-w-[425px] text-[15px] leading-[1.8] text-stone-500">
              Everything you need to start exploring — or put your own business on the map.
            </p>
            <Link href="/faq" className="group mt-7 inline-flex items-center gap-2 text-[13px] font-semibold text-[#26483B] transition-colors hover:text-[#1B3430] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400">
              Visit the Help Center <ArrowUpRight size={16} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
          <div className="space-y-3">
            {[
              {
                question: "What is SL Business Index?",
                answer: "SL Business Index is a directory for discovering Sri Lankan businesses and services. Browse categories, search by name or service, and explore listings by location.",
              },
              {
                question: "How can I find a business near me?",
                answer: "Use the Nearby feature and allow location access, or choose a town or district in search. You can then browse matching listings and view their details.",
              },
              {
                question: "What does a Verified badge mean?",
                answer: "A Verified badge identifies a listing that has met the platform's verification requirements. Always review business details and make your own checks before a transaction.",
              },
              {
                question: "How do I add my business?",
                answer: "Select List Your Business to start registering. Complete your business profile and any requested verification steps to submit the listing for review.",
              },
            ].map((item, i) => (
              <details key={item.question} className="group rounded-[18px] border border-[#E0EADB] bg-white px-5 py-1 transition-colors open:border-[#CADDCB] sm:px-6">
                <summary className="flex min-h-[70px] cursor-pointer list-none items-center justify-between gap-4 py-3 text-left text-[15px] font-semibold text-[#1B3430] marker:hidden [&::-webkit-details-marker]:hidden sm:text-[16px]">
                  <span className="flex items-center gap-4">
                    <span className="text-[11px] font-semibold text-[#94BAA0]">{String(i + 1).padStart(2, "0")}</span>
                    {item.question}
                  </span>
                  <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#E0EADB] bg-[#F8F7F2] text-[#36785E] transition-transform duration-200 group-open:rotate-45">
                    <span className="text-lg font-normal leading-none">+</span>
                  </span>
                </summary>
                <p className="border-t border-[#F0F2E9] pb-6 pt-4 pl-0 text-[14px] leading-[1.8] text-stone-500 sm:pl-8">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <Testimonials />

      {/* --- GROW WITH SLBI: preserve supplied desktop/mobile campaign artwork --- */}
      <section aria-labelledby="grow-with-slbi-title" className="border-t border-[#F0F2E9] bg-white py-20 sm:py-24 lg:py-28">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
          <div className="grid items-center gap-10 overflow-hidden rounded-[30px] bg-[#1B3430] px-6 py-10 sm:px-10 sm:py-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-10 lg:px-12 lg:py-12">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#F0D9AC]">For local businesses</p>
              <h2 id="grow-with-slbi-title" className="mt-5 max-w-[580px] text-balance text-[clamp(2.5rem,4vw,4.6rem)] font-semibold leading-[1.07] tracking-[-0.065em] text-white">
                Get discovered. Grow your reach.
              </h2>
              <p className="mt-5 max-w-[450px] text-[14px] leading-[1.85] text-[#CADDCB] sm:text-[15px]">
                Give people a better way to find your business. Create your listing and share what makes you different.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link href="/register-business" className="group inline-flex min-h-12 items-center gap-2 rounded-xl bg-white px-5 text-[13px] font-bold text-[#1B3430] transition-colors hover:bg-[#F0F2E9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300">
                  List your business <ArrowUpRight size={16} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </Link>
                <Link href="/how-to-list" className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-white/20 px-5 text-[13px] font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300">
                  How it works <ChevronRight size={16} />
                </Link>
              </div>
            </div>
            <div className="flex min-w-0 items-center justify-center overflow-hidden rounded-[22px] border border-white/15 bg-white/[0.07] p-3 sm:p-4">
              <Image
                src="/banner.jpeg"
                alt="SL Business Index promotional banner"
                width={1920}
                height={700}
                loading="lazy"
                className="hidden h-auto w-full rounded-[14px] object-contain md:block"
              />
              <Image
                src="/mobile.jpeg"
                alt="SL Business Index promotional artwork for mobile"
                width={1080}
                height={1920}
                loading="lazy"
                className="mx-auto block max-h-[440px] w-auto max-w-full rounded-[14px] object-contain md:hidden"
              />
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
