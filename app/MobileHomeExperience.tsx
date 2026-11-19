"use client";

import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight, Building2, CarFront, Compass, Ellipsis, HeartPulse,
  House, MapPin, MonitorSmartphone, Plane, Search, Star, Store, UtensilsCrossed,
} from "lucide-react";
import HeroSearch from "./components/HeroSearch";
import { getBusinessDisplayAddress } from "@/lib/businessAddress";

type Category = { id?: string; name: string; icon?: string | null };
type Business = {
  id: string; slug?: string | null; name: string;
  image_url?: string | null; logo_url?: string | null; category?: string | null;
  city?: string | null; address?: string | null; detailed_address?: string | null;
  rating?: number | null; is_verified?: boolean | null; can_show_badge?: boolean | null;
};
type Props = {
  categories: Category[];
  featuredBusinesses: Business[];
  categoriesLoading: boolean;
  featuredLoading: boolean;
  featuredError: unknown;
  userCoords: { lat: number; lng: number } | null;
  isFetchingLocation: boolean;
  handleUseCurrentLocation: (autoSearch?: boolean) => void;
  handleCategoryClick: (name: string) => void;
};

// Static icons, already-fetched categories and existing callbacks: no new API or map SDK.
const categoryTabs = [
  { label: "Dining", icon: UtensilsCrossed, matches: /food|dining|restaurant|cafe|catering/i },
  { label: "Health", icon: HeartPulse, matches: /health|medical|hospital|pharmacy|wellness/i },
  { label: "Tech", icon: MonitorSmartphone, matches: /technical|electronics|technology|computer|it service/i },
  { label: "Travel", icon: Plane, matches: /travel|tourism|hotel|transport/i },
  { label: "Shops", icon: Store, matches: /shop|retail|grocery|store|market/i },
  { label: "Auto", icon: CarFront, matches: /auto|vehicle|automotive|motor|repair/i },
  { label: "Home", icon: House, matches: /home|living|construction|property|real estate/i },
] as const;

/** A decorative, zero-network map thumbnail; the button uses existing Nearby logic. */
function MapPreview() {
  return (
    <svg className="slbi-native-map-drawing" viewBox="0 0 360 160" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <rect width="360" height="160" fill="#F3F5F3" />
      <g fill="none" stroke="#DDE4E0" strokeWidth="1.15" opacity=".95">
        <path d="M0 12 98 0 142 58 252 0M0 57 145 32 220 147 360 110M0 116 125 85 212 160M26 160 75 0M152 0 176 160M263 0 290 160M335 0 307 160" />
        <path d="M0 145 102 118 360 64M0 82 207 16 360 25M85 160 139 3M210 0 260 160M357 147 236 83" />
        <path d="M24 0 60 160M0 35 360 134M312 0 356 94M185 156 354 43" />
      </g>
      <g fill="none" stroke="#FFFFFF" strokeWidth="8.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M-12 141 88 108 174 90 246 47 370 15" />
        <path d="M35 -10 112 47 184 157" />
        <path d="M284 -10 261 78 294 174" />
      </g>
      <g fill="none" stroke="#D7DFDA" strokeWidth="1" strokeLinecap="round">
        <path d="M-12 141 88 108 174 90 246 47 370 15" />
        <path d="M35 -10 112 47 184 157" />
        <path d="M284 -10 261 78 294 174" />
      </g>
    </svg>
  );
}

export default function MobileHomeExperience({
  categories, featuredBusinesses, categoriesLoading, featuredLoading, featuredError,
  userCoords, isFetchingLocation, handleUseCurrentLocation, handleCategoryClick,
}: Props) {
  return (
    <div className="slbi-native-home sm:hidden" id="slbi-native-mobile-home">
      {/* The existing location picker floats into the existing navbar's left slot. */}
      <div className="slbi-native-search-panel">
        <HeroSearch
          idPrefix="mobile-home"
          categories={categories}
          featuredBusinesses={featuredBusinesses}
          userCoords={userCoords}
          isFetchingLocation={isFetchingLocation}
          handleUseCurrentLocation={handleUseCurrentLocation}
        />
      </div>

      <nav className="slbi-native-categories" aria-label="Discover business categories">
        <div className="slbi-native-category-grid">
          <Link href="/" aria-current="page" className="slbi-native-category-tile slbi-native-category-active">
            <Compass size={23} strokeWidth={1.65} aria-hidden="true" />
            <span>Discover</span>
          </Link>
          {categoryTabs.map(({ label, icon: Icon, matches }) => {
            const category = categories.find(item => matches.test(item.name));
            const inner = <><Icon size={23} strokeWidth={1.65} aria-hidden="true" /><span>{label}</span></>;
            return category ? (
              <button key={label} type="button" className="slbi-native-category-tile"
                onClick={() => handleCategoryClick(category.name)}
                aria-label={"Browse " + label + " businesses"}>{inner}</button>
            ) : (
              <Link key={label} href="/category" className="slbi-native-category-tile"
                aria-label={"Browse " + label + " categories"}>{inner}</Link>
            );
          })}
          <Link href="/category" className="slbi-native-category-tile" aria-label="Browse all categories">
            <Ellipsis size={23} strokeWidth={1.65} aria-hidden="true" /><span>More</span>
          </Link>
        </div>
        {categoriesLoading && <span role="status" className="sr-only">Loading categories</span>}
      </nav>

      <section className="slbi-native-nearby" aria-label="Nearby business map">
        <button className="slbi-native-nearby-button" type="button"
          disabled={isFetchingLocation} onClick={() => handleUseCurrentLocation(true)}>
          <MapPreview />
          <span className="slbi-native-map-pin slbi-native-map-pin-one"><MapPin size={24} strokeWidth={2} fill="#236D53" /></span>
          <span className="slbi-native-map-pin slbi-native-map-pin-two"><MapPin size={24} strokeWidth={2} fill="#236D53" /></span>
          <span className="slbi-native-map-pin slbi-native-map-pin-three"><MapPin size={24} strokeWidth={2} fill="#236D53" /></span>
          <span className="slbi-native-nearby-cta">
            {isFetchingLocation ? "Finding location…" : "Open Nearby Map"}
            <ArrowRight size={17} strokeWidth={1.7} aria-hidden="true" />
          </span>
        </button>
      </section>

      <section className="slbi-native-featured" aria-label="Featured Sri Lankan businesses">
        <div className="slbi-native-featured-heading">
          <h2><span>Featured</span>{" "}<span>businesses</span></h2>
          <Link href="/nearby">See all <ArrowRight size={15} strokeWidth={1.7} aria-hidden="true" /></Link>
        </div>
        {featuredLoading ? (
          <div className="slbi-native-listing-track" role="status" aria-label="Loading featured listings">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="slbi-native-card slbi-native-card-placeholder" aria-hidden="true" />
            ))}
          </div>
        ) : featuredError ? (
          <div className="slbi-native-empty">Featured businesses are temporarily unavailable.</div>
        ) : featuredBusinesses.length ? (
          <div className="slbi-native-listing-track" role="region" aria-label="Swipe featured business cards">
            {featuredBusinesses.map(business => (
              <Link key={business.id} href={"/business/" + (business.slug || business.id)}
                className="slbi-native-card" prefetch={false}
                aria-label={"View " + business.name + " business profile"}>
                <div className="slbi-native-card-photo">
                  {business.image_url ? (
                    <Image src={business.image_url} alt={business.name} fill loading="lazy"
                      decoding="async" quality={55} sizes="(max-width:639px) 210px, 210px"
                      className="object-cover" />
                  ) : business.logo_url ? (
                    <Image src={business.logo_url} alt={business.name} fill loading="lazy"
                      decoding="async" quality={55} sizes="(max-width:639px) 210px, 210px"
                      className="object-contain p-9" />
                  ) : (
                    <Building2 size={46} strokeWidth={1.2} aria-hidden="true" className="text-[#C3D0C9]" />
                  )}
                </div>
                <div className="slbi-native-card-shade" aria-hidden="true" />
                <div className="slbi-native-card-topline">
                  <span className="slbi-native-featured-pill">
                    {business.is_verified && business.can_show_badge ? "Verified" : "Featured"}
                  </span>
                  {typeof business.rating === "number" && business.rating > 0 && (
                    <span className="slbi-native-rating">
                      <Star size={12} fill="#E4BD67" strokeWidth={1.3} aria-hidden="true" />
                      {business.rating.toFixed(1)}
                    </span>
                  )}
                </div>
                <div className="slbi-native-card-details">
                  <span className="slbi-native-card-category">{business.category || "Local business"}</span>
                  <h3>{business.name}</h3>
                  <p className="slbi-native-business-address">
                    <MapPin size={13} strokeWidth={1.6} aria-hidden="true" />
                    <span>{getBusinessDisplayAddress(business)}</span>
                  </p>
                  <div className="slbi-native-card-linkline">
                    <span>View business</span><ArrowRight size={15} strokeWidth={1.65} aria-hidden="true" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="slbi-native-empty">
            New featured listings are coming soon. <Link href="/nearby">Explore businesses</Link>
          </div>
        )}
      </section>
    </div>
  );
}
