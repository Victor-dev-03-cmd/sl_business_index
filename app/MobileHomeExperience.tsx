"use client";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, CarFront, Ellipsis, HeartPulse, House, MapPin, MonitorSmartphone, Plane, Star, Store, UtensilsCrossed, Building2 } from "lucide-react";
import HeroSearch from "./components/HeroSearch";
import { getBusinessDisplayAddress } from "@/lib/businessAddress";

type Category={id?:string;name:string;icon?:string|null};
type Business={id:string;slug?:string|null;name:string;image_url?:string|null;logo_url?:string|null;category?:string|null;city?:string|null;address?:string|null;detailed_address?:string|null;rating?:number|null};
type Props={
 categories:Category[];featuredBusinesses:Business[];categoriesLoading:boolean;
 featuredLoading:boolean;featuredError:unknown;
 userCoords:{lat:number;lng:number}|null;isFetchingLocation:boolean;
 handleUseCurrentLocation:(autoSearch?:boolean)=>void;
 handleCategoryClick:(name:string)=>void;
};
/** Presentation only; the desktop data queries, search callbacks and location handler remain untouched. */
const quickCategories=[
 {label:"Food",Icon:UtensilsCrossed,matches:/food|dining|restaurant|cafe|catering/i},
 {label:"Health",Icon:HeartPulse,matches:/health|medical|hospital|pharmacy|wellness/i},
 {label:"Tech",Icon:MonitorSmartphone,matches:/technical|electronics|technology|computer|it service/i},
 {label:"Travel",Icon:Plane,matches:/travel|tourism|hotel|transport/i},
 {label:"Auto",Icon:CarFront,matches:/auto|vehicle|automotive|motor|repair|transport/i},
 {label:"Home",Icon:House,matches:/home|living|construction|property|real estate|industrial/i},
 {label:"Shops",Icon:Store,matches:/shop|retail|grocery|store|market/i}
];
export default function MobileHomeExperience({
 categories,featuredBusinesses,categoriesLoading,featuredLoading,featuredError,
 userCoords,isFetchingLocation,handleUseCurrentLocation,handleCategoryClick
}:Props){
 return (
  <div className="slbi-native-home sm:hidden" id="slbi-native-mobile-home">
   <div className="slbi-native-search-panel">
    <HeroSearch idPrefix="mobile-home" categories={categories} featuredBusinesses={featuredBusinesses}
      userCoords={userCoords} isFetchingLocation={isFetchingLocation}
      handleUseCurrentLocation={handleUseCurrentLocation}/>
   </div>
   <div className="slbi-native-content">
    <section aria-label="Browse top business categories" className="slbi-native-categories">
     <div className="slbi-native-category-grid">
      {quickCategories.map(({label,Icon,matches},index)=>{
       const matched=categories.find(item=>matches.test(item.name));
       const tileClass="slbi-native-category-tile slbi-native-category-tile-"+index%4;
       const content=<><Icon aria-hidden="true" size={32} strokeWidth={1.7}/><span>{label}</span></>;
       return matched?(
        <button key={label} type="button" onClick={()=>handleCategoryClick(matched.name)}
         aria-label={"Explore "+label+" businesses"} className={tileClass}>{content}</button>
       ):(
        <Link key={label} href="/category" aria-label={"Browse "+label+" categories"}
         className={tileClass}>{content}</Link>
       );
      })}
      <Link href="/category" aria-label="Browse all categories"
       className="slbi-native-category-tile slbi-native-category-tile-7">
       <Ellipsis aria-hidden="true" size={32} strokeWidth={1.7}/><span>More</span>
      </Link>
     </div>
     {categoriesLoading&&<span role="status" className="sr-only">Loading categories</span>}
    </section>
    <section className="slbi-native-nearby" aria-label="Explore nearby businesses">
     <button type="button" className="slbi-native-nearby-button"
      onClick={()=>handleUseCurrentLocation(true)} disabled={isFetchingLocation}>
      <span>{isFetchingLocation?"Finding location…":"Explore Near Me"}</span>
      <ArrowRight aria-hidden="true" size={24} strokeWidth={1.7}/>
      <Image className="slbi-native-map-art" alt="" aria-hidden="true"
       src="/sri-lanka-gold-outline.svg" width={150} height={220} unoptimized/>
     </button>
    </section>
    <section aria-label="Featured Sri Lankan businesses" className="slbi-native-featured">
     <div className="slbi-native-featured-heading">
      <h2>Featured businesses</h2>
      <Link href="/nearby">See all <ArrowRight aria-hidden="true" size={18}/></Link>
     </div>
     {featuredLoading?(
      <div className="slbi-native-listing-track" aria-live="polite">
       {Array.from({length:3},(_,i)=>(
        <div className="slbi-native-card slbi-native-card-placeholder" aria-hidden="true" key={i}>
         <div className="slbi-native-card-photo"/><div className="slbi-native-card-placeholder-title"/>
        </div>
       ))}
      </div>
     ):featuredError?(
      <div className="slbi-native-empty">Featured businesses are temporarily unavailable.</div>
     ):featuredBusinesses.length?(
      <div className="slbi-native-listing-track" role="region" aria-label="Swipe featured business cards">
       {featuredBusinesses.map(business=>(
        <Link key={business.id} href={"/business/"+(business.slug||business.id)}
         prefetch={false} className="slbi-native-card"
         aria-label={"View "+business.name+" business profile"}>
         <div className="slbi-native-card-photo">
          {business.image_url?(
           <Image src={business.image_url} alt={business.name} fill loading="lazy"
            decoding="async" quality={65} sizes="(max-width:639px) 310px, 310px" className="object-cover"/>
          ):business.logo_url?(
           <Image src={business.logo_url} alt={business.name} fill loading="lazy"
            decoding="async" quality={65} sizes="(max-width:639px) 310px, 310px" className="object-contain p-10"/>
          ):(
           <Building2 aria-hidden="true" size={52} strokeWidth={1.25} className="text-[#b2c4b7]"/>
          )}
          {business.city&&<span className="slbi-native-photo-area"><MapPin size={12} aria-hidden="true"/>{business.city}</span>}
         </div>
         <div className="slbi-native-card-details">
          <h3>{business.name}</h3>
          <div className="slbi-native-card-subtitle">
           {typeof business.rating==="number"&&business.rating>0&&(
            <span className="slbi-native-rating"><Star aria-hidden="true" size={14} fill="currentColor"/>{business.rating.toFixed(1)}</span>
           )}
           <span className="slbi-native-business-address">{getBusinessDisplayAddress(business)}</span>
          </div>
         </div>
        </Link>
       ))}
      </div>
     ):(
      <div className="slbi-native-empty">New featured listings are coming soon. <Link href="/nearby">Explore businesses</Link></div>
     )}
    </section>
   </div>
  </div>
 );
}

