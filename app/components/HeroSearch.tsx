"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, MapPin, ChevronRight, Building2, Star, Tags } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { cn, expandSearchQuery } from "@/lib/utils";
import { supabase } from "@/lib/supabaseClient";
import Fuse from "fuse.js";
import VoiceSearch from "./VoiceSearch";
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
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  useEffect(() => {
    onFocusChange?.(isSearchFocused);
  }, [isSearchFocused, onFocusChange]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [businessSuggestions, setBusinessSuggestions] = useState<any[]>([]);
  const [fuzzyBusinessSuggestions, setFuzzyBusinessSuggestions] = useState<any[]>([]);
  const [categorySuggestions, setCategorySuggestions] = useState<any[]>([]);
  const [geoData, setGeoData] = useState<any[]>([]);
  
  const searchBarRef = useRef<HTMLDivElement>(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load GeoJSON data once
  useEffect(() => {
    fetch("/srilanka.geojson")
      .then((res) => res.json())
      .then((data) => {
        // Optimization: Simplify GeoJSON features for Fuse
        const simplified = (data.features || []).map((f: any) => ({
          id: f.id,
          properties: {
            name: f.properties.name,
            category: f.properties.category,
            location: f.properties.location,
            city: f.properties.city,
            address: f.properties.address,
          },
          geometry: {
            coordinates: f.geometry.coordinates,
          }
        }));
        setGeoData(simplified);
      })
      .catch((err) => console.error("Error loading GeoJSON:", err));
  }, []);

  const fuse = useMemo(
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
    [geoData]
  );

  // Search logic
  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      const query = searchQuery.toLowerCase();
      const filteredCats = categories
        .filter(
          (cat: any) =>
            cat.name.toLowerCase().includes(query) ||
            cat.keywords?.some((kw: string) => kw.toLowerCase().includes(query))
        )
        .slice(0, 5);
      setCategorySuggestions(filteredCats);
    } else {
      setCategorySuggestions([]);
    }

    if (debouncedSearchQuery.trim().length > 0) {
      const geoResults = fuse.search(debouncedSearchQuery).slice(0, 4);
      setSuggestions(geoResults.map((r) => r.item));

      const fetchSuggestions = async () => {
        try {
          const { data, error } = await supabase.rpc("get_global_search_suggestions", {
            search_query: debouncedSearchQuery,
            suggestion_limit: 5,
          });
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
      setSuggestions([]);
      setBusinessSuggestions(featuredBusinesses.slice(0, 4));
      setFuzzyBusinessSuggestions([]);
    }
  }, [debouncedSearchQuery, searchQuery, fuse, featuredBusinesses, categories]);

  const handleSearch = (query?: string) => {
    const finalQuery = query ?? searchQuery;
    let lowerQuery = finalQuery.toLowerCase().trim();
    let finalLat = "";
    let finalLng = "";
    let extractedTown: Town | null = null;
    let finalDistrict = "";
    let finalSearchMode: "location" | "nearby" | null = null;

    // Detect Town
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

    // Detect District
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

  const handleSelectPlace = (feature: any) => {
    const { name } = feature.properties;
    const [lng, lat] = feature.geometry.coordinates;
    setSearchQuery(name);
    setSuggestions([]);
    router.push(`/nearby?q=${encodeURIComponent(name)}&lat=${lat}&lng=${lng}&radius=5000`);
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

  const IconComponent = ({ name, className }: { name: string | null; className?: string }) => {
    if (!name) return <Tags className={className} />;
    const Icon = (LucideIcons as any)[name];
    return Icon ? <Icon className={className} /> : <Tags className={className} />;
  };

  return (
    <div className="relative max-w-2xl mx-auto">
      {/* Main Search Input */}
      <div ref={searchBarRef} className="bg-white rounded-[6px] shadow-lg border border-gray-300">
        <div className="flex items-center px-4 py-3.5 md:px-5 md:py-4 bg-white rounded-[6px] gap-2 md:gap-3 min-h-[44px]">
          <Search className="text-gray-400 shrink-0" size={20} strokeWidth={1.5} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Service or Business… (e.g. Hospital in Colombo)"
            className="flex-1 min-w-0 bg-transparent outline-none text-gray-700 text-sm md:text-base placeholder:text-gray-400 font-normal"
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
          <VoiceSearch onResult={(text) => { setSearchQuery(text); handleSearch(text); }} className="shrink-0" />
        </div>
      </div>

      {/* Suggestions panel */}
      {isSearchFocused &&
        (suggestions.length > 0 ||
          businessSuggestions.length > 0 ||
          fuzzyBusinessSuggestions.length > 0 ||
          categorySuggestions.length > 0) && (
          <div
            className="absolute top-full left-0 right-0 mt-1 bg-white rounded-[6px] shadow-2xl border border-gray-300 overflow-hidden text-left"
            style={{
              zIndex: 9999,
              maxHeight: "65dvh",
              overflowY: "auto",
            }}
          >
            {/* Categories */}
            {categorySuggestions.length > 0 && (
              <div className="border-b border-gray-100 last:border-0">
                <div className="px-4 pt-3 pb-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Categories</span>
                </div>
                {categorySuggestions.map((cat) => (
                  <button
                    key={cat.id}
                    onMouseDown={() => handleCategoryClick(cat.name)}
                    className="w-full px-4 py-3 hover:bg-gray-50 active:bg-gray-100 flex items-center gap-3 transition-colors border-b border-gray-50 last:border-0"
                  >
                    <div className="w-9 h-9 rounded-xl bg-brand-gold/10 flex items-center justify-center shrink-0 border border-brand-gold/20">
                      {cat.image_url ? (
                        <img src={cat.image_url} alt={cat.name} className="w-5 h-5 object-contain" />
                      ) : (
                        <IconComponent name={cat.icon} className="w-5 h-5 text-brand-gold" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-medium text-gray-800 truncate">{cat.name}</p>
                      {cat.keywords && cat.keywords.length > 0 && (
                        <p className="text-[10px] text-gray-400 mt-0.5 truncate">{cat.keywords.join(", ")}</p>
                      )}
                    </div>
                    <ChevronRight size={14} className="text-gray-300 shrink-0" />
                  </button>
                ))}
              </div>
            )}

            {/* Businesses */}
            {(fuzzyBusinessSuggestions.length > 0 || businessSuggestions.length > 0) && (
              <div>
                <div className="flex items-center justify-between px-4 pt-3 pb-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">
                    {searchQuery.trim() ? "Best Matches" : "Recommended for You"}
                  </span>
                </div>
                {(fuzzyBusinessSuggestions.length > 0 ? fuzzyBusinessSuggestions : businessSuggestions).map((biz) => (
                  <button
                    key={biz.id}
                    onMouseDown={() => router.push(`/business/${biz.slug || biz.id}`)}
                    className="w-full px-4 py-3 hover:bg-gray-50 active:bg-gray-100 flex items-center gap-3 transition-colors border-b border-gray-50 last:border-0"
                  >
                    <div className="w-11 h-11 rounded-xl bg-gray-100 shrink-0 overflow-hidden border border-gray-200">
                      {biz.logo_url || biz.image_url ? (
                        <img src={biz.logo_url || biz.image_url} alt={biz.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <Building2 size={18} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-semibold text-gray-800 truncate leading-tight">{biz.name}</p>
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
                    <div className="shrink-0 flex items-center gap-2">
                      {biz.rating ? (
                        <div className="flex items-center gap-0.5">
                          <Star size={11} className="text-amber-400 fill-amber-400" />
                          <span className="text-xs font-semibold text-gray-600">{biz.rating}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">New</span>
                      )}
                      <ChevronRight size={14} className="text-gray-300" />
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Locations */}
            {suggestions.length > 0 && (
              <div className={cn((fuzzyBusinessSuggestions.length > 0 || businessSuggestions.length > 0) && "border-t border-gray-100")}>
                <div className="px-4 pt-3 pb-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Locations</span>
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
                      <p className="text-sm font-medium text-gray-800 truncate">{feature.properties.name}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{feature.properties.location || feature.properties.city || "Sri Lanka"}</p>
                    </div>
                    <ChevronRight size={14} className="text-gray-300 shrink-0" />
                  </button>
                ))}
              </div>
            )}

            {/* Footer */}
            {searchQuery.trim() && (
              <div className="border-t border-gray-100 px-4 py-3 bg-gray-50/50">
                <button
                  onMouseDown={() => handleSearch()}
                  className="w-full flex items-center gap-2 text-sm font-medium text-brand-dark hover:text-brand-blue transition-colors group"
                >
                  <Search size={14} className="shrink-0 text-gray-400 group-hover:text-brand-blue transition-colors" />
                  Search all results for&nbsp;
                  <span className="font-semibold truncate max-w-[180px]">&ldquo;{searchQuery}&rdquo;</span>
                  <ChevronRight size={14} className="ml-auto text-gray-300 shrink-0" />
                </button>
              </div>
            )}
          </div>
        )}

      {/* Action Buttons */}
      <div className="flex flex-row items-center justify-center gap-2 px-1 mt-4">
        <button
          onClick={() => handleUseCurrentLocation(true)}
          disabled={isFetchingLocation}
          className="flex items-center justify-center gap-2 flex-1 md:flex-none md:w-auto px-4 md:px-6 py-3 text-gray-700 bg-gray-50 hover:bg-brand-blue border border-brand-blue font-normal transition-all disabled:opacity-50 text-sm md:text-base rounded-[6px]"
        >
          <LucideIcons.Navigation
            size={16}
            strokeWidth={1.5}
            className={cn("text-brand-blue", isFetchingLocation && "animate-pulse")}
          />
          <span className="whitespace-nowrap">{isFetchingLocation ? "Locating..." : "Near me"}</span>
        </button>
        <button
          onClick={() => handleSearch()}
          className="flex-1 md:flex-none md:w-auto bg-brand-blue hover:bg-brand-blue/90 text-white text-sm md:text-base font-normal px-6 md:px-12 py-3 shadow-lg shadow-brand-blue/10 transition-all rounded-[6px]"
        >
          Search
        </button>
      </div>
    </div>
  );
}
