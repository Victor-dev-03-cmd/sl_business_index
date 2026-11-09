"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, useScroll, useTransform } from "framer-motion";
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
import * as LucideIcons from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import dynamic from "next/dynamic";
import VerifiedBadge from "./components/VerifiedBadge";
import Testimonials from "./components/Testimonials";

const HeroSearch = dynamic(() => import("./components/HeroSearch"), {
  ssr: false,
  loading: () => <div className="h-16 w-full max-w-2xl mx-auto bg-white/10 animate-pulse rounded-[6px]" />,
});

const EMPTY_ARRAY: any[] = [];

const IconComponent = ({
  name,
  className,
}: {
  name: string | null;
  className?: string;
}) => {
  if (!name) return <Tags className={className} />;
  const Icon = (LucideIcons as any)[name];
  return Icon ? (
    <Icon className={className} />
  ) : (
    <Tags className={className} />
  );
};


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

  // Parallax — hero background drifts at 30% of scroll speed
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const glowY = useTransform(scrollYProgress, [0, 1], ["0%", "40%"]);
  const glowOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const contentY = useTransform(scrollYProgress, [0, 1], ["0%", "12%"]);

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
        ref={heroRef}
        aria-labelledby="homepage-hero-title"
        className="relative isolate bg-[#071B30] text-white"
      >
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <motion.div className="absolute inset-0" style={{ y: glowY, opacity: glowOpacity }}>
            <div className="absolute -left-56 top-0 h-[750px] w-[750px] rounded-full bg-[#174675]/25 blur-[135px]" />
            <div className="absolute -right-28 top-12 h-[740px] w-[740px] rounded-full bg-[#236FAD]/20 blur-[145px]" />
          </motion.div>
          <div className="absolute inset-0 opacity-[0.16]" style={{ backgroundImage: "radial-gradient(rgba(185,222,255,0.26) 0.8px,transparent 0.8px)", backgroundSize: "32px 32px" }} />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#82BDEB]/40 to-transparent" />
        </div>

        <div className="relative mx-auto grid min-h-[540px] max-w-[1500px] items-center gap-7 px-5 pb-12 pt-14 sm:px-8 sm:pb-14 sm:pt-16 lg:min-h-[620px] lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-6 lg:px-12 lg:pb-14 lg:pt-14 xl:gap-10 xl:px-16">
          <motion.div
            style={{ y: contentY }}
            className="relative z-30 min-w-0 max-w-[790px] text-left"
          >
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-5 inline-flex max-w-full items-center gap-2.5 rounded-full border border-white/15 bg-white/[0.05] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#C2DEF7] sm:text-[11px]"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-sky-300 shadow-[0_0_14px_rgba(125,211,252,0.8)]" />
              Discover Sri Lanka, differently
            </motion.div>

            <motion.h1
              id="homepage-hero-title"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="text-balance text-[clamp(3.3rem,5.4vw,6.35rem)] font-medium leading-[1.055] tracking-[-0.065em] text-white"
            >
              Discover <span className="bg-gradient-to-r from-[#F7FBFF] via-[#B8DDFD] to-[#67B7F6] bg-clip-text text-transparent">better.</span>
              <br />
              Grow together.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.18 }}
              className="mt-5 max-w-[600px] text-pretty text-[15px] leading-[1.65] text-[#B4C7DB] sm:text-[17px]"
            >
              Discover businesses, services and people worth knowing.
              Your connection to opportunities across Sri Lanka starts here.
            </motion.p>

            {/* Unified search experience: one surface, clear primary and secondary actions. */}
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.28 }}
              className="relative z-40 mt-6 w-full max-w-[680px]"
            >
              <div className="rounded-[22px] border border-white/[0.18] bg-white/[0.075] p-2.5 shadow-[0_22px_70px_rgba(0,0,0,0.23)] backdrop-blur-xl sm:p-3">
                <div className="mb-2 flex items-center justify-between gap-3 px-2 sm:mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-[0.17em] text-[#BEDBF2]">
                    What are you looking for?
                  </span>
                  <span className="hidden items-center gap-1.5 text-[11px] font-medium text-[#8FAFCB] sm:inline-flex">
                    <span className="h-1.5 w-1.5 rounded-full bg-sky-300" />
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
                    className="group inline-flex min-h-10 items-center justify-center gap-2 rounded-[11px] border border-[#8FC9F2]/25 bg-[#D8EDFC]/[0.10] px-3.5 text-[12px] font-semibold text-[#E8F5FF] transition-all duration-200 hover:border-[#8FC9F2]/50 hover:bg-[#D8EDFC]/[0.18] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 disabled:cursor-wait disabled:opacity-60 sm:px-4 sm:text-[13px]"
                  >
                    <Navigation size={15} className="text-[#99D5FF] transition-transform group-hover:-translate-y-0.5" />
                    {isFetchingLocation ? "Finding location…" : "Explore near me"}
                  </button>
                  <Link
                    href="/category"
                    className="group inline-flex min-h-10 items-center justify-center gap-2 rounded-[11px] border border-white/[0.12] bg-white/[0.035] px-3.5 text-[12px] font-semibold text-[#D7E9F8] transition-all duration-200 hover:border-white/30 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 sm:px-4 sm:text-[13px]"
                  >
                    <Tags size={15} className="text-[#A7CDEC]" />
                    Browse categories
                    <ChevronRight size={15} className="text-[#A7CDEC] transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>
              </div>
              <p className="mt-3 pl-1 text-[12px] text-[#92ADC7] sm:text-[13px]">
                Try “Restaurants in Colombo” or “Electrician in Jaffna”
              </p>
            </motion.div>

            <p className="mt-5 text-[12px] font-medium tracking-wide text-[#81A5C4]">
              Built for discovery. Designed for connection.
            </p>
          </motion.div>

          {/* Fully code-based vector scene: no stock imagery, GIF downloads or external animation service. */}
          <motion.div
            initial={{ opacity: 0, x: 36, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.95, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 mx-auto flex w-full max-w-[380px] items-center justify-center sm:max-w-[460px] lg:max-w-none"
            aria-label="Illustration of business discovery across Sri Lanka"
            role="img"
          >
            <div className="relative aspect-[1.03/1] w-full max-w-[550px]">
              <div className="absolute inset-[7%] rounded-full border border-[#7CB8E5]/10 bg-[radial-gradient(circle,rgba(34,104,160,0.20)_0%,rgba(11,41,73,0.04)_67%,transparent_74%)]" />
              <motion.div
                aria-hidden="true"
                animate={{ rotate: 360 }}
                transition={{ duration: 90, repeat: Infinity, ease: "linear" }}
                className="absolute inset-[7%] rounded-full border border-dashed border-[#83C4F3]/20"
              />
              <motion.div
                aria-hidden="true"
                animate={{ rotate: -360 }}
                transition={{ duration: 115, repeat: Infinity, ease: "linear" }}
                className="absolute inset-[17%] rounded-full border border-[#6FAEE0]/20"
              />
              <svg viewBox="0 0 600 600" fill="none" aria-hidden="true" className="absolute inset-0 h-full w-full">
                <defs>
                  <linearGradient id="hero-map-stroke" x1="140" y1="110" x2="460" y2="520" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#93D9FF" stopOpacity="0.95" />
                    <stop offset="1" stopColor="#267CC1" stopOpacity="0.55" />
                  </linearGradient>
                  <linearGradient id="hero-map-fill" x1="280" y1="125" x2="365" y2="510" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#173F69" stopOpacity="0.94" />
                    <stop offset="1" stopColor="#0E2E4D" stopOpacity="0.8" />
                  </linearGradient>
                </defs>
                <circle cx="300" cy="300" r="224" stroke="#8ACBF7" strokeOpacity=".14" />
                <circle cx="300" cy="300" r="170" stroke="#8ACBF7" strokeOpacity=".13" strokeDasharray="4 12" />
                <path d="M299 90C275 119 278 148 264 172C249 198 244 227 261 253C272 269 252 287 259 307C266 331 285 347 290 366C296 394 305 419 322 442C337 463 346 493 366 505C383 509 396 491 390 472C384 452 372 434 375 412C379 391 370 369 358 350C345 329 343 307 354 286C364 266 356 245 343 229C327 210 325 185 322 163C320 134 313 106 299 90Z" fill="url(#hero-map-fill)" stroke="url(#hero-map-stroke)" strokeWidth="2.5" strokeLinejoin="round" />
                <path d="M278 200L308 277L294 364L357 437M308 277L343 329M294 364L324 404" stroke="#67B8F1" strokeOpacity=".38" strokeWidth="1.5" strokeDasharray="5 8" />
                <circle cx="278" cy="200" r="5" fill="#A2E4FF" />
                <circle cx="308" cy="277" r="5" fill="#A2E4FF" />
                <circle cx="294" cy="364" r="5" fill="#A2E4FF" />
                <circle cx="357" cy="437" r="5" fill="#A2E4FF" />
                <motion.circle cx="308" cy="277" r="19" stroke="#9ADDFF" strokeWidth="2" animate={{ r: [10, 25, 10], opacity: [0.7, 0, 0.7] }} transition={{ duration: 3.2, repeat: Infinity, ease: "easeOut" }} />
                <motion.circle cx="294" cy="364" r="19" stroke="#9ADDFF" strokeWidth="2" animate={{ r: [10, 23, 10], opacity: [0.6, 0, 0.6] }} transition={{ duration: 3.8, repeat: Infinity, delay: 0.5, ease: "easeOut" }} />
              </svg>

              <motion.div
                animate={{ y: [0, -12, 0] }}
                transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute left-[1%] top-[24%] w-[45%] max-w-[225px] rounded-2xl border border-white/15 bg-[#102E4C]/90 p-4 shadow-[0_25px_55px_rgba(0,0,0,0.25)] backdrop-blur-xl sm:p-5"
              >
                <div className="mb-3 flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-400/15 text-sky-200"><Building2 size={18} /></span>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.12em] text-sky-300">Find what matters</p>
                    <p className="text-sm font-semibold text-white">Local businesses</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-2 w-[82%] rounded-full bg-white/20" />
                  <div className="h-2 w-[60%] rounded-full bg-white/10" />
                </div>
              </motion.div>

              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 7.1, repeat: Infinity, delay: 0.5, ease: "easeInOut" }}
                className="absolute right-[0%] top-[53%] w-[46%] max-w-[236px] rounded-2xl border border-white/15 bg-[#102E4C]/95 p-4 shadow-[0_25px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:p-5"
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#6CC5FF]/15 text-sky-200"><MapPin size={19} /></span>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.12em] text-sky-300">Explore nearby</p>
                    <p className="text-sm font-semibold text-white">Sri Lanka</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2 text-[11px] text-[#B4D4EB]">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  Discover local opportunities
                </div>
              </motion.div>

              <motion.div
                animate={{ y: [0, -7, 0] }}
                transition={{ duration: 5.4, repeat: Infinity, delay: 0.8, ease: "easeInOut" }}
                className="absolute bottom-[8%] left-[19%] inline-flex items-center gap-2 rounded-full border border-[#7AC9FE]/20 bg-[#0A2845]/90 px-4 py-3 text-xs font-semibold text-[#C8E9FF] shadow-xl backdrop-blur-lg"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#75C8FF]/15"><Search size={14} /></span>
                Discover. Connect. Grow.
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* --- BROWSE CATEGORIES: editorial, accessible, and lightweight --- */}
      <section
        aria-labelledby="browse-categories-heading"
        className="relative isolate border-b border-[#E6EBF1] bg-[#F8FAFC] py-20 sm:py-24 lg:py-28"
      >
        <div className="pointer-events-none absolute right-0 top-0 h-72 w-72 rounded-full bg-[#C9E2F7]/25 blur-[100px]" aria-hidden="true" />
        <div className="relative mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
          <div className="mb-10 flex flex-col justify-between gap-8 md:mb-12 lg:flex-row lg:items-end">
            <div className="max-w-[820px]">
              <p className="mb-5 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#34668D]">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] border border-[#D8E5EF] bg-white text-[#245A80]">
                  <LayoutGrid size={16} strokeWidth={1.8} />
                </span>
                Explore Sri Lanka
              </p>
              <h2
                id="browse-categories-heading"
                className="text-balance text-[clamp(2.75rem,5vw,5.3rem)] font-semibold leading-[1.08] tracking-[-0.065em] text-[#102B4E]"
              >
                Browse categories<span className="text-[#3C82B4]">.</span>
              </h2>
              <p className="mt-5 max-w-[620px] text-pretty text-[15px] leading-[1.8] text-slate-500 sm:text-[17px]">
                From everyday essentials to specialized expertise. Explore local
                businesses and services across Sri Lanka, all in one place.
              </p>
            </div>
            <Link
              href="/category"
              className="group inline-flex h-12 w-fit shrink-0 items-center gap-3 rounded-xl border border-[#D7E1EB] bg-white px-5 text-[13px] font-semibold text-[#123B60] shadow-[0_5px_20px_rgba(15,47,74,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#AFC8DA] hover:shadow-[0_8px_24px_rgba(15,47,74,0.1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            >
              Explore all categories
              <ArrowUpRight size={17} className="transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          </div>

          <div className="mb-5 flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              Discover by industry
            </p>
            <div className="hidden items-center gap-2 md:flex">
              <button
                type="button"
                aria-label="Scroll categories left"
                onClick={() => scroll("left")}
                disabled={!canScrollLeft}
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#DDE5EC] bg-white text-[#214965] transition-all duration-150 hover:border-[#B0C8DA] hover:bg-[#ECF5FB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 disabled:cursor-not-allowed disabled:opacity-35"
              >
                <ChevronLeft size={19} strokeWidth={1.8} />
              </button>
              <button
                type="button"
                aria-label="Scroll categories right"
                onClick={() => scroll("right")}
                disabled={!canScrollRight}
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#DDE5EC] bg-white text-[#214965] transition-all duration-150 hover:border-[#B0C8DA] hover:bg-[#ECF5FB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 disabled:cursor-not-allowed disabled:opacity-35"
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
                  className="flex min-h-[182px] flex-col justify-between rounded-[22px] border border-[#E2E9F0] bg-white p-5 md:h-[228px] md:w-[232px] md:shrink-0"
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
                    "group relative min-h-[182px] w-full flex-col justify-between overflow-hidden rounded-[22px] border border-[#E0E7EF] bg-white p-4 text-left shadow-[0_3px_16px_rgba(15,40,67,0.025)] transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-1 hover:border-[#BCD5E8] hover:shadow-[0_12px_30px_rgba(15,40,67,0.09)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 sm:p-5 md:h-[228px] md:w-[232px] md:shrink-0 md:snap-start " +
                    (!showAllCategories && idx >= 8 ? "hidden md:flex" : "flex")
                  }
                >
                  <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[#EAF4FC] opacity-70 transition-transform duration-300 group-hover:scale-110" />
                  <div className="relative flex w-full items-start justify-between gap-3">
                    <div className="relative flex h-[58px] w-[58px] shrink-0 items-center justify-center overflow-hidden rounded-[17px] border border-[#E8EFF5] bg-[#F4F8FC] text-[#24638D] sm:h-[66px] sm:w-[66px]">
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
                        <IconComponent name={cat.icon} className="h-7 w-7" />
                      )}
                    </div>
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#E4EBF1] bg-white text-[#7B97AB] transition-colors duration-200 group-hover:border-[#C4DAEB] group-hover:bg-[#E9F5FD] group-hover:text-[#164B72]">
                      <ArrowUpRight size={16} strokeWidth={1.7} />
                    </span>
                  </div>
                  <div className="relative mt-6 w-full">
                    <span className="mb-2 block text-[10px] font-semibold tracking-[0.1em] text-[#83A1B7]">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <h3 className="line-clamp-2 text-[14px] font-semibold leading-[1.4] tracking-[-0.025em] text-[#183851] transition-colors group-hover:text-[#155D92] sm:text-[17px]">
                      {cat.name}
                    </h3>
                  </div>
                </button>
              ))
            ) : (
              <div className="col-span-2 flex w-full flex-col items-center justify-center rounded-2xl border border-dashed border-[#CFDCE7] bg-white px-6 py-14 text-center text-slate-500">
                <LayoutGrid size={26} className="mb-3 text-[#7DA5C5]" />
                <p className="text-sm font-semibold">No categories available right now.</p>
                <Link href="/nearby" className="mt-3 text-xs font-semibold text-[#1B628E] hover:underline">
                  Explore businesses instead
                </Link>
              </div>
            )}
          </div>

          {!categoriesLoading && featuredCategories.length > 8 && (
            <button
              type="button"
              onClick={() => setShowAllCategories(value => !value)}
              className="mx-auto mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#D7E3EC] bg-white px-5 text-[13px] font-semibold text-[#174B72] transition-colors hover:bg-[#EDF5FA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 md:hidden"
            >
              {showAllCategories ? "Show fewer categories" : "Show more categories"}
              <ChevronRight size={16} className={showAllCategories ? "-rotate-90" : "rotate-90"} />
            </button>
          )}

          <div className="mt-9 flex flex-col justify-between gap-4 border-t border-[#E1E8EE] pt-6 sm:flex-row sm:items-center">
            <p className="flex items-center gap-2 text-[13px] text-slate-500">
              <MapPin size={16} className="shrink-0 text-[#5687AC]" />
              Discover businesses wherever you are in Sri Lanka.
            </p>
            <Link
              href="/nearby"
              className="group inline-flex w-fit items-center gap-2 text-[13px] font-semibold text-[#1A557E] transition-colors hover:text-[#0B304F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
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
        className="relative isolate overflow-hidden border-b border-[#E7EDF2] bg-white py-20 sm:py-24 lg:py-28"
      >
        <div className="pointer-events-none absolute -left-48 top-0 h-[500px] w-[500px] rounded-full bg-[#D8ECFB]/20 blur-[120px]" aria-hidden="true" />
        <div className="relative mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
          <div className="mb-9 flex flex-col justify-between gap-7 sm:mb-11 lg:flex-row lg:items-end">
            <div className="max-w-[780px]">
              <p className="mb-5 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#34668D]">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] border border-[#D8E5EF] bg-[#F3F8FC] text-[#245A80]">
                  <Star size={16} strokeWidth={1.8} />
                </span>
                The spotlight
              </p>
              <h2
                id="featured-listings-title"
                className="text-balance text-[clamp(2.7rem,5vw,5.2rem)] font-semibold leading-[1.08] tracking-[-0.065em] text-[#102B4E]"
              >
                Featured listings<span className="text-[#3C82B4]">.</span>
              </h2>
              <p className="mt-5 max-w-[620px] text-pretty text-[15px] leading-[1.8] text-slate-500 sm:text-[17px]">
                Discover businesses and services across Sri Lanka,
                presented in a fresh perspective.
              </p>
            </div>
            <Link
              href="/nearby"
              className="group inline-flex h-12 w-fit shrink-0 items-center gap-3 rounded-xl border border-[#D7E1EB] bg-[#F8FBFD] px-5 text-[13px] font-semibold text-[#123B60] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#AFC8DA] hover:bg-white hover:shadow-[0_8px_22px_rgba(15,47,74,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            >
              Explore businesses
              <ArrowUpRight size={17} className="transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          </div>

          <div className="mb-5 flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              Discover a business worth knowing
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => scrollFeatured("left")}
                disabled={!canFeaturedScrollLeft}
                aria-label="Scroll featured listings left"
                aria-controls="featured-listings-carousel"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#DEE7EE] bg-white text-[#214965] transition-colors hover:border-[#B0C8DA] hover:bg-[#F0F7FC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 disabled:cursor-not-allowed disabled:opacity-35 sm:h-11 sm:w-11"
              >
                <ChevronLeft size={19} strokeWidth={1.8} />
              </button>
              <button
                type="button"
                onClick={() => scrollFeatured("right")}
                disabled={!canFeaturedScrollRight}
                aria-label="Scroll featured listings right"
                aria-controls="featured-listings-carousel"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#DEE7EE] bg-white text-[#214965] transition-colors hover:border-[#B0C8DA] hover:bg-[#F0F7FC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 disabled:cursor-not-allowed disabled:opacity-35 sm:h-11 sm:w-11"
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
                  className="relative aspect-[9/16] w-[178px] shrink-0 snap-start overflow-hidden rounded-[22px] bg-slate-100 sm:w-[207px] lg:w-[229px]"
                >
                  <Skeleton className="absolute inset-0 h-full w-full rounded-none" />
                  <div className="absolute bottom-0 left-0 right-0 space-y-3 p-5">
                    <Skeleton className="h-4 w-4/5 bg-slate-200" />
                    <Skeleton className="h-3 w-1/2 bg-slate-200" />
                  </div>
                </div>
              ))
            ) : featuredError ? (
              <div className="flex min-h-[250px] w-full flex-col items-center justify-center rounded-[22px] border border-rose-100 bg-rose-50/40 px-6 text-center">
                <p className="text-sm font-semibold text-slate-800">Featured listings are unavailable right now.</p>
                <p className="mt-2 text-xs text-slate-500">Please refresh the page or try again shortly.</p>
              </div>
            ) : featuredBusinesses.length > 0 ? (
              featuredBusinesses.map((business) => (
                <Link
                  key={business.id}
                  href={`/business/${business.slug || business.id}`}
                  aria-label={`View ${business.name} business profile`}
                  className="group relative isolate block aspect-[9/16] w-[178px] shrink-0 snap-start overflow-hidden rounded-[22px] border border-[#DFE7EF] bg-[#132F49] shadow-[0_6px_23px_rgba(15,40,67,0.07)] transition-[border-color,transform,box-shadow] duration-200 hover:-translate-y-1 hover:border-[#A9CBDE] hover:shadow-[0_16px_36px_rgba(15,40,67,0.19)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 sm:w-[207px] lg:w-[229px] xl:w-[237px]"
                >
                  {/* 9:16 visual works with landscape photos as well as portrait images. */}
                  <div className="absolute inset-0 overflow-hidden">
                    {business.image_url ? (
                      <Image
                        src={business.image_url}
                        alt={business.name}
                        fill
                        sizes="(max-width: 640px) 178px, (max-width: 1024px) 207px, 237px"
                        className="object-cover transition-transform duration-500 motion-safe:group-hover:scale-[1.045]"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#1C4C75] via-[#153958] to-[#0B2238]">
                        {business.logo_url ? (
                          <div className="relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-[24px] border border-white/15 bg-white/95 p-4 shadow-xl">
                            <Image src={business.logo_url} alt={business.name} fill sizes="112px" className="object-contain p-4" />
                          </div>
                        ) : (
                          <Building2 size={60} strokeWidth={1.1} className="text-[#A7D5F2]/75" />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Contrast stays legible without requiring hover or animation. */}
                  <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#051523] via-[#051523]/65 via-[39%] to-transparent" />
                  <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/45 to-transparent" />

                  <div className="absolute inset-x-0 top-0 z-10 flex flex-wrap items-start justify-between gap-1.5 p-3 sm:p-4">
                    {business.is_verified && business.can_show_badge ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-[#EAF6FF]/95 px-2.5 py-1 text-[10px] font-bold text-[#15557D] shadow-sm">
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
                    <span className="mb-2 inline-block max-w-full truncate rounded-full border border-white/20 bg-white/15 px-2.5 py-1 text-[10px] font-semibold text-[#E4F3FF]">
                      {business.category || "Local business"}
                    </span>
                    <h3 className="line-clamp-2 text-[17px] font-semibold leading-[1.25] tracking-[-0.035em] drop-shadow-sm sm:text-[20px]">
                      {business.name}
                    </h3>
                    {business.address && (
                      <p className="mt-2 flex min-w-0 items-center gap-1.5 text-[11px] font-medium text-[#CDDCE9]">
                        <MapPin size={12} className="shrink-0" />
                        <span className="truncate">{business.address}</span>
                      </p>
                    )}
                    <div className="mt-4 flex items-center justify-between border-t border-white/20 pt-3 text-[11px] font-semibold text-white/90">
                      <span>View business</span>
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/25 bg-white/15 transition-colors group-hover:bg-white group-hover:text-[#0C3154]">
                        <ArrowUpRight size={15} />
                      </span>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="flex min-h-[270px] w-full flex-col items-center justify-center rounded-[22px] border border-dashed border-[#CFDCE7] bg-[#F8FBFD] px-6 text-center">
                <Building2 size={30} className="text-[#7DA5C5]" />
                <h3 className="mt-4 text-base font-semibold text-[#123A5B]">No featured businesses yet</h3>
                <p className="mt-2 max-w-sm text-sm text-slate-500">
                  Browse businesses across Sri Lanka while new listings are being added.
                </p>
                <Link href="/nearby" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#195780] hover:underline">
                  Explore businesses <ArrowRight size={16} />
                </Link>
              </div>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[#EDF1F5] pt-6">
            <p className="text-[12px] text-slate-500">
              Swipe or use the arrows to explore featured businesses.
            </p>
            <Link href="/nearby" className="inline-flex items-center gap-2 text-[12px] font-semibold text-[#195780] hover:text-[#0A304F]">
              Explore nearby listings <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>


      {/* --- HOW DISCOVERY WORKS --- */}
      <section aria-labelledby="discovery-process-heading" className="relative bg-[#F8FAFC] py-20 sm:py-24 lg:py-28">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
          <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
            <div className="max-w-[790px]">
              <p className="mb-5 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.17em] text-[#34688C]">
                <span className="h-px w-9 bg-[#5B8FAE]" />
                A simpler way to discover
              </p>
              <h2 id="discovery-process-heading" className="text-balance text-[clamp(2.65rem,5vw,5.1rem)] font-semibold leading-[1.08] tracking-[-0.065em] text-[#102B4E]">
                Find more. <span className="text-[#4085B6]">Go further.</span>
              </h2>
              <p className="mt-5 max-w-[610px] text-[15px] leading-[1.8] text-slate-500 sm:text-[17px]">
                A thoughtful way to connect with the businesses, services and local expertise you need — wherever you are in Sri Lanka.
              </p>
            </div>
            <Link href="/nearby" className="group inline-flex h-12 w-fit shrink-0 items-center gap-2.5 rounded-xl bg-[#10395D] px-5 text-[13px] font-semibold text-white transition-colors hover:bg-[#1B5682] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2">
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
                <div key={step.index} className="group relative flex min-h-[300px] flex-col overflow-hidden rounded-[26px] border border-[#DFE9F0] bg-white p-7 shadow-[0_8px_24px_rgba(13,45,75,0.025)] transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-1 hover:border-[#B7D2E5] hover:shadow-[0_16px_36px_rgba(13,45,75,0.08)] sm:p-8">
                  <div aria-hidden="true" className="pointer-events-none absolute -right-14 -top-16 h-44 w-44 rounded-full bg-[#E9F5FD] opacity-60" />
                  <div className="relative flex items-start justify-between">
                    <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-[#D9E8F2] bg-[#F0F7FC] text-[#27678F]">
                      <Icon size={25} strokeWidth={1.65} />
                    </span>
                    <span className="text-[12px] font-semibold tracking-[0.12em] text-[#9AB2C4]">{step.index}</span>
                  </div>
                  <div className="relative mt-auto pt-12">
                    <h3 className="text-[22px] font-semibold leading-[1.25] tracking-[-0.04em] text-[#123452]">{step.title}</h3>
                    <p className="mt-3 max-w-[340px] text-[14px] leading-[1.75] text-slate-500">{step.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-3 text-[12px] font-medium text-[#6B879C]">
            <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#66ADD8]" /> Explore categories</span>
            <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#66ADD8]" /> Discover nearby</span>
            <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#66ADD8]" /> Connect directly</span>
          </div>
        </div>
      </section>

      {/* --- DISCOVERY CTA: static, lightweight and functional --- */}
      <section aria-labelledby="discover-nearby-title" className="border-y border-[#E7EDF2] bg-white py-18 sm:py-20">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
          <div className="relative isolate grid items-center gap-9 overflow-hidden rounded-[30px] bg-[#0C2C4B] px-6 py-12 sm:px-10 sm:py-14 lg:grid-cols-[1fr_0.72fr] lg:gap-16 lg:px-14 lg:py-16">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute -left-28 -top-32 h-80 w-80 rounded-full bg-[#3E88BE]/15 blur-[85px]" />
              <div className="absolute -right-32 bottom-0 h-80 w-80 rounded-full bg-[#46B2F4]/10 blur-[95px]" />
            </div>
            <div className="relative z-10">
              <p className="text-[11px] font-bold uppercase tracking-[0.19em] text-[#A0D5F5]">Explore around you</p>
              <h2 id="discover-nearby-title" className="mt-5 max-w-[650px] text-balance text-[clamp(2.4rem,4vw,4.4rem)] font-semibold leading-[1.09] tracking-[-0.06em] text-white">
                Discover more, right where you are.
              </h2>
              <p className="mt-5 max-w-[530px] text-[15px] leading-[1.8] text-[#BCD1E2]">
                Search businesses, choose an area and explore local services in a few simple steps.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => handleUseCurrentLocation(true)}
                  disabled={isFetchingLocation}
                  className="inline-flex min-h-12 items-center justify-center gap-2.5 rounded-xl bg-white px-5 text-[13px] font-bold text-[#103858] transition-colors hover:bg-[#E8F5FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 disabled:cursor-wait disabled:opacity-60"
                >
                  <Navigation size={17} />
                  {isFetchingLocation ? "Finding your location…" : "Explore near me"}
                </button>
                <Link href="/category" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/25 px-5 text-[13px] font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300">
                  Browse categories <ArrowUpRight size={16} />
                </Link>
              </div>
            </div>
            <div className="relative z-10 flex min-h-[220px] items-center justify-center overflow-hidden rounded-[24px] border border-white/15 bg-white/[0.06] p-6 sm:min-h-[270px]">
              <div aria-hidden="true" className="absolute -left-20 -top-20 h-56 w-56 rounded-full border border-[#78BCE9]/20" />
              <div aria-hidden="true" className="absolute -right-14 -bottom-28 h-72 w-72 rounded-full border border-[#78BCE9]/20" />
              <div className="relative w-full max-w-[350px] rounded-[22px] border border-[#83BCE5]/20 bg-[#163F60] p-5 shadow-[0_24px_55px_rgba(0,0,0,0.2)]">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#8ED3FE]/15 text-[#B5E0FE]"><MapPin size={21} /></span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[#8FBFDF]">Local discovery</p>
                    <p className="mt-1 text-[15px] font-semibold text-white">Made for Sri Lanka</p>
                  </div>
                </div>
                <div className="mt-6 space-y-3">
                  <div className="h-2.5 w-[85%] rounded-full bg-white/15" />
                  <div className="h-2.5 w-[63%] rounded-full bg-white/10" />
                  <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/15 pt-4">
                    <span className="text-xs font-medium text-[#C3E0F4]">Search · Explore · Connect</span>
                    <ArrowUpRight size={17} className="text-[#A4D9FA]" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- COMMON QUESTIONS: compact, semantic accordions --- */}
      <section aria-labelledby="homepage-faq-title" className="bg-[#F8FAFC] py-20 sm:py-24 lg:py-28">
        <div className="mx-auto grid max-w-[1440px] gap-10 px-5 sm:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20 lg:px-12">
          <div>
            <p className="mb-5 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.17em] text-[#34688C]">
              <span className="h-px w-9 bg-[#5B8FAE]" /> Good to know
            </p>
            <h2 id="homepage-faq-title" className="text-balance text-[clamp(2.5rem,4.4vw,4.5rem)] font-semibold leading-[1.1] tracking-[-0.065em] text-[#102B4E]">
              Questions, answered<span className="text-[#4085B6]">.</span>
            </h2>
            <p className="mt-5 max-w-[425px] text-[15px] leading-[1.8] text-slate-500">
              Everything you need to start exploring — or put your own business on the map.
            </p>
            <Link href="/faq" className="group mt-7 inline-flex items-center gap-2 text-[13px] font-semibold text-[#1B587F] transition-colors hover:text-[#0C2C4B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400">
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
              <details key={item.question} className="group rounded-[18px] border border-[#DEE8F0] bg-white px-5 py-1 transition-colors open:border-[#BAD5E8] sm:px-6">
                <summary className="flex min-h-[70px] cursor-pointer list-none items-center justify-between gap-4 py-3 text-left text-[15px] font-semibold text-[#163854] marker:hidden [&::-webkit-details-marker]:hidden sm:text-[16px]">
                  <span className="flex items-center gap-4">
                    <span className="text-[11px] font-semibold text-[#8BACBF]">{String(i + 1).padStart(2, "0")}</span>
                    {item.question}
                  </span>
                  <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#E0E9F0] bg-[#F8FBFD] text-[#446E8C] transition-transform duration-200 group-open:rotate-45">
                    <span className="text-lg font-normal leading-none">+</span>
                  </span>
                </summary>
                <p className="border-t border-[#EEF2F6] pb-6 pt-4 pl-0 text-[14px] leading-[1.8] text-slate-500 sm:pl-8">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <Testimonials />

      {/* --- GROW WITH SLBI: preserve supplied desktop/mobile campaign artwork --- */}
      <section aria-labelledby="grow-with-slbi-title" className="border-t border-[#E4EDF3] bg-white py-20 sm:py-24 lg:py-28">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
          <div className="grid items-center gap-10 overflow-hidden rounded-[30px] bg-[#0E2E4C] px-6 py-10 sm:px-10 sm:py-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-10 lg:px-12 lg:py-12">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#A3D5F5]">For local businesses</p>
              <h2 id="grow-with-slbi-title" className="mt-5 max-w-[580px] text-balance text-[clamp(2.5rem,4vw,4.6rem)] font-semibold leading-[1.07] tracking-[-0.065em] text-white">
                Get discovered. Grow your reach.
              </h2>
              <p className="mt-5 max-w-[450px] text-[14px] leading-[1.85] text-[#C1D4E3] sm:text-[15px]">
                Give people a better way to find your business. Create your listing and share what makes you different.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link href="/register-business" className="group inline-flex min-h-12 items-center gap-2 rounded-xl bg-white px-5 text-[13px] font-bold text-[#0C3154] transition-colors hover:bg-[#EAF6FE] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300">
                  List your business <ArrowUpRight size={16} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </Link>
                <Link href="/how-to-list" className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-white/20 px-5 text-[13px] font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300">
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
