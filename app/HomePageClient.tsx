"use client";

import React, { useState, useRef, useEffect } from "react";
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
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import dynamic from "next/dynamic";
import VerifiedBadge from "./components/VerifiedBadge";
import Testimonials from "./components/Testimonials";

const HeroSearch = dynamic(() => import("./components/HeroSearch"), {
  ssr: false,
  loading: () => <div className="h-16 w-full max-w-2xl mx-auto bg-white/10 animate-pulse rounded-[6px]" />,
});

const EMPTY_ARRAY: any[] = [];

export default function HomePageClient() {
  const router = useRouter();

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

  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [userCoords, setUserCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

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

  useEffect(() => {
    let animationId: number;
    const scrollStep = 0.3;

    const autoScroll = () => {
      if (scrollContainerRef.current && !isPaused && !isDragging) {
        const {
          scrollLeft: sLeft,
          scrollWidth,
          clientWidth,
        } = scrollContainerRef.current;

        if (sLeft >= scrollWidth - clientWidth - 5) {
          scrollContainerRef.current.scrollLeft = 0;
        } else {
          scrollContainerRef.current.scrollLeft += scrollStep;
        }
      }
      animationId = requestAnimationFrame(autoScroll);
    };

    animationId = requestAnimationFrame(autoScroll);
    return () => cancelAnimationFrame(animationId);
  }, [isPaused, isDragging]);

  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } =
        scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);

      // Update pagination dots
      const pages = Math.ceil(scrollWidth / clientWidth);
      setTotalPages(pages > 1 ? pages : 1);
      const active = Math.round(scrollLeft / clientWidth);
      setActivePageIndex(active);
    }
  };

  useEffect(() => {
    if (!categoriesLoading) {
      setTimeout(checkScroll, 100);
    }
  }, [categoriesLoading]);

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, []);

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = 600;
      scrollContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollContainerRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
    setScrollLeft(scrollContainerRef.current.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    scrollContainerRef.current.scrollLeft = scrollLeft - walk;
    checkScroll();
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
    setIsPaused(false);
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

  const scrollToPage = (index: number) => {
    if (scrollContainerRef.current) {
      const { clientWidth } = scrollContainerRef.current;
      scrollContainerRef.current.scrollTo({
        left: index * clientWidth,
        behavior: "smooth",
      });
    }
  };

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

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.28 }}
              className="relative z-40 mt-6 w-full max-w-[670px]"
            >
              <div className="rounded-2xl border border-white/15 bg-white/[0.07] p-2 shadow-[0_26px_65px_rgba(0,0,0,0.24)] backdrop-blur-lg sm:p-2.5 [&_form]:!rounded-xl [&_form>div]:!rounded-xl">
                <HeroSearch
                  categories={categories}
                  featuredBusinesses={featuredBusinesses}
                  userCoords={userCoords}
                  isFetchingLocation={isFetchingLocation}
                  handleUseCurrentLocation={handleUseCurrentLocation}
                  onFocusChange={setIsSearchFocused}
                />
              </div>
              <p className="mt-3 pl-1 text-[12px] text-[#92ADC7] sm:text-[13px]">
                Try “Restaurants in Colombo” or “Electrician in Jaffna”
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.38 }}
              className="relative z-10 mt-5 flex flex-wrap items-center gap-3"
            >
              <button
                type="button"
                onClick={() => handleUseCurrentLocation(true)}
                disabled={isFetchingLocation}
                className="inline-flex min-h-12 items-center gap-2.5 rounded-xl bg-[#EAF5FF] px-5 text-[13px] font-bold text-[#0E3152] shadow-lg shadow-black/10 transition-all hover:-translate-y-0.5 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 disabled:cursor-wait disabled:opacity-60"
              >
                <Navigation size={17} />
                {isFetchingLocation ? "Finding location…" : "Explore near me"}
              </button>
              <Link href="/category" className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-white/20 px-5 text-[13px] font-semibold text-[#D8EAFA] transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300">
                Browse categories <ChevronRight size={16} />
              </Link>
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

      {/* --- CATEGORIES (Slider) --- */}
      <section className="py-24 px-6 max-w-7xl mx-auto overflow-hidden">
        <div className="flex justify-between items-center mb-10 px-2">
          <h2 className="text-2xl text-gray-800 tracking-tight font-normal">
            Browse Categories
          </h2>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 mr-2">
              <button
                onClick={() => scroll("left")}
                disabled={!canScrollLeft}
                className="p-2 border border-gray-200 rounded-full hover:bg-brand-blue hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all text-gray-600"
              >
                <ChevronLeft size={20} strokeWidth={2} />
              </button>
              <button
                onClick={() => scroll("right")}
                disabled={!canScrollRight}
                className="p-2 border border-gray-200 rounded-full hover:bg-brand-blue hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all text-gray-600"
              >
                <ChevronRight size={20} strokeWidth={2} />
              </button>
            </div>
            <Link
              href="/category"
              className="hidden md:flex text-sm text-brand-gold items-center hover:underline font-normal"
            >
              View All
            </Link>
            {!showAllCategories && (
              <button
                onClick={() => setShowAllCategories(true)}
                className="md:hidden text-sm text-brand-gold flex items-center hover:underline font-normal"
              >
                View All
              </button>
            )}
          </div>
        </div>

        <div
          ref={scrollContainerRef}
          onScroll={checkScroll}
          onMouseEnter={() => setIsPaused(true)}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          className={cn(
            "grid grid-cols-4 gap-2 md:grid md:grid-cols-none md:grid-rows-2 md:grid-flow-col md:auto-cols-max md:gap-x-6 md:gap-y-6 px-2 md:overflow-x-auto md:min-h-[450px] no-scrollbar pb-8 select-none",
            isDragging && "cursor-grabbing",
          )}
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {categoriesLoading
            ? [...Array(16)].map((_, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center justify-center p-3 md:p-8 bg-white border border-gray-200 rounded-[8px] md:rounded-[12px] md:min-w-[200px] md:h-full"
                >
                  <Skeleton className="w-10 h-10 md:w-20 md:h-20 rounded-full mb-2 md:mb-4" />
                  <Skeleton className="h-2 w-3/4" />
                </div>
              ))
            : categories
                .slice(0, showAllCategories ? categories.length : 1000) // Fallback for desktop
                .map((cat, idx) => {
                  // On mobile, if not showAllCategories, only show first 16 (4 rows of 4)
                  if (!showAllCategories && typeof window !== 'undefined' && window.innerWidth < 768 && idx >= 16) {
                    return null;
                  }
                  return (
                    <div
                      key={cat.id || idx}
                      onClick={() => handleCategoryClick(cat.name)}
                      className="group cursor-pointer flex flex-col items-center justify-center p-3 md:p-8 bg-white border border-gray-300 rounded md:rounded-[12px] md:min-w-[200px] md:h-full hover:border-brand-gold hover:shadow-xl hover:-translate-y-1 transition-all duration-300 select-none"
                      onContextMenu={(e) => e.preventDefault()}
                    >
                      <div className="relative w-10 h-10 md:w-20 md:h-20 mb-2 md:mb-4 transition-transform group-hover:scale-110 pointer-events-none flex items-center justify-center">
                        {cat.image_url ? (
                          <Image
                            src={encodeURI(cat.image_url)}
                            alt={cat.name}
                            fill
                            className="object-contain"
                            draggable={false}
                            unoptimized={cat.image_url.includes('supabase.co')}
                          />
                        ) : (
                          <div className="text-brand-gold scale-[1] md:scale-[2]">
                            <IconComponent name={cat.icon} />
                          </div>
                        )}
                      </div>
                      <span className="text-gray-700 text-[10px] md:text-[12px] font-medium text-center group-hover:text-brand-gold transition-colors leading-tight line-clamp-2">
                        {cat.name}
                      </span>
                    </div>
                  );
                })}
        </div>

        {/* --- PAGINATION DOTS --- */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2.5 mt-4">
            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i}
                onClick={() => scrollToPage(i)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all duration-300",
                  activePageIndex === i
                    ? "bg-brand-blue w-6"
                    : "bg-gray-300 hover:bg-gray-400"
                )}
                aria-label={`Go to page ${i + 1}`}
              />
            ))}
          </div>
        )}
      </section>

      {/* --- LISTINGS (6-Column Modern Grid) --- */}
      <section className="py-24 bg-[#f5f5f5] border-t border-gray-300">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-14 gap-4">
            <div>
              <h2 className="text-2xl text-gray-900 tracking-tight font-normal">
                Featured Listings
              </h2>
              <p className="text-sm text-gray-500 mt-2 font-normal">
                Discover handpicked and verified establishments across Sri Lanka
              </p>
            </div>
            <Link
              href="/nearby"
              className="text-sm font-normal text-brand-gold hover:text-brand-gold-light transition-colors flex items-center gap-1 group"
            >
              Explore All{" "}
              <ChevronRight
                size={16}
                strokeWidth={1.5}
                className="group-hover:translate-x-0.5 transition-transform"
              />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {featuredLoading ? (
              [...Array(18)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-[6px] overflow-hidden border border-gray-300 shadow-sm flex flex-col h-full"
                >
                  <Skeleton className="aspect-square w-full" />
                  <div className="p-4 flex flex-col flex-1 space-y-3">
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                </div>
              ))
            ) : featuredError ? (
              <div className="col-span-full text-center py-12 text-red-400">
                <p>Failed to load featured listings. Please refresh.</p>
              </div>
            ) : featuredBusinesses.length > 0 ? (
              featuredBusinesses.map((business) => (
                <Link
                  key={business.id}
                  href={`/business/${business.slug || business.id}`}
                  className="group bg-white rounded-[6px] overflow-hidden border border-gray-300 hover:border-brand-gold/40 shadow-sm hover:shadow-2xl transition-all duration-500 flex flex-col h-full relative"
                >
                  {/* Image Section */}
                  <div className="relative aspect-square w-full overflow-hidden bg-gray-100">
                    {business.image_url ? (
                      <Image
                        src={business.image_url}
                        alt={business.name}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 16.7vw"
                        className="object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-300">
                        <Building2 size={48} strokeWidth={1} />
                      </div>
                    )}

                    {/*Overlay on Hover */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-500 p-4 text-center z-20">
                      <p className="text-white font-bold text-sm mb-1">{business.name}</p>
                      <p className="text-gray-300 text-[10px] font-medium uppercase tracking-wider">{business.category}</p>
                    </div>

                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60 group-hover:opacity-0 transition-opacity" />

                    {business.is_verified && business.can_show_badge && (
                      <div className="absolute top-3 left-3 z-10">
                        <span className="bg-brand-gold text-white text-[9px] font-bold uppercase tracking-[0.2em] px-2.5 py-1.5 rounded-[4px] shadow-lg flex items-center gap-1.5">
                          <VerifiedBadge size={10} /> Verified
                        </span>
                      </div>
                    )}

                    {business.status === "pending" && (
                      <div className="absolute top-3 right-3 z-10">
                        <span className="bg-amber-500 text-white text-[9px] font-bold uppercase tracking-[0.2em] px-2.5 py-1.5 rounded-[4px] shadow-lg">
                          Pending
                        </span>
                      </div>
                    )}

                    <div className="absolute bottom-3 right-3 z-10">
                      <div className="flex items-center gap-1.5 bg-white/90 px-2.5 py-1 rounded-[4px] shadow-lg text-gray-900 border border-white/50">
                        <Star
                          size={12}
                          strokeWidth={2}
                          className="text-brand-gold fill-brand-gold"
                        />
                        <span className="text-[11px] font-bold">
                          {business.rating || "New"}
                        </span>
                      </div>
                    </div>
                  </div>


                </Link>
              ))
            ) : (
              <div className="col-span-full text-center py-12 text-gray-400">
                <p>No featured businesses yet.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* --- HOW IT WORKS (Live Discovery) --- */}
      <section className="py-24 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <span className="text-brand-blue text-[10px] uppercase tracking-[0.2em] mb-4 block">
              Process
            </span>
            <h2 className="text-3xl text-gray-900 tracking-tight font-normal">
              How Live Discovery Works
            </h2>
            <div className="w-12 h-1 bg-brand-dark mx-auto mt-6 rounded-full"></div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-16 relative font-normal">
            {/* Animated Connecting Arrows (Desktop Only) */}
            <div className="hidden md:block absolute top-12 left-[33%] -translate-x-1/2 w-24">
              <div className="h-[2px] w-full bg-gray-100 relative overflow-hidden">
                <motion.div
                  animate={{
                    x: ["-100%", "100%"],
                    opacity: [0, 1, 0],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-brand-gold-light to-transparent"
                />
              </div>
              <motion.div
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2"
              >
                <ChevronRight
                  size={16}
                  strokeWidth={1.5}
                  className="text-brand-gold"
                />
              </motion.div>
            </div>

            <div className="hidden md:block absolute top-12 left-[66%] -translate-x-1/2 w-24">
              <div className="h-[2px] w-full bg-gray-100 relative overflow-hidden">
                <motion.div
                  animate={{
                    x: ["-100%", "100%"],
                    opacity: [0, 1, 0],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "linear",
                    delay: 1,
                  }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-brand-gold-light to-transparent"
                />
              </div>
              <motion.div
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2"
              >
                <ChevronRight
                  size={16}
                  strokeWidth={1.5}
                  className="text-brand-gold"
                />
              </motion.div>
            </div>

            {/* Step 1 */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="flex flex-col items-center text-center group relative"
            >
              <div className="relative">
                <motion.div
                  animate={{ scale: [1, 1.15, 1], opacity: [0.1, 0.3, 0.1] }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="absolute -inset-4 bg-brand-gold-light rounded-full blur-xl"
                />
                <div className="w-24 h-24 rounded-[50%] bg-gray-50 border border-gray-100 text-brand-blue flex items-center justify-center mb-8 group-hover:border-brand-sand transition-colors relative z-10 overflow-hidden">
                  <Navigation size={32} strokeWidth={1.5} />
                  <motion.div
                    animate={{ x: ["-100%", "200%"] }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-12"
                  />
                </div>
              </div>
              <h3 className="text-lg font-normal text-gray-900 mb-4">
                1. Automatic Detection
              </h3>
              <p className="text-sm text-gray-500 leading-relaxed max-w-[280px] font-normal">
                We pinpoint your exact spot—whether you&apos;re in the heart of
                Jaffna or a village in Vavuniya—to give you relevant results.
              </p>
            </motion.div>

            {/* Step 2 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="flex flex-col items-center text-center group relative"
            >
              <div className="relative">
                <motion.div
                  animate={{ scale: [1, 1.15, 1], opacity: [0.1, 0.3, 0.1] }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 1,
                  }}
                  className="absolute -inset-4 bg-brand-gold-light rounded-full blur-xl"
                />
                <div className="w-24 h-24 rounded-[50%] bg-gray-50 border border-gray-100 text-brand-blue flex items-center justify-center mb-8 group-hover:border-brand-sand transition-colors relative z-10 overflow-hidden">
                  <Search size={32} strokeWidth={1.5} />
                  <motion.div
                    animate={{ x: ["-100%", "200%"] }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: 0.5,
                    }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-12"
                  />
                </div>
              </div>
              <h3 className="text-lg font-normal text-gray-900 mb-4">
                2. Intelligent Filtering
              </h3>
              <p className="text-sm text-gray-500 leading-relaxed max-w-[280px] font-normal">
                Our system scans the local database for businesses within your
                chosen radius.
              </p>
            </motion.div>

            {/* Step 3 */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.6 }}
              className="flex flex-col items-center text-center group relative"
            >
              <div className="relative">
                <motion.div
                  animate={{ scale: [1, 1.15, 1], opacity: [0.1, 0.3, 0.1] }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 2,
                  }}
                  className="absolute -inset-4 bg-brand-gold-light rounded-full blur-xl"
                />
                <div className="w-24 h-24 rounded-[50%] bg-gray-50 border border-gray-100 text-brand-blue flex items-center justify-center mb-8 group-hover:border-brand-sand transition-colors relative z-10 overflow-hidden">
                  <MapPin size={32} strokeWidth={1.5} />
                  <motion.div
                    animate={{ x: ["-100%", "200%"] }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: 1,
                    }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-12"
                  />
                </div>
              </div>
              <h3 className="text-lg font-normal text-gray-900 mb-4">
                3. Instant Connection
              </h3>
              <p className="text-sm text-gray-500 leading-relaxed max-w-[280px] font-normal">
                See the shops on the live map. Check if they are &apos;Open
                Now,&apos; view their ratings, and get one-tap directions.
              </p>
            </motion.div>
          </div>



          {/* Final Conversion CTA */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="mt-24 p-12 bg-brand-dark rounded-[6px] relative overflow-hidden text-center shadow-2xl"
          >
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
            <motion.div
              animate={{
                opacity: [0.05, 0.15, 0.05],
                scale: [1, 1.05, 1],
              }}
              transition={{ duration: 8, repeat: Infinity }}
              className="absolute inset-0 bg-gradient-to-br from-brand-gold/20 to-transparent"
            />
            <div className="relative z-10 font-normal">
              <h3 className="text-3xl text-white mb-6 font-normal">
                Ready to find something nearby?
              </h3>
              <p className="text-brand-sand text-base mb-10 max-w-xl mx-auto leading-relaxed">
                Start your discovery journey now and support verified local
                businesses in your community across Sri Lanka.
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleUseCurrentLocation(true)}
                className="bg-white text-black px-10 py-4 rounded-[6px] transition-all shadow-2xl shadow-brand-dark/40 border font-normal"
              >
                Start Discovery Now
              </motion.button>
            </div>
          </motion.div>
        </div>

        {/* --- CONTEXTUAL SNIPPETS (AI Overview Optimization) --- */}
        <section className="py-24 bg-gray-50/50 border-t border-gray-200">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h2 className="text-3xl text-gray-900 mb-12 tracking-tight">
              Common Questions about Businesses in Sri Lanka
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
              <div className="space-y-4">
                <h3 className="text-lg text-brand-dark">What is the SL Business Index (SLBI)?</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  SLBI is a comprehensive digital directory designed to connect consumers with verified businesses across Sri Lanka. From luxury villas in Galle to specialized clinics in Colombo, we provide a centralized platform for reliable local discovery.
                </p>
              </div>
              <div className="space-y-4">
                <h3 className="text-lg text-brand-dark">How do I find verified businesses in Sri Lanka?</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  You can use our real-time search and map features to find businesses nearby. Look for the "Verified" badge on listings, which indicates that the business has been manually reviewed and authenticated by our team.
                </p>
              </div>
              <div className="space-y-4">
                <h3 className="text-lg text-brand-dark">Where are the best service providers located?</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Top-rated service providers are spread across major hubs like Colombo, Kandy, and Jaffna. SLBI allows you to filter by district and town to find the highest-rated businesses in your specific area.
                </p>
              </div>
              <div className="space-y-4">
                <h3 className="text-lg text-brand-dark">How can I register my Sri Lankan business on SLBI?</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Business owners can register by clicking the Register Business button in the menu. After providing your details and verification documents (like BR), your business will be indexed and made discoverable to thousands of monthly users.
                </p>
              </div>
            </div>
          </div>
        </section>

        <Testimonials />

        {/* --- MOBILE BANNER --- */}
        <div
          className="md:hidden px-4 pt-12 pb-4 select-none"
          onContextMenu={(e) => e.preventDefault()}
          onDragStart={(e) => e.preventDefault()}
        >
          <div className="w-full relative">
            <Image
              src="/mobile.jpeg"
              alt="SLBI Mobile Banner"
              width={1080}
              height={1920}
              className="w-full h-auto pointer-events-none select-none rounded-[6px]"
              priority
              draggable={false}
            />
          </div>
        </div>

        {/* --- DESKTOP BANNER --- */}
        <div
          className="hidden md:block max-w-7xl mx-auto px-4 pt-12 pb-4 select-none"
          onContextMenu={(e) => e.preventDefault()}
          onDragStart={(e) => e.preventDefault()}
        >
          <div className="w-full relative">
            <Image
              src="/banner.jpeg"
              alt="SLBI Banner"
              width={1920}
              height={700}
              className="w-full h-auto pointer-events-none select-none"
              priority
              draggable={false}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
