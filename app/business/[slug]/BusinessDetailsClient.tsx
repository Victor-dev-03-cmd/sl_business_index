"use client";

import React, { useState, useEffect } from "react";
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
import Link from "next/link";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabaseClient";
import VerifiedBadge from "@/app/components/VerifiedBadge";
import ReportModal from "@/app/components/ReportModal";
import { logEvent } from "@/lib/utils";
import { toast } from "sonner";

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
}

interface Review {
  id: string;
  user_name: string;
  rating: number;
  comment: string;
  created_at: string;
  review_replies?: { reply_text: string; created_at: string }[];
}

export default function BusinessDetailsClient({ business }: Props) {
  const [reviews, setReviews] = useState<Review[]>([]);
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
    if (!reviewForm.user_name || !reviewForm.comment) return;

    setSubmittingReview(true);
    try {
      let sentiment = null;
      let is_approved = true;

      // AI Moderation Call
      try {
        const modRes = await fetch("/api/reviews/moderate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ comment: reviewForm.comment }),
        });

        if (modRes.ok) {
          const moderation = await modRes.json();
          if (moderation.status === "blocked") {
            toast.error(
              "Your review contains inappropriate content and cannot be posted.",
              {
                description: moderation.reason,
              },
            );
            setSubmittingReview(false);
            return;
          }
          sentiment = moderation.sentiment;
        }
      } catch (modError) {
        console.error(
          "Moderation service error, proceeding with manual flag:",
          modError,
        );
        is_approved = false; // Flag for manual review if AI fails
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("reviews")
        .insert({
          business_id: business?.id,
          user_id: user?.id || null,
          user_name: reviewForm?.user_name,
          rating: reviewForm?.rating,
          comment: reviewForm?.comment,
          sentiment: sentiment,
          is_approved: is_approved,
        })
        .select()
        .single();

      if (error) throw error;

      if (is_approved) {
        setReviews([{ ...data, review_replies: [] }, ...reviews]);
        toast.success("Review posted successfully!");
      } else {
        toast.info("Review submitted and pending manual moderation.");
      }

      setReviewForm({ rating: 5, comment: "", user_name: "" });
    } catch (error) {
      console.error("Error posting review:", error);
      toast.error("Failed to post review.");
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleEnquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWhatsappReadyUrl(null);
    setSubmittingEnquiry(true);
    try {
      // 1. Save lead to Supabase for tracking
      const { error } = await supabase.from("leads").insert({
        business_id: business?.id,
        name: enquiryForm?.name,
        email: enquiryForm?.email,
        phone: enquiryForm?.phone,
        message: enquiryForm?.message,
        source: "Business Detail Page",
      });

      if (error) throw error;

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

      // Log analytics event
      await logEvent(
        business.id,
        "lead_form_submit",
        business.address?.split(",").pop()?.trim() || "Unknown",
      );

      setEnquiryForm({ name: "", email: "", phone: "", message: "" });
      toast.success("Enquiry submitted", {
        description: business.phone
          ? "You can also continue the conversation on WhatsApp below."
          : "Your enquiry has been saved successfully.",
      });
    } catch (error) {
      console.error("Error sending enquiry:", error);
      toast.error("Failed to send enquiry.");
    } finally {
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
  const hasCoordinates = Number.isFinite(lat) && Number.isFinite(lng) &&
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
  const hasRating = typeof business.rating === "number" && business.rating > 0 &&
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

  const inputStyle = "w-full rounded-[14px] border border-[#DDDCD3] bg-[#FBFCF8] px-4 py-3.5 text-[13px] text-[#24483D] outline-none transition-colors placeholder:text-[#9FA8A0] focus:border-[#6DA992] focus:bg-white focus:ring-2 focus:ring-[#D7E9DC]";

  return (
    <div className="min-h-[100dvh] bg-[#F6F3ED] pb-24 text-[#233F36] lg:pb-0">
      {/* Profile orientation — intentionally lightweight, no full-screen overlays. */}
      <div className="border-b border-[#33544C] bg-[#1B3430] text-[#D6E4DC]">
        <div className="mx-auto flex max-w-[1480px] items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-10">
          <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-[11px] font-medium">
            <Link href="/" className="flex shrink-0 items-center gap-1.5 transition-colors hover:text-white">
              <ArrowLeft size={14} /> Home
            </Link>
            <span aria-hidden="true" className="text-[#7B9589]">/</span>
            <Link href="/nearby" className="shrink-0 transition-colors hover:text-white">Explore businesses</Link>
            <span aria-hidden="true" className="text-[#7B9589]">/</span>
            <span className="truncate text-[#E8C38F]" aria-current="page">{business.name}</span>
          </nav>
          <button type="button" onClick={shareBusiness}
            className="inline-flex h-9 shrink-0 items-center gap-2 rounded-xl border border-white/20 bg-white/[0.07] px-3 text-[11px] font-semibold text-white transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8C38F]">
            <Share2 size={15} /> <span className="hidden sm:inline">Share profile</span>
          </button>
        </div>
      </div>

      {/* Cinematic, business-specific hero. No stock imagery or invented credentials. */}
      <section aria-labelledby="business-profile-title" className="relative overflow-hidden bg-[#1B3430]">
        <div aria-hidden="true" className="pointer-events-none absolute -right-36 -top-32 h-[500px] w-[500px] rounded-full border-[65px] border-[#E1B987]/[0.04]" />
        <div className="relative mx-auto grid max-w-[1480px] gap-0 lg:min-h-[515px] lg:grid-cols-[1.03fr_0.97fr]">
          <div className="relative order-2 flex min-w-0 flex-col justify-center px-5 pb-12 pt-10 sm:px-8 lg:order-1 lg:py-16 lg:pl-10 lg:pr-12 xl:pl-14">
            <div className="mb-6 flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#DAB784]/30 bg-[#DBAD74]/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.13em] text-[#F0CD9A]">
                <Compass size={14} /> Sri Lanka business directory
              </span>
              {verified && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#8AC7A9]/30 bg-[#8AC7A9]/10 px-3 py-1.5 text-[10px] font-bold text-[#A9DFBE]">
                  <VerifiedBadge size={13} /> Verified listing
                </span>
              )}
            </div>
            {business.category && (
              <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[#E6C28E]">{business.category}</p>
            )}
            <h1 id="business-profile-title"
              className="max-w-[740px] break-words text-balance text-[clamp(2.4rem,4.8vw,5.3rem)] font-semibold leading-[1.09] tracking-[-0.065em] text-white">
              {business.name}
            </h1>
            {fullAddress && (
              <p className="mt-5 flex max-w-[620px] items-start gap-2.5 text-[13px] leading-6 text-[#C7D8CF] sm:text-[14px]">
                <MapPin size={18} className="mt-0.5 shrink-0 text-[#D6B17A]" /> {fullAddress}
              </p>
            )}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              {hasRating ? (
                <a href="#reviews" className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.07] px-3.5 py-2 text-[12px] font-semibold text-white hover:bg-white/10">
                  <Star size={15} className="fill-[#E4BB77] text-[#E4BB77]" />
                  {Number(business.rating).toFixed(1)}
                  <span className="text-[#B9CEC3]">· {business.reviews_count} reviews</span>
                </a>
              ) : (
                <span className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3.5 py-2 text-[12px] font-medium text-[#CEDDD4]">
                  <MessageSquare size={15}/> New to reviews
                </span>
              )}
              {business.is_registered && (
                <span className="inline-flex items-center gap-2 text-[12px] font-medium text-[#A6CABC]">
                  <CheckCircle2 size={15}/> Registration details provided
                </span>
              )}
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-2.5">
              {canCall && (
                <a href={"tel:" + business.phone} onClick={recordCall}
                  className="inline-flex min-h-12 items-center justify-center gap-2.5 rounded-[13px] bg-[#E8BA7B] px-5 text-[13px] font-bold text-[#19352D] shadow-[0_12px_28px_rgba(0,0,0,0.1)] transition-colors hover:bg-[#F3CE9E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8BA7B] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1B3430]">
                  <Phone size={17}/> Call business
                </a>
              )}
              {directionsHref && (
                <a href={directionsHref} target="_blank" rel="noopener noreferrer"
                  onClick={() => void logEvent(business.id, "location_click", business.address?.split(",").pop()?.trim() || "Unknown")}
                  className="inline-flex min-h-12 items-center justify-center gap-2.5 rounded-[13px] border border-white/25 bg-white/[0.07] px-5 text-[13px] font-semibold text-white transition-colors hover:bg-white/[0.13] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8BA7B]">
                  <Navigation size={17}/> Directions
                </a>
              )}
              <a href="#enquiry" className="inline-flex min-h-12 items-center gap-2 rounded-[13px] border border-white/25 px-5 text-[13px] font-semibold text-white transition-colors hover:bg-white/10">
                Send enquiry <ArrowUpRight size={16}/>
              </a>
            </div>
          </div>
          <div className="relative order-1 h-[300px] min-w-0 overflow-hidden bg-[#294941] sm:h-[380px] lg:order-2 lg:h-auto">
            {business.image_url ? (
              <>
                {/* A soft, blurred fill keeps the hero cinematic without cropping the main photo. */}
                <Image src={business.image_url} alt="" aria-hidden="true" fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="scale-110 object-cover opacity-35 blur-[24px]" />
                <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-[#1B3430]/35 via-transparent to-[#1B3430]/10" />
                <Image src={business.image_url} alt={"Full photo of " + business.name} fill priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="relative z-[1] object-contain object-center p-2 sm:p-3 lg:p-4" />
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#386354] via-[#23473E] to-[#162E2A]">
                <div aria-hidden="true" className="absolute -left-20 -top-20 h-80 w-80 rounded-full border-[45px] border-[#E7C18B]/[0.08]" />
                {business.logo_url ? (
                  <div className="relative h-36 w-36 overflow-hidden rounded-[30px] border-[6px] border-white/20 bg-white p-4 shadow-2xl">
                    <Image src={business.logo_url} alt={business.name + " logo"} fill sizes="144px" className="object-contain p-4"/>
                  </div>
                ) : <Building2 size={105} strokeWidth={0.9} className="text-[#BDD4C7]/50"/>}
              </div>
            )}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#102B25]/35 via-transparent to-transparent"/>
            <div className="absolute bottom-4 left-4 z-[2] flex items-center gap-2 rounded-full border border-white/25 bg-[#183A31]/80 px-3.5 py-2 text-[11px] font-semibold text-white backdrop-blur-sm sm:bottom-6 sm:left-6">
              {business.image_url ? <Camera size={15}/> : <Building2 size={15}/>}
              {business.image_url ? "Business photo" : "Business profile"}
            </div>
          </div>
        </div>
      </section>

      {/* Contextual sub-navigation is visible, quick and keyboard accessible. */}
      <nav aria-label="Business profile sections" className="sticky top-0 z-30 border-b border-[#E6E0D6] bg-[#F6F3ED]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1480px] items-center gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:px-6 lg:px-10">
          {[
            { href: "#overview", label: "Overview" },
            { href: "#amenities", label: "Features" },
            { href: "#location", label: "Location" },
            { href: "#reviews", label: "Reviews" },
            { href: "#enquiry", label: "Contact" },
          ].map(item => (
            <a key={item.href} href={item.href} className="inline-flex min-h-9 shrink-0 items-center rounded-full border border-[#E6E1D6] bg-white/80 px-4 text-[11px] font-semibold text-[#47675A] transition-colors hover:border-[#98C0A6] hover:bg-[#E8F4E9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6CBA94]">
              {item.label}
            </a>
          ))}
          <button type="button" onClick={() => setShowReportModal(true)}
            className="ml-auto inline-flex min-h-9 shrink-0 items-center gap-2 rounded-full px-3 text-[11px] font-medium text-[#8C8277] transition-colors hover:bg-[#F5E9E3] hover:text-[#9D4B3D]">
            <Flag size={14}/> Report listing
          </button>
        </div>
      </nav>

      <div className="mx-auto max-w-[1480px] px-4 py-10 sm:px-6 sm:py-14 lg:px-10 lg:py-16">
        <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_370px] xl:gap-10">
          <main className="min-w-0 space-y-7">
            <section id="overview" className="scroll-mt-28 overflow-hidden rounded-[26px] border border-[#E5E0D7] bg-white shadow-[0_8px_34px_rgba(30,53,44,0.045)]">
              <div className="border-b border-[#EFE9E0] px-6 py-6 sm:px-8 sm:py-8">
                <p className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.17em] text-[#9E8159]"><span className="h-px w-8 bg-[#C4A16D]"/> Get to know us</p>
                <h2 className="text-[clamp(1.8rem,3vw,2.75rem)] font-semibold leading-tight tracking-[-0.055em] text-[#203F36]">Behind the business<span className="text-[#D2A56C]">.</span></h2>
                <p className="mt-4 whitespace-pre-line break-words text-[14px] leading-[1.9] text-[#61766A] sm:text-[15px]">
                  {business.description?.trim() || "This business has not added a description yet. Contact them directly for more information."}
                </p>
              </div>
              <div className="grid gap-px bg-[#EDE8DF] sm:grid-cols-2">
                <div className="flex items-center gap-4 bg-[#FCFCF9] p-5 sm:p-7">
                  <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[15px] bg-[#E5F2E8] text-[#3B8069]"><Building2 size={22}/></span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9EAAA0]">Industry</p>
                    <p className="mt-1 break-words text-[14px] font-semibold text-[#345A49]">{business.category || "Local business"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 bg-[#FCFCF9] p-5 sm:p-7">
                  <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[15px] bg-[#F8EEDF] text-[#A17A45]"><Clock size={22}/></span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9EAAA0]">Working hours</p>
                    <p className="mt-1 break-words text-[13px] font-semibold leading-6 text-[#345A49]">{hoursLabel || "Contact for availability"}</p>
                  </div>
                </div>
              </div>
            </section>

            <section id="amenities" className="scroll-mt-28 rounded-[26px] border border-[#E5E0D7] bg-white p-6 shadow-[0_8px_34px_rgba(30,53,44,0.045)] sm:p-8">
              <p className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.17em] text-[#A28359]"><span className="h-px w-8 bg-[#C4A16D]"/> What to expect</p>
              <h2 className="text-[clamp(1.65rem,2.6vw,2.25rem)] font-semibold tracking-[-0.05em] text-[#203F36]">Facilities &amp; amenities</h2>
              {business.facilities && business.facilities.length > 0 ? (
                <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {business.facilities.map((facility, i) => (
                    <div key={i} className="flex min-h-[65px] items-center gap-3 rounded-[16px] border border-[#E0EADF] bg-[#F7FBF7] px-4 py-3 text-[#3A765F] transition-colors hover:border-[#B6D3BE]">
                      <span className="shrink-0">{getFacilityIcon(facility)}</span>
                      <span className="min-w-0 break-words text-[12px] font-semibold leading-5 text-[#456A59]">{facility}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-6 rounded-[18px] border border-dashed border-[#E1E4D9] bg-[#FAFAF6] px-5 py-7">
                  <p className="text-[13px] leading-6 text-[#849386]">No facilities have been listed yet. Contact the business to ask about available services.</p>
                </div>
              )}
            </section>

            <section id="location" className="scroll-mt-28 overflow-hidden rounded-[26px] border border-[#E5E0D7] bg-white shadow-[0_8px_34px_rgba(30,53,44,0.045)]">
              <div className="flex flex-wrap items-start justify-between gap-4 p-6 sm:p-8">
                <div>
                  <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.17em] text-[#A28359]">Find your way</p>
                  <h2 className="text-[clamp(1.65rem,2.6vw,2.25rem)] font-semibold tracking-[-0.05em] text-[#203F36]">Location &amp; directions</h2>
                  {fullAddress && <p className="mt-2 max-w-[480px] text-[13px] leading-6 text-[#708476]">{fullAddress}</p>}
                </div>
                {directionsHref && (
                  <a href={directionsHref} target="_blank" rel="noopener noreferrer"
                    onClick={() => void logEvent(business.id, "location_click", business.address?.split(",").pop()?.trim() || "Unknown")}
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#C6DCCF] bg-[#EBF6ED] px-4 text-[12px] font-semibold text-[#31765C] transition-colors hover:bg-[#DCF0E3]">
                    <Navigation size={16}/> Get directions <ExternalLink size={13}/>
                  </a>
                )}
              </div>
              {hasCoordinates ? (
                <div className="h-[290px] w-full overflow-hidden border-t border-[#E6E8DF] sm:h-[390px]">
                  <LeafletMap centerLat={lat} centerLng={lng} businesses={[business]} zoom={15}
                    height="100%" showUserLocation={false} enableClustering={false}
                    wrapperClassName="h-full w-full overflow-hidden" />
                </div>
              ) : (
                <div className="flex min-h-[200px] items-center justify-center border-t border-[#E7E9E1] bg-[#F0F3EA] px-6 text-center">
                  <div>
                    <MapPin size={29} className="mx-auto text-[#6B9880]"/>
                    <p className="mt-3 text-[13px] font-medium text-[#718B78]">A precise map location has not been provided for this business.</p>
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between gap-3 bg-[#FBFBF7] px-6 py-4 sm:px-8">
                <p className="flex items-center gap-2 text-[11px] text-[#82988A]"><MapPin size={14}/> Sri Lanka business directory</p>
                <a href="/nearby" className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#327C61] hover:text-[#1B5241]">Explore nearby <ArrowUpRight size={14}/></a>
              </div>
            </section>

            <section id="reviews" className="scroll-mt-28 rounded-[26px] border border-[#E5E0D7] bg-white p-6 shadow-[0_8px_34px_rgba(30,53,44,0.045)] sm:p-8">
              <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#ECE8DF] pb-7">
                <div>
                  <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.17em] text-[#A28359]">Community experience</p>
                  <h2 className="text-[clamp(1.65rem,2.6vw,2.25rem)] font-semibold tracking-[-0.05em] text-[#203F36]">Customer reviews<span className="text-[#C69A60]">.</span></h2>
                  <p className="mt-2 text-[13px] text-[#839187]">{reviews.length} published {reviews.length === 1 ? "review" : "reviews"}</p>
                </div>
                <a href="#write-review" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#D3E4D8] bg-[#F1F8F2] px-4 text-[12px] font-semibold text-[#39775E] hover:bg-[#E4F3E8]">
                  <MessageSquare size={15}/> Write a review
                </a>
              </div>

              {reviewsLoading ? (
                <div role="status" className="py-9 text-center text-[13px] text-[#7F9388]"><Loader2 size={22} className="mx-auto mb-2 animate-spin"/>Loading reviews…</div>
              ) : reviews.length === 0 ? (
                <div className="mt-6 flex items-center gap-4 rounded-[18px] border border-dashed border-[#DEE6DC] bg-[#F8FBF7] p-5">
                  <MessageSquare size={23} className="shrink-0 text-[#75A78A]"/>
                  <p className="text-[13px] leading-6 text-[#798D7F]">No customer reviews yet. You can be the first to share your experience.</p>
                </div>
              ) : (
                <div className="divide-y divide-[#EBEBE3]">
                  {reviews.map(review => (
                    <article key={review.id} className="py-6 first:pt-7">
                      <div className="flex items-start gap-3.5">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[#2D705A] text-[16px] font-semibold text-white">{review.user_name?.charAt(0)?.toUpperCase() || "C"}</div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <h3 className="text-[14px] font-semibold text-[#34594B]">{review.user_name}</h3>
                            <time dateTime={review.created_at} className="text-[11px] text-[#9AA99B]">{new Date(review.created_at).toLocaleDateString()}</time>
                          </div>
                          <div className="mt-1.5 flex gap-1" aria-label={review.rating + " out of 5 stars"}>
                            {[1, 2, 3, 4, 5].map(n => (
                              <Star key={n} size={13} className={n <= review.rating ? "fill-[#D5A76C] text-[#D5A76C]" : "text-[#D8DFD7]"}/>
                            ))}
                          </div>
                          <p className="mt-4 whitespace-pre-line break-words text-[13px] leading-[1.85] text-[#667C6E]">{review.comment}</p>
                          {review.review_replies?.[0] && (
                            <div className="mt-4 rounded-[16px] border-l-[3px] border-[#7CB595] bg-[#EFF7EE] p-4">
                              <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.09em] text-[#46775F]"><MessageSquare size={14}/> Business response</p>
                              <p className="mt-2 break-words text-[12px] leading-6 text-[#60836D]">{review.review_replies[0].reply_text}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}

              <div id="write-review" className="scroll-mt-28 mt-7 rounded-[22px] border border-[#DFE7DC] bg-[#F8FAF5] p-5 sm:p-7">
                <h3 className="text-[20px] font-semibold tracking-[-0.035em] text-[#244438]">Share your experience</h3>
                <p className="mt-1.5 text-[12px] leading-6 text-[#809588]">Your review may be moderated before it appears publicly.</p>
                <form onSubmit={handleReviewSubmit} className="mt-6 space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="business-review-name" className="mb-2 block text-[11px] font-semibold text-[#547362]">Your name</label>
                      <input id="business-review-name" required maxLength={100} value={reviewForm.user_name}
                        onChange={event => setReviewForm({...reviewForm, user_name: event.target.value})}
                        placeholder="Enter your name" className={inputStyle}/>
                    </div>
                    <div>
                      <label className="mb-2 block text-[11px] font-semibold text-[#547362]">Your rating</label>
                      <div className="flex min-h-[48px] items-center gap-1" role="group" aria-label="Review rating">
                        {[1, 2, 3, 4, 5].map(star => (
                          <button type="button" key={star} aria-label={star + " stars"} aria-pressed={reviewForm.rating === star}
                            onClick={() => setReviewForm({...reviewForm, rating: star})}
                            className="rounded-lg p-2 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6CBA94]">
                            <Star size={23} className={star <= reviewForm.rating ? "fill-[#D8AC70] text-[#D8AC70]" : "text-[#C6D1C6]"}/>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="business-review-comment" className="mb-2 block text-[11px] font-semibold text-[#547362]">Your review</label>
                    <textarea id="business-review-comment" rows={4} required maxLength={3000} value={reviewForm.comment}
                      onChange={event => setReviewForm({...reviewForm, comment: event.target.value})}
                      placeholder="Tell others about your experience…" className={inputStyle}/>
                  </div>
                  <button type="submit" disabled={submittingReview}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[13px] bg-[#276B56] px-6 text-[13px] font-bold text-white transition-colors hover:bg-[#1B5142] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6CBA94] disabled:opacity-60">
                    {submittingReview ? <Loader2 size={17} className="animate-spin"/> : <Send size={17}/>}
                    Submit review
                  </button>
                </form>
              </div>
            </section>
          </main>

          <aside className="min-w-0 space-y-5 lg:sticky lg:top-24" aria-label="Business contact and enquiry">
            <section className="overflow-hidden rounded-[24px] border border-[#DFE2D8] bg-white shadow-[0_16px_40px_rgba(31,53,43,0.08)]">
              <div className="bg-[#24483D] p-6 text-white sm:p-7">
                <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#EDC88F]"><Phone size={14}/> Get in touch</p>
                <h2 className="mt-3 text-[25px] font-semibold tracking-[-0.05em]">Connect directly.</h2>
                <p className="mt-2 text-[12px] leading-6 text-[#C2D5C7]">Reach the business using the contact details provided on its profile.</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {canCall && <a href={"tel:" + business.phone} onClick={recordCall} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#EAC28B] px-4 text-[12px] font-bold text-[#1C4033] transition-colors hover:bg-[#F3D6AA]"><Phone size={16}/> Call</a>}
                  {business.email && <a href={"mailto:" + business.email} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 text-[12px] font-semibold text-white hover:bg-white/15"><Mail size={16}/> Email</a>}
                  {!canCall && !business.email && <a href="#enquiry" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#EAC28B] px-4 text-[12px] font-bold text-[#1C4033]"><Send size={16}/> Send enquiry</a>}
                </div>
              </div>
              <div className="space-y-5 p-6 sm:p-7">
                {fullAddress && (
                  <div className="flex items-start gap-3">
                    <MapPin size={18} className="mt-0.5 shrink-0 text-[#5F9879]"/>
                    <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.11em] text-[#9AAA9D]">Address</p>
                      <p className="mt-1 break-words text-[13px] leading-6 text-[#345D4B]">{fullAddress}</p></div>
                  </div>
                )}
                {canCall && (
                  <div className="flex items-start gap-3">
                    <Phone size={18} className="mt-0.5 shrink-0 text-[#5F9879]"/>
                    <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.11em] text-[#9AAA9D]">Phone</p>
                      <a href={"tel:" + business.phone} onClick={recordCall} className="mt-1 block break-all text-[13px] font-semibold text-[#2B7455] hover:underline">{business.phone}</a></div>
                  </div>
                )}
                {business.email && (
                  <div className="flex items-start gap-3">
                    <Mail size={18} className="mt-0.5 shrink-0 text-[#5F9879]"/>
                    <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.11em] text-[#9AAA9D]">Email</p>
                      <a href={"mailto:" + business.email} className="mt-1 block break-all text-[13px] font-semibold text-[#2B7455] hover:underline">{business.email}</a></div>
                  </div>
                )}
                {websiteHref && (
                  <div className="flex items-start gap-3">
                    <Globe size={18} className="mt-0.5 shrink-0 text-[#5F9879]"/>
                    <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.11em] text-[#9AAA9D]">Website</p>
                      <a href={websiteHref} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex max-w-full items-center gap-1.5 break-all text-[13px] font-semibold text-[#2B7455] hover:underline">
                        {business.website_name || "Visit website"} <ExternalLink size={13} className="shrink-0"/>
                      </a></div>
                  </div>
                )}
                {hoursLabel && (
                  <div className="flex items-start gap-3">
                    <Clock size={18} className="mt-0.5 shrink-0 text-[#5F9879]"/>
                    <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.11em] text-[#9AAA9D]">Working hours</p>
                      <p className="mt-1 break-words text-[13px] leading-6 text-[#345D4B]">{hoursLabel}</p></div>
                  </div>
                )}
                {verified && (
                  <div className="flex items-center gap-2 rounded-[13px] border border-[#CBE4D1] bg-[#F0F9F1] p-3 text-[12px] font-semibold text-[#3A7A5D]">
                    <VerifiedBadge size={17}/> Verified by SL Business Index
                  </div>
                )}
              </div>
            </section>

            <section id="enquiry" className="scroll-mt-28 rounded-[24px] border border-[#DFE2D8] bg-white p-6 shadow-[0_12px_34px_rgba(31,53,43,0.055)] sm:p-7">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[#E5F3E8] text-[#45866A]"><Send size={20}/></div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#AD946F]">Start a conversation</p>
                  <h2 className="mt-0.5 text-[21px] font-semibold tracking-[-0.045em] text-[#244438]">Quick enquiry</h2>
                </div>
              </div>
              <p className="mt-4 text-[12px] leading-6 text-[#85968A]">Share your enquiry with this business. Your message and contact details will be submitted to the directory.</p>
              <form onSubmit={handleEnquirySubmit} onChange={() => setWhatsappReadyUrl(null)} className="mt-6 space-y-3.5">
                <div>
                  <label htmlFor="enquiry-name" className="mb-1.5 block text-[11px] font-semibold text-[#537361]">Your name</label>
                  <input id="enquiry-name" type="text" required maxLength={100} placeholder="Full name"
                    value={enquiryForm.name} onChange={e => setEnquiryForm({...enquiryForm, name: e.target.value})} className={inputStyle}/>
                </div>
                <div>
                  <label htmlFor="enquiry-email" className="mb-1.5 block text-[11px] font-semibold text-[#537361]">Email address</label>
                  <input id="enquiry-email" type="email" required maxLength={160} placeholder="you@example.com"
                    value={enquiryForm.email} onChange={e => setEnquiryForm({...enquiryForm, email: e.target.value})} className={inputStyle}/>
                </div>
                <div>
                  <label htmlFor="enquiry-phone" className="mb-1.5 block text-[11px] font-semibold text-[#537361]">Phone number</label>
                  <input id="enquiry-phone" type="tel" required maxLength={24} placeholder="Your contact number"
                    value={enquiryForm.phone} onChange={e => setEnquiryForm({...enquiryForm, phone: e.target.value})} className={inputStyle}/>
                </div>
                <div>
                  <label htmlFor="enquiry-message" className="mb-1.5 block text-[11px] font-semibold text-[#537361]">Message</label>
                  <textarea id="enquiry-message" rows={4} required maxLength={3000} placeholder="How can this business help?"
                    value={enquiryForm.message} onChange={e => setEnquiryForm({...enquiryForm, message: e.target.value})} className={inputStyle}/>
                </div>
                <button type="submit" disabled={submittingEnquiry}
                  className="mt-2 inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-[13px] bg-[#276B56] px-5 text-[13px] font-bold text-white transition-colors hover:bg-[#1B5142] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6CBA94] disabled:opacity-60">
                  {submittingEnquiry ? <Loader2 size={17} className="animate-spin"/> : <Send size={17}/>} Send enquiry
                </button>
              </form>
              {whatsappReadyUrl && (
                <a href={whatsappReadyUrl} target="_blank" rel="noopener noreferrer"
                  className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#B9DCC4] bg-[#EFF9F0] px-4 text-[12px] font-bold text-[#286A49] transition-colors hover:bg-[#E0F3E5]">
                  Continue on WhatsApp <ArrowUpRight size={16}/>
                </a>
              )}
              <p className="mt-4 text-center text-[11px] leading-5 text-[#9BA99D]">Please avoid sharing sensitive personal or payment information.</p>
            </section>

            {business.owner_name && (
              <section className="flex items-center gap-3 rounded-[20px] border border-[#E0DED4] bg-[#EEEDE5] p-5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#D7E6DA] text-[16px] font-bold text-[#3D725B]">{business.owner_name[0].toUpperCase()}</div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.11em] text-[#A08E72]">Business contact</p>
                  <h3 className="mt-1 break-words text-[13px] font-semibold text-[#416452]">{business.owner_name}</h3>
                </div>
              </section>
            )}
          </aside>
        </div>
      </div>

      {/* Mobile-only actions, conditional on valid contact/location data. */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-2 border-t border-[#E0E3D8] bg-[#F9FAF5]/95 px-4 py-3 shadow-[0_-10px_28px_rgba(30,56,43,0.1)] backdrop-blur-md lg:hidden"
        style={{paddingBottom:"max(12px,env(safe-area-inset-bottom))"}}>
        {canCall && <a href={"tel:" + business.phone} onClick={recordCall}
          className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-[12px] bg-[#276B56] px-3 text-[12px] font-bold text-white">
          <Phone size={16}/> Call
        </a>}
        {directionsHref && <a href={directionsHref} target="_blank" rel="noopener noreferrer"
          className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-[12px] border border-[#C6DDCA] bg-white px-3 text-[12px] font-bold text-[#397359]">
          <Navigation size={16}/> Directions
        </a>}
        {!canCall && !directionsHref && <a href="#enquiry" className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-[12px] bg-[#276B56] px-3 text-[12px] font-bold text-white"><Send size={16}/> Enquire</a>}
        <button type="button" onClick={shareBusiness} aria-label="Share business profile"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] border border-[#C6DDCA] bg-white text-[#397359]">
          <Share2 size={18}/>
        </button>
      </div>

      <ReportModal isOpen={showReportModal} onClose={() => setShowReportModal(false)}
        targetId={business.id.toString()} targetType="business" targetName={business.name}/>
    </div>
  );
}
