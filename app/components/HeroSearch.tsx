"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, ChevronRight, Building2, Star, Tags, MapPin, ChevronDown, Check, X } from "lucide-react";
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
  const [areaOpen, setAreaOpen] = useState(false);
  const [areaQuery, setAreaQuery] = useState("");
  const [selectedArea, setSelectedArea] = useState<{ label: string; district?: string; town?: Town } | null>(null);
  const areaRef = useRef<HTMLDivElement>(null);

  const searchBarRef = useRef<HTMLFormElement>(null);
  const latestFetchId = useRef(0);

  // The location selector uses existing Sri Lankan town coordinates; no invented postal codes.
  const areaOptions = useMemo(() => {
    const query = areaQuery.trim().toLowerCase();
    if (!query) return sriLankanDistricts.slice(0, 8).map(district => ({ label: district, district }));
    const matchingDistricts = sriLankanDistricts.filter(d => d.toLowerCase().includes(query)).slice(0, 5).map(district => ({ label: district, district }));
    const matchingTowns = SL_TOWNS.filter(t => t.name.toLowerCase().includes(query) || t.district.toLowerCase().includes(query)).slice(0, 12).map(town => ({ label: `${town.name}, ${town.district}`, town }));
    return [...matchingDistricts, ...matchingTowns];
  }, [areaQuery]);

  useEffect(() => {
    if (!areaOpen) return;
    const onOutsideClick = (event: MouseEvent) => {
      if (areaRef.current && !areaRef.current.contains(event.target as Node)) setAreaOpen(false);
    };
    document.addEventListener("mousedown", onOutsideClick);
    return () => document.removeEventListener("mousedown", onOutsideClick);
  }, [areaOpen]);

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

    // Explicit area selection takes precedence over location inference and cached GPS.
    if (selectedArea?.town) {
      finalLat = selectedArea.town.lat.toString();
      finalLng = selectedArea.town.lon.toString();
      finalSearchMode = "nearby";
    } else if (selectedArea?.district) {
      finalDistrict = selectedArea.district;
      finalSearchMode = "location";
    }

    if (!selectedArea) for (const town of SL_TOWNS) {
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

    if (!selectedArea && !finalLat) {
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

  const IconComponent = ({ name, className }: { name: string | null; className?: string }) => {
    if (!name) return <Tags className={className} />;
    const Icon = (LucideIcons as any)[name];
    return Icon ? <Icon className={className} /> : <Tags className={className} />;
  };

  const showDropdown =
    !areaOpen && isSearchFocused &&
    (bizSuggestions.length > 0 || categorySuggestions.length > 0 || isFetchingSuggestions);

  return (
    <div className="relative mx-auto w-full">
      {/* Three-part destination search: keyword, location, one primary action. */}
      <form
        onSubmit={handleSubmit}
        ref={searchBarRef}
        role="search"
        className="rounded-[17px] border border-slate-200 bg-white p-1.5 shadow-[0_12px_36px_rgba(2,22,44,0.16)] focus-within:ring-2 focus-within:ring-sky-200 sm:p-2"
      >
        <div className="flex flex-col gap-1 sm:flex-row sm:items-stretch sm:gap-0">
          <div className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-3 py-2 sm:py-1">
            <Search size={20} strokeWidth={1.8} className="shrink-0 text-slate-400" />
            <div className="min-w-0 flex-1">
              <label htmlFor="hero-business-query" className="block text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">Business or service</label>
              <input
                id="hero-business-query"
                type="search"
                autoComplete="off"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => { setIsSearchFocused(true); setAreaOpen(false); }}
                onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                placeholder="What are you looking for?"
                className="mt-0.5 w-full min-w-0 bg-transparent text-[13px] font-medium text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-400 sm:text-[14px]"
              />
            </div>
            <VoiceSearch
              onResult={(text) => { setSearchQuery(text); handleSearch(text); }}
              className="shrink-0"
            />
          </div>

          <div className="mx-2 h-px bg-slate-200 sm:mx-0 sm:my-1 sm:h-auto sm:w-px" />

          <div ref={areaRef} className="relative min-w-0 sm:w-[37%]">
            <button
              type="button"
              aria-label="Choose district or town"
              aria-expanded={areaOpen}
              onClick={() => { setAreaOpen(v => !v); setIsSearchFocused(false); setAreaQuery(""); }}
              className="flex min-h-[54px] w-full items-center gap-2 rounded-xl px-3 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 sm:min-h-[56px]"
            >
              <MapPin size={19} strokeWidth={1.8} className="shrink-0 text-slate-400" />
              <span className="min-w-0 flex-1">
                <span className="block text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">Area / town</span>
                <span className="mt-0.5 block truncate text-[13px] font-semibold text-slate-800">{selectedArea?.label || "All Sri Lanka"}</span>
              </span>
              <ChevronDown size={15} className={cn("shrink-0 text-slate-400 transition-transform", areaOpen && "rotate-180")} />
            </button>
            {areaOpen && (
              <div className="absolute left-0 right-0 top-full z-[100] mt-2 min-w-[250px] overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 text-left shadow-[0_20px_55px_rgba(2,22,44,0.22)] sm:right-auto sm:w-[330px]">
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3">
                  <Search size={16} className="shrink-0 text-slate-400" />
                  <input
                    type="search"
                    autoFocus
                    value={areaQuery}
                    onChange={e => setAreaQuery(e.target.value)}
                    placeholder="Search district or town..."
                    aria-label="Search Sri Lankan districts and towns"
                    className="h-11 min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                  />
                  {selectedArea && <button type="button" onClick={() => { setSelectedArea(null); setAreaOpen(false); }} aria-label="Clear selected area" className="text-slate-400 hover:text-slate-700"><X size={16}/></button>}
                </div>
                <div className="max-h-[238px] overflow-y-auto py-1">
                  <button type="button" onClick={() => { setSelectedArea(null); setAreaOpen(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-sky-50">
                    <MapPin size={16} className="text-slate-400" /> All Sri Lanka {!selectedArea && <Check size={15} className="ml-auto text-sky-700"/>}
                  </button>
                  {areaOptions.map(option => (
                    <button
                      type="button"
                      key={option.town ? `town-${option.town.name}-${option.town.district}-${option.town.lat}` : `district-${option.district}`}
                      onClick={() => { setSelectedArea(option); setAreaOpen(false); }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-slate-700 transition-colors hover:bg-sky-50"
                    >
                      <MapPin size={15} className="shrink-0 text-sky-600" />
                      <span className="min-w-0 flex-1 truncate">{option.label}</span>
                      <span className="shrink-0 text-[10px] text-slate-400">{option.town ? "Town" : "District"}</span>
                      {selectedArea?.label === option.label && <Check size={15} className="text-sky-700"/>}
                    </button>
                  ))}
                  {areaOptions.length === 0 && <p className="px-3 py-4 text-sm text-slate-500">No matching area found.</p>}
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-[12px] bg-[#123E65] px-5 text-[13px] font-semibold text-white shadow-[0_5px_16px_rgba(18,62,101,0.2)] transition-colors hover:bg-[#1B5888] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 sm:min-h-[56px]"
          >
            <Search size={18} strokeWidth={2} /> Search
          </button>
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


    </div>
  );
}
