"use client";

import React, { useState, useRef, useEffect, useMemo, useDeferredValue } from "react";
import { useRouter } from "next/navigation";
import { Search, ChevronRight, Building2, Star, Tags, MapPin, ChevronDown, Check, X } from "lucide-react";
import CategoryIcon from "./CategoryIcon";
import { cn, expandSearchQuery } from "@/lib/utils";
import { supabase } from "@/lib/supabaseClient";
import { motion } from "framer-motion";
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


type AreaMatch = { town?: Town; district?: string; remainingQuery: string };
const normalizePlace = (value: string) =>
  value.toLowerCase().replace(/[.,!?]+/g, " ").trim().replace(/\s+/g, " ");

// Build the lookup once at module load, rather than scanning SL_TOWNS on Search.
const TOWN_LOOKUP = new Map<string, Town>();
for (const town of SL_TOWNS) {
  const name = normalizePlace(town.name);
  if (!TOWN_LOOKUP.has(name)) TOWN_LOOKUP.set(name, town);
}
const DISTRICT_LOOKUP = new Map(sriLankanDistricts.map(name => [normalizePlace(name), name]));
const TOWN_SEARCH_INDEX = SL_TOWNS.map(town => ({
  town,
  text: `${town.name} ${town.district}`.toLowerCase(),
}));

function findAreaInQuery(input: string): AreaMatch | null {
  const parts = normalizePlace(input).split(" ").filter(Boolean);
  if (parts.length === 0) return null;
  // Longest place names first; bounded by input maxLength and place name length.
  for (let width = Math.min(5, parts.length); width >= 1; width--) {
    for (let i = 0; i + width <= parts.length; i++) {
      const candidate = parts.slice(i, i + width).join(" ");
      const town = TOWN_LOOKUP.get(candidate);
      const district = DISTRICT_LOOKUP.get(candidate);
      if (!town && !district) continue;
      const before = parts.slice(0, i);
      if (["in", "at", "near"].includes(before[before.length - 1])) before.pop();
      return { town, district, remainingQuery: [...before, ...parts.slice(i + width)].join(" ") };
    }
  }
  return null;
}

interface HeroSearchProps {
  categories: any[];
  featuredBusinesses: any[];
  userCoords: { lat: number; lng: number } | null;
  isFetchingLocation: boolean;
  handleUseCurrentLocation: (autoSearch?: boolean) => void;
}

export default function HeroSearch({
  categories,
  featuredBusinesses,
  userCoords,
  isFetchingLocation,
  handleUseCurrentLocation,
}: HeroSearchProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [bizSuggestions, setBizSuggestions] = useState<any[]>([]);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const [areaOpen, setAreaOpen] = useState(false);
  const [areaQuery, setAreaQuery] = useState("");
  const [selectedArea, setSelectedArea] = useState<{ label: string; district?: string; town?: Town } | null>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const searchRootRef = useRef<HTMLDivElement>(null);

  const searchBarRef = useRef<HTMLFormElement>(null);
  const suggestionCache = useRef<Map<string, any[]>>(new Map());
  const deferredAreaQuery = useDeferredValue(areaQuery);

  // The location selector uses existing Sri Lankan town coordinates; no invented postal codes.
  const areaOptions = useMemo<Array<{ label: string; district?: string; town?: Town }>>(() => {
    const query = deferredAreaQuery.trim().toLowerCase();
    if (!query) return sriLankanDistricts.slice(0, 8).map(district => ({ label: district, district }));
    const matchingDistricts = sriLankanDistricts.filter(d => d.toLowerCase().includes(query)).slice(0, 5).map(district => ({ label: district, district }));
    const matchingTowns: Array<{ label: string; town: Town }> = [];
    for (const row of TOWN_SEARCH_INDEX) {
      if (row.text.includes(query)) {
        matchingTowns.push({ label: `${row.town.name}, ${row.town.district}`, town: row.town });
        if (matchingTowns.length === 12) break;
      }
    }
    return [...matchingDistricts, ...matchingTowns];
  }, [deferredAreaQuery]);

  useEffect(() => {
    if (!areaOpen) return;
    const onOutsideClick = (event: MouseEvent) => {
      if (areaRef.current && !areaRef.current.contains(event.target as Node)) setAreaOpen(false);
    };
    document.addEventListener("mousedown", onOutsideClick);
    return () => document.removeEventListener("mousedown", onOutsideClick);
  }, [areaOpen]);

  // Close search suggestions on outside pointer interaction (without locking page scroll).
  useEffect(() => {
    if (!isSearchFocused) return;
    const closeOutside = (event: PointerEvent) => {
      if (searchRootRef.current && !searchRootRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [isSearchFocused]);

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

  // Derive category suggestions without scheduling a state update on every keystroke.
  const categorySuggestions = useMemo(() => {
    const query = searchQuery.trim();
    if (!isSearchFocused || areaOpen || query.length < 2) return [];
    return fuse.search(query, { limit: 5 }).map((result) => result.item);
  }, [searchQuery, fuse, isSearchFocused, areaOpen]);

  // Autocomplete runs only while actively searching, after two characters.
  // Cancel stale requests and reuse recent results to reduce database work.
  useEffect(() => {
    const query = searchQuery.trim();
    if (!isSearchFocused || areaOpen || query.length < 2) {
      setBizSuggestions([]);
      setIsFetchingSuggestions(false);
      return;
    }
    const key = query.toLowerCase();
    const cached = suggestionCache.current.get(key);
    if (cached) {
      setBizSuggestions(cached);
      setIsFetchingSuggestions(false);
      return;
    }

    let active = true;
    const controller = new AbortController();
    setIsFetchingSuggestions(true);
    const timer = window.setTimeout(async () => {
      try {
        const { data, error } = await supabase.rpc("get_global_search_suggestions", {
          search_query: query,
          suggestion_limit: 5,
        }).abortSignal(controller.signal);
        if (!active || controller.signal.aborted) return;
        if (error) throw error;
        const matches = data ?? [];
        if (suggestionCache.current.size >= 60) suggestionCache.current.clear();
        suggestionCache.current.set(key, matches);
        setBizSuggestions(matches);
      } catch (error) {
        if (active && !controller.signal.aborted) {
          console.error("Error fetching suggestions:", error);
        }
      } finally {
        if (active && !controller.signal.aborted) setIsFetchingSuggestions(false);
      }
    }, 350);

    return () => {
      active = false;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery, isSearchFocused, areaOpen]);

  const handleSearch = (query?: string) => {
    const finalQuery = query || searchQuery;
    let lowerQuery = finalQuery.toLowerCase().trim();
    let finalLat = "";
    let finalLng = "";
    let extractedTown: Town | null = null;
    let finalDistrict = "";
    let finalSearchMode: "location" | "nearby" | null = null;

    // Explicit selection wins. Otherwise parse short keyword phrases against
    // an indexed town/district lookup instead of scanning thousands of towns.
    if (selectedArea?.town) {
      finalLat = selectedArea.town.lat.toString();
      finalLng = selectedArea.town.lon.toString();
      finalSearchMode = "nearby";
    } else if (selectedArea?.district) {
      finalDistrict = selectedArea.district;
      finalSearchMode = "location";
    } else {
      const match = findAreaInQuery(finalQuery);
      if (match) {
        lowerQuery = match.remainingQuery;
        if (match.town) {
          finalLat = match.town.lat.toString();
          finalLng = match.town.lon.toString();
          finalSearchMode = "nearby";
        } else if (match.district) {
          finalDistrict = match.district;
          finalSearchMode = "location";
        }
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
    searchParams.set("q", expandSearchQuery(selectedArea ? finalQuery.trim() : (lowerQuery || searchQuery)));

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

  // An empty focused input must not open a large scrollable panel.
  // Suggestions appear only after meaningful input, avoiding unnecessary layout/compositing work.
  const displayedBusinesses = searchQuery.trim().length >= 2 ? bizSuggestions : [];
  const showDropdown =
    !areaOpen && isSearchFocused && searchQuery.trim().length >= 2 &&
    (displayedBusinesses.length > 0 || categorySuggestions.length > 0 || isFetchingSuggestions);

  // Never trap page scrolling in the autocomplete panel. Dismiss it on
  // wheel/touch scroll gestures; keep default scrolling fully enabled.
  useEffect(() => {
    if (!showDropdown) return;
    const dismiss = () => setIsSearchFocused(false);
    window.addEventListener("wheel", dismiss, { capture: true, passive: true });
    window.addEventListener("touchmove", dismiss, { capture: true, passive: true });
    window.addEventListener("scroll", dismiss, { passive: true });
    return () => {
      window.removeEventListener("wheel", dismiss, true);
      window.removeEventListener("touchmove", dismiss, true);
      window.removeEventListener("scroll", dismiss);
    };
  }, [showDropdown]);

  return (
    <div ref={searchRootRef} className="relative mx-auto w-full">
      {/* Three-part destination search: keyword, location, one primary action. */}
      <form
        onSubmit={handleSubmit}
        ref={searchBarRef}
        role="search"
        className="rounded-[17px] border border-stone-200 bg-white p-1.5 shadow-[0_12px_36px_rgba(2,22,44,0.16)] focus-within:ring-2 focus-within:ring-emerald-200 sm:p-2"
      >
        <div className="flex flex-col gap-1 sm:flex-row sm:items-stretch sm:gap-0">
          <div className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-3 py-2 sm:py-1">
            <Search size={20} strokeWidth={1.8} className="shrink-0 text-stone-400" />
            <div className="min-w-0 flex-1">
              <label htmlFor="hero-business-query" className="block text-[10px] font-bold uppercase tracking-[0.08em] text-stone-500">Business or service</label>
              <input
                id="hero-business-query"
                type="search"
                autoComplete="off"
                value={searchQuery}
                maxLength={160}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => { setIsSearchFocused(true); setAreaOpen(false); }}
                onBlur={() => setTimeout(() => setIsSearchFocused(false), 120)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setIsSearchFocused(false);
                    event.currentTarget.blur();
                  }
                }}
                aria-expanded={showDropdown}
                aria-controls="hero-search-suggestions"
                placeholder="What are you looking for?"
                className="mt-0.5 w-full min-w-0 bg-transparent text-[13px] font-medium text-stone-900 outline-none placeholder:font-normal placeholder:text-stone-400 sm:text-[14px]"
              />
            </div>
            <VoiceSearch
              onResult={(text) => { setSearchQuery(text); handleSearch(text); }}
              className="shrink-0"
            />
          </div>

          <div className="mx-2 h-px bg-stone-200 sm:mx-0 sm:my-1 sm:h-auto sm:w-px" />

          <div ref={areaRef} className="relative min-w-0 sm:w-[37%]">
            <button
              type="button"
              aria-label="Choose district or town"
              aria-expanded={areaOpen}
              onClick={() => { setAreaOpen(v => !v); setIsSearchFocused(false); setAreaQuery(""); }}
              className="flex min-h-[54px] w-full items-center gap-2 rounded-xl px-3 text-left transition-colors hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 sm:min-h-[56px]"
            >
              <MapPin size={19} strokeWidth={1.8} className="shrink-0 text-stone-400" />
              <span className="min-w-0 flex-1">
                <span className="block text-[10px] font-bold uppercase tracking-[0.08em] text-stone-500">Area / town</span>
                <span className="mt-0.5 block truncate text-[13px] font-semibold text-stone-800">{selectedArea?.label || "All Sri Lanka"}</span>
              </span>
              <ChevronDown size={15} className={cn("shrink-0 text-stone-400 transition-transform", areaOpen && "rotate-180")} />
            </button>
            {areaOpen && (
              <div className="absolute left-0 right-0 top-full z-[100] mt-2 min-w-[250px] overflow-hidden rounded-2xl border border-stone-200 bg-white p-2 text-left shadow-[0_20px_55px_rgba(2,22,44,0.22)] sm:right-auto sm:w-[330px]">
                <div className="flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3">
                  <Search size={16} className="shrink-0 text-stone-400" />
                  <input
                    type="search"
                    autoFocus
                    value={areaQuery}
                    onChange={e => setAreaQuery(e.target.value)}
                    placeholder="Search district or town..."
                    aria-label="Search Sri Lankan districts and towns"
                    className="h-11 min-w-0 flex-1 bg-transparent text-sm text-stone-900 outline-none placeholder:text-stone-400"
                  />
                  {selectedArea && <button type="button" onClick={() => { setSelectedArea(null); setAreaOpen(false); }} aria-label="Clear selected area" className="text-stone-400 hover:text-stone-700"><X size={16}/></button>}
                </div>
                <div className="max-h-[238px] overflow-y-auto py-1">
                  <button type="button" onClick={() => { setSelectedArea(null); setAreaOpen(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-stone-700 hover:bg-emerald-50">
                    <MapPin size={16} className="text-stone-400" /> All Sri Lanka {!selectedArea && <Check size={15} className="ml-auto text-emerald-700"/>}
                  </button>
                  {areaOptions.map(option => (
                    <button
                      type="button"
                      key={option.town ? `town-${option.town.name}-${option.town.district}-${option.town.lat}` : `district-${option.district}`}
                      onClick={() => { setSelectedArea(option); setAreaOpen(false); }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-stone-700 transition-colors hover:bg-emerald-50"
                    >
                      <MapPin size={15} className="shrink-0 text-emerald-600" />
                      <span className="min-w-0 flex-1 truncate">{option.label}</span>
                      <span className="shrink-0 text-[10px] text-stone-400">{option.town ? "Town" : "District"}</span>
                      {selectedArea?.label === option.label && <Check size={15} className="text-emerald-700"/>}
                    </button>
                  ))}
                  {areaOptions.length === 0 && <p className="px-3 py-4 text-sm text-stone-500">No matching area found.</p>}
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-[12px] bg-[#1B3430] px-5 text-[13px] font-semibold text-white shadow-[0_5px_16px_rgba(18,62,101,0.2)] transition-colors hover:bg-[#2B6552] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 sm:min-h-[56px]"
          >
            <Search size={18} strokeWidth={2} /> Search
          </button>
        </div>
      </form>

      {/* Lightweight autocomplete. No full-page overlay or scroll lock. */}
      {showDropdown && (
        <div
          id="hero-search-suggestions"
          role="region"
          aria-label="Business search suggestions"
          className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[288px] overflow-y-auto overscroll-auto rounded-xl border border-stone-200 bg-white text-left shadow-[0_14px_42px_rgba(15,23,42,0.14)]"
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
                        <CategoryIcon name={cat.icon} className="w-4 h-4 text-brand-gold" />
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
            {displayedBusinesses.length > 0 && (
              <div>
                <div className="px-4 pt-3 pb-1.5">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">
                    {searchQuery.trim() ? "Best Matches" : "Recommended for You"}
                  </span>
                </div>
                {displayedBusinesses.map((biz) => (
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
                        <span className="text-[10px] font-medium text-brand-blue bg-emerald-50 px-1.5 py-0.5 rounded-full shrink-0">
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
        </div>
      )}


    </div>
  );
}
