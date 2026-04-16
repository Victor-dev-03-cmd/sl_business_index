"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
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

export default function HomePage() {
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

  const { data: categories = EMPTY_ARRAY, isLoading: categoriesLoading } = useQuery({
    queryKey: ["categories-home"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
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
        .limit(10);

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
    }
  };

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
    if (navigator.geolocation) {
      setIsFetchingLocation(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
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
          console.error("Error getting location: ", err.message);
          setIsFetchingLocation(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        },
      );
    }
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

  return (
    <div className="min-h-[100dvh] bg-white font-normal">
      {/* --- HERO SECTION --- */}
      <section className="relative h-[78dvh] flex items-center justify-center z-20 bg-brand-dark">
        <div className="relative z-10 max-w-5xl px-6 py-12 text-center mx-4">
          <span className="inline-block px-4 py-1.5 mb-6 text-[11px] md:text-[13px] tracking-[0.15em] uppercase text-brand-sand border border-gray-300/20 rounded bg-white/5">
            Sri Lanka Business Index
          </span>
          <h1 className="text-3xl md:text-7xl text-white mb-6 leading-tight tracking-tight">
            The Ultimate Directory for <br />
            <span className="text-white text-4xl md:text-7xl">Businesses in Sri Lanka (SLBI)</span>
          </h1>
          <p className="text-brand-sand text-base md:text-lg mb-10 max-w-xl mx-auto leading-relaxed">
            Explore verified local businesses, clinics, and luxury villas across Sri Lanka. Discover premium services and authentic island experiences through our directory.
          </p>

          <HeroSearch
            categories={categories}
            featuredBusinesses={featuredBusinesses}
            userCoords={userCoords}
            isFetchingLocation={isFetchingLocation}
            handleUseCurrentLocation={handleUseCurrentLocation}
            onFocusChange={setIsSearchFocused}
          />

          {/* Overlay to close category dropdown */}
          {isCategoryOpen && (
            <div
              className="fixed inset-0 z-40 bg-transparent"
              onClick={() => setIsCategoryOpen(false)}
            />
          )}
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
      </section>

      {/* --- LISTINGS (4-Column Modern Grid) --- */}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {featuredLoading ? (
              [...Array(10)].map((_, i) => (
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
