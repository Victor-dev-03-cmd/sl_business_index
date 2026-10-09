"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, ChevronRight, Building2, Star, Tags } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { cn, expandSearchQuery } from "@/lib/utils";
import { supabase } from "@/lib/supabaseClient";
import { AnimatePresence, motion } from "framer-motion";
import Fuse from "fuse.js";
import VoiceSearch from "./VoiceSearch";
import VerifiedBadge from "./VerifiedBadge";
import { SL_TOWNS, Town } from "@/lib/towns";

const sriLankanDistricts = [
  "Ampara", "Anuradhapura", "Badulla", "Batticaloa", "Colombo", "Galle", "Gampaha",
  "Hambantota", "Jaffna", "Kalutara", "Kandy", "Kegalle", "Kilinochchi", "Kurunegala",
  "Mannar", "Matale", "Matara", "Monaragala", "Mullaitivu", "Nuwara Eliya",
  "Polonnaruwa", "Puttalam", "Ratnapura", "Trincomalee", "Vavuniya",
];

interface HeroSearchProps {
  categories: any[];
  featuredBusinesses: any[];
  userCoords: { lat: number; lng: number } | null;
  isFetchingLocation: boolean;
  handleUseCurrentLocation: (autoSearch?: boolean) => void;
  onFocusChange?: (focused: boolean) => void;
}

export default function HeroSearch({
  categories,
  featuredBusinesses,
  userCoords,
  isFetchingLocation,
  handleUseCurrentLocation,
  onFocusChange,
}: HeroSearchProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [bizSuggestions, setBizSuggestions] = useState<any[]>([]);
  const [categorySuggestions, setCategorySuggestions] = useState<any[]>([]);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);

  const searchBarRef = useRef<HTMLFormElement>(null);
  const latestFetchId = useRef(0);

  // Fuse.js instance — rebuilt only when categories list changes
  const fuse = useMemo(
    () =>
      new Fuse(categories, {
        keys: ["name"],
        threshold: 0.35,
        minMatchCharLength: 1,
        ignoreLocation: true,
      }),
    [categories]
  );

  useEffect(() => {
    onFocusChange?.(isSearchFocused);
  }, [isSearchFocused, onFocusChange]);

  // Category filter — Fuse.js fuzzy match, instant client-side
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setCategorySuggestions([]);
      return;
    }
    const results = fuse.search(q, { limit: 5 });
    setCategorySuggestions(results.map((r) => r.item));
  }, [searchQuery, fuse]);

  // Business suggestions — debounced RPC at 150 ms, cancels stale responses
  useEffect(() => {
    const q = searchQuery.trim();

    if (!q) {
      setBizSuggestions(featuredBusinesses.slice(0, 4));
      setIsFetchingSuggestions(false);
      return;
    }

    setIsFetchingSuggestions(true);

    const fetchId = ++latestFetchId.current;
    const timer = setTimeout(async () => {
      try {
        const { data, error } = await supabase.rpc("get_global_search_suggestions", {
          search_query: q,
          suggestion_limit: 5,
        });
        if (fetchId !== latestFetchId.current) return;
        if (error) throw error;
        setBizSuggestions(data ?? []);
      } catch (err) {
        if (fetchId !== latestFetchId.current) return;
        console.error("Error fetching suggestions:", err);
      } finally {
        if (fetchId === latestFetchId.current) setIsFetchingSuggestions(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [searchQuery, featuredBusinesses]);

  const handleSearch = (query?: string) => {
    const finalQuery = query || searchQuery;
    let lowerQuery = finalQuery.toLowerCase().trim();
    let finalLat = "";
    let finalLng = "";
    let extractedTown: Town | null = null;
    let finalDistrict = "";
    let finalSearchMode: "location" | "nearby" | null = null;

    for (const town of SL_TOWNS) {
      const townName = town.name.toLowerCase();
      const patterns = [` in ${townName}`, ` at ${townName}`, ` near ${townName}`, `${townName} `, ` ${townName}`];
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

    if (!finalLat) {
      for (const district of sriLankanDistricts) {
        const dLower = district.toLowerCase();
        const patterns = [` in ${dLower}`, ` at ${dLower}`, ` near ${dLower}`, `${dLower} `, ` ${dLower}`];
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

    if (!finalLat && !finalDistrict && !finalSearchMode) {
      if (!userCoords && !searchQuery.trim()) {
        handleUseCurrentLocation(true);
        return;
      }
      if (userCoords) finalSearchMode = "nearby";
    }

    const searchParams = new URLSearchParams();
    searchParams.set("q", expandSearchQuery(lowerQuery || searchQuery));

    if (finalLat && finalLng) {
      searchParams.set("lat", finalLat);
      searchParams.set("lng", finalLng);
      searchParams.set("radius", "3000");
    } else if ((finalSearchMode === "nearby" || (!finalDistrict && userCoords)) && userCoords) {
      searchParams.set("lat", userCoords.lat.toString());
      searchParams.set("lng", userCoords.lng.toString());
      searchParams.set("radius", "5000");
    } else if (finalDistrict) {
      searchParams.set("district", finalDistrict);
    }

    router.push(`/nearby?${searchParams.toString()}`);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch();
  };

  const IconComponent = ({ name, className }: { name: string | null; className?: string }) => {
    if (!name) return <Tags className={className} />;
    const Icon = (LucideIcons as any)[name];
    return Icon ? <Icon className={className} /> : <Tags className={className} />;
  };

  const showDropdown =
    isSearchFocused &&
    (bizSuggestions.length > 0 || categorySuggestions.length > 0 || isFetchingSuggestions);

  return (
    <div className="relative max-w-2xl mx-auto">
      {/* Main Search Input */}
      <form
        onSubmit={handleSubmit}
        ref={searchBarRef}
        className="bg-white rounded-[8px] shadow-xl shadow-black/10 border border-white/60 overflow-visible"
      >
        <div className="flex items-center px-4 py-2 md:px-5 md:py-2.5 bg-white rounded-[8px] gap-2 md:gap-3 min-h-[48px]">
          <Search className="text-gray-400 shrink-0" size={20} strokeWidth={1.5} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
            placeholder="Service or Business… (e.g. Hospital in Colombo)"
            className="flex-1 min-w-0 bg-transparent outline-none text-gray-700 text-sm md:text-base placeholder:text-gray-400 font-normal"
          />
          {searchQuery && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                setSearchQuery("");
              }}
              className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors text-base leading-none"
            >
              ✕
            </button>
          )}
          <div className="w-[1px] h-6 bg-gray-200 mx-1 shrink-0" />
          <VoiceSearch
            onResult={(text) => {
              setSearchQuery(text);
              handleSearch(text);
            }}
            className="shrink-0"
          />
          <button type="submit" className="hidden">Search</button>
        </div>
      </form>

      {/* Suggestions dropdown */}
      <AnimatePresence>
        {showDropdown && (
          <motion.div
            key="suggestions"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: [0.2, 0, 0, 1] }}
            className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-xl rounded-xl shadow-2xl shadow-black/15 border border-gray-200/80 overflow-hidden text-left"
            style={{ zIndex: 9999, maxHeight: "65dvh", overflowY: "auto" }}
          >
            {/* Loading indicator */}
            {isFetchingSuggestions && (
              <div className="h-[2px] w-full bg-gray-100 overflow-hidden">
                <motion.div
                  className="h-full bg-brand-blue rounded-full"
                  initial={{ x: "-100%" }}
                  animate={{ x: "100%" }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  style={{ width: "40%" }}
                />
              </div>
            )}

            {/* Categories */}
            {categorySuggestions.length > 0 && (
              <div className="border-b border-gray-100">
                <div className="px-4 pt-3 pb-1.5">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">
                    Categories
                  </span>
                </div>
                {categorySuggestions.map((cat) => (
                  <button
                    key={cat.id}
                    onMouseDown={() => handleCategoryClick(cat.name)}
                    className="w-full px-4 py-2.5 hover:bg-gray-50 active:bg-gray-100 flex items-center gap-3 transition-colors border-b border-gray-50 last:border-0"
                  >
                    <div className="w-8 h-8 rounded-lg bg-brand-gold/10 flex items-center justify-center shrink-0 border border-brand-gold/15">
                      {cat.image_url ? (
                        <img src={cat.image_url} alt={cat.name} className="w-4 h-4 object-contain" />
                      ) : (
                        <IconComponent name={cat.icon} className="w-4 h-4 text-brand-gold" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-medium text-gray-800 truncate">{cat.name}</p>
                    </div>
                    <ChevronRight size={13} className="text-gray-300 shrink-0" />
                  </button>
                ))}
              </div>
            )}

            {/* Businesses */}
            {bizSuggestions.length > 0 && (
              <div>
                <div className="px-4 pt-3 pb-1.5">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">
                    {searchQuery.trim() ? "Best Matches" : "Recommended for You"}
                  </span>
                </div>
                {bizSuggestions.map((biz) => (
                  <button
                    key={biz.id}
                    onMouseDown={() => router.push(`/business/${biz.slug || biz.id}`)}
                    className="w-full px-4 py-2.5 hover:bg-gray-50 active:bg-gray-100 flex items-center gap-3 transition-colors border-b border-gray-50 last:border-0"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gray-100 shrink-0 overflow-hidden border border-gray-200">
                      {biz.logo_url || biz.image_url ? (
                        <img
                          src={biz.logo_url || biz.image_url}
                          alt={biz.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <Building2 size={16} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-semibold text-gray-800 truncate leading-tight flex items-center gap-1.5">
                        {biz.name}
                        {biz.is_verified && <VerifiedBadge size={10} />}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-[10px] font-medium text-brand-blue bg-blue-50 px-1.5 py-0.5 rounded-full shrink-0">
                          {biz.category}
                        </span>
                        {biz.address && (
                          <span className="text-[10px] text-gray-400 truncate">
                            · {biz.address.split(",").pop()?.trim()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 flex items-center gap-1.5">
                      {biz.rating ? (
                        <div className="flex items-center gap-0.5">
                          <Star size={10} className="text-amber-400 fill-amber-400" />
                          <span className="text-xs font-semibold text-gray-600">{biz.rating}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
                          New
                        </span>
                      )}
                      <ChevronRight size={13} className="text-gray-300" />
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Footer — search all */}
            {searchQuery.trim() && (
              <div className="border-t border-gray-100 px-4 py-2.5 bg-gray-50/50">
                <button
                  onMouseDown={() => handleSearch()}
                  className="w-full flex items-center gap-2 text-sm font-medium text-brand-dark hover:text-brand-blue transition-colors group"
                >
                  <Search
                    size={13}
                    className="shrink-0 text-gray-400 group-hover:text-brand-blue transition-colors"
                  />
                  Search all results for&nbsp;
                  <span className="font-semibold truncate max-w-[180px]">
                    &ldquo;{searchQuery}&rdquo;
                  </span>
                  <ChevronRight size={13} className="ml-auto text-gray-300 shrink-0" />
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Buttons */}
      <div className="flex flex-row items-center justify-center gap-2 px-1 mt-4">
        <button
          onClick={() => handleUseCurrentLocation(true)}
          disabled={isFetchingLocation}
          className="flex items-center justify-center gap-2 flex-1 md:flex-none md:w-auto px-4 md:px-6 py-3 text-gray-700 bg-gray-50 hover:bg-brand-blue hover:text-white border border-brand-blue font-normal transition-all disabled:opacity-50 text-sm md:text-base rounded-[6px]"
        >
          <LucideIcons.Navigation
            size={16}
            strokeWidth={1.5}
            className={cn("text-brand-blue", isFetchingLocation && "animate-pulse")}
          />
          <span className="whitespace-nowrap">
            {isFetchingLocation ? "Locating..." : "Near me"}
          </span>
        </button>
        <button
          onClick={() => handleSearch()}
          className="flex-1 md:flex-none md:w-auto bg-brand-blue hover:bg-brand-blue/90 text-white text-sm md:text-base font-normal px-6 md:px-12 py-3 shadow-lg shadow-brand-blue/20 transition-all rounded-[6px]"
        >
          Search
        </button>
      </div>
    </div>
  );
}
