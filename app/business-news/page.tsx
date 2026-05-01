"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useSession } from "@/app/components/SessionContext";
import { useSearchParams } from "next/navigation";
import { 
  Megaphone, 
  MessageSquare, 
  Phone, 
  Plus, 
  ShieldCheck, 
  Clock, 
  Building2,
  Send,
  Loader2,
  X,
  Filter,
  MapPin,
  Tag,
  Briefcase,
  Search
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";

interface NewsPost {
  id: string;
  title: string;
  content: string;
  contact_phone: string;
  created_at: string;
  business_id: string;
  owner_id: string;
  category: string;
  district: string;
  post_type: 'hiring' | 'looking';
  businesses: {
    name: string;
    logo_url: string;
    is_verified: boolean;
  } | null;
}

interface UserBusiness {
  id: string;
  name: string;
  is_verified: boolean;
}

const MAIN_CATEGORY_GROUPS = [
  "Manpower Services",
  "Care & Lifestyle",
  "Professional & Finance",
  "Construction & Industrial",
  "Technical & Electronics",
  "Events, Food & Leisure",
  "Travel & Transport",
  "Retail & Others",
];

const SRI_LANKAN_DISTRICTS = [
  "Ampara", "Anuradhapura", "Badulla", "Batticaloa", "Colombo", "Galle", "Gampaha",
  "Hambantota", "Jaffna", "Kalutara", "Kandy", "Kegalle", "Kilinochchi", "Kurunegala",
  "Mannar", "Matale", "Matara", "Monaragala", "Mullaitivu", "Nuwara Eliya",
  "Polonnaruwa", "Puttalam", "Ratnapura", "Trincomalee", "Vavuniya",
];

export default function BusinessNewsPage() {
  const { user } = useSession();
  const searchParams = useSearchParams();
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const [userBusinesses, setUserBusinesses] = useState<UserBusiness[]>([]);
  const [showPostForm, setShowPostForm] = useState(searchParams.get("post") === "true");
  
  // Filters State
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterDistrict, setFilterDistrict] = useState("all");
  const [filterType, setFilterType] = useState("all");

  // Form State
  const [selectedBusinessId, setSelectedBusinessId] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [formCategory, setFormCategory] = useState(MAIN_CATEGORY_GROUPS[0]);
  const [formDistrict, setFormDistrict] = useState("Colombo");
  const [formType, setFormType] = useState<'hiring' | 'looking'>('hiring');

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("business_news")
        .select(`
          *,
          businesses (
            name,
            logo_url,
            is_verified
          )
        `)
        .order("created_at", { ascending: false });

      if (filterCategory !== "all") query = query.eq("category", filterCategory);
      if (filterDistrict !== "all") query = query.eq("district", filterDistrict);
      if (filterType !== "all") query = query.eq("post_type", filterType);

      const { data, error } = await query;

      if (error) throw error;
      setPosts(data || []);
    } catch (err) {
      console.error("Error fetching news:", err);
      toast.error("Failed to load business news");
    } finally {
      setLoading(false);
    }
  }, [filterCategory, filterDistrict, filterType]);

  const fetchUserBusinesses = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from("businesses")
        .select("id, name, is_verified")
        .eq("owner_id", user.id)
        .eq("is_verified", true)
        .eq("status", "approved");

      if (error) throw error;
      setUserBusinesses(data || []);
      if (data && data.length > 0 && !selectedBusinessId) {
        setSelectedBusinessId(data[0].id);
      }
    } catch (err) {
      console.error("Error fetching user businesses:", err);
    }
  };

  useEffect(() => {
    fetchPosts();
    fetchUserBusinesses();
    
    // Update last_news_check when viewing page
    const updateLastCheck = async () => {
      if (user?.id) {
        await supabase
          .from("profiles")
          .update({ last_news_check: new Date().toISOString() })
          .eq("id", user.id);
      }
    };
    updateLastCheck();
  }, [user?.id, fetchPosts]);

  // Realtime Subscription
  useEffect(() => {
    const channel = supabase
      .channel("realtime_business_news")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "business_news" },
        () => {
          fetchPosts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPosts]);

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) {
      toast.error("You must be logged in to post");
      return;
    }
    if (!selectedBusinessId) {
      toast.error("Please select a verified business");
      return;
    }

    try {
      setIsPosting(true);
      const { error } = await supabase
        .from("business_news")
        .insert([
          {
            business_id: selectedBusinessId,
            owner_id: user.id,
            title,
            content,
            contact_phone: contactPhone,
            category: formCategory,
            district: formDistrict,
            post_type: formType
          }
        ]);

      if (error) throw error;

      toast.success("News update posted successfully!");
      setTitle("");
      setContent("");
      setContactPhone("");
      setShowPostForm(false);
      // fetchPosts will be triggered by realtime
    } catch (err: any) {
      console.error("Error posting news:", err);
      toast.error(err.message || "Failed to post news update");
    } finally {
      setIsPosting(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-brand-dark py-16 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <Megaphone className="w-96 h-96 -rotate-12 absolute -left-20 -top-20 text-white" />
          <Building2 className="w-96 h-96 rotate-12 absolute -right-20 -bottom-20 text-white" />
        </div>
        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-md text-brand-sand text-[11px] font-bold uppercase tracking-[0.2em] rounded-full mb-6 border border-white/20">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            SL-Business News
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 tracking-tight">
            The Industry <span className="text-brand-gold">Pulse</span>
          </h1>
          <p className="text-gray-300 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
            Instant updates, urgent requirements, and verified opportunities from across Sri Lanka's business landscape.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 -mt-10 relative z-30">
        {/* Advanced Filters Bar */}
        <div className="bg-white/80 backdrop-blur-xl p-4 rounded-2xl shadow-xl border border-white/40 mb-8 flex flex-col md:flex-row gap-4 items-center">
          <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Category Filter */}
            <div className="relative">
              <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-gold outline-none transition-all text-sm font-medium appearance-none"
              >
                <option value="all">All Categories</option>
                {MAIN_CATEGORY_GROUPS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Location Filter */}
            <div className="relative">
              <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <select
                value={filterDistrict}
                onChange={(e) => setFilterDistrict(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-gold outline-none transition-all text-sm font-medium appearance-none"
              >
                <option value="all">All Districts</option>
                {SRI_LANKAN_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            {/* Post Type Filter */}
            <div className="relative">
              <Briefcase size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-gold outline-none transition-all text-sm font-medium appearance-none"
              >
                <option value="all">All Types</option>
                <option value="hiring">Hiring / Required</option>
                <option value="looking">Looking for Work</option>
              </select>
            </div>
          </div>
          
          <button 
            onClick={() => { setFilterCategory("all"); setFilterDistrict("all"); setFilterType("all"); }}
            className="px-4 py-2.5 text-xs font-bold text-gray-400 hover:text-brand-gold uppercase tracking-widest transition-colors"
          >
            Reset
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Feed */}
          <div className="lg:col-span-2 space-y-6">
            {loading ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm animate-pulse">
                  <div className="flex gap-4 mb-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-xl" />
                    <div className="flex-1 space-y-2 py-1">
                      <div className="h-3 bg-gray-100 rounded w-1/4" />
                      <div className="h-2 bg-gray-100 rounded w-1/3" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-100 rounded w-3/4" />
                    <div className="h-2 bg-gray-100 rounded w-full" />
                    <div className="h-2 bg-gray-100 rounded w-5/6" />
                  </div>
                </div>
              ))
            ) : posts.length > 0 ? (
              posts.map((post) => (
                <div key={post.id} className="group bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-xl hover:border-brand-gold/30 transition-all duration-300 overflow-hidden">
                  <div className="p-6">
                    {/* Card Header */}
                    <div className="flex items-start justify-between mb-5">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden shadow-inner group-hover:scale-105 transition-transform">
                          {post.businesses?.logo_url ? (
                            <img src={post.businesses.logo_url} alt={post.businesses.name} className="w-full h-full object-cover" />
                          ) : (
                            <Building2 size={24} className="text-gray-300" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={cn(
                              "text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border",
                              post.post_type === 'hiring' 
                                ? "bg-blue-50 text-blue-600 border-blue-100" 
                                : "bg-emerald-50 text-emerald-600 border-emerald-100"
                            )}>
                              {post.post_type === 'hiring' ? 'Hiring' : 'Looking'}
                            </span>
                            <span className="text-[10px] text-gray-400 flex items-center gap-1 font-medium">
                              <MapPin size={10} /> {post.district}
                            </span>
                          </div>
                          <h3 className="text-base font-bold text-gray-900 flex items-center gap-1.5 leading-none">
                            {post.businesses?.name}
                            {post.businesses?.is_verified && (
                              <ShieldCheck size={16} className="text-brand-gold" />
                            )}
                          </h3>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-tighter">
                          {formatTime(post.created_at)}
                        </p>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="mb-6">
                      <h2 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-brand-gold transition-colors">{post.title}</h2>
                      <p className="text-gray-600 text-sm leading-relaxed line-clamp-4 whitespace-pre-wrap">
                        {post.content}
                      </p>
                    </div>

                    {/* Footer / Actions */}
                    <div className="flex items-center justify-between pt-5 border-t border-gray-50">
                      <div className="flex items-center gap-4 text-xs font-bold text-gray-400 uppercase tracking-widest">
                        <span className="flex items-center gap-1.5">
                          <Tag size={12} /> {post.category}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <a
                          href={`tel:${post.contact_phone}`}
                          className="w-10 h-10 flex items-center justify-center bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl transition-all border border-gray-200"
                          title="Call Now"
                        >
                          <Phone size={18} />
                        </a>
                        <a
                          href={`https://wa.me/${post.contact_phone.replace(/[^\d]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-10 px-5 flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#128C7E] text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-emerald-500/20"
                        >
                          <MessageSquare size={18} /> Contact
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-32 bg-white rounded-3xl border border-dashed border-gray-300">
                <Megaphone className="mx-auto w-16 h-16 text-gray-200 mb-6" />
                <h3 className="text-2xl font-bold text-gray-900 mb-2">No Updates Found</h3>
                <p className="text-gray-500 max-w-xs mx-auto">Try adjusting your filters or be the first to post a new business update!</p>
              </div>
            )}
          </div>

          {/* Sidebar Area / Post Form */}
          <div className="space-y-6">
            {/* Post Card / Prompt */}
            <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100 sticky top-28">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-brand-gold/10 flex items-center justify-center text-brand-gold">
                  <Megaphone size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Reach the Island</h2>
                  <p className="text-xs text-gray-400 font-medium">Broadcast to all businesses</p>
                </div>
              </div>

              {userBusinesses.length > 0 ? (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 leading-relaxed mb-6">
                    Verified vendors can post requirements, updates, or offers directly to the SL-Business community.
                  </p>
                  
                  {!showPostForm ? (
                    <button
                      onClick={() => setShowPostForm(true)}
                      className="w-full py-4 bg-brand-dark hover:bg-brand-blue text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-brand-dark/10 transition-all"
                    >
                      <Plus size={20} /> Create Update
                    </button>
                  ) : (
                    <form onSubmit={handlePostSubmit} className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Select Business</label>
                        <select
                          value={selectedBusinessId}
                          onChange={(e) => setSelectedBusinessId(e.target.value)}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-gold outline-none transition-all text-sm font-bold"
                          required
                        >
                          {userBusinesses.map((biz) => (
                            <option key={biz.id} value={biz.id}>{biz.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                         <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Type</label>
                          <select
                            value={formType}
                            onChange={(e) => setFormType(e.target.value as any)}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-gold outline-none transition-all text-xs font-bold"
                            required
                          >
                            <option value="hiring">Hiring</option>
                            <option value="looking">Looking</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">District</label>
                          <select
                            value={formDistrict}
                            onChange={(e) => setFormDistrict(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-gold outline-none transition-all text-xs font-bold"
                            required
                          >
                            {SRI_LANKAN_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                          </select>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Category</label>
                        <select
                          value={formCategory}
                          onChange={(e) => setFormCategory(e.target.value)}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-gold outline-none transition-all text-xs font-bold"
                          required
                        >
                          {MAIN_CATEGORY_GROUPS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      
                      <div>
                        <input
                          type="text"
                          placeholder="Headline (e.g. Urgent Requirement)"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-gold outline-none transition-all text-sm font-medium"
                          required
                        />
                      </div>

                      <div>
                        <textarea
                          rows={4}
                          placeholder="What's the update?"
                          value={content}
                          onChange={(e) => setContent(e.target.value)}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-gold outline-none transition-all text-sm resize-none"
                          required
                        />
                      </div>

                      <div>
                        <input
                          type="tel"
                          placeholder="Phone / WhatsApp"
                          value={contactPhone}
                          onChange={(e) => setContactPhone(e.target.value)}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-gold outline-none transition-all text-sm font-medium"
                          required
                        />
                      </div>

                      <div className="flex gap-2 pt-2">
                         <button
                          type="button"
                          onClick={() => setShowPostForm(false)}
                          className="flex-1 py-3 bg-gray-100 text-gray-500 rounded-xl font-bold text-sm hover:bg-gray-200 transition-all"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isPosting}
                          className="flex-[2] py-3 bg-brand-dark text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-brand-blue transition-all disabled:opacity-50"
                        >
                          {isPosting ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                          Post Now
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-brand-sand/10 border border-brand-sand/20 rounded-2xl text-center">
                    <p className="text-sm text-brand-gold font-bold mb-2">Vendors Only</p>
                    <p className="text-[11px] text-gray-500 leading-relaxed">
                      Only verified business owners can post updates. If you have a business, ensure it's verified first.
                    </p>
                  </div>
                  {!user ? (
                    <Link
                      href="/login"
                      className="w-full py-4 bg-brand-dark text-white rounded-2xl font-bold flex items-center justify-center transition-all"
                    >
                      Login to Post
                    </Link>
                  ) : (
                    <Link
                      href="/register-business"
                      className="w-full py-4 border border-brand-dark text-brand-dark rounded-2xl font-bold flex items-center justify-center transition-all"
                    >
                      Register Business
                    </Link>
                  )}
                </div>
              )}
            </div>
            
            {/* Quick Tips */}
            <div className="p-6 bg-blue-50/50 rounded-3xl border border-blue-100">
               <h4 className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-3">Posting Tips</h4>
               <ul className="space-y-2">
                 <li className="text-[11px] text-gray-500 flex gap-2">
                   <div className="w-1 h-1 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                   Be specific about location and count.
                 </li>
                 <li className="text-[11px] text-gray-500 flex gap-2">
                   <div className="w-1 h-1 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                   Mention if it's an urgent requirement.
                 </li>
                 <li className="text-[11px] text-gray-500 flex gap-2">
                   <div className="w-1 h-1 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                   Add your WhatsApp number for faster response.
                 </li>
               </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
