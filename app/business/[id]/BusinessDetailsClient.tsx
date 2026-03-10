'use client';

import React, { useState, useEffect } from 'react';
import { Business } from '@/lib/types';
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
  Coffee
} from 'lucide-react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabaseClient';
import VerifiedBadge from '@/app/components/VerifiedBadge';

const MapboxMap = dynamic(() => import('@/components/MapboxMap'), { 
  ssr: false,
  loading: () => <div className="h-[400px] w-full bg-gray-100 animate-pulse rounded-xl flex items-center justify-center text-gray-400">Loading Map...</div>
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
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '', user_name: '' });
  const [enquiryForm, setEnquiryForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [submittingEnquiry, setSubmittingEnquiry] = useState(false);

  useEffect(() => {
    fetchReviews();
    recordView();
  }, [business.id]);

  const fetchReviews = async () => {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*, review_replies(reply_text, created_at)')
        .eq('business_id', business.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReviews(data || []);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setReviewsLoading(false);
    }
  };

  const recordView = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('business_views').insert({
        business_id: business.id,
        user_id: user?.id
      });
      
      // Increment view count in businesses table
      await supabase.rpc('increment_business_views', { business_id: business.id });
    } catch (error) {
      console.error('Error recording view:', error);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewForm.user_name || !reviewForm.comment) return;

    setSubmittingReview(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('reviews')
        .insert({
          business_id: business.id,
          user_id: user?.id,
          user_name: reviewForm.user_name,
          rating: reviewForm.rating,
          comment: reviewForm.comment
        })
        .select()
        .single();

      if (error) throw error;
      setReviews([data, ...reviews]);
      setReviewForm({ rating: 5, comment: '', user_name: '' });
      alert('Review posted successfully!');
    } catch (error) {
      console.error('Error posting review:', error);
      alert('Failed to post review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleEnquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingEnquiry(true);
    try {
      const { error } = await supabase
        .from('leads')
        .insert({
          business_id: business.id,
          name: enquiryForm.name,
          email: enquiryForm.email,
          phone: enquiryForm.phone,
          message: enquiryForm.message,
          source: 'Business Detail Page'
        });

      if (error) throw error;
      setEnquiryForm({ name: '', email: '', phone: '', message: '' });
      alert('Enquiry sent successfully! The business will contact you soon.');
    } catch (error) {
      console.error('Error sending enquiry:', error);
      alert('Failed to send enquiry.');
    } finally {
      setSubmittingEnquiry(false);
    }
  };

  const getFacilityIcon = (facility: string) => {
    const f = facility.toLowerCase();
    if (f.includes('wifi')) return <Wifi size={16} />;
    if (f.includes('parking')) return <Car size={16} />;
    if (f.includes('card')) return <CreditCard size={16} />;
    if (f.includes('language')) return <Languages size={16} />;
    if (f.includes('coffee') || f.includes('cafe')) return <Coffee size={16} />;
    return <CheckCircle2 size={16} />;
  };

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      {/* Hero Header */}
      <div className="relative h-[40vh] md:h-[50vh] w-full overflow-hidden">
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
        
        <div className="absolute bottom-0 left-0 w-full p-6 md:p-12">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <span className="px-3 py-1 bg-brand-gold text-white text-[10px] uppercase tracking-widest rounded">
                  {business.category}
                </span>
                {(business.is_verified || business.verification_status === 'verified') && business.can_show_badge && (
                  <span className="flex items-center gap-1.5 px-3 py-1 bg-blue-500/20 backdrop-blur-md text-blue-200 text-[10px] font-bold uppercase tracking-widest rounded-full border border-blue-400/30">
                    <VerifiedBadge size={10} /> Verified
                  </span>
                )}
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-normal text-white tracking-tight mb-4">
                {business.name}
              </h1>
              <div className="flex flex-wrap items-center gap-6 text-white/80">
                <div className="flex items-center gap-2">
                  <MapPin size={18} className="text-brand-gold" />
                  <span className="text-sm md:text-base">{business.address}</span>
                </div>
                {business.rating && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-amber-500 px-2 py-0.5 rounded text-white font-bold text-sm">
                      <Star size={14} className="fill-white" />
                      {business.rating}
                    </div>
                    <span className="text-sm font-normal text-white/60">({business.reviews_count} Reviews)</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex gap-3">
              <button className="p-3 bg-white/10 backdrop-blur-md border border-white/20 rounded text-white hover:bg-white/20 transition-all">
                <Share2 size={20} />
              </button>
              <a 
                href={`tel:${business.phone}`}
                className="flex items-center gap-2 px-8 py-3 bg-white text-brand-dark rounded hover:bg-brand-sand transition-all shadow-xl"
              >
                <Phone size={20} /> Call Now
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="max-w-7xl mx-auto px-6 md:px-12 mt-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-12">
            <section>
              <h2 className="text-xl text-brand-dark mb-6">About the Business</h2>
              <p className="text-gray-600 leading-relaxed text-sm">
                {business.description || "No description available for this business."}
              </p>
            </section>

            {/* Facilities */}
            {business.facilities && business.facilities.length > 0 && (
              <section>
                <h2 className="text-xl text-brand-dark mb-6">Facilities & Amenities</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {business.facilities.map((facility, index) => (
                    <div key={index} className="flex items-center gap-3 p-4 bg-white rounded border border-gray-300 shadow-sm group hover:border-brand-gold transition-all">
                      <div className="text-brand-dark group-hover:text-brand-gold transition-colors">
                        {getFacilityIcon(facility)}
                      </div>
                      <span className="text-sm text-gray-700">{facility}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section>
              <h2 className="text-xl text-brand-dark mb-6 flex items-center gap-3">
                <MapPin className="text-brand-blue" /> Location & Directions
              </h2>
              <div className="rounded overflow-hidden shadow-xl border border-gray-300">
                <MapboxMap 
                  userLat={business.latitude} 
                  userLng={business.longitude}
                  businesses={[business]}
                  zoom={15}
                  height="450px"
                />
              </div>
            </section>

            {/* Reviews Section */}
            <section id="reviews" className="space-y-8">
              <div className="flex items-center justify-between">
                <h2 className="text-xl text-brand-dark flex items-center gap-3">
                  <MessageSquare className="text-brand-blue" /> Customer Reviews ({reviews.length})
                </h2>
              </div>

              {/* Review Form */}
              <div className="bg-white rounded border border-gray-300 p-8 shadow-sm">
                <h3 className="text-sm mb-6 text-brand-blue">Write a Review</h3>
                <form onSubmit={handleReviewSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm text-gray-400 uppercase tracking-widest mb-2">Your Name</label>
                      <input 
                        type="text" 
                        required
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-brand-gold focus:border-brand-gold transition-all"
                        value={reviewForm.user_name}
                        onChange={(e) => setReviewForm({ ...reviewForm, user_name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 uppercase tracking-widest mb-2">Rating</label>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                            className="p-1 transition-transform hover:scale-110"
                          >
                            <Star 
                              size={28} 
                              className={star <= reviewForm.rating ? "fill-amber-400 text-amber-400" : "text-gray-300"} 
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 uppercase tracking-widest mb-2">Your Review</label>
                    <textarea 
                      required
                      rows={4}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-brand-gold focus:border-brand-gold transition-all"
                      value={reviewForm.comment}
                      onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                    />
                  </div>
                  <button 
                    type="submit" 
                    disabled={submittingReview}
                    className="flex items-center justify-center gap-2 px-8 py-4 bg-brand-dark text-white rounded hover:bg-brand-blue disabled:opacity-50 transition-all shadow-lg"
                  >
                    {submittingReview ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                    Post Review
                  </button>
                </form>
              </div>

              {/* Reviews List */}
              <div className="space-y-6">
                {reviewsLoading ? (
                  <div className="text-center py-12">
                    <Loader2 className="animate-spin mx-auto text-brand-dark mb-4" size={32} />
                    <p className="text-gray-500">Loading reviews...</p>
                  </div>
                ) : reviews.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded border border-gray-300 border-dashed">
                    <MessageSquare size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-400">No reviews yet. Be the first to review!</p>
                  </div>
                ) : (
                  reviews.map((review) => (
                    <div key={review.id} className="bg-white rounded border border-gray-300 p-8 shadow-sm space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-full bg-brand-dark flex items-center justify-center text-white">
                            {review.user_name.charAt(0)}
                          </div>
                          <div>
                            <h4 className="font-medium text-brand-blue">{review.user_name}</h4>
                            <div className="flex items-center gap-1">
                              {[...Array(5)].map((_, i) => (
                                <Star 
                                  key={i} 
                                  size={12} 
                                  className={i < review.rating ? "fill-amber-400 text-amber-400" : "text-gray-300"} 
                                />
                              ))}
                              <span className="text-[10px] text-gray-500 ml-2">
                                {new Date(review.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <p className="text-gray-600 leading-relaxed">{review.comment}</p>
                      
                      {/* Vendor Reply */}
                      {review.review_replies && review.review_replies.length > 0 && (
                        <div className="mt-6 p-6 bg-gray-100 rounded border-l-4 border-brand-dark">
                          <p className="text-xs text-brand-dark uppercase tracking-widest mb-2 flex items-center gap-2">
                            <ShieldCheck size={14} /> Owner Response
                          </p>
                          <p className="text-gray-600 italic">&quot;{review.review_replies[0].reply_text}&quot;</p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          {/* Sidebar Info */}
          <div className="space-y-8 sticky top-24 self-start">
            {/* Quick Enquiry Card */}
            <div className="bg-white rounded border border-gray-300 p-8 shadow-xl space-y-6">
              <div>
                <h3 className="text-xl text-brand-dark">Quick Enquiry</h3>
                <p className="text-sm text-gray-500 mt-1">Send a message directly to the business.</p>
              </div>
              
              <form onSubmit={handleEnquirySubmit} className="space-y-4">
                <div>
                  <input 
                    type="text" 
                    placeholder="Your Name"
                    required
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all text-sm"
                    value={enquiryForm.name}
                    onChange={(e) => setEnquiryForm({ ...enquiryForm, name: e.target.value })}
                  />
                </div>
                <div>
                  <input 
                    type="email" 
                    placeholder="Email Address"
                    required
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all text-sm"
                    value={enquiryForm.email}
                    onChange={(e) => setEnquiryForm({ ...enquiryForm, email: e.target.value })}
                  />
                </div>
                <div>
                  <input 
                    type="tel" 
                    placeholder="Phone Number"
                    required
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all text-sm"
                    value={enquiryForm.phone}
                    onChange={(e) => setEnquiryForm({ ...enquiryForm, phone: e.target.value })}
                  />
                </div>
                <div>
                  <textarea 
                    placeholder="How can we help you?"
                    required
                    rows={3}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all text-sm"
                    value={enquiryForm.message}
                    onChange={(e) => setEnquiryForm({ ...enquiryForm, message: e.target.value })}
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={submittingEnquiry}
                  className="w-full py-4 bg-brand-dark text-white rounded disabled:opacity-50 transition-all shadow flex items-center justify-center gap-2"
                >
                  {submittingEnquiry ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                  Send Enquiry
                </button>
              </form>

              <div className="pt-4 border-t border-gray-100 flex items-center justify-center gap-2 text-xs text-gray-400 font-medium">
                <ShieldCheck size={14} className="text-emerald-500" /> Secure & Private Enquiry
              </div>
            </div>

            <div className="bg-white rounded border border-gray-300 p-8 shadow-sm space-y-8">
              <h3 className="text-xl text-brand-dark border-b border-gray-100 pb-4">Contact Details</h3>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-gray-50 rounded text-brand-blue border border-gray-100">
                    <Phone size={16} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Phone</p>
                    <p className="text-brand-blue">{business.phone || "Not provided"}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="p-3 bg-gray-50 rounded text-brand-blue border border-gray-100">
                    <Mail size={16} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Email</p>
                    <p className="text-brand-blue">{business.email || "Not provided"}</p>
                  </div>
                </div>

                {business.website_url && (
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-gray-50 rounded text-brand-blue border border-gray-100">
                      <Globe size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Website</p>
                      <a 
                        href={business.website_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-brand-blue hover:underline font-medium flex items-center gap-1 truncate"
                      >
                        {business.website_name || "Visit Website"} <ExternalLink size={14} />
                      </a>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-4">
                  <div className="p-3 bg-gray-50 rounded text-brand-blue border border-gray-100">
                    <Clock size={16} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Working Hours</p>
                    <p className="text-brand-blue">{business.working_hours || "Contact for hours"}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-brand-dark rounded-xl p-8 text-white shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
              <h3 className="text-xl font-normal mb-4 relative z-10">Owner Info</h3>
              <div className="flex items-center gap-4 relative z-10">
                <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center font-bold text-brand-sand">
                  {business.owner_name?.[0] || "O"}
                </div>
                <div>
                  <p className="text-white font-medium">{business.owner_name || "Business Owner"}</p>
                  <p className="text-white/50 text-xs tracking-wider uppercase">Verified Member</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
