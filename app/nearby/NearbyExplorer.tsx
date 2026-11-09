"use client";

import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, ArrowRight, ArrowUpRight, Building2, ChevronDown,
  Compass, LocateFixed, Map as MapIcon, MapPin, Navigation, Search,
  SlidersHorizontal, Star, X, List, RotateCcw, ShieldCheck, Sparkles, Check, Layers3, PanelLeftClose, PanelLeftOpen, Camera, Globe2, BadgeCheck, Route
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/lib/supabaseClient";
import { SL_TOWNS, type Town } from "@/lib/towns";
import type { Business } from "@/lib/types";
import VerifiedBadge from "@/app/components/VerifiedBadge";

const LeafletMap = dynamic(() => import("@/components/LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[#EDF4F9] text-[#4A7796]">
      <MapIcon size={30} strokeWidth={1.4} />
      <span className="text-sm font-medium">Preparing your map…</span>
    </div>
  ),
});

type NearbyBusiness = Business & { distance_meters?: number };
const EMPTY_CATEGORIES: any[] = [];
const EMPTY_BUSINESSES: NearbyBusiness[] = [];
type LocationChoice = {
  lat: number;
  lng: number;
  label: string;
  kind: "default" | "district" | "town" | "gps" | "coordinates";
};
type SortMode = "nearest" | "top-rated" | "alphabetical";
type AreaOption = { label: string; description: string; lat: number; lng: number; kind: "district" | "town" };

const DEFAULT_LOCATION: LocationChoice = {
  lat: 6.9271, lng: 79.8612, label: "Colombo · Starting area", kind: "default",
};
const DISTRICTS: Record<string, { lat: number; lng: number }> = {
  Ampara: { lat: 7.2912, lng: 81.6724 },
  Anuradhapura: { lat: 8.3122, lng: 80.4131 },
  Badulla: { lat: 6.9899, lng: 81.0569 },
  Batticaloa: { lat: 7.7102, lng: 81.6924 },
  Colombo: { lat: 6.9271, lng: 79.8612 },
  Galle: { lat: 6.0535, lng: 80.221 },
  Gampaha: { lat: 7.0873, lng: 79.9925 },
  Hambantota: { lat: 6.1241, lng: 81.1225 },
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

const DISCOVERY_AREAS = [
  { name: "Colombo", detail: "Western coast" },
  { name: "Kandy", detail: "Central region" },
  { name: "Jaffna", detail: "Northern peninsula" },
  { name: "Galle", detail: "Southern coast" },
  { name: "Gampaha", detail: "Western region" },
  { name: "Trincomalee", detail: "Eastern coast" },
] as const;

const TOWN_INDEX = SL_TOWNS.map((town) => ({
  town,
  name: town.name.toLowerCase(),
  district: town.district.toLowerCase(),
}));
const TOWN_EXACT = new globalThis.Map<string, Town>();
for (const entry of TOWN_INDEX) {
  if (!TOWN_EXACT.has(entry.name)) TOWN_EXACT.set(entry.name, entry.town);
}

function validCoords(lat: number, lng: number) {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function formatDistance(meters: number) {
  if (!Number.isFinite(meters)) return "Distance unavailable";
  return meters < 1000 ? Math.round(meters) + " m" : (meters / 1000).toFixed(1) + " km";
}

function initialChoice(params: ReturnType<typeof useSearchParams>): LocationChoice {
  const latString = params.get("lat");
  const lngString = params.get("lng");
  if (latString !== null && lngString !== null) {
    const lat = Number(latString);
    const lng = Number(lngString);
    if (validCoords(lat, lng)) {
      const districtQuery = params.get("district");
      const districtName = districtQuery && Object.keys(DISTRICTS).find(name => name.toLowerCase() === districtQuery.toLowerCase());
      if (districtName) return { lat, lng, label: districtName + " District", kind: "district" };
      return { lat, lng, label: "Selected map area", kind: "coordinates" };
    }
  }
  const districtName = params.get("district");
  if (districtName) {
    const match = Object.keys(DISTRICTS).find((name) => name.toLowerCase() === districtName.toLowerCase());
    if (match) return { ...DISTRICTS[match], label: match + " District", kind: "district" };
  }
  return DEFAULT_LOCATION;
}

function resultsMessage(count: number) {
  return count === 1 ? "1 business found" : count + " businesses found";
}

export default function NearbyExplorer() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [location, setLocation] = useState<LocationChoice>(() => initialChoice(searchParams));
  const [mapCenter, setMapCenter] = useState(() => {
    const first = initialChoice(searchParams);
    return { lat: first.lat, lng: first.lng };
  });
  const [mapZoom, setMapZoom] = useState(() => searchParams.has("lat") ? 13 : 11);
  const [pendingArea, setPendingArea] = useState<{ lat: number; lng: number; zoom: number } | null>(null);
  const [userPosition, setUserPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationNotice, setLocationNotice] = useState("");

  const [searchText, setSearchText] = useState(searchParams.get("q") || "");
  const [appliedQuery, setAppliedQuery] = useState(searchParams.get("q") || "");
  const [searchFocused, setSearchFocused] = useState(false);
  const [debouncedText, setDebouncedText] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const suggestionCache = useRef(new globalThis.Map<string, any[]>());

  const initialRadius = Number(searchParams.get("radius") || 10000);
  const [radius, setRadius] = useState(Number.isFinite(initialRadius) ? Math.max(1000, Math.min(50000, initialRadius)) : 10000);
  const [radiusDraft, setRadiusDraft] = useState(radius);
  const [category, setCategory] = useState<string | null>(searchParams.get("category"));
  const [draftCategory, setDraftCategory] = useState<string | null>(category);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [areaOpen, setAreaOpen] = useState(false);
  const [areaText, setAreaText] = useState("");
  const deferredAreaText = useDeferredValue(areaText);
  const [mobileView, setMobileView] = useState<"map" | "list">("map");
  const [selectedBusiness, setSelectedBusiness] = useState<NearbyBusiness | null>(null);
  const [sortBy, setSortBy] = useState<SortMode>("nearest");
  const [resultLimit, setResultLimit] = useState(30);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [withPhotosOnly, setWithPhotosOnly] = useState(false);
  const [draftVerifiedOnly, setDraftVerifiedOnly] = useState(false);
  const [draftWithPhotosOnly, setDraftWithPhotosOnly] = useState(false);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [mapAppearance, setMapAppearance] = useState<"original" | "soft">("original");
  const [mapAppearanceOpen, setMapAppearanceOpen] = useState(false);
  const mapAppearanceRef = useRef<HTMLDivElement>(null);

  const headerRef = useRef<HTMLElement>(null);
  const skipMapMove = useRef(false);
  const mapMoveTimer = useRef<number | null>(null);

  const { data: categories = EMPTY_CATEGORIES } = useQuery({
    queryKey: ["categories-nearby"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, icon, parent_id")
        .is("parent_id", null)
        .order("name", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: businesses = EMPTY_BUSINESSES,
    isLoading: loadingBusinesses,
    isFetching,
    error,
    refetch,
  } = useQuery<NearbyBusiness[]>({
    queryKey: ["nearby-businesses", location.lat, location.lng, radius, appliedQuery, category],
    queryFn: async ({ signal }) => {
      const { data, error: fetchError } = await supabase
        .rpc("get_nearby_businesses", {
          user_lat: location.lat,
          user_lng: location.lng,
          search_query: appliedQuery,
          dist_limit: radius,
          category_filter: category || "",
        })
        .abortSignal(signal);
      if (fetchError) throw fetchError;
      return (data || []).map((row: any) => ({
        ...row,
        distanceText: typeof row.distance_meters === "number"
          ? formatDistance(row.distance_meters)
          : undefined,
      }));
    },
    staleTime: 60 * 1000,
    retry: 1,
  });

  const visibleBusinesses = useMemo(() => {
    const sorted = businesses.filter(item =>
      (!verifiedOnly || (item.is_verified === true && item.can_show_badge === true)) &&
      (!withPhotosOnly || Boolean(item.image_url || item.logo_url))
    );
    if (sortBy === "top-rated") {
      sorted.sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));
    } else if (sortBy === "alphabetical") {
      sorted.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
    } else {
      sorted.sort((a, b) =>
        (typeof a.distance_meters === "number" ? a.distance_meters : Number.MAX_SAFE_INTEGER) -
        (typeof b.distance_meters === "number" ? b.distance_meters : Number.MAX_SAFE_INTEGER)
      );
    }
    return sorted;
  }, [businesses, sortBy, verifiedOnly, withPhotosOnly]);

  useEffect(() => { setResultLimit(30); }, [location.lat, location.lng, appliedQuery, category, radius, sortBy, verifiedOnly, withPhotosOnly]);

  const mapFeatures = useMemo(() => visibleBusinesses
    .filter((business) => validCoords(Number(business.latitude), Number(business.longitude)))
    .map((business) => ({
      type: "Feature" as const,
      id: business.id,
      properties: business,
      geometry: {
        type: "Point" as const,
        coordinates: [Number(business.longitude), Number(business.latitude)],
      },
    })), [visibleBusinesses]);

  const areaOptions = useMemo<AreaOption[]>(() => {
    if (!areaOpen) return [];
    const query = deferredAreaText.trim().toLowerCase();
    const districts = Object.entries(DISTRICTS)
      .filter(([name]) => !query || name.toLowerCase().includes(query))
      .slice(0, query ? 6 : 8)
      .map(([name, coords]) => ({
        label: name,
        description: "District",
        lat: coords.lat,
        lng: coords.lng,
        kind: "district" as const,
      }));
    if (query.length < 2) return districts;
    const towns: AreaOption[] = [];
    for (const entry of TOWN_INDEX) {
      if (entry.name.includes(query) || entry.district.includes(query)) {
        towns.push({
          label: entry.town.name,
          description: entry.town.district + " · Town",
          lat: entry.town.lat,
          lng: entry.town.lon,
          kind: "town",
        });
        if (towns.length === 10) break;
      }
    }
    return [...districts, ...towns];
  }, [deferredAreaText, areaOpen]);

  const categorySuggestions = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!searchFocused || query.length < 2) return [];
    return categories.filter((cat: any) => String(cat.name).toLowerCase().includes(query)).slice(0, 4);
  }, [searchText, categories, searchFocused]);

  const townSuggestions = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!searchFocused || query.length < 2) return [];
    const towns: Town[] = [];
    for (const entry of TOWN_INDEX) {
      if (entry.name.startsWith(query)) {
        towns.push(entry.town);
        if (towns.length === 4) break;
      }
    }
    return towns;
  }, [searchText, searchFocused]);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedText(searchText.trim()), 350);
    return () => window.clearTimeout(timeout);
  }, [searchText]);

  // Suggestions are the only queries allowed while typing, and can be cancelled.
  useEffect(() => {
    const query = debouncedText;
    if (!searchFocused || query.length < 2) {
      setSuggestions([]);
      setSuggestionsLoading(false);
      return;
    }
    const key = query.toLowerCase();
    const cached = suggestionCache.current.get(key);
    if (cached) {
      setSuggestions(cached);
      setSuggestionsLoading(false);
      return;
    }
    const controller = new AbortController();
    let active = true;
    setSuggestionsLoading(true);
    const fetchSuggestions = async () => {
      try {
        const { data, error: suggestionError } = await supabase
          .rpc("get_global_search_suggestions", {
            search_query: query,
            suggestion_limit: 5,
          })
          .abortSignal(controller.signal);
        if (!active || controller.signal.aborted) return;
        if (suggestionError) throw suggestionError;
        const next = Array.isArray(data) ? data : [];
        if (suggestionCache.current.size >= 60) suggestionCache.current.clear();
        suggestionCache.current.set(key, next);
        setSuggestions(next);
      } catch (fetchError) {
        if (active && !controller.signal.aborted) console.error("Suggestion request failed:", fetchError);
      } finally {
        if (active && !controller.signal.aborted) setSuggestionsLoading(false);
      }
    };
    void fetchSuggestions();
    return () => { active = false; controller.abort(); };
  }, [debouncedText, searchFocused]);

  const openFilters = () => {
    setRadiusDraft(radius);
    setDraftCategory(category);
    setDraftVerifiedOnly(verifiedOnly);
    setDraftWithPhotosOnly(withPhotosOnly);
    setAreaOpen(false);
    setSearchFocused(false);
    setFiltersOpen(true);
  };

  const closePopovers = useCallback(() => {
    setAreaOpen(false);
    setFiltersOpen(false);
    setSearchFocused(false);
  }, []);

  useEffect(() => {
    const onOutside = (event: PointerEvent) => {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) closePopovers();
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closePopovers();
    };
    document.addEventListener("pointerdown", onOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("pointerdown", onOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, [closePopovers]);

  useEffect(() => () => {
    if (mapMoveTimer.current) window.clearTimeout(mapMoveTimer.current);
  }, []);

  useEffect(() => {
    if (!mapAppearanceOpen) return;
    const outside = (event: PointerEvent) => {
      if (!mapAppearanceRef.current?.contains(event.target as Node)) setMapAppearanceOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMapAppearanceOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [mapAppearanceOpen]);

  const moveMapTo = (lat: number, lng: number, zoom: number) => {
    skipMapMove.current = true;
    if (mapMoveTimer.current) window.clearTimeout(mapMoveTimer.current);
    setMapCenter({ lat, lng });
    setMapZoom(zoom);
    setPendingArea(null);
    mapMoveTimer.current = window.setTimeout(() => { skipMapMove.current = false; }, 850);
  };

  const applySearch = (options?: {
    location?: LocationChoice;
    query?: string;
    category?: string | null;
    radius?: number;
    zoom?: number;
    verifiedOnly?: boolean;
    withPhotosOnly?: boolean;
  }) => {
    const nextLocation = options?.location || location;
    const nextQuery = options?.query !== undefined ? options.query.trim() : appliedQuery;
    const nextCategory = options && "category" in options ? (options.category || null) : category;
    const nextRadius = options?.radius || radius;

    setLocation(nextLocation);
    setAppliedQuery(nextQuery);
    setSearchText(nextQuery);
    setCategory(nextCategory);
    setRadius(nextRadius);
    setRadiusDraft(nextRadius);
    setDraftCategory(nextCategory);
    if (options && "verifiedOnly" in options) {
      setVerifiedOnly(Boolean(options.verifiedOnly));
      setDraftVerifiedOnly(Boolean(options.verifiedOnly));
    }
    if (options && "withPhotosOnly" in options) {
      setWithPhotosOnly(Boolean(options.withPhotosOnly));
      setDraftWithPhotosOnly(Boolean(options.withPhotosOnly));
    }
    setSelectedBusiness(null);
    setLocationNotice("");
    moveMapTo(nextLocation.lat, nextLocation.lng, options?.zoom || 12);
    closePopovers();

    const params = new URLSearchParams();
    params.set("lat", nextLocation.lat.toString());
    params.set("lng", nextLocation.lng.toString());
    params.set("radius", nextRadius.toString());
    if (nextQuery) params.set("q", nextQuery);
    if (nextCategory) params.set("category", nextCategory);
    if (nextLocation.kind === "district") params.set("district", nextLocation.label.replace(" District", ""));
    router.replace("/nearby?" + params.toString(), { scroll: false });
  };

  const selectArea = (choice: AreaOption) => {
    applySearch({
      location: { lat: choice.lat, lng: choice.lng, label: choice.label + (choice.kind === "district" ? " District" : ", " + choice.description.split(" · ")[0]), kind: choice.kind },
      zoom: choice.kind === "town" ? 13 : 11,
    });
    setAreaText("");
  };

  const locateMe = () => {
    if (!navigator.geolocation) {
      setLocationNotice("Location is unavailable in this browser. Select a district or town instead.");
      return;
    }
    setLocationLoading(true);
    setLocationNotice("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setUserPosition({ lat, lng });
        setLocationLoading(false);
        applySearch({ location: { lat, lng, label: "Your current location", kind: "gps" }, zoom: 14 });
      },
      () => {
        setLocationLoading(false);
        setLocationNotice("We could not access your location. Choose a district or town to continue.");
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 },
    );
  };

  const submitSearch = (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const query = searchText.trim();
    const exactTown = TOWN_EXACT.get(query.toLowerCase());
    if (exactTown) {
      applySearch({
        query: "",
        location: { lat: exactTown.lat, lng: exactTown.lon, label: exactTown.name + ", " + exactTown.district, kind: "town" },
        zoom: 13,
      });
      return;
    }
    applySearch({ query });
    setMobileView("list");
  };

  const showBusinessOnMap = (business: NearbyBusiness) => {
    setSelectedBusiness(business);
    if (validCoords(Number(business.latitude), Number(business.longitude))) {
      moveMapTo(Number(business.latitude), Number(business.longitude), 16);
    }
    setMobileView("map");
    closePopovers();
  };

  const onMapMoved = useCallback((lat: number, lng: number, zoom: number) => {
    if (!skipMapMove.current && validCoords(lat, lng)) {
      setPendingArea({ lat, lng, zoom });
    }
  }, []);

  const onMapClicked = useCallback((lat: number, lng: number) => {
    if (validCoords(lat, lng)) {
      setPendingArea({ lat, lng, zoom: 13 });
    }
  }, []);

  const onMarkerClicked = useCallback((feature: any) => {
    // LeafletMap sends GeoJSON features; always extract the actual business.
    const business = feature?.properties || feature;
    if (business?.id) setSelectedBusiness(business as NearbyBusiness);
  }, []);

  const searchDropdownOpen = searchFocused && searchText.trim().length >= 2;
  const QUICK_CATEGORIES = ["Food & Dining", "Health & Medical", "Shopping & Retail", "Travel & Tourism", "Professional Services"];
  const quickCategories = categories.filter((item: any) => QUICK_CATEGORIES.includes(String(item.name))).sort((a: any, b: any) => QUICK_CATEGORIES.indexOf(a.name) - QUICK_CATEGORIES.indexOf(b.name));
  const categoryCount = category ? 1 : 0;
  const activeFiltersCount = categoryCount + (radius !== 10000 ? 1 : 0) + (verifiedOnly ? 1 : 0) + (withPhotosOnly ? 1 : 0);

  return (
    <div className="flex h-[100dvh] min-h-[500px] w-full flex-col overflow-hidden bg-[#F6F9FC] font-sans text-[#123653]">
      <header ref={headerRef} className="relative z-[1200] shrink-0 border-b border-[#E5DED2] bg-[#F5F1EB] shadow-[0_6px_25px_rgba(26,49,45,0.09)]">
        {/* Dark editorial navigation gives the map explorer a clear visual hierarchy. */}
        <div className="bg-[#1B3230]">
        <div className="mx-auto flex min-h-[74px] max-w-[1800px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/"
              aria-label="Back to SL Business Index homepage"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/[0.05] text-[#E2EEE8] transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            >
              <ArrowLeft size={19} />
            </Link>
            <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] border border-[#D2AA72]/35 bg-[#E5B77C]/15 text-[#F3D4A4]">
              <Compass size={21} strokeWidth={1.7} />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-[17px] font-semibold tracking-[-0.04em] text-white sm:text-[20px]">
                Nearby Explorer<span className="text-[#E7BC81]">.</span>
              </h1>
              <p className="hidden text-[11px] font-medium text-[#AFC7BD] sm:block">Your Sri Lanka. Your next discovery.</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link href="/category" className="hidden rounded-xl px-4 py-2.5 text-[12px] font-semibold text-[#BFD2CA] transition-colors hover:bg-white/10 hover:text-white md:inline-flex">
              Categories
            </Link>
            <Link href="/" className="hidden rounded-xl px-4 py-2.5 text-[12px] font-semibold text-[#BFD2CA] transition-colors hover:bg-white/10 hover:text-white lg:inline-flex">
              Home
            </Link>
            <button
              type="button"
              disabled={locationLoading}
              onClick={locateMe}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#E8BB7B] px-3.5 text-[12px] font-semibold text-[#203936] transition-colors hover:bg-[#F4CE9A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 disabled:cursor-wait disabled:opacity-60 sm:px-4"
            >
              <LocateFixed size={17} className={locationLoading ? "animate-pulse" : ""} />
              <span className="hidden sm:inline">{locationLoading ? "Locating…" : "Use my location"}</span>
            </button>
          </div>
        </div>

        </div>

        {/* Consistent search, town selector and filters for every screen */}
        <div className="mx-auto flex max-w-[1800px] flex-col gap-2.5 px-4 pb-4 pt-3.5 sm:px-6 md:flex-row md:items-stretch md:gap-3 lg:px-8">
          <div className="relative min-w-0 flex-1">
            <form onSubmit={submitSearch} role="search" className="flex h-[51px] items-center gap-2 rounded-[14px] border border-[#E3DCD0] bg-white p-1.5 pl-3.5 shadow-[0_3px_12px_rgba(30,58,53,0.04)] focus-within:border-[#8EBAAB] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#D7E9DC]/80">
              <Search size={18} className="shrink-0 text-[#7C9AAF]" />
              <input
                type="search"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                onFocus={() => { setSearchFocused(true); setAreaOpen(false); setFiltersOpen(false); }}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setSearchFocused(false);
                    event.currentTarget.blur();
                  }
                }}
                aria-label="Search nearby businesses and services"
                aria-expanded={searchDropdownOpen}
                aria-controls="nearby-search-suggestions"
                autoComplete="off"
                maxLength={160}
                placeholder="Search businesses, services or towns"
                className="h-full min-w-0 flex-1 bg-transparent text-[13px] font-medium text-[#163D5A] outline-none placeholder:font-normal placeholder:text-[#91A7B9] sm:text-[14px]"
              />
              {searchText && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => { applySearch({ query: "" }); }}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-[#EAF2F8] hover:text-[#244E6D]"
                >
                  <X size={16} />
                </button>
              )}
              <button
                type="submit"
                className="inline-flex h-[39px] shrink-0 items-center justify-center gap-1.5 rounded-[10px] bg-[#256C60] px-3.5 text-[12px] font-semibold text-white transition-colors hover:bg-[#174F47] sm:px-5"
              >
                <Search size={15} />
                <span className="hidden sm:inline">Search</span>
              </button>
            </form>

            {searchDropdownOpen && (
              <div
                id="nearby-search-suggestions"
                className="absolute inset-x-0 top-full z-[1600] mt-2 max-h-[min(360px,55dvh)] overflow-y-auto overscroll-auto rounded-2xl border border-[#DCE6EF] bg-white p-2 shadow-[0_18px_45px_rgba(11,45,75,0.16)]"
              >
                {categorySuggestions.length > 0 && (
                  <div className="border-b border-[#EDF1F5] pb-2">
                    <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-[0.15em] text-[#8DA3B7]">Categories</p>
                    {categorySuggestions.map((item: any) => (
                      <button key={item.id} type="button" onClick={() => applySearch({ category: item.name, query: "" })}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-[#214B6A] hover:bg-[#F1F7FB]">
                        <Building2 size={16} className="shrink-0 text-[#538BB3]" />
                        <span className="min-w-0 flex-1 truncate">{item.name}</span>
                        <ArrowUpRight size={14} className="text-[#9CB4C6]" />
                      </button>
                    ))}
                  </div>
                )}
                {suggestions.length > 0 && (
                  <div className="border-b border-[#EDF1F5] pb-2">
                    <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-[0.15em] text-[#8DA3B7]">Business matches</p>
                    {suggestions.map((business: any) => (
                      <Link
                        key={business.id}
                        href={"/business/" + (business.slug || business.id)}
                        onClick={closePopovers}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-[#F1F7FB]"
                      >
                        <Building2 size={16} className="shrink-0 text-[#538BB3]" />
                        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[#214B6A]">{business.name}</span>
                        <ArrowUpRight size={14} className="text-[#9CB4C6]" />
                      </Link>
                    ))}
                  </div>
                )}
                {townSuggestions.length > 0 && (
                  <div className="pb-1">
                    <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-[0.15em] text-[#8DA3B7]">Towns</p>
                    {townSuggestions.map((town) => (
                      <button
                        key={town.name + town.district}
                        type="button"
                        onClick={() => selectArea({ label: town.name, description: town.district + " · Town", lat: town.lat, lng: town.lon, kind: "town" })}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] text-[#214B6A] hover:bg-[#F1F7FB]"
                      >
                        <MapPin size={16} className="text-[#538BB3]" />
                        <span className="min-w-0 flex-1 truncate">{town.name}, {town.district}</span>
                      </button>
                    ))}
                  </div>
                )}
                {!suggestionsLoading && categorySuggestions.length === 0 && suggestions.length === 0 && townSuggestions.length === 0 && (
                  <p className="px-3 py-4 text-[13px] text-[#7B93A6]">No suggestions. Press Search to explore this term.</p>
                )}
                {suggestionsLoading && (
                  <p className="px-3 py-2 text-[11px] text-[#8DA3B7]">Finding matches…</p>
                )}
                <button type="button" onClick={() => submitSearch()} className="mt-1 flex w-full items-center justify-between rounded-xl bg-[#EEF6FB] px-3 py-3 text-[12px] font-semibold text-[#18517B] hover:bg-[#DFEEF8]">
                  Search for “{searchText.trim()}” <ArrowRight size={16} />
                </button>
              </div>
            )}
          </div>

          <div className="flex min-w-0 items-stretch gap-2 md:w-auto md:max-w-[530px]">
            <div className="relative min-w-0 flex-1 md:w-[235px]">
              <button
                type="button"
                aria-label="Choose district or town"
                aria-controls="nearby-area-picker"
                aria-expanded={areaOpen}
                onClick={() => { setAreaOpen(value => !value); setAreaText(""); setSearchFocused(false); setFiltersOpen(false); }}
                className="flex h-[51px] w-full min-w-0 items-center gap-2.5 rounded-[14px] border border-[#E3DCD0] bg-white px-3.5 text-left shadow-[0_3px_12px_rgba(30,58,53,0.04)] transition-colors hover:border-[#B4CABB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
              >
                <MapPin size={18} className="shrink-0 text-[#4285B1]" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[9px] font-bold uppercase tracking-[0.09em] text-[#8AA4B8]">Exploring area</span>
                  <span className="mt-0.5 block truncate text-[12px] font-semibold text-[#1B4868]">{location.label}</span>
                </span>
                <ChevronDown size={15} className={"shrink-0 text-[#7995AA] transition-transform " + (areaOpen ? "rotate-180" : "")} />
              </button>
              {areaOpen && (
                <div id="nearby-area-picker" className="absolute left-0 top-full z-[1600] mt-2 w-[min(340px,calc(100vw-32px))] overflow-hidden rounded-2xl border border-[#DFE8EF] bg-white p-2 shadow-[0_18px_45px_rgba(11,45,75,0.16)] md:right-0 md:left-auto">
                  <div className="flex items-center gap-2 rounded-xl border border-[#E0EAF2] bg-[#F7FAFD] px-3">
                    <Search size={15} className="text-[#7896AC]" />
                    <input
                      type="search"
                      autoFocus
                      value={areaText}
                      onChange={event => setAreaText(event.target.value)}
                      aria-label="Find a district or town in Sri Lanka"
                      placeholder="Search district or town..."
                      className="h-11 min-w-0 flex-1 bg-transparent text-[13px] text-[#183E5B] outline-none placeholder:text-[#92A7B7]"
                    />
                  </div>
                  <div className="mt-1 max-h-[268px] overflow-y-auto">
                    {areaOptions.map((choice, index) => (
                      <button
                        type="button"
                        key={choice.kind + choice.label + index}
                        onClick={() => selectArea(choice)}
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-[#EFF7FC]"
                      >
                        <MapPin size={15} className="shrink-0 text-[#538BB3]" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-semibold text-[#224B68]">{choice.label}</span>
                          <span className="block text-[11px] text-[#91A6B7]">{choice.description}</span>
                        </span>
                        <ArrowUpRight size={14} className="text-[#A1B6C5]" />
                      </button>
                    ))}
                    {areaOptions.length === 0 && <p className="px-3 py-5 text-[13px] text-slate-500">No matching locations found.</p>}
                  </div>
                  <button type="button" onClick={locateMe} className="mt-2 flex w-full items-center gap-2 rounded-xl border-t border-[#EEF2F5] px-3 py-3 text-[12px] font-semibold text-[#19557D] hover:bg-[#F1F7FB]">
                    <LocateFixed size={16} /> Use my current location
                  </button>
                </div>
              )}
            </div>

            <div className="relative shrink-0">
              <button
                type="button"
                aria-expanded={filtersOpen}
                aria-controls="nearby-filter-panel"
                onClick={openFilters}
                className="relative inline-flex h-[51px] items-center gap-2 rounded-[14px] border border-[#E3DCD0] bg-white px-3.5 text-[12px] font-semibold text-[#385B52] shadow-[0_3px_12px_rgba(30,58,53,0.04)] transition-colors hover:border-[#B4CABB] hover:bg-[#FAFCF8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 sm:px-4"
              >
                <SlidersHorizontal size={18} className="text-[#5686A9]" />
                Filters
                {activeFiltersCount > 0 && <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#E8F4FC] px-1 text-[10px] text-[#18517B]">{activeFiltersCount}</span>}
              </button>

              {filtersOpen && (
                <>
                  <div className="fixed inset-0 z-[1700] bg-[#071F35]/45 md:hidden" onClick={() => setFiltersOpen(false)} />
                  <div
                    id="nearby-filter-panel"
                    role="dialog"
                    aria-label="Nearby search filters"
                    className="fixed inset-x-0 bottom-0 z-[1701] max-h-[88dvh] overflow-hidden rounded-t-[26px] bg-white shadow-[0_-18px_60px_rgba(0,0,0,0.18)] md:absolute md:inset-x-auto md:right-0 md:bottom-auto md:top-full md:mt-2 md:w-[354px] md:rounded-[22px] md:border md:border-[#DDE8F0] md:shadow-[0_20px_55px_rgba(14,48,77,0.18)]"
                  >
                    <div className="flex items-center justify-between gap-3 border-b border-[#EDF2F6] px-5 py-5">
                      <div>
                        <h2 className="text-[17px] font-semibold tracking-[-0.04em] text-[#173D5B]">Refine your search</h2>
                        <p className="mt-1 text-[12px] text-[#859EB1]">Find the results that matter.</p>
                      </div>
                      <button type="button" aria-label="Close filters" onClick={() => setFiltersOpen(false)}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#DFE9F0] text-[#7190A5] hover:bg-[#F2F7FA]">
                        <X size={18} />
                      </button>
                    </div>
                    <div className="max-h-[min(56dvh,440px)] overflow-y-auto px-5 py-5">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-[13px] font-semibold text-[#1C4565]">Search radius</h3>
                        <span className="rounded-full bg-[#EAF4FC] px-3 py-1 text-[12px] font-bold text-[#1D6491]">{formatDistance(radiusDraft)}</span>
                      </div>
                      <Slider min={1000} max={50000} step={1000} value={[radiusDraft]} onValueChange={value => setRadiusDraft(value[0])} className="mt-5 py-2" />
                      <div className="mt-2 flex justify-between text-[11px] text-[#90A3B1]"><span>1 km</span><span>50 km</span></div>
                      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Quick radius selection">
                        {[2000, 5000, 10000, 25000, 50000].map(distance => (
                          <button key={distance} type="button" onClick={() => setRadiusDraft(distance)} aria-pressed={radiusDraft === distance}
                            className={"min-h-9 rounded-full border px-3 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 " + (radiusDraft === distance ? "border-[#123D63] bg-[#123D63] text-white" : "border-[#DDE7EF] text-[#54768F] hover:bg-[#F0F7FB]")}>
                            {formatDistance(distance)}
                          </button>
                        ))}
                      </div>

                      <div className="mt-7 space-y-3 border-t border-[#EEF2F5] pt-6">
                        <h3 className="text-[13px] font-semibold text-[#1C4565]">More ways to discover</h3>
                        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-[#E1E9EF] bg-[#F9FAF8] px-3.5 py-3">
                          <span className="flex items-center gap-2 text-[12px] font-medium text-[#395B5B]"><BadgeCheck size={16} className="text-[#367D73]"/> Verified listings only</span>
                          <input type="checkbox" checked={draftVerifiedOnly} onChange={event => setDraftVerifiedOnly(event.target.checked)} className="h-4 w-4 accent-[#21766C]" />
                        </label>
                        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-[#E1E9EF] bg-[#F9FAF8] px-3.5 py-3">
                          <span className="flex items-center gap-2 text-[12px] font-medium text-[#395B5B]"><Camera size={16} className="text-[#367D73]"/> Listings with photos</span>
                          <input type="checkbox" checked={draftWithPhotosOnly} onChange={event => setDraftWithPhotosOnly(event.target.checked)} className="h-4 w-4 accent-[#21766C]" />
                        </label>
                      </div>

                      <div className="mt-7 border-t border-[#EEF2F5] pt-6">
                        <h3 className="mb-4 text-[13px] font-semibold text-[#1C4565]">Business category</h3>
                        <div className="flex max-h-[230px] flex-wrap gap-2 overflow-y-auto pr-1">
                          <button
                            type="button"
                            onClick={() => setDraftCategory(null)}
                            className={"rounded-full border px-3 py-2 text-[12px] font-medium transition-colors " + (!draftCategory ? "border-[#1B547A] bg-[#123D63] text-white" : "border-[#DDE7EF] text-[#54768F] hover:bg-[#F0F7FB]")}
                          >
                            All categories
                          </button>
                          {categories.map((item: any) => (
                            <button
                              type="button"
                              key={item.id}
                              onClick={() => setDraftCategory(item.name)}
                              className={"rounded-full border px-3 py-2 text-[12px] font-medium transition-colors " + (draftCategory === item.name ? "border-[#1B547A] bg-[#123D63] text-white" : "border-[#DDE7EF] text-[#54768F] hover:bg-[#F0F7FB]")}
                            >
                              {item.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-3 border-t border-[#EEF2F5] bg-white px-5 py-4 pb-[max(16px,env(safe-area-inset-bottom))]">
                      <button type="button" onClick={() => { setDraftCategory(null); setRadiusDraft(10000); setDraftVerifiedOnly(false); setDraftWithPhotosOnly(false); }}
                        className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#DDE7EF] px-4 text-[12px] font-semibold text-[#597B92] hover:bg-[#F5F9FC]">
                        <RotateCcw size={15} /> Reset
                      </button>
                      <button type="button" onClick={() => applySearch({ category: draftCategory, radius: radiusDraft, verifiedOnly: draftVerifiedOnly, withPhotosOnly: draftWithPhotosOnly })}
                        className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#123D63] px-4 text-[12px] font-semibold text-white hover:bg-[#1B5C8D]">
                        Apply filters <ArrowRight size={16} />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        {/* Discovery shortcuts: only categories present in the database. */}
        <nav aria-label="Quick discovery categories" className="mx-auto flex max-w-[1800px] items-center gap-2 overflow-x-auto border-t border-[#E8E0D5] bg-[#EEE9E1] px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:px-6 lg:px-8">
          <span className="mr-1 hidden shrink-0 items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.11em] text-[#796F5F] sm:inline-flex">
            <Sparkles size={14} className="text-[#3F897A]"/> Explore
          </span>
          <button
            type="button"
            onClick={() => applySearch({ category: null, query: "", verifiedOnly: false, withPhotosOnly: false })}
            aria-pressed={!category && !appliedQuery && !verifiedOnly && !withPhotosOnly}
            className={"inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 " + (!category && !appliedQuery && !verifiedOnly && !withPhotosOnly ? "border-[#2E7568] bg-[#276F62] text-white" : "border-[#DDD8CD] bg-[#FCFAF6] text-[#536F63] hover:border-[#AFCBB5] hover:bg-[#F1F8F1]")}
          >
            <Compass size={13} /> All businesses
          </button>
          {quickCategories.map((item: any) => {
            const selected = category === item.name;
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={selected}
                onClick={() => applySearch({ category: selected ? null : item.name, query: "" })}
                className={"inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 " + (selected ? "border-[#14466D] bg-[#103A60] text-white" : "border-[#DEEBF3] bg-[#F7FAFD] text-[#557B95] hover:border-[#B5D2E4] hover:bg-[#EDF6FC]")}
              >
                {selected && <Check size={12}/>}
                {item.name}
              </button>
            );
          })}
          <Link href="/category" className="ml-auto inline-flex min-h-9 shrink-0 items-center gap-1.5 px-2 text-[11px] font-semibold text-[#307A68] transition-colors hover:text-[#184B3F]">
            More categories <ArrowUpRight size={13}/>
          </Link>
        </nav>

        {location.kind === "default" && !locationNotice && (
          <div role="status" className="mx-auto flex max-w-[1800px] items-center justify-between gap-3 border-t border-[#EBF0F4] bg-[#F2F8FC] px-4 py-2 text-[11px] text-[#4B7694] sm:px-6 lg:px-8">
            <span className="inline-flex min-w-0 items-center gap-2">
              <MapPin size={14} className="shrink-0" />
              Starting in Colombo. Choose a district or town, or use your location for nearby results.
            </span>
            <button type="button" onClick={locateMe} disabled={locationLoading} className="inline-flex shrink-0 items-center gap-1.5 font-semibold text-[#195C89] hover:text-[#0C3554] disabled:opacity-60">
              <LocateFixed size={14}/><span className="hidden sm:inline">Use my location</span>
            </button>
          </div>
        )}
        {locationNotice && (
          <div role="status" className="mx-auto flex max-w-[1800px] items-center justify-between gap-3 border-t border-[#E4EDF4] px-4 py-2 text-[12px] text-[#9A5824] sm:px-6 lg:px-8">
            <span>{locationNotice}</span>
            <button type="button" onClick={() => setLocationNotice("")} aria-label="Dismiss location notice"><X size={16}/></button>
          </div>
        )}
      </header>

      {/* Desktop split view. Mobile switches between map and results without blocking scrolling. */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside id="nearby-results" className={(mobileView === "list" ? "flex" : "hidden") + " w-full min-h-0 flex-col border-r border-[#E0EAF1] bg-[#F7FAFC] md:flex md:w-[420px] md:shrink-0 xl:w-[490px]"} aria-label="Nearby business results">
          <div className="shrink-0 border-b border-[#E3EBF1] bg-white px-4 pb-4 pt-5 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#6489A4]">Explore listings</p>
                <h2 aria-live="polite" className="mt-1.5 text-[24px] font-semibold tracking-[-0.055em] text-[#123B5A]">
                  {loadingBusinesses ? "Finding businesses…" : resultsMessage(visibleBusinesses.length)}
                </h2>
              </div>
              {isFetching && !loadingBusinesses && <span className="shrink-0 rounded-full bg-[#E9F4FC] px-2.5 py-1 text-[10px] font-semibold text-[#337BA5]">Updating</span>}
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 flex-wrap gap-1.5">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F0F6FA] px-3 py-1.5 text-[11px] font-medium text-[#4E7895]">
                  <MapPin size={12} /> {location.label}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F0F6FA] px-3 py-1.5 text-[11px] font-medium text-[#4E7895]">{formatDistance(radius)} radius</span>
                {category && <button type="button" onClick={() => applySearch({ category: null })} aria-label="Clear category filter" className="inline-flex items-center gap-1.5 rounded-full bg-[#DDEFFB] px-3 py-1.5 text-[11px] font-semibold text-[#215B80] hover:bg-[#CBE4F5]">{category} <X size={12}/></button>}
                {appliedQuery && <button type="button" onClick={() => applySearch({ query: "" })} aria-label="Clear search query" className="inline-flex items-center gap-1.5 rounded-full bg-[#DDEFFB] px-3 py-1.5 text-[11px] font-semibold text-[#215B80] hover:bg-[#CBE4F5]">{appliedQuery} <X size={12}/></button>}
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between gap-2">
              <p className="text-[11px] text-[#8DA3B3]">{sortBy === "nearest" ? "Closest first" : sortBy === "top-rated" ? "Highest rated first" : "A to Z"}</p>
              <label className="flex items-center gap-2 text-[11px] font-semibold text-[#557B95]">
                Sort by
                <select
                  value={sortBy}
                  onChange={event => setSortBy(event.target.value as SortMode)}
                  className="rounded-lg border border-[#DDE8F0] bg-white px-2.5 py-2 text-[12px] text-[#234F70] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                >
                  <option value="nearest">Nearest</option>
                  <option value="top-rated">Top rated</option>
                  <option value="alphabetical">Name (A–Z)</option>
                </select>
              </label>
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-3 py-4 sm:px-4">
            {loadingBusinesses ? (
              Array.from({ length: 5 }, (_, i) => (
                <div key={i} className="flex gap-4 rounded-[20px] border border-[#E0EAF2] bg-white p-4">
                  <div className="h-[94px] w-[94px] shrink-0 animate-pulse rounded-[15px] bg-[#E8F0F6]" />
                  <div className="min-w-0 flex-1 space-y-3 py-2">
                    <div className="h-3 w-2/3 animate-pulse rounded bg-[#E8F0F6]" />
                    <div className="h-2.5 w-1/2 animate-pulse rounded bg-[#E8F0F6]" />
                    <div className="h-2.5 w-4/5 animate-pulse rounded bg-[#E8F0F6]" />
                  </div>
                </div>
              ))
            ) : error ? (
              <div className="rounded-[24px] border border-[#E5EDF3] bg-white px-6 py-12 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F1F7FB] text-[#5789AA]"><RotateCcw size={25}/></div>
                <h3 className="mt-5 text-[18px] font-semibold text-[#163B58]">We could not load businesses.</h3>
                <p className="mt-2 text-[13px] leading-6 text-[#8198AA]">Check your connection and try again.</p>
                <button type="button" onClick={() => void refetch()} className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-[#123D63] px-5 text-[13px] font-semibold text-white hover:bg-[#1B5E8E]">
                  <RotateCcw size={16}/> Try again
                </button>
              </div>

            ) : visibleBusinesses.length === 0 ? (
              <div className="space-y-4 pb-6">
                <div className="relative overflow-hidden rounded-[24px] bg-[#1D3534] p-5 text-white shadow-[0_15px_36px_rgba(25,52,50,0.14)] sm:p-6">
                  <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-28 h-64 w-64 rounded-full border-[35px] border-white/[0.06]" />
                  <div className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-[#F3CC93]">
                    <Compass size={23} strokeWidth={1.65}/>
                  </div>
                  <p className="relative mt-6 text-[10px] font-bold uppercase tracking-[0.17em] text-[#EAC48C]">Keep exploring</p>
                  <h3 className="relative mt-2 text-[23px] font-semibold leading-[1.2] tracking-[-0.045em] text-white">
                    Your next discovery is out there.
                  </h3>
                  <p className="relative mt-3 max-w-[330px] text-[13px] leading-[1.75] text-[#CBDBD6]">
                    Our directory has no matches for these settings. Broaden your search or try another place.
                  </p>
                  <div className="relative mt-6 flex flex-wrap gap-2">
                    {radius < 50000 && (
                      <button type="button" onClick={() => applySearch({ radius: Math.min(radius + 15000, 50000) })}
                        className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#E9BB78] px-4 text-[12px] font-bold text-[#17312F] transition-colors hover:bg-[#F2CF9B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300">
                        <Route size={15}/> Widen to {formatDistance(Math.min(radius + 15000, 50000))}
                      </button>
                    )}
                    {(category || appliedQuery || verifiedOnly || withPhotosOnly) && (
                      <button type="button" onClick={() => applySearch({ category: null, query: "", verifiedOnly: false, withPhotosOnly: false })}
                        className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/25 px-4 text-[12px] font-semibold text-white transition-colors hover:bg-white/10">
                        <RotateCcw size={14}/> Clear filters
                      </button>
                    )}
                    <button type="button" onClick={() => setAreaOpen(true)}
                      className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/25 px-4 text-[12px] font-semibold text-white transition-colors hover:bg-white/10">
                      <MapPin size={14}/> Choose a town
                    </button>
                  </div>
                </div>

                <div className="rounded-[22px] border border-[#E4DDD2] bg-white p-4 shadow-[0_5px_20px_rgba(28,52,49,0.035)] sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#B18A57]">Explore Sri Lanka</p>
                      <h3 className="mt-1.5 text-[18px] font-semibold tracking-[-0.035em] text-[#253E3A]">Jump to another area</h3>
                    </div>
                    <Globe2 size={20} className="text-[#B79A73]"/>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {DISCOVERY_AREAS.map(area => (
                      <button
                        type="button"
                        key={area.name}
                        onClick={() => applySearch({
                          location: { ...DISTRICTS[area.name], label: area.name + " District", kind: "district" },
                          query: "", category: null, verifiedOnly: false, withPhotosOnly: false, zoom: 11,
                        })}
                        className="group flex min-h-[70px] items-center gap-2.5 rounded-[13px] border border-[#E8E7E0] bg-[#F8F8F4] px-3 text-left transition-[background,border-color] hover:border-[#AACCC1] hover:bg-[#EDF6F0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#81BDA8]"
                      >
                        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-[#E5EEE8] text-[#427565]"><MapPin size={15}/></span>
                        <span className="min-w-0">
                          <span className="block truncate text-[12px] font-semibold text-[#29413B]">{area.name}</span>
                          <span className="mt-0.5 block truncate text-[10px] text-[#82928B]">{area.detail}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-[22px] border border-[#E4DDD2] bg-white p-4 shadow-[0_5px_20px_rgba(28,52,49,0.035)] sm:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#A5885F]">Explore by interest</p>
                      <h3 className="mt-1.5 text-[18px] font-semibold tracking-[-0.035em] text-[#253E3A]">What are you looking for?</h3>
                    </div>
                    <SlidersHorizontal size={19} className="text-[#B59A79]"/>
                  </div>
                  {categories.length > 0 ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {categories.slice(0, 7).map((item: any) => (
                        <button key={item.id} type="button"
                          onClick={() => applySearch({ category: item.name, query: "", verifiedOnly: false, withPhotosOnly: false })}
                          className="min-h-9 rounded-full border border-[#D8E6DE] bg-[#F2F8F4] px-3 text-[11px] font-semibold text-[#356957] transition-colors hover:border-[#9CC6AE] hover:bg-[#E0F0E6]">
                          {item.name}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-[12px] leading-6 text-[#81978A]">Browse the full directory to find the right service category.</p>
                  )}
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-[#F0EFE9] pt-4">
                    <Link href="/category" className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#397562] hover:text-[#1D4E40]">
                      Browse categories <ArrowUpRight size={14}/>
                    </Link>
                    <Link href="/search" className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#397562] hover:text-[#1D4E40]">
                      Search island-wide <ArrowRight size={14}/>
                    </Link>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-[17px] border border-[#E4E5D9] bg-[#F4F4EC] px-4 py-4">
                  <LocateFixed size={20} className="shrink-0 text-[#6A9483]"/>
                  <p className="min-w-0 flex-1 text-[12px] leading-5 text-[#687E73]">Prefer results around you? Location access is optional.</p>
                  <button type="button" onClick={locateMe} disabled={locationLoading} className="shrink-0 text-[12px] font-bold text-[#37735E] hover:underline disabled:opacity-50">
                    Use GPS
                  </button>
                </div>
              </div>
            ) : (
              visibleBusinesses.slice(0, resultLimit).map((business) => {
                const active = selectedBusiness?.id === business.id;
                const rating = Number(business.rating);
                return (
                  <article key={business.id} className={"group rounded-[23px] border bg-white p-3.5 shadow-[0_6px_22px_rgba(15,46,73,0.035)] transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-[#AFCFE2] hover:shadow-[0_13px_30px_rgba(15,46,73,0.095)] " + (active ? "border-[#7BB4D9] ring-1 ring-[#D4EAF8]" : "border-[#DFE9F1]")}>
                    <button
                      type="button"
                      onClick={() => showBusinessOnMap(business)}
                      aria-label={"Show " + business.name + " on the map"}
                      className="flex w-full items-start gap-3.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                    >
                      <div className="flex h-[92px] w-[92px] shrink-0 items-center justify-center overflow-hidden rounded-[15px] bg-gradient-to-br from-[#EAF3FA] to-[#D7E7F2] text-[#7BA8C4] sm:h-[104px] sm:w-[104px]">
                        {business.logo_url || business.image_url ? (
                          <img
                            loading="lazy"
                            decoding="async"
                            src={business.logo_url || business.image_url}
                            alt={business.name}
                            className="h-full w-full object-cover"
                          />
                        ) : <Building2 size={34} strokeWidth={1.3}/>}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-1.5">
                          <h3 className="line-clamp-2 min-w-0 flex-1 text-[15px] font-semibold leading-[1.4] tracking-[-0.025em] text-[#123B5B] sm:text-[16px]">{business.name}</h3>
                          {business.is_verified && business.can_show_badge && <VerifiedBadge size={15}/>}
                        </div>
                        <p className="mt-1.5 truncate text-[11px] font-semibold text-[#4381A9]">{business.category || "Local business"}</p>
                        <p className="mt-2 line-clamp-2 text-[11px] leading-4 text-[#8198A9]">{business.detailed_address || business.address || business.city || "Sri Lanka"}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-semibold">
                          {business.distanceText && <span className="inline-flex items-center gap-1 rounded-full bg-[#EDF5FB] px-2.5 py-1 text-[#326A90]"><MapPin size={11}/>{business.distanceText}</span>}
                          {Number.isFinite(rating) && rating > 0 && <span className="inline-flex items-center gap-1 text-[#B37A21]"><Star size={12} className="fill-amber-400 text-amber-400"/>{rating.toFixed(1)}</span>}
                        </div>
                      </div>
                    </button>
                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-[#EFF3F6] pt-3">
                      <span className="inline-flex items-center gap-1.5 text-[11px] text-[#8199AA]"><Compass size={13} /> Business profile</span>
                      <div className="flex items-center gap-3">
                        <button type="button" onClick={() => showBusinessOnMap(business)} className="text-[12px] font-semibold text-[#477FA2] hover:text-[#1B5175]">Show on map</button>
                        <Link href={"/business/" + (business.slug || business.id)} className="inline-flex items-center gap-1 text-[12px] font-bold text-[#164D76] hover:text-[#0B304F]">View profile <ArrowUpRight size={14}/></Link>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
            {!loadingBusinesses && !error && visibleBusinesses.length > resultLimit && (
              <button
                type="button"
                onClick={() => setResultLimit(limit => limit + 30)}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-[16px] border border-[#DCE7EF] bg-white px-5 text-[12px] font-semibold text-[#20597F] transition-colors hover:bg-[#EDF6FB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
              >
                Show more results
                <span className="text-[#91A8B7]">({visibleBusinesses.length - resultLimit} remaining)</span>
                <ChevronDown size={16}/>
              </button>
            )}
          </div>
        </aside>

        <main className={(mobileView === "map" ? "flex" : "hidden") + " relative min-h-0 min-w-0 flex-1 flex-col bg-[#E5EFF6] md:flex"} aria-label="Interactive business map">
          <div className="absolute inset-0">
            <LeafletMap
              centerLat={mapCenter.lat}
              centerLng={mapCenter.lng}
              userLat={userPosition?.lat}
              userLng={userPosition?.lng}
              businesses={mapFeatures}
              zoom={mapZoom}
              radius={radius}
              height="100%"
              onMarkerClick={onMarkerClicked}
              onMapMove={onMapMoved}
              onMapClick={onMapClicked}
              wrapperClassName="h-full w-full overflow-hidden z-0"
            />
          </div>
          {pendingArea && (
            <div className="absolute left-1/2 top-5 z-[900] -translate-x-1/2">
              <button
                type="button"
                onClick={() => {
                  applySearch({
                    location: { lat: pendingArea.lat, lng: pendingArea.lng, label: "Selected map area", kind: "coordinates" },
                    zoom: pendingArea.zoom,
                  });
                }}
                className="inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-full bg-[#123E65] px-5 text-[12px] font-semibold text-white shadow-[0_12px_30px_rgba(10,40,65,0.25)] transition-colors hover:bg-[#20618F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
              >
                <Search size={16} /> Search this area
              </button>
            </div>
          )}
          {!pendingArea && (
            <div className="pointer-events-none absolute left-4 top-4 z-[800] hidden md:block">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#DCE8F0] bg-white/95 px-4 py-2 text-[11px] font-semibold text-[#3B7194] shadow-sm">
                <Sparkles size={14}/> Explore the map · Select a pin
              </div>
            </div>
          )}
          {selectedBusiness && (
            <div className="absolute bottom-5 left-4 right-4 z-[900] md:bottom-6 md:left-6 md:right-auto md:w-[min(360px,calc(100%-48px))]">
              <div className="rounded-[24px] border border-[#DCE8F0] bg-white p-4 shadow-[0_18px_50px_rgba(8,40,66,0.22)]">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#7495AB]">Selected business</p>
                    <h3 className="mt-1.5 line-clamp-2 text-[17px] font-semibold tracking-[-0.03em] text-[#163F5D]">{selectedBusiness.name}</h3>
                    <p className="mt-1 truncate text-[12px] text-[#7894A8]">{selectedBusiness.category || "Local business"}</p>
                  </div>
                  <button type="button" onClick={() => setSelectedBusiness(null)} aria-label="Close selected business" className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#E5ECF2] text-[#7895AA] hover:bg-[#F2F7FA]">
                    <X size={16}/>
                  </button>
                </div>
                <div className="mt-4 flex items-center gap-3 rounded-[16px] bg-[#F3F8FC] p-2.5">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#DFEBF4] text-[#5A91B4]">
                    {selectedBusiness.logo_url || selectedBusiness.image_url ? (
                      <img src={selectedBusiness.logo_url || selectedBusiness.image_url} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                    ) : <Building2 size={23} strokeWidth={1.5} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-semibold text-[#244E69]">{selectedBusiness.city || selectedBusiness.address || "Sri Lanka"}</p>
                    <div className="mt-1 flex items-center gap-2 text-[11px] text-[#6489A3]">
                      {typeof selectedBusiness.distance_meters === "number" && <span>{formatDistance(selectedBusiness.distance_meters)} away</span>}
                      {Number(selectedBusiness.rating) > 0 && <span className="inline-flex items-center gap-1"><Star size={12} className="fill-amber-400 text-amber-400"/>{Number(selectedBusiness.rating).toFixed(1)}</span>}
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Link href={"/business/" + (selectedBusiness.slug || selectedBusiness.id)} className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-[#123E65] px-4 text-[12px] font-semibold text-white hover:bg-[#205E8B]">
                    View profile <ArrowUpRight size={14}/>
                  </Link>
                  {validCoords(Number(selectedBusiness.latitude), Number(selectedBusiness.longitude)) && (
                    <a
                      href={"https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(selectedBusiness.latitude + "," + selectedBusiness.longitude)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[#DCE7EF] px-3.5 text-[12px] font-semibold text-[#235A7C] hover:bg-[#F2F8FC]"
                    >
                      <Navigation size={15} /> Directions
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="absolute bottom-24 right-4 z-[800] flex flex-col gap-2 md:bottom-6 md:right-5">
            <button type="button" onClick={locateMe} disabled={locationLoading} aria-label="Use my current location"
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#D5E3EC] bg-white text-[#275D82] shadow-[0_8px_22px_rgba(13,46,70,0.12)] hover:bg-[#EFF7FC] disabled:opacity-60">
              <LocateFixed size={20} className={locationLoading ? "animate-pulse" : ""}/>
            </button>
          </div>

          {visibleBusinesses.length > 0 && mobileView === "map" && !selectedBusiness && (
            <button type="button" onClick={() => setMobileView("list")} className="absolute bottom-5 left-1/2 z-[900] inline-flex min-h-12 -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border border-[#D7E5EF] bg-white px-5 text-[12px] font-semibold text-[#184869] shadow-[0_10px_30px_rgba(15,47,74,0.18)] md:hidden">
              <List size={17}/> {resultsMessage(visibleBusinesses.length)} <ArrowRight size={15}/>
            </button>
          )}
        </main>
      </div>

      {/* Native mobile navigator: map, listings, and filters. */}
      <nav aria-label="Nearby page views" className="z-[1000] flex shrink-0 items-stretch border-t border-[#DBE7F0] bg-white md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <button type="button" onClick={() => setMobileView("map")} aria-current={mobileView === "map" ? "page" : undefined}
          className={"flex h-[61px] flex-1 flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors " + (mobileView === "map" ? "text-[#16557F]" : "text-[#91A8B9]")}>
          <MapIcon size={20}/><span>Map</span>
        </button>
        <button type="button" onClick={() => setMobileView("list")} aria-current={mobileView === "list" ? "page" : undefined}
          className={"flex h-[61px] flex-1 flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors " + (mobileView === "list" ? "text-[#16557F]" : "text-[#91A8B9]")}>
          <List size={20}/><span>Listings</span>
        </button>
        <button type="button" onClick={openFilters} aria-expanded={filtersOpen}
          className={"relative flex h-[61px] flex-1 flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors " + (filtersOpen ? "text-[#16557F]" : "text-[#91A8B9]")}>
          <SlidersHorizontal size={20}/><span>Filters</span>
          {activeFiltersCount > 0 && <span className="absolute right-[calc(50%-21px)] top-2 h-2 w-2 rounded-full bg-[#3E94C4]"/>}
        </button>
      </nav>
    </div>
  );
}
