"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { MorphingText } from "@/components/animate-ui/primitives/texts/morphing";
import { supabase } from "@/lib/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  MapPin,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Navigation,
  Check,
  LayoutGrid,
  Star,
  Phone,
  Clock,
  Tags,
  Building2,
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn, expandSearchQuery } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { SL_TOWNS, Town } from "@/lib/towns";
import VerifiedBadge from "./components/VerifiedBadge";
import Testimonials from "./components/Testimonials";
import VoiceSearch from "./components/VoiceSearch";
import { toast } from "sonner";
import Fuse from "fuse.js";

const sriLankanDistricts = [
  "Ampara",
  "Anuradhapura",
  "Badulla",
  "Batticaloa",
  "Colombo",
  "Galle",
  "Gampaha",
  "Hambantota",
  "Jaffna",
  "Kalutara",
  "Kandy",
  "Kegalle",
  "Kilinochchi",
  "Kurunegala",
  "Mannar",
  "Matale",
  "Matara",
  "Monaragala",
  "Mullaitivu",
  "Nuwara Eliya",
  "Polonnaruwa",
  "Puttalam",
  "Ratnapura",
  "Trincomalee",
  "Vavuniya",
];

const words = ["businesses", "Enterprises", "Owners"];

const districtCoordinates: Record<string, { lat: number; lng: number }> = {
  Ampara: { lat: 7.2912, lng: 81.6724 },
  Anuradhapura: { lat: 8.3122, lng: 80.4131 },
  Badulla: { lat: 6.9899, lng: 81.0569 },
  Batticaloa: { lat: 7.7102, lng: 81.6924 },
  Colombo: { lat: 6.9271, lng: 79.8612 },
  Galle: { lat: 6.0535, lng: 80.221 },
  Gampaha: { lat: 7.0873, lng: 79.9925 },
  Hambantota: { lat: 6.1429, lng: 81.1212 },
  Jaffna: { lat: 9.6615, lng: 80.007 },
  Kalutara: { lat: 6.5854, lng: 79.9607 },
  Kandy: { lat: 7.2906, lng: 80.6337 },
  Kegalle: { lat: 7.2513, lng: 80.3464 },
  Kilinochchi: { lat: 9.3872, lng: 80.3948 },
  Kurunegala: { lat: 7.4863, lng: 80.3647 },
  Mannar: { lat: 8.981, lng: 79.9044 },
  Matale: { lat: 7.4675, lng: 80.6234 },
  Matara: { lat: 5.9496, lng: 80.5469 },
  Monaragala: { lat: 6.8718, lng: 81.3496 },
  Mullaitivu: { lat: 9.2671, lng: 80.8144 },
  "Nuwara Eliya": { lat: 6.9697, lng: 80.7672 },
  Polonnaruwa: { lat: 7.9403, lng: 81.0188 },
  Puttalam: { lat: 8.033, lng: 79.8259 },
  Ratnapura: { lat: 6.6828, lng: 80.3992 },
  Trincomalee: { lat: 8.5874, lng: 81.2152 },
  Vavuniya: { lat: 8.7514, lng: 80.4971 },
};

export default function HomePage() {
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [businessSuggestions, setBusinessSuggestions] = useState<any[]>([]);
  const [fuzzyBusinessSuggestions, setFuzzyBusinessSuggestions] = useState<
    any[]
  >([]);
  const [categorySuggestions, setCategorySuggestions] = useState<any[]>([]);
  const [geoData, setGeoData] = useState<any[]>([]);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [searchMode, setSearchMode] = useState<"location" | "nearby" | null>(
    null,
  );
  const [userCoords, setUserCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const searchBarRef = useRef<HTMLDivElement>(null);
  const [panelPos, setPanelPos] = useState<{
    top: number;
    left: number;
    width: number;
  }>({ top: 0, left: 0, width: 0 });
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [showAllCategories, setShowAllCategories] = useState(false);

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
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

  const handleVoiceResult = (text: string) => {
    setSearchQuery(text);
    handleSearch(text);
  };

  const {
    data: featuredBusinesses = [],
    isLoading: featuredLoading,
    error: featuredError,
  } = useQuery({
    queryKey: ["featured-businesses-home"],
    queryFn: async () => {
      // Fetch from featured_listings table which references businesses
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

      // Flatten the data and ensure we only have businesses that actually exist and are approved
      return (data as any[])
        .map((item) => item.businesses)
        .filter((b) => b && b.status === "approved") as any[];
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    fetch("/srilanka.geojson")
      .then((res) => res.json())
      .then((data) => {
        setGeoData(data.features || []);
      })
      .catch((err) => console.error("Error loading GeoJSON:", err));
  }, []);

  const fuse = React.useMemo(
    () =>
      new Fuse(geoData, {
        keys: [
          "properties.name",
          "properties.category",
          "properties.location",
          "properties.address",
        ],
        threshold: 0.3,
        distance: 100,
      }),
    [geoData],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  /* On mobile: when the keyboard opens it shrinks the visible viewport.
     Scroll the search bar just below the sticky navbar so it stays visible. */
  const handleSearchFocus = () => {
    setIsSearchFocused(true);

    if (typeof window === "undefined" || window.innerWidth >= 768) return;

    setTimeout(() => {
      if (!searchBarRef.current) return;
      const rect = searchBarRef.current.getBoundingClientRect();
      const navbarH = 80; // sticky navbar height (h-20)
      const gap = 12;
      const offset = rect.top - navbarH - gap;
      if (Math.abs(offset) > 4) {
        window.scrollBy({ top: offset, behavior: "smooth" });
      }
    }, 80);
  };

  /* Track search bar position so the fixed suggestions panel stays aligned */
  useEffect(() => {
    const updatePos = () => {
      if (searchBarRef.current) {
        const r = searchBarRef.current.getBoundingClientRect();
        setPanelPos({ top: r.bottom + 8, left: r.left, width: r.width });
      }
    };
    if (isSearchFocused) updatePos();
    window.addEventListener("resize", updatePos);
    window.addEventListener("scroll", updatePos, { passive: true });
    return () => {
      window.removeEventListener("resize", updatePos);
      window.removeEventListener("scroll", updatePos);
    };
  }, [isSearchFocused]);

  useEffect(() => {
    // 1. Immediate Local Search (GeoJSON)
    if (searchQuery.trim().length > 0) {
      const geoResults = fuse.search(searchQuery).slice(0, 4);
      setSuggestions(geoResults.map((r) => r.item));

      // Update category suggestions
      const query = searchQuery.toLowerCase();
      const filteredCats = categories
        .filter(
          (cat: any) =>
            cat.name.toLowerCase().includes(query) ||
            cat.keywords?.some((kw: string) => kw.toLowerCase().includes(query)),
        )
        .slice(0, 5);
      setCategorySuggestions(filteredCats);
    } else {
      setSuggestions([]);
      setCategorySuggestions([]);
    }

    // 2. Database Fetch (Debounced)
    if (debouncedSearchQuery.trim().length > 0) {
      const fetchSuggestions = async () => {
        try {
          const { data, error } = await supabase.rpc(
            "get_global_search_suggestions",
            {
              search_query: debouncedSearchQuery,
              suggestion_limit: 5,
            },
          );
          if (error) throw error;
          if (data) {
            setFuzzyBusinessSuggestions(data);
            setBusinessSuggestions(data);
          }
        } catch (err) {
          console.error("Error fetching suggestions:", err);
        }
      };
      fetchSuggestions();
    } else {
      // Auto-show featured businesses when focused but empty
      setBusinessSuggestions(featuredBusinesses.slice(0, 4));
      setFuzzyBusinessSuggestions([]);
    }
  }, [debouncedSearchQuery, searchQuery, fuse, userCoords, featuredBusinesses]);

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

  useEffect(() => {
    let animationId: number;
    const scrollStep = 0.3; // Slower speed (was 0.5)

    const autoScroll = () => {
      if (scrollContainerRef.current && !isPaused && !isDragging) {
        const {
          scrollLeft: sLeft,
          scrollWidth,
          clientWidth,
        } = scrollContainerRef.current;

        // If we reached the end, reset to start or stop (resetting to start for continuous)
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
      const scrollAmount = 600; // Increased for two-row scrolling
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
    const walk = (x - startX) * 2; // Scroll speed multiplier
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
          setSearchMode("nearby");
          setSelectedLocation("Current Location");
          setIsFetchingLocation(false);

          if (autoSearch) {
            const finalQuery = [searchQuery, selectedCategory]
              .filter(Boolean)
              .join(" ");
            const params = new URLSearchParams({
              lat: coords.lat.toString(),
              lng: coords.lng.toString(),
              q: finalQuery,
              radius: "5000",
            });
            router.push(`/nearby?${params.toString()}`);
          }
        },
        (err) => {
          console.error("Error getting location: ", err.message);
          toast.error("Could not get your location. Please grant permission.");
          setIsFetchingLocation(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        },
      );
    } else {
      toast.error("Geolocation is not supported by this browser.");
    }
  };

  const handleSearch = (query?: string) => {
    let finalQuery = query ?? searchQuery;
    let finalDistrict = selectedLocation;
    let finalCategory = selectedCategory;
    let finalSearchMode = searchMode;

    // --- SMART PARSING ---
    let lowerQuery = (query ?? searchQuery).toLowerCase().trim();
    let finalLat = "";
    let finalLng = "";
    let extractedTown: Town | null = null;

    // Detect Town from search string (High Priority)
    // We check for "in [town]" or just "[town]"
    for (const town of SL_TOWNS) {
      const townName = town.name.toLowerCase();
      // Match "in Colombo", "at Colombo", or just "Colombo" at the end/start
      const patterns = [
        ` in ${townName}`,
        ` at ${townName}`,
        ` near ${townName}`,
        `${townName} `,
        ` ${townName}`,
      ];

      if (lowerQuery === townName) {
        extractedTown = town;
        lowerQuery = "";
        break;
      }

      let found = false;
      for (const pattern of patterns) {
        if (lowerQuery.includes(pattern)) {
          extractedTown = town;
          lowerQuery = lowerQuery.replace(pattern, " ").trim();
          found = true;
          break;
        }
      }
      if (found) break;
    }

    if (extractedTown) {
      finalLat = extractedTown.lat.toString();
      finalLng = extractedTown.lon.toString();
      finalSearchMode = "nearby";
    }

    // Detect District from search string (if no town found)
    if (!finalLat) {
      for (const district of sriLankanDistricts) {
        const dLower = district.toLowerCase();
        const patterns = [
          ` in ${dLower}`,
          ` at ${dLower}`,
          ` near ${dLower}`,
          `${dLower} `,
          ` ${dLower}`,
        ];

        if (lowerQuery === dLower) {
          finalDistrict = district;
          finalSearchMode = "location";
          lowerQuery = "";
          break;
        }

        let found = false;
        for (const pattern of patterns) {
          if (lowerQuery.includes(pattern)) {
            finalDistrict = district;
            finalSearchMode = "location";
            lowerQuery = lowerQuery.replace(pattern, " ").trim();
            found = true;
            break;
          }
        }
        if (found) break;
      }
    }

    // Default to Current Location if no explicit location found and query is not empty
    if (!finalLat && !finalDistrict && !finalSearchMode) {
      if (!userCoords && !searchQuery.trim()) {
        handleUseCurrentLocation(true);
        return;
      }
      // If we have no location but have a query, search near current location if available
      if (userCoords) {
        finalSearchMode = "nearby";
      }
    }

    const searchParams = new URLSearchParams();
    searchParams.set("q", expandSearchQuery(lowerQuery || searchQuery));
    if (selectedCategory) searchParams.set("category", selectedCategory);

    if (finalLat && finalLng) {
      searchParams.set("lat", finalLat);
      searchParams.set("lng", finalLng);
      searchParams.set("radius", "3000");
    } else if (
      (finalSearchMode === "nearby" || (!finalDistrict && userCoords)) &&
      userCoords
    ) {
      searchParams.set("lat", userCoords.lat.toString());
      searchParams.set("lng", userCoords.lng.toString());
      searchParams.set("radius", "5000");
    } else if (finalDistrict) {
      searchParams.set("district", finalDistrict);
    }

    router.push(`/nearby?${searchParams.toString()}`);
  };

  const handleSelectPlace = (feature: any) => {
    const { name } = feature.properties;
    const [lng, lat] = feature.geometry.coordinates;

    setSearchQuery(name);
    setSuggestions([]);

    const searchParams = new URLSearchParams();
    searchParams.set("q", name);
    searchParams.set("lat", lat.toString());
    searchParams.set("lng", lng.toString());
    searchParams.set("radius", "5000");
    router.push(`/nearby?${searchParams.toString()}`);
  };

  const handleCategoryClick = (categoryName: string) => {
    const params = new URLSearchParams();

    if (searchMode === "nearby" && userCoords) {
      params.set("lat", userCoords.lat.toString());
      params.set("lng", userCoords.lng.toString());
      params.set("radius", "5000");
    } else if (searchMode === "location" && selectedLocation) {
      params.set("district", selectedLocation);
    }

    params.set("q", categoryName);
    router.push(`/nearby?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-white font-normal">
      {/* --- HERO SECTION --- */}
      <section className="relative h-[78vh] flex items-center justify-center overflow-hidden bg-white">
        {/* Animated Blue Background Elements */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden ">
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              x: [0, 100, 0],
              y: [0, 50, 0],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "linear",
            }}
            className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-brand-blue/10 blur-[120px] rounded-full"
          />
          <motion.div
            animate={{
              scale: [1, 1.3, 1],
              x: [0, -120, 0],
              y: [0, -80, 0],
            }}
            transition={{
              duration: 25,
              repeat: Infinity,
              ease: "linear",
            }}
            className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-brand-blue/10 blur-[150px] rounded-full"
          />
        </div>

        {/* Glass Morphism Overlay */}
        <div className="absolute inset-0 bg-white/20 backdrop-blur-[100px] z-0 border-b border-gray-300" />

        <div className="relative z-10 max-w-5xl px-6 text-center">
          <span className="inline-block px-4 py-1.5 mb-6 text-[11px] md:text-[13px] tracking-[0.15em] uppercase text-brand-blue border border-gray-300 rounded">
            Sri Lanka Business Index
          </span>
          <h1 className="text-3xl md:text-7xl text-gray-900 mb-6 leading-tight tracking-tight">
            The Ultimate Directory for <br />
            <span className="text-brand-blue text-4xl md:text-7xl">Businesses in Sri Lanka (SLBI)</span>
          </h1>
          <p className="text-gray-600 text-base md:text-lg mb-10 max-w-xl mx-auto leading-relaxed">
            Explore verified local businesses, clinics, and luxury villas across Sri Lanka. Discover premium services and authentic island experiences through our directory.
          </p>

          {/* --- New Search Bar Design --- */}
          <div className="relative max-w-2xl mx-auto space-y-4">
            {/* Main Search Input */}
            <div
              ref={searchBarRef}
              className="bg-white rounded-[6px] shadow-lg border border-gray-300"
            >
              <div className="flex items-center px-5 py-4 bg-white rounded-[6px] gap-3">
                <Search
                  className="text-gray-400 shrink-0"
                  size={20}
                  strokeWidth={1.5}
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={handleSearchFocus}
                  onBlur={() =>
                    setTimeout(() => setIsSearchFocused(false), 200)
                  }
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Service or Business… (e.g. Hospital in Colombo)"
                  className="flex-1 min-w-0 bg-transparent outline-none text-gray-700 text-base placeholder:text-gray-400 font-normal"
                />
                {searchQuery && (
                  <button
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setSearchQuery("");
                    }}
                    className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    ✕
                  </button>
                )}
                <div className="w-[1px] h-6 bg-gray-200 mx-1 shrink-0" />
                <VoiceSearch onResult={handleVoiceResult} className="shrink-0" />
              </div>
            </div>

            {/* ── Fixed suggestions panel — escapes hero's overflow-hidden ── */}
            <AnimatePresence>
              {isSearchFocused &&
                (suggestions.length > 0 ||
                  businessSuggestions.length > 0 ||
                  fuzzyBusinessSuggestions.length > 0 ||
                  categorySuggestions.length > 0) &&
                panelPos.width > 0 && (
                  <motion.div
                    key="suggestions"
                    initial={{ opacity: 0, y: -6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.98 }}
                    transition={{ duration: 0.16, ease: "easeOut" }}
                    className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden text-left"
                    style={{
                      position: "fixed",
                      top: panelPos.top,
                      left: panelPos.left,
                      width: panelPos.width,
                      zIndex: 9999,
                      maxHeight: "65vh",
                      overflowY: "auto",
                    }}
                  >
                    {/* ── Categories section ── */}
                    {categorySuggestions.length > 0 && (
                      <div className="border-b border-gray-100 last:border-0">
                        <div className="px-4 pt-3 pb-2">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">
                            Categories
                          </span>
                        </div>
                        {categorySuggestions.map((cat) => (
                          <button
                            key={cat.id}
                            onMouseDown={() => handleCategoryClick(cat.name)}
                            className="w-full px-4 py-3 hover:bg-gray-50 active:bg-gray-100 flex items-center gap-3 transition-colors border-b border-gray-50 last:border-0"
                          >
                            <div className="w-9 h-9 rounded-xl bg-brand-gold/10 flex items-center justify-center shrink-0 border border-brand-gold/20">
                              {cat.image_url ? (
                                <img
                                  src={cat.image_url}
                                  alt={cat.name}
                                  className="w-5 h-5 object-contain"
                                />
                              ) : (
                                <IconComponent
                                  name={cat.icon}
                                  className="w-5 h-5 text-brand-gold"
                                />
                              )}
                            </div>
                            <div className="flex-1 min-w-0 text-left">
                              <p className="text-sm font-medium text-gray-800 truncate">
                                {cat.name}
                              </p>
                              {cat.keywords && cat.keywords.length > 0 && (
                                <p className="text-[10px] text-gray-400 mt-0.5 truncate">
                                  {cat.keywords.join(", ")}
                                </p>
                              )}
                            </div>
                            <ChevronRight
                              size={14}
                              className="text-gray-300 shrink-0"
                            />
                          </button>
                        ))}
                      </div>
                    )}

                    {/* ── Businesses section ── */}
                    {(fuzzyBusinessSuggestions.length > 0 ||
                      businessSuggestions.length > 0) && (
                      <div>
                        {/* Section header */}
                        <div className="flex items-center justify-between px-4 pt-3 pb-2">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">
                            {searchQuery.trim()
                              ? "Best Matches"
                              : "Recommended for You"}
                          </span>
                          <span className="text-[10px] text-gray-300">
                            {fuzzyBusinessSuggestions.length ||
                              businessSuggestions.length}{" "}
                            result
                            {(fuzzyBusinessSuggestions.length ||
                              businessSuggestions.length) !== 1
                              ? "s"
                              : ""}
                          </span>
                        </div>

                        {(fuzzyBusinessSuggestions.length > 0
                          ? fuzzyBusinessSuggestions
                          : businessSuggestions
                        ).map((biz) => (
                          <button
                            key={biz.id}
                            onMouseDown={() =>
                              router.push(`/business/${biz.slug || biz.id}`)
                            }
                            className="w-full px-4 py-3 hover:bg-gray-50 active:bg-gray-100 flex items-center gap-3 transition-colors border-b border-gray-50 last:border-0"
                          >
                            {/* Thumbnail */}
                            <div className="w-11 h-11 rounded-xl bg-gray-100 shrink-0 overflow-hidden border border-gray-200">
                              {biz.logo_url || biz.image_url ? (
                                <img
                                  src={biz.logo_url || biz.image_url}
                                  alt={biz.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-300">
                                  <Building2 size={18} />
                                </div>
                              )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0 text-left">
                              <p className="text-sm font-semibold text-gray-800 truncate leading-tight">
                                {biz.name}
                              </p>
                              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                <span className="text-[10px] font-medium text-brand-blue bg-blue-50 px-2 py-0.5 rounded-full shrink-0">
                                  {biz.category}
                                </span>
                                {biz.address && (
                                  <span className="text-[10px] text-gray-400 truncate">
                                    · {biz.address.split(",").pop()?.trim()}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Rating + arrow */}
                            <div className="shrink-0 flex items-center gap-2">
                              {biz.rating ? (
                                <div className="flex items-center gap-0.5">
                                  <Star
                                    size={11}
                                    className="text-amber-400 fill-amber-400"
                                  />
                                  <span className="text-xs font-semibold text-gray-600">
                                    {biz.rating}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
                                  New
                                </span>
                              )}
                              <ChevronRight
                                size={14}
                                className="text-gray-300"
                              />
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* ── Locations section ── */}
                    {suggestions.length > 0 && (
                      <div
                        className={cn(
                          (fuzzyBusinessSuggestions.length > 0 ||
                            businessSuggestions.length > 0) &&
                            "border-t border-gray-100",
                        )}
                      >
                        <div className="px-4 pt-3 pb-2">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">
                            Locations
                          </span>
                        </div>

                        {suggestions.map((feature, idx) => (
                          <button
                            key={feature.id || idx}
                            onMouseDown={() => handleSelectPlace(feature)}
                            className="w-full px-4 py-3 hover:bg-gray-50 active:bg-gray-100 flex items-center gap-3 transition-colors border-b border-gray-50 last:border-0"
                          >
                            <div className="w-9 h-9 rounded-full bg-brand-dark/8 flex items-center justify-center shrink-0">
                              <MapPin size={15} className="text-brand-dark" />
                            </div>
                            <div className="flex-1 min-w-0 text-left">
                              <p className="text-sm font-medium text-gray-800 truncate">
                                {feature.properties.name}
                              </p>
                              <p className="text-[10px] text-gray-400 mt-0.5">
                                {feature.properties.location ||
                                  feature.properties.city ||
                                  "Sri Lanka"}
                              </p>
                            </div>
                            <ChevronRight
                              size={14}
                              className="text-gray-300 shrink-0"
                            />
                          </button>
                        ))}
                      </div>
                    )}

                    {/* ── Footer: search all results ── */}
                    {searchQuery.trim() && (
                      <div className="border-t border-gray-100 px-4 py-3 bg-gray-50/50">
                        <button
                          onMouseDown={() => handleSearch()}
                          className="w-full flex items-center gap-2 text-sm font-medium text-brand-dark hover:text-brand-blue transition-colors group"
                        >
                          <Search
                            size={14}
                            className="shrink-0 text-gray-400 group-hover:text-brand-blue transition-colors"
                          />
                          Search all results for&nbsp;
                          <span className="font-semibold truncate max-w-[180px]">
                            &ldquo;{searchQuery}&rdquo;
                          </span>
                          <ChevronRight
                            size={14}
                            className="ml-auto text-gray-300 shrink-0"
                          />
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
            </AnimatePresence>

            {/* Location and Action Buttons */}
            <div className="flex flex-row items-center justify-center gap-2">
              <button
                onClick={() => handleUseCurrentLocation(true)}
                disabled={isFetchingLocation}
                className="flex items-center gap-2 w-1/2 sm:w-auto px-5 py-3 text-gray-700 bg-gray-50 hover:bg-brand-blue border border-gray-300 font-normal transition-all disabled:opacity-50 text-base rounded-[6px]"
              >
                <Navigation
                  size={16}
                  strokeWidth={1.5}
                  className={cn("text-brand-blue", isFetchingLocation && "animate-pulse")}
                />
                {isFetchingLocation ? "Locating..." : "Near me"}
              </button>

              <button
                onClick={() => handleSearch()}
                className="w-1/2 sm:w-auto bg-brand-blue hover:bg-brand-blue/90 text-white text-base font-normal px-10 py-3 shadow-lg shadow-brand-blue/10 transition-all rounded-[6px]"
              >
                Search
              </button>
            </div>
          </div>

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
              href="/categories"
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
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-500 backdrop-blur-[2px] p-4 text-center z-20">
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
                      <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-[4px] shadow-lg text-gray-900 border border-white/50">
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
          <Testimonials />
      </section>
    </div>
  );
}
