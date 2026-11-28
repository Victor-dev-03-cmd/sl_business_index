"use client";

import React, { useState, useEffect, useRef } from "react";
import { Business } from "@/lib/types";
import {
  MapPin,
  Info,
  Bookmark,
  MessageCircle,
  Phone,
  Mail,
  Globe,
  Clock,
  Star,
  Building2,
  Share2,
  ExternalLink,
  MessageSquare,
  CheckCircle2,
  Loader2,
  Send,
  Wifi,
  Car,
  CreditCard,
  Languages,
  Coffee,
  Navigation,
  Flag,
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  Camera,
  Compass,
  Copy,
  Leaf,
  UserRound,
} from "lucide-react";
import Image from "next/image";
import * as Dialog from "@radix-ui/react-dialog";
import { X, ChevronLeft, ChevronRight, Images, BriefcaseBusiness } from "lucide-react";
import Link from "next/link";

import { supabase } from "@/lib/supabaseClient";
import VerifiedBadge from "@/app/components/VerifiedBadge";
import OwnerVerificationPrompt from "./OwnerVerificationPrompt";
import DeferredBusinessMap from "./DeferredBusinessMap";
import { isApprovedVerifiedBusiness } from "@/lib/business-verification";
import BrandIcon from "@/app/components/BrandIcon";
import BusinessAudienceControls from "@/app/components/audience/BusinessAudienceControls";
import {useSavedBusinesses} from "@/lib/public-saved-businesses";
import ReportModal from "@/app/components/ReportModal";
import { logEvent } from "@/lib/utils";
import { toast } from "sonner";
import { Turnstile } from "@marsidev/react-turnstile";


interface Props {
  business: Business;
  galleryUrls: string[];
  services: string[];
}

interface Review {
  id: string;
  user_name: string;
  rating: number;
  comment: string;
  created_at: string;
  review_replies?: { reply_text: string; created_at: string }[];
}

export default function BusinessDetailsClient({ business, galleryUrls, services }: Props) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewSummary, setReviewSummary] = useState<{count:number;average:number|null}|null>(null);
  const turnstileContainerRef = useRef<HTMLDivElement>(null);
  const [turnstileSize, setTurnstileSize] = useState<"normal" | "compact" | null>(null);
  const [photoIndex, setPhotoIndex] = useState<number | null>(null);
  // Registration cover image stays in discovery cards, not the public profile.
  const photos = [...new Set(galleryUrls.filter(url => Boolean(url)))];
  const {items:savedBusinesses,toggle:toggleSavedBusiness}=useSavedBusinesses();
  const isSaved=savedBusinesses.some(item=>item.id===String(business.id));
  const handleToggleSaved=()=>{
    const added=toggleSavedBusiness({
      id:String(business.id),slug:String(business.slug||business.id),name:business.name,
      category:business.category||'',
      city:business.address?.split(',').pop()?.trim()||'',
    });
    toast.success(added?'Business saved on this device.':'Bookmark removed from this device.');
  };
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    comment: "",
    user_name: "",
  });
  const [enquiryForm, setEnquiryForm] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [submittingEnquiry, setSubmittingEnquiry] = useState(false);
  const [whatsappReadyUrl, setWhatsappReadyUrl] = useState<string | null>(null);
  const [leadConsent, setLeadConsent] = useState(false);
  const [marketingOptIn,setMarketingOptIn]=useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileReset, setTurnstileReset] = useState(0);
  // Retry the same submitted payload with the same UUID. A changed form gets a
  // fresh UUID so an earlier successful request cannot mask new enquiry data.
  const enquiryRequestRef = useRef<{ fingerprint: string; id: string } | null>(null);
  const secureLeadsEnabled = process.env.NEXT_PUBLIC_SECURE_LEADS_ENABLED === "true";
  const emailOptInEnabled=secureLeadsEnabled&&process.env.NEXT_PUBLIC_EMAIL_OPTIN_ENABLED==='true';
  const turnstileSiteKey = process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY || "";
  const [showReportModal, setShowReportModal] = useState(false);

  useEffect(() => {
    let active = true;
    setReviewsLoading(true);
    setReviewSummary(null);
    setReviews([]);
    void (async () => {
      try {
        // Never trust the stale denormalized counter on the business row.
        // Both conditions exclude pending/rejected reviews, even for staff.
        const {data, count, error} = await supabase
          .from("reviews")
          .select("id,user_name,rating,comment,created_at,review_replies(reply_text, created_at)", {count:"exact"})
          .eq("business_id", business.id)
          .eq("is_approved", true)
          .eq("moderation_status", "approved")
          .order("created_at", {ascending:false});
        if (error || count === null) throw error || new Error("Review count unavailable");
        const published = (data || []) as Review[];
        let average:number|null = null;
        if (count > 0 && published.length === count) {
          average = published.reduce((sum, review) => sum + Number(review.rating), 0) / count;
        } else if(count > 0) {
          // PostgREST may cap returned rows; count every rating bucket instead
          // of presenting a partial-page average as the complete result.
          const buckets=await Promise.all([1,2,3,4,5].map(rating=>supabase.from("reviews").select("id",{count:"exact",head:true}).eq("business_id",business.id).eq("is_approved",true).eq("moderation_status","approved").eq("rating",rating)));
          if(buckets.every(bucket=>!bucket.error && bucket.count!==null) && buckets.reduce((sum,bucket)=>sum+(bucket.count||0),0)===count){
            average=buckets.reduce((sum,bucket,index)=>sum+(index+1)*(bucket.count||0),0)/count;
          }
        }
        if(active){setReviews(published);setReviewSummary({count,average:average!==null&&Number.isFinite(average)?average:null});}
      } catch (error) {
        console.error("Error fetching reviews:", error);
      } finally {
        if(active)setReviewsLoading(false);
      }
    })();
    recordView();
    return()=>{active=false};
  }, [business.id]);

  useEffect(()=>{
    if(!secureLeadsEnabled||!turnstileSiteKey)return;
    const container=turnstileContainerRef.current;
    if(!container)return;
    let previous:"normal"|"compact"|null=null;
    const update=()=>{
      const next=container.clientWidth>=300?"normal":"compact";
      if(next!==previous){
        previous=next;
        setTurnstileToken("");
        setTurnstileSize(next);
      }
    };
    update();
    if(typeof ResizeObserver==="undefined"){
      window.addEventListener("resize",update);
      return()=>window.removeEventListener("resize",update);
    }
    const observer=new ResizeObserver(update);
    observer.observe(container);
    return()=>observer.disconnect();
  },[secureLeadsEnabled,turnstileSiteKey]);

  const recordView = async () => {
    try {
      // New Analytics logging
      await logEvent(
        business?.id,
        "view",
        business?.address?.split(",").pop()?.trim() || "Unknown",
      );

      // G0-16: when the verified server counter is enabled, do not send a
      // second direct browser RPC or a redundant user-scoped view write.
      // The server logs and increments atomically; a disabled/missing backend
      // fails closed for counts rather than falling back to anonymous mutation.
      if (process.env.NEXT_PUBLIC_G0_VERIFIED_VIEW_COUNT_ENABLED === "true") {
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      
      if (user) {
        await supabase.from("business_views").insert({
          business_id: business?.id,
          user_id: user?.id,
        });
      }

      // Increment view count in businesses table
      await supabase.rpc("increment_business_views", {
        business_id: business?.id,
      });
    } catch (error) {
      console.error("Error recording view:", error);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingReview) return;
    setSubmittingReview(true);
    try {
      // No direct reviews INSERT from the browser. The server validates the
      // authenticated user; only staff can later approve a pending review.
      const response = await fetch('/api/reviews/submit', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: business.id,
          userName: reviewForm.user_name,
          rating: reviewForm.rating,
          comment: reviewForm.comment,
        }),
      });
      const data: { success?: boolean; error?: string; status?: string } =
        await response.json();
      if (!response.ok || !data.success || data.status !== 'pending') {
        if (response.status === 401) {
          toast.error('Please sign in before writing a business review.');
        } else {
          toast.error(data.error || 'Review submission is unavailable. Please retry.');
        }
        return;
      }
      toast.success('Review submitted for approval. It is not public yet.');
      setReviewForm({ rating: 5, comment: '', user_name: '' });
      // Do not prepend a pending review to the public list or claim it is live.
    } catch {
      toast.error('Review service is temporarily unavailable.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleEnquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWhatsappReadyUrl(null);
    if (!leadConsent) {
      toast.error("Please agree to share your enquiry with this business.");
      return;
    }
    if (secureLeadsEnabled && (!turnstileSiteKey || !turnstileToken)) {
      toast.error("Complete the security verification before submitting.");
      return;
    }
    setSubmittingEnquiry(true);
    try {
      if (secureLeadsEnabled) {
        const fingerprint = JSON.stringify({ businessId: business.id, ...enquiryForm, marketingOptIn:marketingOptIn&&emailOptInEnabled });
        if (!enquiryRequestRef.current || enquiryRequestRef.current.fingerprint !== fingerprint) {
          enquiryRequestRef.current = { fingerprint, id: crypto.randomUUID() };
        }
        const response = await fetch("/api/leads/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            request_id: enquiryRequestRef.current.id,
            business_id: business.id,
            name: enquiryForm.name,
            email: enquiryForm.email,
            phone: enquiryForm.phone,
            message: enquiryForm.message,
            consent: true,
            marketing_opt_in:emailOptInEnabled&&marketingOptIn,
            turnstile_token: turnstileToken,
          }),
        });
        const result = await response.json() as { success?: boolean; error?: string };
        if (!response.ok || !result.success) {
          if (response.status === 409 && result.error === 'lead-request-conflict') {
            // Never silently retry with a new ID: previous delivery may have succeeded.
            throw new Error('This enquiry request conflicts with an earlier submission. Check whether the business received it before sending a new enquiry.');
          }
          throw new Error(result.error || "Unable to save your enquiry securely.");
        }
      } else {
        // Backward compatibility: old mobile/web deployments still use the
        // existing insert policy until the coordinated RLS rollout is complete.
        const { error } = await supabase.from("leads").insert({
          business_id: business.id,
          name: enquiryForm.name,
          email: enquiryForm.email,
          phone: enquiryForm.phone,
          message: enquiryForm.message,
          source: "Business Detail Page",
        });
        if (error) throw error;
      }

      // 2. Prepare an explicit WhatsApp link; async popup opening may be blocked.
      if (business.phone) {
        // Format Owner Phone: remove non-digits, replace leading 0 with 94
        const formattedOwnerPhone = business.phone.replace(/\D/g, "");
        const finalOwnerPhone = formattedOwnerPhone.startsWith("0")
          ? "94" + formattedOwnerPhone.substring(1)
          : formattedOwnerPhone.startsWith("94") 
            ? formattedOwnerPhone 
            : "94" + formattedOwnerPhone;

        const whatsappText = `New Enquiry from SLBI:\n\nName: ${enquiryForm.name}\nPhone: ${enquiryForm.phone}\nMessage: ${enquiryForm.message}`;
        const whatsappUrl = `https://wa.me/${finalOwnerPhone}?text=${encodeURIComponent(whatsappText)}`;
        
        setWhatsappReadyUrl(whatsappUrl);
      }

      // CRM lead creation above is the source of truth for actual enquiries.
      // Do not send unsupported lead_form_submit telemetry through the view/call API.
      enquiryRequestRef.current = null;

      setEnquiryForm({ name: "", email: "", phone: "", message: "" });
      setLeadConsent(false);
      setMarketingOptIn(false);
      setTurnstileToken("");
      setTurnstileReset(v => v + 1);
      toast.success("Enquiry submitted", {
        description: business.phone
          ? "You can also continue the conversation on WhatsApp below."
          : "Your enquiry has been saved successfully.",
      });
    } catch (error) {
      // Avoid logging raw database/provider errors, which may contain contact details.
      console.error('Enquiry submission failed');
      toast.error(error instanceof Error ? error.message : "Failed to send enquiry.");
    } finally {
      // Turnstile tokens expire and must not be reused after a server attempt.
      setTurnstileToken("");
      if (secureLeadsEnabled) setTurnstileReset(v => v + 1);
      setSubmittingEnquiry(false);
    }
  };

  const getFacilityIcon = (facility: string) => {
    const f = facility.toLowerCase();
    if (f.includes("wifi")) return <Wifi size={16} />;
    if (f.includes("parking")) return <Car size={16} />;
    if (f.includes("card")) return <CreditCard size={16} />;
    if (f.includes("language")) return <Languages size={16} />;
    if (f.includes("coffee") || f.includes("cafe")) return <Coffee size={16} />;
    return <CheckCircle2 size={16} />;
  };

  // Display only business-supplied contact and verification details.
  // Only business-level approval and verification grant the blue tick.
  // can_show_badge is a legacy flag not synchronized by approval flows.
  const verified = isApprovedVerifiedBusiness(business);
  const lat = Number(business.latitude);
  const lng = Number(business.longitude);
  const hasCoordinates = business.latitude != null && business.longitude != null && Number.isFinite(lat) && Number.isFinite(lng) &&
    !(lat === 0 && lng === 0) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
  const fullAddress = business.detailed_address || business.address || "";
  const directionsHref = hasCoordinates
    ? "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(lat + "," + lng)
    : fullAddress
      ? "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(fullAddress)
      : null;
  const rawWebsite = business.website_url?.trim() || "";
  const websiteHref = /^https?:\/\//i.test(rawWebsite)
    ? rawWebsite
    : /^[a-z0-9.-]+\.[a-z]{2,}/i.test(rawWebsite)
      ? "https://" + rawWebsite : null;
  const hours = business.working_hours;
  const hoursLabel = typeof hours === "string"
    ? hours
    : hours && typeof hours === "object"
      ? Object.entries(hours as unknown as Record<string, unknown>)
          .map(([day, time]) => day + ": " + (typeof time === "string" ? time : "Contact for details"))
          .join(" · ")
      : null;
  const canCall = Boolean(business.phone?.trim());
  const digits = (business.phone || "").replace(/\D/g,"");
  const whatsappNumber = /^0\d{9}$/.test(digits) ? "94"+digits.slice(1) : /^94\d{9}$/.test(digits) ? digits : /^\+/.test(business.phone || "") && /^[1-9]\d{7,14}$/.test(digits) ? digits : null;
  const whatsappHref = whatsappNumber ? "https://wa.me/"+whatsappNumber : null;
  const hasRating = reviewSummary !== null && reviewSummary.count > 0 && reviewSummary.average !== null;

  const shareBusiness = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: business.name, url });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        toast.success("Business link copied");
      } else {
        toast.info("Copy this page's URL to share this business");
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      toast.error("Unable to share this profile");
    }
  };

  const recordCall = () => {
    void logEvent(business.id, "call_click", business.address?.split(",").pop()?.trim() || "Unknown");
  };



  const inputStyle = "w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-neutral-500 focus:ring-1 focus:ring-neutral-400";
  const action = "flex min-h-[76px] w-full min-w-0 flex-col items-center justify-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-1 py-2 text-center text-[11px] font-medium leading-tight text-neutral-800 transition-colors hover:border-neutral-300 hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-600 sm:text-xs";
  const logDirections=()=>void logEvent(business.id,"location_click",business.address?.split(",").pop()?.trim()||"Unknown");
  const advancePhoto=(direction:number)=>setPhotoIndex(index=>index===null||!photos.length?null:(index+direction+photos.length)%photos.length);
  const bentoTiles=photos.slice(0,4);
  const bentoSize=bentoTiles.length;
  const bentoColumns=bentoSize===4?"grid-cols-[1.35fr_1fr_.58fr] grid-rows-2":bentoSize===3?"grid-cols-[1.35fr_1fr] grid-rows-2":bentoSize===2?"grid-cols-2 grid-rows-1":"grid-cols-1 grid-rows-1";

  return (
    <div data-business-profile className="min-h-[80dvh] bg-white font-sans text-neutral-900" style={{fontFamily:"var(--font-inter), var(--font-tamil), var(--font-sinhala), sans-serif"}}>
      <div className="mx-auto max-w-[1480px] px-4 pb-12 pt-5 sm:px-6 lg:px-10 lg:pt-8">
        <nav aria-label="Breadcrumb" className="mb-6 flex min-w-0 items-center gap-2 text-xs text-neutral-500">
          <Link href="/" className="shrink-0 hover:text-neutral-900">Home</Link><ChevronRight size={13} className="shrink-0"/>
          <Link href="/nearby" className="shrink-0 hover:text-neutral-900">Businesses</Link><ChevronRight size={13} className="shrink-0"/>
          <span aria-current="page" className="truncate text-neutral-800">{business.name}</span>
        </nav>
        <div className="grid items-start gap-y-7 lg:grid-cols-[minmax(0,2.7fr)_minmax(0,1fr)] lg:gap-x-8 xl:gap-x-12">
          <div className="min-w-0">
            <section aria-labelledby="business-profile-title" className="grid items-center gap-4 border-b border-neutral-200 pb-6 sm:grid-cols-[minmax(100px,144px)_minmax(0,1fr)] lg:gap-5 xl:grid-cols-[minmax(112px,148px)_minmax(0,1fr)_310px]">
              <div data-profile-logo className="relative aspect-square w-[104px] overflow-hidden rounded-xl border border-neutral-100 bg-neutral-50 sm:w-full">
                {business.logo_url?<Image src={business.logo_url} alt={business.name+" logo"} fill priority sizes="(max-width:639px) 104px, 148px" className="object-contain p-2"/>:
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-neutral-400"><Building2 size={36} strokeWidth={1.4}/><span className="text-[11px]">No logo</span></div>}
              </div>
              <div className="min-w-0 space-y-2">
                {business.category&&<p className="break-words text-xs font-medium text-neutral-600 sm:text-sm">{business.category}</p>}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2"><h1 id="business-profile-title" className="min-w-0 break-words text-[clamp(1.45rem,2.1vw,2.15rem)] font-semibold leading-tight tracking-tight">{business.name}</h1>{business.status==="approved"&&<BusinessAudienceControls businessId={String(business.id)} businessName={business.name}/>}</div>
                <div className="space-y-1.5 text-sm">
                  <a href="#reviews" className="flex min-w-0 flex-wrap items-center gap-1.5 text-sm text-neutral-700 hover:underline">
                    <Star size={17} aria-hidden="true" className={"shrink-0 "+(hasRating?"fill-amber-400 text-amber-500":"text-neutral-400")}/>
                    {reviewsLoading?<span className="text-neutral-500">Loading reviews…</span>:reviewSummary===null?<span className="text-neutral-500">Reviews unavailable</span>:reviewSummary.count===0?<span>No reviews yet</span>:<>
                      {reviewSummary.average!==null&&<span className="font-semibold tabular-nums text-neutral-900">{reviewSummary.average.toFixed(1)}</span>}
                      <span className="text-neutral-500">({reviewSummary.count} {reviewSummary.count===1?"review":"reviews"})</span>
                    </>}
                  </a>
                  {business.is_registered&&!verified&&<p className="flex items-center gap-2 text-neutral-600"><Building2 size={16} className="shrink-0"/> Registration provided</p>}
                  {verified&&<div className="flex items-center gap-2 text-slate-800 font-semibold"><VerifiedBadge size={15}/> <span>Verified Business</span></div>}
                  {!verified&&<OwnerVerificationPrompt business={business}/>}
                  {business.owner_name&&<p className="flex items-center gap-2 pt-1 text-base font-medium"><UserRound size={19} className="shrink-0 text-neutral-500"/><span className="break-words">{business.owner_name}</span></p>}
                </div>
              </div>
              <div data-slbi-business-actions="true" aria-label="Business actions" className="grid w-full min-w-0 grid-cols-3 auto-rows-fr gap-2 sm:col-span-2 xl:col-span-1">
                {whatsappHref&&<a href={whatsappHref} target="_blank" rel="noopener noreferrer" className={action}><Image src="/business-actions/whatsapp.svg" alt="" width={23} height={23} unoptimized className="h-6 w-6 shrink-0 object-contain"/><span className="whitespace-nowrap">WhatsApp</span></a>}
                {canCall&&<a href={"tel:"+business.phone} onClick={recordCall} className={action}><span data-slbi-action-icon="call" className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#16A34A] text-white"><Phone size={15} strokeWidth={2.5} aria-hidden="true"/></span><span className="whitespace-nowrap">Call me</span></a>}
                {directionsHref&&<a href={directionsHref} target="_blank" rel="noopener noreferrer" onClick={logDirections} className={action}><Image src="/business-actions/google-maps.svg" alt="" width={24} height={24} unoptimized className="h-6 w-6 shrink-0 object-contain"/><span className="whitespace-nowrap">Directions</span></a>}
                <a href="#enquiry" className={action}><MessageSquare data-slbi-action-icon="enquiry" size={24} strokeWidth={1.9} aria-hidden="true" className="shrink-0 text-blue-600"/><span className="whitespace-nowrap">Enquire</span></a>
                <button type="button" onClick={handleToggleSaved} aria-pressed={isSaved} className={action}><Bookmark data-slbi-action-icon="save" size={24} strokeWidth={1.9} aria-hidden="true" className={"shrink-0 text-amber-600 "+(isSaved?"fill-amber-400":"")}/><span className="whitespace-nowrap">{isSaved?'Saved':'Save'}</span></button>
                <button type="button" onClick={shareBusiness} className={action}><Share2 data-slbi-action-icon="share" size={24} strokeWidth={1.9} aria-hidden="true" className="shrink-0 text-slate-600"/><span className="whitespace-nowrap">Share</span></button>
              </div>
            </section>

            <div className="grid items-start gap-y-7 pt-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.45fr)] lg:gap-x-6 xl:gap-x-8">
              <div className="min-w-0 space-y-8">
                <section id="overview" className="scroll-mt-24 min-w-0">
                  <h2 className="flex items-center gap-2 text-base font-semibold"><Info size={19} className="text-neutral-500"/> About the business</h2>
                  <p className="mt-3 whitespace-pre-line break-words text-sm leading-7 text-neutral-600">{business.description?.trim()||"This business has not added a description yet."}</p>
                  {(business.email||websiteHref||hoursLabel)&&<dl className="mt-5 space-y-3 border-t border-neutral-100 pt-4 text-sm">
                    {business.email&&<div className="flex min-w-0 items-start gap-2"><Mail size={17} className="mt-0.5 shrink-0 text-neutral-500"/><div className="min-w-0"><dt className="sr-only">Email</dt><dd className="break-all"><a className="hover:underline" href={"mailto:"+business.email}>{business.email}</a></dd></div></div>}
                    {websiteHref&&<div className="flex min-w-0 items-start gap-2"><Globe size={17} className="mt-0.5 shrink-0 text-neutral-500"/><div className="min-w-0"><dt className="sr-only">Website</dt><dd className="break-words"><a href={websiteHref} target="_blank" rel="noopener noreferrer" className="hover:underline">{business.website_name||"Visit website"} <ExternalLink size={12} className="inline"/></a></dd></div></div>}
                    {hoursLabel&&<div className="flex min-w-0 items-start gap-2"><Clock size={17} className="mt-0.5 shrink-0 text-neutral-500"/><div className="min-w-0"><dt className="font-medium">Opening hours</dt><dd className="mt-1 whitespace-pre-line break-words text-neutral-600">{hoursLabel}</dd></div></div>}
                  </dl>}
                </section>
                <section id="gallery" className="scroll-mt-24 min-w-0">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="flex items-center gap-2 text-base font-semibold"><Images size={19} className="text-neutral-500"/> Gallery</h2>{photos.length>0&&<button type="button" onClick={()=>setPhotoIndex(0)} className="inline-flex items-center gap-1 text-xs font-medium text-neutral-700 hover:underline">View all ({photos.length}) <ArrowUpRight size={14}/></button>}</div>
                  {bentoSize>0?<div data-bento-gallery className={"grid h-[220px] gap-2 overflow-hidden sm:h-[280px] "+bentoColumns}>
                    {bentoTiles.map((url,index)=><button type="button" key={url} aria-label={"Open gallery photo "+(index+1)} onClick={()=>setPhotoIndex(index)} className={"group relative min-h-0 min-w-0 overflow-hidden rounded-lg bg-neutral-100 focus-visible:outline-2 focus-visible:outline-neutral-600 "+(bentoSize>=3&&(index===0||(bentoSize===4&&index===3))?"row-span-2":"")}><Image src={url} alt={business.name+" gallery photo "+(index+1)} fill sizes="(max-width:639px) 94vw, (max-width:1023px) 48vw, 32vw" className="object-cover"/>{index===bentoSize-1&&photos.length>bentoSize&&<span className="absolute inset-0 grid place-items-center bg-black/40 text-sm font-semibold text-white">+{photos.length-bentoSize} photos</span>}</button>)}
                  </div>:<div className="flex min-h-[175px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-5 text-center"><Images size={28} strokeWidth={1.4} className="text-neutral-400"/><p className="text-sm text-neutral-500">No gallery photos uploaded yet.</p></div>}
                </section>
              </div>
              <section id="services" className="scroll-mt-24 min-w-0">
                <h2 className="mb-3 flex items-center gap-2 text-base font-semibold"><BriefcaseBusiness size={19} className="text-neutral-500"/> Services</h2>
                <div className="min-h-[160px] rounded-xl border border-neutral-200 bg-neutral-50/70 p-3.5">
                  {services.length?<ul className="divide-y divide-neutral-200">{services.map((service,index)=><li key={index} className="flex items-start gap-2 py-3 first:pt-1 last:pb-1 text-sm"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-neutral-500"/><span className="min-w-0 break-words">{service}</span></li>)}</ul>:<p className="text-sm leading-6 text-neutral-500">Services have not been listed yet.</p>}
                  {!!business.facilities?.length&&<div className="mt-4 border-t border-neutral-200 pt-3"><h3 className="mb-2 text-xs font-semibold">Facilities &amp; amenities</h3><ul className="space-y-2">{business.facilities.map((facility,index)=><li key={index} className="flex items-center gap-2 text-xs text-neutral-600"><span className="shrink-0">{getFacilityIcon(facility)}</span>{facility}</li>)}</ul></div>}
                </div>
              </section>
            </div>
          </div>
          <aside aria-label="Location and enquiry" className="min-w-0 space-y-5 lg:row-span-2">
            <section id="location" className="scroll-mt-24 min-w-0">
              <h2 className="flex items-center justify-center gap-2 text-base font-semibold"><MapPin size={20} className="text-neutral-500"/> Location</h2>
              {fullAddress&&<p className="my-3 break-words text-center text-sm leading-5 text-neutral-600">{fullAddress}</p>}
              {hasCoordinates?<DeferredBusinessMap lat={lat} lng={lng} business={business}/>:<div className="mt-3 grid min-h-40 place-items-center rounded-xl border border-neutral-200 bg-neutral-50 p-5 text-center text-sm text-neutral-500">Precise map location has not been provided.</div>}
            </section>
            <section id="enquiry" className="scroll-mt-24 rounded-xl border border-neutral-200 bg-white p-4 xl:p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#F5F5F5] text-[#404040]"><Send size={20}/></div>
                <div>
                  
                  <h2 className="mt-0.5 text-lg font-semibold tracking-tight text-[#202124]">Quick enquiry</h2>
                </div>
              </div>
              <p className="mt-4 text-[12px] leading-6 text-[#6B7280]">Send a message directly to this business.</p>
              <form onSubmit={handleEnquirySubmit} onChange={() => setWhatsappReadyUrl(null)} className="mt-4 space-y-3.5">
                <div>
                  <label htmlFor="enquiry-name" className="mb-1.5 block text-[11px] font-semibold text-[#4B5563]">Your name</label>
                  <input id="enquiry-name" type="text" required maxLength={100} placeholder="Full name"
                    value={enquiryForm.name} onChange={e => setEnquiryForm({...enquiryForm, name: e.target.value})} className={inputStyle}/>
                </div>
                <div>
                  <label htmlFor="enquiry-email" className="mb-1.5 block text-[11px] font-semibold text-[#4B5563]">Email address</label>
                  <input id="enquiry-email" type="email" required maxLength={160} placeholder="you@example.com"
                    value={enquiryForm.email} onChange={e => setEnquiryForm({...enquiryForm, email: e.target.value})} className={inputStyle}/>
                </div>
                <div>
                  <label htmlFor="enquiry-phone" className="mb-1.5 block text-[11px] font-semibold text-[#4B5563]">Phone number</label>
                  <input id="enquiry-phone" type="tel" required maxLength={24} placeholder="Your contact number"
                    value={enquiryForm.phone} onChange={e => setEnquiryForm({...enquiryForm, phone: e.target.value})} className={inputStyle}/>
                </div>
                <div>
                  <label htmlFor="enquiry-message" className="mb-1.5 block text-[11px] font-semibold text-[#4B5563]">Message</label>
                  <textarea id="enquiry-message" rows={4} required maxLength={3000} placeholder="How can this business help?"
                    value={enquiryForm.message} onChange={e => setEnquiryForm({...enquiryForm, message: e.target.value})} className={inputStyle}/>
                </div>
                <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-[#E5E7EB] bg-[#FAFAFA] px-3.5 py-3 text-[11px] leading-5 text-[#525252]">
                  <input type="checkbox" checked={leadConsent} onChange={e => setLeadConsent(e.target.checked)} required
                    className="mt-1 h-4 w-4 shrink-0 accent-[#262626]" />
                  <span>I agree to send my name, email, phone and message to this business for responding to my enquiry. Please do not send sensitive IDs or payment details.</span>
                </label>
                {emailOptInEnabled&&<label className="flex items-start gap-2 rounded-xl border border-[#F1DECE] bg-[#FFFAF7] p-3 text-[11px] leading-5 text-[#5B4A3D]">
                  <input type="checkbox" checked={marketingOptIn} disabled={!emailOptInEnabled}
                    onChange={e=>setMarketingOptIn(e.target.checked)}
                    className="mt-1 h-4 w-4 shrink-0 accent-[#FF7900]"/>
                  <span>Receive occasional offers &amp; updates from <strong>{business.name}</strong>.
                    Optional and separate from this enquiry. A confirmation email and an unsubscribe option are required before promotional sending.
                    {!emailOptInEnabled&&<span className="block text-[#B36B3D]">Subscription registration is being prepared; enquiries still work without this option.</span>}
                  </span>
                </label>}
                {secureLeadsEnabled && turnstileSiteKey && (
                  <div ref={turnstileContainerRef} data-enquiry-turnstile className="flex w-full min-w-0 max-w-full items-center justify-center py-1">
                    {turnstileSize!==null&&<Turnstile key={turnstileReset+"-"+turnstileSize} siteKey={turnstileSiteKey}
                      options={{ action: "business_enquiry", size: turnstileSize, theme: "light" }}
                      onSuccess={token => setTurnstileToken(token)}
                      onExpire={() => setTurnstileToken("")}
                      onError={() => setTurnstileToken("")}
                    />}
                  </div>
                )}
                {secureLeadsEnabled && !turnstileSiteKey && (
                  <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                    Secure enquiry verification is temporarily unavailable.
                  </p>
                )}
                <button type="submit" disabled={submittingEnquiry || !leadConsent || (secureLeadsEnabled && !turnstileToken)}
                  className="mt-2 inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-lg bg-[#252525] px-5 text-[13px] font-bold text-white transition-colors hover:bg-[#444444] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#737373] disabled:opacity-60">
                  {submittingEnquiry ? <Loader2 size={17} className="animate-spin"/> : <Send size={17}/>} Send enquiry
                </button>
              </form>
              {whatsappReadyUrl && (
                <a href={whatsappReadyUrl} target="_blank" rel="noopener noreferrer"
                  className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#E5E5E5] bg-[#FAFAFA] px-4 text-[12px] font-bold text-[#262626] transition-colors hover:bg-[#F5F5F5]">
                  Continue on WhatsApp <ArrowUpRight size={16}/>
                </a>
              )}
              <p className="mt-4 text-center text-[11px] leading-5 text-[#737373]">Please avoid sharing sensitive personal or payment information.</p>
            </section>
          </aside>
          <div className="min-w-0 lg:col-start-1">            <section id="reviews" className="scroll-mt-28 border-t border-neutral-200 pt-7">
              <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#E5E7EB] pb-7">
                <div>
                  
                  <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#202124]">Customer reviews</h2>
                  <p className="mt-2 text-[13px] text-[#6B7280]">{reviewSummary === null ? (reviewsLoading ? "Loading reviews…" : "Review count unavailable") : reviewSummary.count+" published "+(reviewSummary.count===1?"review":"reviews")}</p>
                </div>
                <a href="#write-review" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#E5E7EB] bg-[#FAFAFA] px-4 text-[12px] font-semibold text-[#262626] hover:bg-[#F5F5F5]">
                  <MessageSquare size={15}/> Write a review
                </a>
              </div>

              {reviewsLoading ? (
                <div role="status" className="py-9 text-center text-[13px] text-[#6B7280]"><Loader2 size={22} className="mx-auto mb-2 animate-spin"/>Loading reviews…</div>
              ) : reviewSummary === null ? (
                <p className="py-6 text-sm text-neutral-500">Reviews could not be loaded. Please refresh to try again.</p>
              ) : reviews.length === 0 ? (
                <div className="mt-6 flex items-center gap-4 rounded-lg border border-dashed border-[#E5E7EB] bg-[#FAFAFA] p-5">
                  <MessageSquare size={23} className="shrink-0 text-[#737373]"/>
                  <p className="text-[13px] leading-6 text-[#6B7280]">No customer reviews yet. You can be the first to share your experience.</p>
                </div>
              ) : (
                <div className="divide-y divide-[#E5E7EB]">
                  {reviews.map(review => (
                    <article key={review.id} className="py-6 first:pt-7">
                      <div className="flex items-start gap-3.5">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#525252] text-[16px] font-semibold text-white">{review.user_name?.charAt(0)?.toUpperCase() || "C"}</div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <h3 className="text-[14px] font-semibold text-[#262626]">{review.user_name}</h3>
                            <time dateTime={review.created_at} className="text-[11px] text-[#737373]">{new Date(review.created_at).toLocaleDateString()}</time>
                          </div>
                          <div className="mt-1.5 flex gap-1" aria-label={review.rating + " out of 5 stars"}>
                            {[1, 2, 3, 4, 5].map(n => (
                              <Star key={n} size={13} className={n <= review.rating ? "fill-[#262626] text-[#262626]" : "text-[#D1D5DB]"}/>
                            ))}
                          </div>
                          <p className="mt-4 whitespace-pre-line break-words text-[13px] leading-[1.85] text-[#4B5563]">{review.comment}</p>
                          {review.review_replies?.[0] && (
                            <div className="mt-4 rounded-lg border-l-[3px] border-[#737373] bg-[#FAFAFA] p-4">
                              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.09em] text-[#404040]"><MessageSquare size={14}/> Business response</p>
                              <p className="mt-2 break-words text-[12px] leading-6 text-[#525252]">{review.review_replies[0].reply_text}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}

              <div id="write-review" className="scroll-mt-28 mt-7 rounded-xl border border-[#E5E7EB] bg-[#FAFAFA] p-5 sm:p-7">
                <h3 className="text-[20px] font-semibold tracking-[-0.035em] text-[#202124]">Share your experience</h3>
                <p className="mt-1.5 text-[12px] leading-6 text-[#6B7280]">
                  Sign-in is required to submit a review. Feedback may be moderated before appearing publicly.
                  {' '}<Link href={"/login?redirect=" + encodeURIComponent("/business/" + (business.slug || business.id) + "#write-review")}
                    className="font-semibold text-[#252525] underline underline-offset-2">Sign in</Link>
                </p>
                <form onSubmit={handleReviewSubmit} className="mt-6 space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="business-review-name" className="mb-2 block text-[11px] font-semibold text-[#4B5563]">Your name</label>
                      <input id="business-review-name" required maxLength={100} value={reviewForm.user_name}
                        onChange={event => setReviewForm({...reviewForm, user_name: event.target.value})}
                        placeholder="Enter your name" className={inputStyle}/>
                    </div>
                    <div>
                      <label className="mb-2 block text-[11px] font-semibold text-[#4B5563]">Your rating</label>
                      <div className="flex min-h-[48px] items-center gap-1" role="group" aria-label="Review rating">
                        {[1, 2, 3, 4, 5].map(star => (
                          <button type="button" key={star} aria-label={star + " stars"} aria-pressed={reviewForm.rating === star}
                            onClick={() => setReviewForm({...reviewForm, rating: star})}
                            className="rounded-lg p-2 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#737373]">
                            <Star size={23} className={star <= reviewForm.rating ? "fill-[#262626] text-[#262626]" : "text-[#D1D5DB]"}/>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="business-review-comment" className="mb-2 block text-[11px] font-semibold text-[#4B5563]">Your review</label>
                    <textarea id="business-review-comment" rows={4} required maxLength={3000} value={reviewForm.comment}
                      onChange={event => setReviewForm({...reviewForm, comment: event.target.value})}
                      placeholder="Tell others about your experience…" className={inputStyle}/>
                  </div>
                  <button type="submit" disabled={submittingReview}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#252525] px-6 text-[13px] font-bold text-white transition-colors hover:bg-[#444444] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#737373] disabled:opacity-60">
                    {submittingReview ? <Loader2 size={17} className="animate-spin"/> : <Send size={17}/>}
                    Submit review
                  </button>
                </form>
              </div>
            </section>
</div>
        </div>
        <div className="mt-8 border-t border-neutral-200 pt-4"><button type="button" onClick={()=>setShowReportModal(true)} className="inline-flex items-center gap-2 text-xs text-neutral-500 hover:text-neutral-900"><Flag size={14}/> Report listing</button></div>
      </div>
      <Dialog.Root open={photoIndex!==null} onOpenChange={open=>{if(!open)setPhotoIndex(null)}}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[2000] bg-black/80"/>
          <Dialog.Content onKeyDown={event=>{if(event.key==='ArrowLeft')advancePhoto(-1);if(event.key==='ArrowRight')advancePhoto(1)}} className="fixed inset-3 z-[2001] flex flex-col overflow-hidden rounded-xl bg-neutral-950 text-white outline-none sm:inset-8 lg:inset-x-[12%]">
            <div className="flex items-center justify-between gap-3 px-4 py-3"><div className="min-w-0"><Dialog.Title className="truncate text-sm font-semibold">{business.name}</Dialog.Title><Dialog.Description className="text-xs text-neutral-400">Photo {(photoIndex??0)+1} of {photos.length}</Dialog.Description></div><Dialog.Close aria-label="Close gallery" className="grid h-10 w-10 shrink-0 place-items-center rounded-lg hover:bg-white/10"><X size={22}/></Dialog.Close></div>
            <div className="relative min-h-0 flex-1">{photoIndex!==null&&photos[photoIndex]&&<Image src={photos[photoIndex]} alt={business.name+" photo "+(photoIndex+1)} fill sizes="90vw" className="object-contain"/>}</div>
            {photos.length>1&&<div className="flex justify-center gap-4 p-4"><button type="button" aria-label="Previous photo" onClick={()=>advancePhoto(-1)} className="grid h-11 w-11 place-items-center rounded-lg bg-white/10 hover:bg-white/20"><ChevronLeft size={24}/></button><button type="button" aria-label="Next photo" onClick={()=>advancePhoto(1)} className="grid h-11 w-11 place-items-center rounded-lg bg-white/10 hover:bg-white/20"><ChevronRight size={24}/></button></div>}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <ReportModal isOpen={showReportModal} onClose={()=>setShowReportModal(false)} targetId={business.id.toString()} targetType="business" targetName={business.name}/>
    </div>
  );
}
