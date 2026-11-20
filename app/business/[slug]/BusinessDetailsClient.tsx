"use client";

import React, { useState, useEffect, useRef } from "react";
import { Business } from "@/lib/types";
import {
  MapPin,
  Phone,
  Mail,
  Globe,
  Clock,
  Star,
  Building2,
  ShieldCheck,
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
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabaseClient";
import VerifiedBadge from "@/app/components/VerifiedBadge";
import BrandIcon from "@/app/components/BrandIcon";
import {useSavedBusinesses} from "@/lib/public-saved-businesses";
import ReportModal from "@/app/components/ReportModal";
import { logEvent } from "@/lib/utils";
import { toast } from "sonner";
import { Turnstile } from "@marsidev/react-turnstile";

const LeafletMap = dynamic(() => import("@/components/LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[400px] w-full bg-gray-100 animate-pulse rounded-xl flex items-center justify-center text-gray-400">
      Loading Map...
    </div>
  ),
});

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
  const [photoIndex, setPhotoIndex] = useState<number | null>(null);
  const photos = [...new Set([business.image_url, ...galleryUrls].filter((url): url is string => Boolean(url)))];
  const heroPhoto = photos[0];
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
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileReset, setTurnstileReset] = useState(0);
  // Retry the same submitted payload with the same UUID. A changed form gets a
  // fresh UUID so an earlier successful request cannot mask new enquiry data.
  const enquiryRequestRef = useRef<{ fingerprint: string; id: string } | null>(null);
  const secureLeadsEnabled = process.env.NEXT_PUBLIC_SECURE_LEADS_ENABLED === "true";
  const turnstileSiteKey = process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY || "";
  const [showReportModal, setShowReportModal] = useState(false);

  useEffect(() => {
    fetchReviews();
    recordView();
  }, [business.id]);

  const fetchReviews = async () => {
    try {
      const { data, error } = await supabase
        .from("reviews")
        .select("*, review_replies(reply_text, created_at)")
        .eq("business_id", business.id)
        .eq("is_approved", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setReviews(data || []);
    } catch (error) {
      console.error("Error fetching reviews:", error);
    } finally {
      setReviewsLoading(false);
    }
  };

  const recordView = async () => {
    try {
      // New Analytics logging
      await logEvent(
        business?.id,
        "view",
        business?.address?.split(",").pop()?.trim() || "Unknown",
      );

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
        const fingerprint = JSON.stringify({ businessId: business.id, ...enquiryForm });
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
            turnstile_token: turnstileToken,
          }),
        });
        const result = await response.json() as { success?: boolean; error?: string };
        if (!response.ok || !result.success) {
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
      setTurnstileToken("");
      setTurnstileReset(v => v + 1);
      toast.success("Enquiry submitted", {
        description: business.phone
          ? "You can also continue the conversation on WhatsApp below."
          : "Your enquiry has been saved successfully.",
      });
    } catch (error) {
      console.error("Error sending enquiry:", error);
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
  const verified = Boolean(
    business.can_show_badge && (business.is_verified || business.verification_status === "verified")
  );
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
  const hasRating = Number.isFinite(Number(business.rating)) && Number(business.rating) > 0 &&
    (business.reviews_count || 0) > 0;

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


  const inputStyle = "w-full rounded-lg border border-neutral-200 bg-white px-3.5 py-3 text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-[#B7874D] focus:ring-2 focus:ring-[#EBDAC4]";
  const card = "scroll-mt-28 min-w-0 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-7";
  const action = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 text-sm font-medium text-neutral-800 transition hover:border-[#BE9B71] hover:bg-[#FAF7F2] focus-visible:outline-2 focus-visible:outline-[#B7874D]";
  const sectionLinks = [{href:"#overview",label:"Overview"},{href:"#services",label:"Services"},{href:"#gallery",label:"Gallery"},{href:"#location",label:"Location"},{href:"#reviews",label:"Reviews"},{href:"#enquiry",label:"Enquiry"}];
  const logDirections=()=>void logEvent(business.id,"location_click",business.address?.split(",").pop()?.trim()||"Unknown");
  const advancePhoto=(direction:number)=>setPhotoIndex(index=>index===null||!photos.length?null:(index+direction+photos.length)%photos.length);
  return (
    <div className="min-h-[80dvh] bg-[#F8F8F7] text-neutral-900">
      <div className="mx-auto max-w-[1480px] px-4 pb-5 pt-5 sm:px-6 lg:px-10 lg:pt-8">
        <nav aria-label="Breadcrumb" className="mb-5 flex min-w-0 items-center gap-2 text-xs text-neutral-500 sm:text-sm">
          <Link href="/" className="shrink-0 hover:text-neutral-900">Home</Link><ChevronRight size={13} className="shrink-0"/>
          <Link href="/nearby" className="shrink-0 hover:text-neutral-900">Businesses</Link><ChevronRight size={13} className="shrink-0"/>
          <span aria-current="page" className="truncate font-medium text-neutral-800">{business.name}</span>
        </nav>
        <section aria-labelledby="business-profile-title" className="grid items-stretch gap-5 rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm sm:p-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-8 lg:p-6">
          <div className="relative aspect-[4/3] min-w-0 overflow-hidden rounded-xl bg-[#F2F1EE] sm:aspect-[16/10] lg:aspect-auto lg:min-h-[340px]">
            {heroPhoto?<Image src={heroPhoto} alt={business.name+" business photo"} fill priority sizes="(max-width:1023px) 100vw, 45vw" className="object-contain"/>:
              business.logo_url?<Image src={business.logo_url} alt={business.name+" logo"} fill sizes="(max-width:1023px) 100vw, 45vw" className="object-contain p-12"/>:
              <div className="flex h-full flex-col items-center justify-center gap-3 text-neutral-400"><Building2 size={58} strokeWidth={1.2}/><span className="text-xs">Business photo not provided</span></div>}
            {!!photos.length&&<button type="button" onClick={()=>setPhotoIndex(0)} className="absolute bottom-3 right-3 inline-flex min-h-10 items-center gap-2 rounded-lg bg-neutral-950/85 px-3.5 text-xs font-semibold text-white hover:bg-black"><Images size={15}/> View photos ({photos.length})</button>}
          </div>
          <div className="flex min-w-0 flex-col justify-center px-2 pb-3 pt-1 sm:px-3 lg:py-5">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {business.category&&<span className="rounded-md bg-[#F4EEE5] px-2.5 py-1.5 text-xs font-semibold text-[#845D2E]">{business.category}</span>}
              {verified&&<span className="inline-flex items-center gap-1.5 rounded-md border border-[#E5D4BE] bg-white px-2.5 py-1.5 text-xs font-medium text-[#79562D]"><VerifiedBadge size={14}/> Verified business</span>}
            </div>
            <h1 id="business-profile-title" className="break-words text-[clamp(1.8rem,3.3vw,3.5rem)] font-semibold leading-[1.12] tracking-tight text-neutral-950">{business.name}</h1>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
              {hasRating?<a href="#reviews" className="inline-flex items-center gap-2 font-semibold text-neutral-900"><Star size={18} className="fill-[#B98542] text-[#B98542]"/>{Number(business.rating).toFixed(1)} <span className="font-normal text-neutral-500">({business.reviews_count} reviews)</span></a>:<a href="#reviews" className="flex items-center gap-2 text-neutral-500"><Star size={17}/> No reviews yet</a>}
              {business.is_registered&&<span className="inline-flex items-center gap-1.5 border-l border-neutral-200 pl-3 text-xs text-neutral-600"><ShieldCheck size={15}/> Registration provided</span>}
            </div>
            {fullAddress&&<p className="mt-5 flex items-start gap-2.5 break-words text-sm leading-6 text-neutral-600"><MapPin size={18} className="mt-0.5 shrink-0 text-[#A17A45]"/>{fullAddress}</p>}
            <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-5">
              {canCall&&<a href={"tel:"+business.phone} onClick={recordCall} className="inline-flex min-h-11 min-w-0 items-center gap-2 rounded-lg bg-neutral-900 px-4 text-sm font-semibold text-white transition hover:bg-neutral-700"><Phone size={16}/><span className="break-all">{business.phone}</span></a>}
              {directionsHref&&<a href={directionsHref} target="_blank" rel="noopener noreferrer" onClick={logDirections} className={action}><Navigation size={16}/> Directions</a>}
              <a href="#enquiry" className={action}><MessageSquare size={16}/> Enquire</a>
              <button type="button" onClick={handleToggleSaved} aria-pressed={isSaved} className={action}><BrandIcon name="bookmark-2" size={17} variant={isSaved?'bold':'linear'}/>{isSaved?'Saved':'Save'}</button>
              <button type="button" onClick={shareBusiness} className={action}><Share2 size={16}/> Share</button>
            </div>
          </div>
        </section>
      </div>

      <nav aria-label="Business profile sections" className="border-y border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-[1480px] items-center gap-5 overflow-x-auto px-4 [scrollbar-width:none] sm:px-6 lg:px-10">
          {sectionLinks.map(link=><a key={link.href} href={link.href} className="shrink-0 border-b-2 border-transparent py-3 text-sm font-medium text-neutral-600 transition hover:border-[#B7874D] hover:text-neutral-950">{link.label}</a>)}
          <button type="button" onClick={()=>setShowReportModal(true)} className="ml-auto inline-flex shrink-0 items-center gap-2 py-3 text-xs text-neutral-500 hover:text-red-700"><Flag size={14}/> Report listing</button>
        </div>
      </nav>

      <div className="mx-auto grid max-w-[1480px] items-start gap-5 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)] lg:gap-6 lg:px-10 lg:py-8">
        <div className="min-w-0 space-y-5">
          <section id="overview" className={card}>
            <h2 className="flex items-center gap-2.5 text-xl font-semibold tracking-tight"><Building2 size={21} className="text-[#A17A45]"/> About the business</h2>
            <p className="mt-4 whitespace-pre-line break-words text-sm leading-7 text-neutral-600">{business.description?.trim()||"This business has not added a description yet."}</p>
          </section>
          <section id="services" className={card}>
            <h2 className="flex items-center gap-2.5 text-xl font-semibold tracking-tight"><BriefcaseBusiness size={21} className="text-[#A17A45]"/> Services</h2>
            {services.length?<div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">{services.map((service,index)=><div key={index} className="flex min-w-0 items-center gap-3 rounded-lg border border-neutral-200 bg-[#FAF9F7] p-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-white text-[#A17A45]"><BriefcaseBusiness size={17}/></span><span className="min-w-0 break-words text-sm font-medium">{service}</span></div>)}</div>:<p className="mt-4 text-sm leading-6 text-neutral-500">Services have not been listed yet. Contact the business to learn more.</p>}
            {!!business.facilities?.length&&<div className="mt-6 border-t border-neutral-100 pt-5"><h3 className="mb-3 text-sm font-semibold">Facilities &amp; amenities</h3><div className="flex flex-wrap gap-2">{business.facilities.map((facility,index)=><span key={index} className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-xs text-neutral-700"><span className="text-[#A17A45]">{getFacilityIcon(facility)}</span>{facility}</span>)}</div></div>}
          </section>
          <section id="gallery" className={card}>
            <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="flex items-center gap-2.5 text-xl font-semibold tracking-tight"><Images size={21} className="text-[#A17A45]"/> Gallery</h2>{photos.length>0&&<button type="button" onClick={()=>setPhotoIndex(0)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#895F2E] hover:underline">View all {photos.length} <ArrowUpRight size={15}/></button>}</div>
            {galleryUrls.length?<div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:gap-3">{galleryUrls.slice(0,6).map((url,index)=><button key={url} type="button" onClick={()=>setPhotoIndex(photos.indexOf(url))} aria-label={"Open gallery image "+(index+1)} className="relative aspect-[4/3] overflow-hidden rounded-lg bg-neutral-100 focus-visible:outline-2 focus-visible:outline-[#B7874D]"><Image src={url} alt={business.name+" gallery photo "+(index+1)} fill sizes="(max-width:639px) 46vw, (max-width:1023px) 30vw, 20vw" className="object-cover transition hover:scale-[1.03]"/></button>)}</div>:<p className="mt-4 text-sm text-neutral-500">Additional business photos have not been uploaded yet.</p>}
          </section>
                      <section id="reviews" className="scroll-mt-28 rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm sm:p-8">
              <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#E5E7EB] pb-7">
                <div>
                  <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.17em] text-[#9A6C35]">Community experience</p>
                  <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#202124]">Customer reviews<span className="text-[#B7874D]">.</span></h2>
                  <p className="mt-2 text-[13px] text-[#6B7280]">{reviews.length} published {reviews.length === 1 ? "review" : "reviews"}</p>
                </div>
                <a href="#write-review" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#E5E7EB] bg-[#FAF8F4] px-4 text-[12px] font-semibold text-[#825A2B] hover:bg-[#F5EFE5]">
                  <MessageSquare size={15}/> Write a review
                </a>
              </div>

              {reviewsLoading ? (
                <div role="status" className="py-9 text-center text-[13px] text-[#6B7280]"><Loader2 size={22} className="mx-auto mb-2 animate-spin"/>Loading reviews…</div>
              ) : reviews.length === 0 ? (
                <div className="mt-6 flex items-center gap-4 rounded-[18px] border border-dashed border-[#E5E7EB] bg-[#FAFAFA] p-5">
                  <MessageSquare size={23} className="shrink-0 text-[#A67B49]"/>
                  <p className="text-[13px] leading-6 text-[#6B7280]">No customer reviews yet. You can be the first to share your experience.</p>
                </div>
              ) : (
                <div className="divide-y divide-[#E5E7EB]">
                  {reviews.map(review => (
                    <article key={review.id} className="py-6 first:pt-7">
                      <div className="flex items-start gap-3.5">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[#78634D] text-[16px] font-semibold text-white">{review.user_name?.charAt(0)?.toUpperCase() || "C"}</div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <h3 className="text-[14px] font-semibold text-[#262626]">{review.user_name}</h3>
                            <time dateTime={review.created_at} className="text-[11px] text-[#737373]">{new Date(review.created_at).toLocaleDateString()}</time>
                          </div>
                          <div className="mt-1.5 flex gap-1" aria-label={review.rating + " out of 5 stars"}>
                            {[1, 2, 3, 4, 5].map(n => (
                              <Star key={n} size={13} className={n <= review.rating ? "fill-[#B98542] text-[#B98542]" : "text-[#D1D5DB]"}/>
                            ))}
                          </div>
                          <p className="mt-4 whitespace-pre-line break-words text-[13px] leading-[1.85] text-[#4B5563]">{review.comment}</p>
                          {review.review_replies?.[0] && (
                            <div className="mt-4 rounded-[16px] border-l-[3px] border-[#C9A26D] bg-[#FAF7F2] p-4">
                              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.09em] text-[#805829]"><MessageSquare size={14}/> Business response</p>
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
                            className="rounded-lg p-2 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A26D]">
                            <Star size={23} className={star <= reviewForm.rating ? "fill-[#B98542] text-[#B98542]" : "text-[#D1D5DB]"}/>
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
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[13px] bg-[#252525] px-6 text-[13px] font-bold text-white transition-colors hover:bg-[#444444] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A26D] disabled:opacity-60">
                    {submittingReview ? <Loader2 size={17} className="animate-spin"/> : <Send size={17}/>}
                    Submit review
                  </button>
                </form>
              </div>
            </section>

        </div>
        <aside className="min-w-0 space-y-5" aria-label="Business information">
          {(business.email||websiteHref||business.owner_name||hoursLabel)&&<section className={card}>
            <h2 className="flex items-center gap-2.5 text-xl font-semibold tracking-tight"><Globe size={21} className="text-[#A17A45]"/> Business information</h2>
            <dl className="mt-3 divide-y divide-neutral-100">
              {business.email&&<div className="flex items-start gap-3 py-3"><Mail size={17} className="mt-1 shrink-0 text-[#A17A45]"/><div className="min-w-0"><dt className="text-xs text-neutral-500">Email</dt><dd className="mt-1 break-all text-sm font-medium"><a href={"mailto:"+business.email} className="hover:underline">{business.email}</a></dd></div></div>}
              {websiteHref&&<div className="flex items-start gap-3 py-3"><Globe size={17} className="mt-1 shrink-0 text-[#A17A45]"/><div className="min-w-0"><dt className="text-xs text-neutral-500">Website</dt><dd className="mt-1 break-all text-sm font-medium"><a href={websiteHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:underline">{business.website_name||"Visit website"}<ExternalLink size={13}/></a></dd></div></div>}
              {business.owner_name&&<div className="flex items-start gap-3 py-3"><UserRound size={17} className="mt-1 shrink-0 text-[#A17A45]"/><div className="min-w-0"><dt className="text-xs text-neutral-500">Business contact</dt><dd className="mt-1 break-words text-sm font-medium">{business.owner_name}</dd></div></div>}
            </dl>
            {hoursLabel&&<div className="border-t border-neutral-100 pt-4"><h3 className="flex items-center gap-2 text-sm font-semibold"><Clock size={17} className="text-[#A17A45]"/> Opening hours</h3><p className="mt-2 whitespace-pre-line break-words text-sm leading-6 text-neutral-600">{hoursLabel}</p></div>}
          </section>}

          <section id="location" className="scroll-mt-28 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-3 px-5 py-4"><h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight"><MapPin size={21} className="text-[#A17A45]"/> Location</h2>{directionsHref&&<a href={directionsHref} target="_blank" rel="noopener noreferrer" onClick={logDirections} className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-[#895F2E] hover:underline">Open map <ExternalLink size={13}/></a>}</div>
            {hasCoordinates?<div className="relative isolate z-0 h-[250px] w-full overflow-hidden border-t border-neutral-100"><LeafletMap centerLat={lat} centerLng={lng} businesses={[business]} zoom={15} height="100%" showUserLocation={false} enableClustering={false} wrapperClassName="relative isolate z-0 h-full w-full overflow-hidden" /></div>:<div className="grid min-h-32 place-items-center border-t border-neutral-100 bg-neutral-50 p-5 text-center text-sm text-neutral-500">Precise map location has not been provided.</div>}
          </section>
                      <section id="enquiry" className="scroll-mt-28 rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm sm:p-7">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[#FAF1E5] text-[#8C6236]"><Send size={20}/></div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[#9A6C35]">Start a conversation</p>
                  <h2 className="mt-0.5 text-xl font-semibold tracking-tight text-[#202124]">Quick enquiry</h2>
                </div>
              </div>
              <p className="mt-4 text-[12px] leading-6 text-[#6B7280]">Share your enquiry with this business. Your message and contact details will be submitted to the directory.</p>
              <form onSubmit={handleEnquirySubmit} onChange={() => setWhatsappReadyUrl(null)} className="mt-6 space-y-3.5">
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
                    className="mt-1 h-4 w-4 shrink-0 accent-[#956A39]" />
                  <span>I agree to send my name, email, phone and message to this business for responding to my enquiry. Please do not send sensitive IDs or payment details.</span>
                </label>
                {secureLeadsEnabled && turnstileSiteKey && (
                  <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-[#FAFAFA] p-3">
                    <Turnstile key={turnstileReset} siteKey={turnstileSiteKey}
                      options={{ action: "business_enquiry", size: "flexible" }}
                      onSuccess={token => setTurnstileToken(token)}
                      onExpire={() => setTurnstileToken("")}
                      onError={() => setTurnstileToken("")}
                    />
                  </div>
                )}
                {secureLeadsEnabled && !turnstileSiteKey && (
                  <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                    Secure enquiry verification is temporarily unavailable.
                  </p>
                )}
                <button type="submit" disabled={submittingEnquiry || !leadConsent || (secureLeadsEnabled && !turnstileToken)}
                  className="mt-2 inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-[13px] bg-[#252525] px-5 text-[13px] font-bold text-white transition-colors hover:bg-[#444444] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A26D] disabled:opacity-60">
                  {submittingEnquiry ? <Loader2 size={17} className="animate-spin"/> : <Send size={17}/>} Send enquiry
                </button>
              </form>
              {whatsappReadyUrl && (
                <a href={whatsappReadyUrl} target="_blank" rel="noopener noreferrer"
                  className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#DDD6C9] bg-[#FAF7F2] px-4 text-[12px] font-bold text-[#815B31] transition-colors hover:bg-[#F2EBDF]">
                  Continue on WhatsApp <ArrowUpRight size={16}/>
                </a>
              )}
              <p className="mt-4 text-center text-[11px] leading-5 text-[#737373]">Please avoid sharing sensitive personal or payment information.</p>
            </section>


        </aside>
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
