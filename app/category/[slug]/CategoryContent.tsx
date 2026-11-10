"use client";

import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight, ArrowUpRight, Building2, Check, ChevronLeft, ChevronRight,
  Grid2X2, List, MapPin, RotateCcw, Search, ShieldCheck, SlidersHorizontal,
  Star, X,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import CategoryIcon from "@/app/components/CategoryIcon";

export type CategoryInfo = {
  id: string | null;
  name: string;
  icon?: string | null;
  parent_id?: string | null;
};

type BusinessListing = {
  id: string;
  slug: string | null;
  name: string;
  category: string | null;
  description: string | null;
  address: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  image_url: string | null;
  logo_url: string | null;
  rating: number | null;
  reviews_count: number | null;
  is_verified: boolean | null;
  can_show_badge: boolean | null;
  created_at: string | null;
  distanceKm?: number;
};

type Filters = {
  town: string;
  radiusKm: number;
  minRating: number;
  verifiedOnly: boolean;
};

type Sort = "recommended" | "newest" | "rating" | "name" | "nearest";
type ViewMode = "grid" | "list";

const PAGE_SIZE = 12;
const COLUMN_LIST =
  "id,slug,name,category,description,address,city,latitude,longitude,image_url,logo_url,rating,reviews_count,is_verified,can_show_badge,created_at";
const INITIAL_FILTERS: Filters = { town: "", radiusKm: 30, minRating: 0, verifiedOnly: false };

// These public town coordinates are drawn from the existing SLBI town dataset.
// A selected-town radius is user-directed and never requests device location.
const TOWNS = [
  { name: "Ampara", lat: 7.2978118, lon: 81.6790194 },
  { name: "Anuradhapura", lat: 8.334985, lon: 80.4106096 },
  { name: "Badulla", lat: 6.9900353, lon: 81.0570315 },
  { name: "Batticaloa", lat: 7.7356027, lon: 81.6941956 },
  { name: "Colombo", lat: 6.9388614, lon: 79.8542005 },
  { name: "Ella", lat: 6.8736058, lon: 81.0489927 },
  { name: "Galle", lat: 6.0328139, lon: 80.214955 },
  { name: "Gampaha", lat: 7.0925595, lon: 79.9951396 },
  { name: "Hambantota", lat: 6.1249126, lon: 81.1242563 },
  { name: "Jaffna", lat: 9.665093, lon: 80.0093029 },
  { name: "Kalmunai", lat: 7.4131557, lon: 81.8269327 },
  { name: "Kalutara", lat: 6.5835219, lon: 79.9612508 },
  { name: "Kandy", lat: 7.2931208, lon: 80.6350358 },
  { name: "Kegalle", lat: 7.2532006, lon: 80.3454132 },
  { name: "Kilinochchi", lat: 9.3840068, lon: 80.4087224 },
  { name: "Kurunegala", lat: 7.4870464, lon: 80.364908 },
  { name: "Mannar", lat: 8.9812896, lon: 79.9043942 },
  { name: "Matale", lat: 7.4720453, lon: 80.6234307 },
  { name: "Matara", lat: 5.947822, lon: 80.5482919 },
  { name: "Monaragala", lat: 6.8725497, lon: 81.3507069 },
  { name: "Mullaitivu", lat: 9.2698532, lon: 80.8145347 },
  { name: "Negombo", lat: 7.2094282, lon: 79.833117 },
  { name: "Nuwara Eliya", lat: 6.9738863, lon: 80.767127 },
  { name: "Polonnaruwa", lat: 7.9395357, lon: 81.0003387 },
  { name: "Puttalam", lat: 8.0301856, lon: 79.8286583 },
  { name: "Ratnapura", lat: 6.6803691, lon: 80.4022975 },
  { name: "Trincomalee", lat: 8.576425, lon: 81.2344952 },
  { name: "Vavuniya", lat: 8.7593517, lon: 80.5000778 },
] as const;

function slugify(name: string) {
  return name.toLowerCase().trim().replace(/ & /g, "-").replace(/ /g, "-").replace(/,/g, "").replace(/[^\w-]+/g, "");
}

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = Math.PI / 180;
  const dLat = (lat2 - lat1) * toRad;
  const dLon = (lon2 - lon1) * toRad;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function ListingCard({ business, mode }: { business: BusinessListing; mode: ViewMode }) {
  const imageUrl = business.image_url || business.logo_url;
  const verified = Boolean(business.is_verified && business.can_show_badge);
  const rating = Number(business.rating || 0);
  return (
    <Link
      href={"/business/" + (business.slug || business.id)}
      prefetch={false}
      className={"group flex min-w-0 overflow-hidden rounded-[10px] border border-[#E2E8E1] bg-white transition-[border-color,box-shadow] duration-150 hover:border-[#A9CBB1] hover:shadow-[0_8px_22px_rgba(21,55,39,0.07)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#36785E] " +
        (mode === "list" ? "flex-col sm:flex-row" : "flex-col")}
    >
      <div className={"relative shrink-0 overflow-hidden bg-[#EFF3EC] " +
        (mode === "list" ? "aspect-[16/10] sm:aspect-auto sm:w-[215px] lg:w-[235px]" : "aspect-[16/10]")}>
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={business.name}
            fill
            loading="lazy"
            quality={68}
            sizes={mode === "list" ? "(max-width:640px) 100vw, 235px" : "(max-width:640px) 100vw, (max-width:1200px) 50vw, 33vw"}
            unoptimized={imageUrl.includes("supabase.co")}
            className={"h-full w-full " + (business.image_url ? "object-cover" : "object-contain p-8")}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,#F0F5EC,#DBE9DE)] text-[#60967C]">
            <Building2 size={46} strokeWidth={1.3} aria-hidden="true" />
          </div>
        )}
        {verified && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-[6px] border border-[#C4E4CB] bg-[#F5FFF7]/95 px-2.5 py-1 text-[10px] font-bold text-[#286A4B]">
            <ShieldCheck size={12} aria-hidden="true" /> Verified
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col p-4 sm:p-5">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="min-w-0 truncate text-[10px] font-bold uppercase tracking-[0.11em] text-[#448167]">{business.category || "Business"}</span>
          {rating > 0 && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-[5px] bg-[#FFF6E5] px-2 py-1 text-[11px] font-bold text-[#795721]">
              <Star size={12} className="fill-[#D7A347]" aria-hidden="true" /> {rating.toFixed(1)}
            </span>
          )}
        </div>
        <h3 className="line-clamp-2 text-[17px] font-semibold leading-[1.3] tracking-[-0.03em] text-[#1C3A2E] transition-colors group-hover:text-[#2F765C]">{business.name}</h3>
        <p className="mt-2 line-clamp-2 min-h-[37px] text-[12px] leading-[1.65] text-stone-500 sm:text-[13px]">
          {business.description?.trim() || "Explore this business and see the services it offers."}
        </p>
        <div className="mt-auto flex items-end justify-between gap-2 border-t border-[#EDF1E9] pt-4">
          <div className="flex min-w-0 flex-col gap-1 text-[11px] text-stone-500">
            <span className="flex items-center gap-1.5">
              <MapPin size={13} className="shrink-0 text-[#578C70]" aria-hidden="true" />
              <span className="truncate">
                {typeof business.distanceKm === "number"
                  ? business.distanceKm.toFixed(1) + " km from selected town"
                  : (business.city || (business.address && !/^\s*-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?\s*$/.test(business.address) ? business.address : "Sri Lanka"))}
              </span>
            </span>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-bold text-[#2C6D52]">
            View profile <ArrowUpRight size={15} aria-hidden="true" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function FilterPanel({
  category, allCategories, filters, onChange, onReset, idPrefix,
}: {
  category: CategoryInfo;
  allCategories: CategoryInfo[];
  filters: Filters;
  onChange: Dispatch<SetStateAction<Filters>>;
  onReset: () => void;
  idPrefix: string;
}) {
  const router = useRouter();
  const rootCategories = allCategories.filter((item) => !item.parent_id);

  const fieldLabel = "mb-2 block text-[11px] font-semibold tracking-[0.025em] text-[#355647]";
  const fieldInput = "h-11 w-full min-w-0 rounded-[8px] border border-[#D9E5D8] bg-white px-3 text-[12px] font-medium text-[#1B3430] outline-none transition-colors focus:border-[#579475] focus:ring-2 focus:ring-[#B5D9BF]/50";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 border-b border-[#E9EEE6] pb-4">
        <div className="flex items-center gap-2 text-[#1B3430]">
          <SlidersHorizontal size={17} aria-hidden="true" />
          <h2 className="text-[14px] font-bold">Refine results</h2>
        </div>
        <button type="button" onClick={onReset} className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#387657] hover:text-[#1B3430]">
          <RotateCcw size={12} aria-hidden="true" /> Reset
        </button>
      </div>

      <div>
        <label htmlFor={idPrefix + "-category"} className={fieldLabel}>Category / service</label>
        <select
          id={idPrefix + "-category"}
          value={category.name}
          onChange={(event) => router.push("/category/" + slugify(event.target.value))}
          className={fieldInput}
        >
          {!allCategories.some((item) => item.name === category.name) && <option value={category.name}>{category.name}</option>}
          {rootCategories.map((root) => (
            <optgroup key={root.id || root.name} label={root.name}>
              <option value={root.name}>{root.name} — All</option>
              {allCategories
                .filter((item) => item.parent_id != null && item.parent_id === root.id)
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((item) => <option key={item.id || item.name} value={item.name}>{item.name}</option>)}
            </optgroup>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor={idPrefix + "-town"} className={fieldLabel}>Search near a town</label>
        <select
          id={idPrefix + "-town"}
          className={fieldInput}
          value={filters.town}
          onChange={(event) => onChange((prev) => ({ ...prev, town: event.target.value }))}
        >
          <option value="">Anywhere in Sri Lanka</option>
          {TOWNS.map((town) => <option key={town.name} value={town.name}>{town.name}</option>)}
        </select>
        {filters.town ? (
          <div className="mt-3">
            <label htmlFor={idPrefix + "-radius"} className={fieldLabel}>Within distance of {filters.town}</label>
            <select
              id={idPrefix + "-radius"}
              className={fieldInput}
              value={filters.radiusKm}
              onChange={(event) => onChange((prev) => ({ ...prev, radiusKm: Number(event.target.value) }))}
            >
              {[5, 10, 25, 30, 50, 100].map((radius) => (
                <option key={radius} value={radius}>{radius} km radius</option>
              ))}
            </select>
            <p className="mt-2 text-[11px] leading-[1.55] text-stone-500">
              Calculated from business map coordinates; not administrative district boundaries.
            </p>
          </div>
        ) : (
          <p className="mt-2 text-[11px] leading-[1.55] text-stone-500">Choose a town to filter by distance. No device location access needed.</p>
        )}
      </div>

      <div>
        <label htmlFor={idPrefix + "-rating"} className={fieldLabel}>Minimum customer rating</label>
        <select
          id={idPrefix + "-rating"}
          className={fieldInput}
          value={filters.minRating}
          onChange={(event) => onChange((prev) => ({ ...prev, minRating: Number(event.target.value) }))}
        >
          <option value={0}>Any rating</option>
          <option value={3}>3 stars and above</option>
          <option value={4}>4 stars and above</option>
          <option value={4.5}>4.5 stars and above</option>
        </select>
      </div>

      <label className="flex cursor-pointer items-center justify-between gap-3 rounded-[9px] border border-[#DDE8DB] bg-[#F7F9F5] px-3 py-3.5">
        <span className="inline-flex items-center gap-2 text-[12px] font-semibold text-[#244C39]">
          <ShieldCheck size={17} aria-hidden="true" />
          Verified businesses only
        </span>
        <input
          type="checkbox"
          checked={filters.verifiedOnly}
          onChange={(event) => onChange((prev) => ({ ...prev, verifiedOnly: event.target.checked }))}
          className="h-[17px] w-[17px] accent-[#2F765C]"
        />
      </label>

      <div className="border-t border-[#E9EEE6] pt-5">
        <Link href="/category" className="inline-flex items-center gap-2 text-[12px] font-semibold text-[#357255] hover:text-[#1B3430]">
          Browse all categories <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

export default function CategoryContent({
  category, allCategories,
}: {
  category: CategoryInfo;
  allCategories: CategoryInfo[];
}) {
  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS);
  const [sort, setSort] = useState<Sort>("recommended");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [searchInput, setSearchInput] = useState("");
  const [searchText, setSearchText] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearchText(searchInput.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => setCurrentPage(1), [filters, searchText, sort, category.name]);

  useEffect(() => {
    if (!mobileFiltersOpen) return;
    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileFiltersOpen(false);
    }
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [mobileFiltersOpen]);

  const includedCategories = useMemo(
    () => [
      category.name,
      ...allCategories
        .filter((item) => item.parent_id != null && item.parent_id === category.id)
        .map((item) => item.name),
    ],
    [allCategories, category.id, category.name],
  );

  const onReset = useCallback(() => {
    setFilters({ ...INITIAL_FILTERS });
    setSearchInput("");
    setSearchText("");
    setSort("recommended");
    setCurrentPage(1);
  }, []);

  const town = TOWNS.find((item) => item.name === filters.town);

  // Keep the sort selector valid when location-based ranking is switched off.
  useEffect(() => {
    if (!filters.town && sort === "nearest") setSort("recommended");
  }, [filters.town, sort]);

  const { data, isPending, isFetching, isError, refetch } = useQuery({
    queryKey: [
      "category-businesses-v3", category.name, includedCategories.join("|"), currentPage,
      searchText, filters.town, filters.radiusKm, filters.minRating,
      filters.verifiedOnly, sort,
    ],
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      // Filter at the database level for ordinary browsing, so pagination and
      // counts remain correct as the directory scales beyond 1,000 listings.
      const baseQuery = () => {
        let query = supabase
          .from("businesses")
          .select(COLUMN_LIST, { count: "exact" })
          .eq("status", "approved");

        if (includedCategories.length === 1) query = query.eq("category", includedCategories[0]);
        else query = query.in("category", includedCategories);

        const safeSearch = searchText.replace(/[%,]/g, "").trim().slice(0, 80);
        if (safeSearch) query = query.ilike("name", "%" + safeSearch + "%");
        if (filters.minRating > 0) query = query.gte("rating", filters.minRating);
        if (filters.verifiedOnly) query = query.eq("is_verified", true).eq("can_show_badge", true);

        if (town) {
          const latitudeRadius = filters.radiusKm / 110.574;
          const longitudeRadius = filters.radiusKm / (111.32 * Math.max(0.2, Math.cos(town.lat * Math.PI / 180)));
          query = query
            .gte("latitude", town.lat - latitudeRadius)
            .lte("latitude", town.lat + latitudeRadius)
            .gte("longitude", town.lon - longitudeRadius)
            .lte("longitude", town.lon + longitudeRadius);
        }
        return query;
      };

      if (town) {
        // Bounding box query first, then accurate Haversine radius calculation.
        // Fetch in batches: no silent truncation at Supabase's default row limit.
        const matches: BusinessListing[] = [];
        let offset = 0;
        while (true) {
          const { data: batch, error, count } = await baseQuery()
            .order("id", { ascending: true })
            .range(offset, offset + 499);

          if (error) throw error;
          const results = (batch || []) as BusinessListing[];
          matches.push(
            ...results
              .filter((item) => item.latitude != null && item.longitude != null)
              .map((item) => ({
                ...item,
                distanceKm: distanceKm(town.lat, town.lon, Number(item.latitude), Number(item.longitude)),
              }))
              .filter((item) => (item.distanceKm ?? Infinity) <= filters.radiusKm),
          );
          offset += results.length;
          if (!results.length || results.length < 500 || offset >= (count ?? 0)) break;
        }

        matches.sort((a, b) => {
          if (sort === "name") return a.name.localeCompare(b.name);
          if (sort === "newest") return (b.created_at || "").localeCompare(a.created_at || "");
          if (sort === "rating" || sort === "recommended") {
            const ratingDiff = Number(b.rating || 0) - Number(a.rating || 0);
            if (ratingDiff !== 0) return ratingDiff;
            if (sort === "rating") return a.name.localeCompare(b.name);
            return (b.created_at || "").localeCompare(a.created_at || "");
          }
          return (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity);
        });
        const start = (currentPage - 1) * PAGE_SIZE;
        return { businesses: matches.slice(start, start + PAGE_SIZE), totalCount: matches.length };
      }

      let query = baseQuery();
      if (sort === "name") query = query.order("name", { ascending: true });
      else if (sort === "newest") query = query.order("created_at", { ascending: false });
      else query = query.order("rating", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false });

      const from = (currentPage - 1) * PAGE_SIZE;
      const { data: results, count, error } = await query
        .order("id", { ascending: true })
        .range(from, from + PAGE_SIZE - 1);
      if (error) throw error;
      return { businesses: (results || []) as BusinessListing[], totalCount: count ?? 0 };
    },
  });

  const businesses = data?.businesses ?? [];
  const total = data?.totalCount ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const firstResult = total ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
  const lastResult = Math.min(currentPage * PAGE_SIZE, total);

  const selectedFilterCount =
    Number(Boolean(filters.town)) + Number(filters.minRating > 0) +
    Number(filters.verifiedOnly) + Number(Boolean(searchText));

  const filterProps = { category, allCategories, filters, onChange: setFilters, onReset };

  return (
    <div className="bg-[#FAFBF8]">
      <div className="mx-auto max-w-[1440px] px-5 py-9 sm:px-8 sm:py-12 lg:px-12 lg:py-14">
        <div className="flex flex-col items-start gap-7 lg:flex-row lg:gap-9">
          <aside className="hidden w-[270px] shrink-0 lg:block xl:w-[295px]" aria-label="Business search filters">
            <div className="sticky top-[110px] rounded-[10px] border border-[#E0E9DE] bg-white p-5 shadow-[0_2px_12px_rgba(15,45,25,0.03)]">
              <FilterPanel {...filterProps} idPrefix="desktop" />
            </div>
          </aside>

          <div className="min-w-0 flex-1">
            <div className="mb-6 flex flex-col gap-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-[#448167]">Business directory</p>
                  <h2 className="text-[clamp(1.5rem,2.3vw,2.2rem)] font-semibold tracking-[-0.045em] text-[#193A2C]">
                    {category.name} <span className="font-normal text-[#6A8E79]">listings</span>
                  </h2>
                  <p className="mt-2 text-[12px] leading-relaxed text-stone-500">
                    {isPending ? "Finding available businesses..." : (total === 0 ? "No matching listings yet" : "Showing " + firstResult + "–" + lastResult + " of " + total + " businesses")}
                    {includedCategories.length > 1 ? " · Includes related services" : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileFiltersOpen(true)}
                  className="inline-flex min-h-11 items-center gap-2 rounded-[8px] border border-[#CBDEC9] bg-white px-4 text-[12px] font-semibold text-[#2E654C] lg:hidden"
                >
                  <SlidersHorizontal size={16} aria-hidden="true" />
                  Filters {selectedFilterCount > 0 && <span className="rounded bg-[#E4F1E5] px-1.5 text-[10px]">{selectedFilterCount}</span>}
                </button>
              </div>

              <div className="flex flex-col gap-3 rounded-[10px] border border-[#E0E9DE] bg-white p-3 sm:flex-row sm:items-center sm:p-4">
                <label className="relative flex min-w-0 flex-1 items-center">
                  <Search size={18} className="pointer-events-none absolute left-3.5 text-[#56836A]" aria-hidden="true" />
                  <span className="sr-only">Search business names</span>
                  <input
                    type="search"
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder="Search businesses by name..."
                    className="h-11 w-full rounded-[7px] border border-[#DDE8DB] bg-[#F9FBF7] pl-11 pr-3 text-[13px] text-[#1B3430] outline-none focus:border-[#75A688] focus:ring-2 focus:ring-[#CDE8D2]"
                  />
                </label>
                <label className="flex items-center gap-2 text-[12px] font-semibold text-[#355647]">
                  <span className="shrink-0">Sort by</span>
                  <select
                    value={sort}
                    onChange={(event) => setSort(event.target.value as Sort)}
                    aria-label="Sort businesses"
                    className="h-11 min-w-0 flex-1 rounded-[7px] border border-[#DDE8DB] bg-white px-3 text-[12px] font-medium text-[#1B3430] outline-none focus:border-[#75A688] sm:max-w-[187px]"
                  >
                    <option value="recommended">Recommended</option>
                    <option value="newest">Newest first</option>
                    <option value="rating">Highest rated</option>
                    <option value="name">Name A–Z</option>
                    {town && <option value="nearest">Nearest first</option>}
                  </select>
                </label>
                <div className="hidden shrink-0 gap-1 border-l border-[#E7EEE5] pl-3 sm:flex" aria-label="Result layout">
                  <button
                    type="button"
                    aria-label="Grid view"
                    aria-pressed={viewMode === "grid"}
                    onClick={() => setViewMode("grid")}
                    className={"flex h-10 w-10 items-center justify-center rounded-[7px] " + (viewMode === "grid" ? "bg-[#E5F0E7] text-[#2F765C]" : "text-stone-400 hover:bg-stone-50")}
                  >
                    <Grid2X2 size={18} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label="List view"
                    aria-pressed={viewMode === "list"}
                    onClick={() => setViewMode("list")}
                    className={"flex h-10 w-10 items-center justify-center rounded-[7px] " + (viewMode === "list" ? "bg-[#E5F0E7] text-[#2F765C]" : "text-stone-400 hover:bg-stone-50")}
                  >
                    <List size={19} aria-hidden="true" />
                  </button>
                </div>
              </div>

              {(selectedFilterCount > 0) && (
                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                  {filters.town && <span className="rounded-[6px] border border-[#D8E8D6] bg-[#EAF3E8] px-2.5 py-1.5 font-semibold text-[#2E694F]">{filters.town} · {filters.radiusKm} km</span>}
                  {filters.minRating > 0 && <span className="rounded-[6px] border border-[#D8E8D6] bg-[#EAF3E8] px-2.5 py-1.5 font-semibold text-[#2E694F]">{filters.minRating}+ stars</span>}
                  {filters.verifiedOnly && <span className="rounded-[6px] border border-[#D8E8D6] bg-[#EAF3E8] px-2.5 py-1.5 font-semibold text-[#2E694F]">Verified</span>}
                  {searchText && <span className="rounded-[6px] border border-[#D8E8D6] bg-[#EAF3E8] px-2.5 py-1.5 font-semibold text-[#2E694F]">“{searchText}”</span>}
                  <button onClick={onReset} className="rounded-[6px] px-2.5 py-1.5 font-bold text-[#377657] hover:bg-white">Clear all</button>
                </div>
              )}
            </div>

            {isError ? (
              <div className="rounded-[10px] border border-rose-200 bg-white px-6 py-16 text-center">
                <h3 className="text-lg font-semibold text-[#1B3430]">Couldn&apos;t load these businesses</h3>
                <p className="mt-2 text-[13px] text-stone-500">Please try again. Your filters have been preserved.</p>
                <button onClick={() => void refetch()} className="mt-5 rounded-[8px] bg-[#1B3430] px-5 py-2.5 text-[12px] font-semibold text-white">Retry</button>
              </div>
            ) : isPending ? (
              <div className={viewMode === "grid" ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-3" : "grid grid-cols-1 gap-4"}>
                {Array.from({ length: 6 }, (_, index) => (
                  <div key={index} className="overflow-hidden rounded-[10px] border border-[#E0E9DE] bg-white">
                    <div className="aspect-[16/10] bg-[#EFF3ED]" />
                    <div className="space-y-3 p-5">
                      <div className="h-3 w-[60%] rounded-[3px] bg-[#EEF2EC]" />
                      <div className="h-5 w-[80%] rounded-[3px] bg-[#EEF2EC]" />
                      <div className="h-3 w-full rounded-[3px] bg-[#EEF2EC]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : businesses.length > 0 ? (
              <>
                {isFetching && <p role="status" className="mb-3 text-[11px] text-stone-500">Updating listings…</p>}
                <div className={viewMode === "grid" ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-3" : "grid grid-cols-1 gap-4"}>
                  {businesses.map((business) => <ListingCard key={business.id} business={business} mode={viewMode} />)}
                </div>

                {totalPages > 1 && (
                  <nav aria-label="Results pagination" className="mt-9 flex flex-wrap items-center justify-center gap-1.5">
                    <button
                      type="button"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((current) => Math.max(1, current - 1))}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-[7px] border border-[#DCE7DA] bg-white text-[#416A50] disabled:cursor-not-allowed disabled:opacity-35"
                      aria-label="Previous page"
                    ><ChevronLeft size={18} aria-hidden="true" /></button>
                    {Array.from({ length: totalPages }, (_, index) => index + 1)
                      .filter((page) => totalPages <= 7 || page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                      .map((page, index, shown) => (
                        <span key={page} className="inline-flex items-center gap-1.5">
                          {index > 0 && page > shown[index - 1] + 1 && <span className="px-1 text-stone-400">…</span>}
                          <button
                            type="button"
                            aria-label={"Go to page " + page}
                            aria-current={page === currentPage ? "page" : undefined}
                            onClick={() => setCurrentPage(page)}
                            className={"h-10 min-w-10 rounded-[7px] px-3 text-[12px] font-semibold " + (page === currentPage ? "bg-[#244B3B] text-white" : "border border-[#DCE7DA] bg-white text-[#416A50] hover:bg-[#EEF5EB]")}
                          >{page}</button>
                        </span>
                      ))}
                    <button
                      type="button"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage((current) => Math.min(totalPages, current + 1))}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-[7px] border border-[#DCE7DA] bg-white text-[#416A50] disabled:cursor-not-allowed disabled:opacity-35"
                      aria-label="Next page"
                    ><ChevronRight size={18} aria-hidden="true" /></button>
                  </nav>
                )}
              </>
            ) : (
              <div className="rounded-[10px] border border-dashed border-[#CADBCD] bg-white px-6 py-16 text-center">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-[10px] bg-[#EFF6ED] text-[#397C5D]">
                  <Building2 size={29} strokeWidth={1.5} aria-hidden="true" />
                </span>
                <h3 className="mt-5 text-[20px] font-semibold tracking-tight text-[#193A2C]">
                  {selectedFilterCount ? "No matching businesses" : "New businesses are on the way"}
                </h3>
                <p className="mx-auto mt-2 max-w-[380px] text-[13px] leading-[1.7] text-stone-500">
                  {selectedFilterCount
                    ? "Try a wider search area, a lower rating, or clear your filters."
                    : "There are no approved listings in this category yet. Explore related services or check back soon."}
                </p>
                {selectedFilterCount > 0 ? (
                  <button onClick={onReset} className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-[8px] bg-[#1B3430] px-5 text-[12px] font-semibold text-white">
                    <X size={15} aria-hidden="true" /> Clear all filters
                  </button>
                ) : (
                  <Link href="/category" className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-[8px] bg-[#1B3430] px-5 text-[12px] font-semibold text-white">
                    Explore other categories <ArrowRight size={15} aria-hidden="true" />
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-[140] lg:hidden" role="presentation">
          <button
            type="button"
            aria-label="Close filters"
            className="absolute inset-0 bg-black/45"
            onClick={() => setMobileFiltersOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Filter businesses"
            className="absolute inset-x-0 bottom-0 max-h-[88dvh] overflow-y-auto rounded-t-[14px] bg-white px-5 pb-7 pt-5 shadow-xl"
          >
            <div className="mb-5 flex items-center justify-between">
              <span className="text-[16px] font-bold text-[#1B3430]">Filters</span>
              <button type="button" aria-label="Close filters" onClick={() => setMobileFiltersOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-[7px] bg-[#EFF3ED]">
                <X size={19} aria-hidden="true" />
              </button>
            </div>
            <FilterPanel {...filterProps} idPrefix="mobile" />
            <button
              type="button"
              onClick={() => setMobileFiltersOpen(false)}
              className="mt-7 flex min-h-12 w-full items-center justify-center gap-2 rounded-[8px] bg-[#1B3430] px-4 text-[13px] font-semibold text-white"
            >
              <Check size={17} aria-hidden="true" /> View results
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
