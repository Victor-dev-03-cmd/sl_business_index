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
} from "lucide-react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabaseClient";
import VerifiedBadge from "@/app/components/VerifiedBadge";
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
        business.id,
        "view",
        business.address?.split(",").pop()?.trim(),
      );

      const {
        data: { user },
      } = await supabase.auth.getUser();
      await supabase.from("business_views").insert({
        business_id: business.id,
        user_id: user?.id,
      });

      // Increment view count in businesses table
      await supabase.rpc("increment_business_views", {
        business_id: business.id,
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
          business_id: business.id,
          user_id: user?.id || null,
          user_name: reviewForm.user_name,
          rating: reviewForm.rating,
          comment: reviewForm.comment,
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
    setSubmittingEnquiry(true);
    try {
      const { error } = await supabase.from("leads").insert({
        business_id: business.id,
        name: enquiryForm.name,
        email: enquiryForm.email,
        phone: enquiryForm.phone,
        message: enquiryForm.message,
        source: "Business Detail Page",
      });

      if (error) throw error;

      // Log analytics event
      await logEvent(
        business.id,
        "lead_form_submit",
        business.address?.split(",").pop()?.trim(),
      );

      setEnquiryForm({ name: "", email: "", phone: "", message: "" });
      toast.success(
        "Enquiry sent successfully! The business will contact you soon.",
      );
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

  return (
    <div className="min-h-screen bg-gray-50/50 pb-24 lg:pb-20">
      {/* ── Hero ── */}
      <div className="relative h-[38vh] md:h-[50vh] w-full overflow-hidden">
        {business.image_url ? (
          <Image
            src={business.image_url}
            alt={business.name}
            fill
            className="object-cover"
            priority
          />
        ) : (
          <div className="w-full h-full bg-brand-dark flex items-center justify-center">
            <Building2 size={120} className="text-white/10" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        <div className="absolute bottom-0 left-0 w-full p-4 md:p-8 lg:p-12">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-3 md:gap-6">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2 md:mb-4">
                <span className="px-2.5 py-1 bg-brand-gold text-white text-[10px] uppercase tracking-widest rounded">
                  {business.category}
                </span>
                {(business.is_verified ||
                  business.verification_status === "verified") &&
                  business.can_show_badge && (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-500/20 backdrop-blur-md text-blue-200 text-[10px] font-bold uppercase tracking-widest rounded-full border border-blue-400/30">
                      <VerifiedBadge size={10} /> Verified
                    </span>
                  )}
              </div>
              <h1 className="text-2xl md:text-5xl lg:text-6xl font-normal text-white tracking-tight mb-2 md:mb-4 leading-tight">
                {business.name}
              </h1>
              <div className="flex flex-wrap items-center gap-3 md:gap-6 text-white/80">
                <div className="flex items-center gap-1.5">
                  <MapPin size={14} className="text-brand-gold shrink-0" />
                  <span className="text-xs md:text-base line-clamp-1">
                    {business.address}
                  </span>
                </div>
                {business.rating && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-amber-500 px-2 py-0.5 rounded text-white font-bold text-xs md:text-sm">
                      <Star size={12} className="fill-white" />
                      {business.rating}
                    </div>
                    <span className="text-xs font-normal text-white/60">
                      ({business.reviews_count} Reviews)
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Desktop-only hero actions */}
            <div className="hidden md:flex gap-3 shrink-0">
              <button className="p-3 bg-white/10 backdrop-blur-md border border-white/20 rounded text-white hover:bg-white/20 transition-all">
                <Share2 size={20} />
              </button>
              <a
                href={`tel:${business.phone}`}
                onClick={() =>
                  logEvent(
                    business.id,
                    "call_click",
                    business.address?.split(",").pop()?.trim(),
                  )
                }
                className="flex items-center gap-2 px-8 py-3 bg-white text-brand-dark rounded hover:bg-brand-sand transition-all shadow-xl"
              >
                <Phone size={20} /> Call Now
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-12 mt-4 lg:mt-12">
        {/*
          Mobile  order: Sidebar (1) → About+Facilities (2) → Map (3) → Reviews (4)
          Desktop order: [About+Fac | Map | Reviews] left 2/3  +  [Sidebar sticky] right 1/3
          Sidebar wrapper spans all 3 grid rows on desktop so lg:sticky persists across the full scroll.
        */}
        <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 lg:gap-12">
          {/* ── ORDER 2 mobile | col-span-2 row-1 desktop ── About + Facilities */}
          <div className="order-2 lg:order-none lg:col-span-2 space-y-6 lg:space-y-12">
            <section>
              <h2 className="text-base lg:text-xl text-brand-dark mb-3 lg:mb-6">
                About the Business
              </h2>
              <p className="text-gray-600 leading-relaxed text-sm">
                {business.description ||
                  "No description available for this business."}
              </p>
            </section>

            {business.facilities && business.facilities.length > 0 && (
              <section>
                <h2 className="text-base lg:text-xl text-brand-dark mb-3 lg:mb-6">
                  Facilities & Amenities
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {business.facilities.map((facility, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2.5 p-3 bg-white rounded border border-gray-300 shadow-sm group hover:border-brand-gold transition-all"
                    >
                      <div className="text-brand-dark group-hover:text-brand-gold transition-colors shrink-0">
                        {getFacilityIcon(facility)}
                      </div>
                      <span className="text-xs md:text-sm text-gray-700 truncate">
                        {facility}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* ── ORDER 1 mobile | col-3 rows 1-3 desktop (sticky across full scroll) ── Sidebar */}
          <div className="order-1 lg:order-none lg:col-start-3 lg:row-span-3 lg:sticky lg:top-24 lg:self-start space-y-4 lg:space-y-6">
            {/* Contact Details */}
            <div className="bg-white rounded border border-gray-300 p-4 lg:p-8 shadow-sm">
              <h3 className="text-base lg:text-xl text-brand-dark border-b border-gray-100 pb-3 mb-4 lg:mb-6 lg:pb-4">
                Contact Details
              </h3>

              {/* Mobile: compact quick-action buttons */}
              <div className="grid grid-cols-2 gap-3 lg:hidden mb-4">
                {business.phone && (
                  <a
                    href={`tel:${business.phone}`}
                    onClick={() =>
                      logEvent(
                        business.id,
                        "call_click",
                        business.address?.split(",").pop()?.trim(),
                      )
                    }
                    className="flex items-center gap-2 p-3 bg-brand-dark text-white rounded text-sm font-semibold justify-center"
                  >
                    <Phone size={16} /> Call
                  </a>
                )}
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${business.latitude},${business.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 bg-blue-50 text-brand-blue border border-blue-100 rounded text-sm font-semibold justify-center"
                >
                  <Navigation size={16} /> Directions
                </a>
              </div>

              <div className="space-y-4 lg:space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 lg:p-3 bg-gray-50 rounded text-brand-blue border border-gray-100 shrink-0">
                    <Phone size={15} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-0.5">
                      Phone
                    </p>
                    <p className="text-brand-blue text-sm truncate">
                      {business.phone || "Not provided"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 lg:p-3 bg-gray-50 rounded text-brand-blue border border-gray-100 shrink-0">
                    <Mail size={15} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-0.5">
                      Email
                    </p>
                    <p className="text-brand-blue text-sm truncate">
                      {business.email || "Not provided"}
                    </p>
                  </div>
                </div>

                {business.website_url && (
                  <div className="flex items-center gap-3">
                    <div className="p-2 lg:p-3 bg-gray-50 rounded text-brand-blue border border-gray-100 shrink-0">
                      <Globe size={15} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-0.5">
                        Website
                      </p>
                      <a
                        href={business.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-blue hover:underline text-sm font-medium flex items-center gap-1 truncate"
                      >
                        {business.website_name || "Visit Website"}{" "}
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <div className="p-2 lg:p-3 bg-gray-50 rounded text-brand-blue border border-gray-100 shrink-0">
                    <Clock size={15} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-0.5">
                      Working Hours
                    </p>
                    <p className="text-brand-blue text-sm">
                      {business.working_hours || "Contact for hours"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Enquiry Form */}
            <div className="bg-white rounded border border-gray-300 p-4 lg:p-8 shadow-xl space-y-4 lg:space-y-6">
              <div>
                <h3 className="text-base lg:text-xl text-brand-dark">
                  Quick Enquiry
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Send a message directly to the business.
                </p>
              </div>

              <form
                onSubmit={handleEnquirySubmit}
                className="space-y-3 lg:space-y-4"
              >
                <input
                  type="text"
                  placeholder="Your Name"
                  required
                  className="w-full px-3 py-2.5 lg:px-4 lg:py-3 bg-gray-50 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all text-sm"
                  value={enquiryForm.name}
                  onChange={(e) =>
                    setEnquiryForm({ ...enquiryForm, name: e.target.value })
                  }
                />
                <input
                  type="email"
                  placeholder="Email Address"
                  required
                  className="w-full px-3 py-2.5 lg:px-4 lg:py-3 bg-gray-50 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all text-sm"
                  value={enquiryForm.email}
                  onChange={(e) =>
                    setEnquiryForm({ ...enquiryForm, email: e.target.value })
                  }
                />
                <input
                  type="tel"
                  placeholder="Phone Number"
                  required
                  className="w-full px-3 py-2.5 lg:px-4 lg:py-3 bg-gray-50 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all text-sm"
                  value={enquiryForm.phone}
                  onChange={(e) =>
                    setEnquiryForm({ ...enquiryForm, phone: e.target.value })
                  }
                />
                <textarea
                  placeholder="How can we help you?"
                  required
                  rows={3}
                  className="w-full px-3 py-2.5 lg:px-4 lg:py-3 bg-gray-50 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all text-sm"
                  value={enquiryForm.message}
                  onChange={(e) =>
                    setEnquiryForm({ ...enquiryForm, message: e.target.value })
                  }
                />
                <button
                  type="submit"
                  disabled={submittingEnquiry}
                  className="w-full py-3 lg:py-4 bg-brand-dark text-white rounded disabled:opacity-50 transition-all shadow flex items-center justify-center gap-2 text-sm font-semibold"
                >
                  {submittingEnquiry ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <Send size={18} />
                  )}
                  Send Enquiry
                </button>
              </form>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-center gap-2 text-xs text-gray-400 font-medium">
                <ShieldCheck size={13} className="text-emerald-500" /> Secure &
                Private Enquiry
              </div>
            </div>

            {/* Owner Info */}
            <div className="bg-brand-dark rounded-xl p-5 lg:p-8 text-white shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
              <h3 className="text-base lg:text-xl font-normal mb-3 lg:mb-4 relative z-10">
                Owner Info
              </h3>
              <div className="flex items-center gap-3 relative z-10">
                <div className="h-11 w-11 rounded-full bg-white/10 flex items-center justify-center font-bold text-brand-sand shrink-0">
                  {business.owner_name?.[0] || "O"}
                </div>
                <div>
                  <p className="text-white font-medium text-sm">
                    {business.owner_name || "Business Owner"}
                  </p>
                  <p className="text-white/50 text-xs tracking-wider uppercase">
                    Verified Member
                  </p>
                </div>
              </div>
            </div>
          </div>
          {/* end sidebar */}

          {/* ── ORDER 3 mobile | col-span-2 row-2 desktop ── Map */}
          <div className="order-3 lg:order-none lg:col-span-2">
            <section>
              <div className="flex items-center justify-between mb-3 lg:mb-6">
                <h2 className="text-base lg:text-xl text-brand-dark flex items-center gap-2">
                  <MapPin size={18} className="text-brand-blue" /> Location &
                  Directions
                </h2>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${business.latitude},${business.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden md:flex items-center gap-2 px-4 py-2 bg-blue-50 text-brand-blue rounded-lg text-sm font-medium hover:bg-blue-100 transition-all border border-blue-100"
                >
                  <Navigation size={16} /> Get Directions
                </a>
              </div>
              <div
                className="rounded overflow-hidden shadow-md border border-gray-300 h-[260px] lg:h-[450px]"
                onClick={() =>
                  logEvent(
                    business.id,
                    "location_click",
                    business.address?.split(",").pop()?.trim(),
                  )
                }
              >
                <LeafletMap
                  centerLat={business.latitude}
                  centerLng={business.longitude}
                  businesses={[business]}
                  zoom={15}
                  height="100%"
                  showUserLocation={false}
                  enableClustering={false}
                />
              </div>
            </section>
          </div>

          {/* ── ORDER 4 mobile | col-span-2 row-3 desktop ── Reviews */}
          <div className="order-4 lg:order-none lg:col-span-2">
            <section id="reviews" className="space-y-5 lg:space-y-8">
              <h2 className="text-base lg:text-xl text-brand-dark flex items-center gap-2 lg:gap-3">
                <MessageSquare size={18} className="text-brand-blue" /> Customer
                Reviews ({reviews.length})
              </h2>

              {/* Review Form */}
              <div className="bg-white rounded border border-gray-300 p-4 lg:p-8 shadow-sm">
                <h3 className="text-sm mb-4 lg:mb-6 text-brand-blue">
                  Write a Review
                </h3>
                <form
                  onSubmit={handleReviewSubmit}
                  className="space-y-4 lg:space-y-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
                    <div>
                      <label className="block text-xs text-gray-400 uppercase tracking-widest mb-2">
                        Your Name
                      </label>
                      <input
                        type="text"
                        required
                        className="w-full px-3 py-2.5 lg:px-4 lg:py-3 bg-gray-50 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-brand-gold focus:border-brand-gold transition-all text-sm"
                        value={reviewForm.user_name}
                        onChange={(e) =>
                          setReviewForm({
                            ...reviewForm,
                            user_name: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 uppercase tracking-widest mb-2">
                        Rating
                      </label>
                      <div className="flex gap-1.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() =>
                              setReviewForm({ ...reviewForm, rating: star })
                            }
                            className="p-0.5 transition-transform hover:scale-110"
                          >
                            <Star
                              size={26}
                              className={
                                star <= reviewForm.rating
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-gray-300"
                              }
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 uppercase tracking-widest mb-2">
                      Your Review
                    </label>
                    <textarea
                      required
                      rows={4}
                      className="w-full px-3 py-2.5 lg:px-4 lg:py-3 bg-gray-50 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-brand-gold focus:border-brand-gold transition-all text-sm"
                      value={reviewForm.comment}
                      onChange={(e) =>
                        setReviewForm({
                          ...reviewForm,
                          comment: e.target.value,
                        })
                      }
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="flex items-center justify-center gap-2 px-6 py-3 lg:px-8 lg:py-4 bg-brand-dark text-white rounded hover:bg-brand-blue disabled:opacity-50 transition-all shadow-lg text-sm font-semibold"
                  >
                    {submittingReview ? (
                      <Loader2 className="animate-spin" size={18} />
                    ) : (
                      <Send size={18} />
                    )}
                    Post Review
                  </button>
                </form>
              </div>

              {/* Reviews List */}
              <div className="space-y-4 lg:space-y-6">
                {reviewsLoading ? (
                  <div className="text-center py-12">
                    <Loader2
                      className="animate-spin mx-auto text-brand-dark mb-4"
                      size={32}
                    />
                    <p className="text-gray-500">Loading reviews...</p>
                  </div>
                ) : reviews.length === 0 ? (
                  <div className="text-center py-10 bg-white rounded border border-gray-300 border-dashed">
                    <MessageSquare
                      size={40}
                      className="mx-auto text-gray-300 mb-3"
                    />
                    <p className="text-gray-400 text-sm">
                      No reviews yet. Be the first to review!
                    </p>
                  </div>
                ) : (
                  reviews.map((review) => (
                    <div
                      key={review.id}
                      className="bg-white rounded border border-gray-300 p-4 lg:p-8 shadow-sm space-y-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-brand-dark flex items-center justify-center text-white text-sm shrink-0">
                          {review.user_name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-medium text-brand-blue text-sm">
                            {review.user_name}
                          </h4>
                          <div className="flex items-center gap-1 mt-0.5">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                size={11}
                                className={
                                  i < review.rating
                                    ? "fill-amber-400 text-amber-400"
                                    : "text-gray-300"
                                }
                              />
                            ))}
                            <span className="text-[10px] text-gray-500 ml-1.5">
                              {new Date(review.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <p className="text-gray-600 leading-relaxed text-sm">
                        {review.comment}
                      </p>

                      {review.review_replies &&
                        review.review_replies.length > 0 && (
                          <div className="p-3 lg:p-6 bg-gray-100 rounded border-l-4 border-brand-dark">
                            <p className="text-xs text-brand-dark uppercase tracking-widest mb-2 flex items-center gap-2">
                              <ShieldCheck size={13} /> Owner Response
                            </p>
                            <p className="text-gray-600 italic text-sm">
                              &quot;{review.review_replies[0].reply_text}&quot;
                            </p>
                          </div>
                        )}
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* ── Mobile sticky bottom action bar ── */}
      <div
        className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 flex gap-3 px-4 py-3"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <a
          href={`tel:${business.phone}`}
          onClick={() =>
            logEvent(
              business.id,
              "call_click",
              business.address?.split(",").pop()?.trim(),
            )
          }
          className="flex-1 flex items-center justify-center gap-2 h-11 bg-brand-dark text-white rounded font-semibold text-sm"
        >
          <Phone size={17} /> Call Now
        </a>
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${business.latitude},${business.longitude}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-2 h-11 border border-gray-300 text-brand-dark rounded font-semibold text-sm hover:bg-gray-50 transition-colors"
        >
          <Navigation size={17} /> Directions
        </a>
        <button
          className="w-11 h-11 border border-gray-300 rounded flex items-center justify-center text-brand-dark hover:bg-gray-50 transition-colors shrink-0"
          onClick={() => {
            if (navigator.share) {
              navigator.share({
                title: business.name,
                url: window.location.href,
              });
            }
          }}
        >
          <Share2 size={17} />
        </button>
      </div>
    </div>
  );
}
