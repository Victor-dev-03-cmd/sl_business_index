"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useSession } from "@/app/components/SessionContext";
import { useSearchParams, useRouter } from "next/navigation";
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
  Share2,
  Facebook,
  Image as ImageIcon,
  Trash2,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";

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
  images: string[];
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
  const router = useRouter();
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const [userBusinesses, setUserBusinesses] = useState<UserBusiness[]>([]);
  const [showPostModal, setShowPostForm] = useState(searchParams.get("post") === "true");
  
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
  
  // Multi-image upload state
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setSelectedImagePreviews] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Sharing state
  const [sharingPostId, setSharingPostId] = useState<string | null>(null);

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

  // Scroll to specific post if post_id is present and posts are loaded
  useEffect(() => {
    const postId = searchParams.get("post_id");
    if (postId && posts.length > 0) {
      const element = document.getElementById(`post-${postId}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        element.classList.add("ring-2", "ring-brand-gold", "ring-offset-4");
        // Remove highlight after a few seconds
        setTimeout(() => {
          element.classList.remove("ring-2", "ring-brand-gold", "ring-offset-4");
        }, 5000);
      }
    }
  }, [posts, searchParams]);

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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (validFiles.length !== files.length) {
      toast.error("Only image files are allowed");
    }

    if (selectedImages.length + validFiles.length > 5) {
      toast.error("Maximum 5 images allowed");
      return;
    }

    setSelectedImages(prev => [...prev, ...validFiles]);
    const newPreviews = validFiles.map(file => URL.createObjectURL(file));
    setSelectedImagePreviews(prev => [...prev, ...newPreviews]);
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setSelectedImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) {
      toast.error("Redirecting to login...");
      router.push("/login?redirect=/business-news");
      return;
    }
    if (!selectedBusinessId) {
      toast.error("Please select a verified business");
      return;
    }

    try {
      setIsPosting(true);
      
      // 1. Upload Images
      const uploadedUrls: string[] = [];
      let currentProgress = 0;
      for (const file of selectedImages) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `posts/${fileName}`;

        const { error: uploadError, data } = await supabase.storage
          .from("news-images")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("news-images")
          .getPublicUrl(filePath);
          
        uploadedUrls.push(publicUrl);
        currentProgress += (100 / selectedImages.length);
        setUploadProgress(Math.min(currentProgress, 100));
      }

      // 2. Insert Post
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
            post_type: formType,
            images: uploadedUrls
          }
        ]);

      if (error) throw error;

      toast.success("News update posted successfully!");
      setTitle("");
      setContent("");
      setContactPhone("");
      setSelectedImages([]);
      setSelectedImagePreviews([]);
      setUploadProgress(0);
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

  const shareOnWhatsApp = (post: NewsPost) => {
    const url = `${window.location.origin}/business-news?post_id=${post.id}`;
    const text = `Check out this update from ${post.businesses?.name}: ${post.title}\n\nRead more: ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    setSharingPostId(null);
  };

  const shareOnFacebook = (post: NewsPost) => {
    const url = `${window.location.origin}/business-news?post_id=${post.id}`;
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
    setSharingPostId(null);
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
            <div className="relative">
              <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-gold outline-none transition-all text-sm font-medium appearance-none cursor-pointer"
              >
                <option value="all">All Categories</option>
                {MAIN_CATEGORY_GROUPS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="relative">
              <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <select
                value={filterDistrict}
                onChange={(e) => setFilterDistrict(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-gold outline-none transition-all text-sm font-medium appearance-none cursor-pointer"
              >
                <option value="all">All Districts</option>
                {SRI_LANKAN_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="relative">
              <Briefcase size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-gold outline-none transition-all text-sm font-medium appearance-none cursor-pointer"
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
                  </div>
                </div>
              ))
            ) : posts.length > 0 ? (
              posts.map((post) => (
                <div key={post.id} id={`post-${post.id}`} className="group bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-xl hover:border-brand-gold/30 transition-all duration-500 overflow-hidden flex flex-col">
                  {/* Optional Image Carousel */}
                  {post.images && post.images.length > 0 && (
                    <div className="relative aspect-video w-full overflow-hidden bg-gray-100 group/img">
                      <Image 
                        src={post.images[0]} 
                        alt={post.title} 
                        fill 
                        className="object-cover transition-transform duration-700 group-hover:scale-105" 
                      />
                      {post.images.length > 1 && (
                        <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/50 backdrop-blur-md rounded-lg text-[10px] text-white font-bold">
                          +{post.images.length - 1} more
                        </div>
                      )}
                    </div>
                  )}

                  <div className="p-6">
                    {/* Card Header */}
                    <div className="flex items-start justify-between mb-5">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden shadow-inner shrink-0">
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
                      <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap line-clamp-6">
                        {post.content}
                      </p>
                    </div>

                    {/* Footer / Actions */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-5 border-t border-gray-50 gap-4">
                      <div className="flex items-center gap-4 text-xs font-bold text-gray-400 uppercase tracking-widest">
                        <span className="flex items-center gap-1.5">
                          <Tag size={12} /> {post.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSharingPostId(sharingPostId === post.id ? null : post.id)}
                          className="w-10 h-10 flex items-center justify-center bg-white hover:bg-gray-50 text-gray-400 hover:text-brand-gold rounded-xl transition-all border border-gray-200 relative"
                          title="Share"
                        >
                          <Share2 size={18} />
                          {/* Share Popover */}
                          <AnimatePresence>
                            {sharingPostId === post.id && (
                              <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className="absolute bottom-full right-0 mb-3 p-2 bg-white rounded-2xl shadow-2xl border border-gray-100 flex gap-2 z-50 min-w-max"
                              >
                                <button
                                  onClick={(e) => { e.stopPropagation(); shareOnWhatsApp(post); }}
                                  className="w-10 h-10 flex items-center justify-center bg-emerald-50 text-[#25D366] rounded-xl hover:bg-emerald-100 transition-colors"
                                  title="Share to WhatsApp"
                                >
                                  <MessageSquare size={18} />
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); shareOnFacebook(post); }}
                                  className="w-10 h-10 flex items-center justify-center bg-blue-50 text-[#1877F2] rounded-xl hover:bg-blue-100 transition-colors"
                                  title="Share to Facebook"
                                >
                                  <Facebook size={18} />
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </button>
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
                          <MessageSquare size={18} /> WhatsApp
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

          {/* Sidebar Area / Sticky Post CTA */}
          <div className="space-y-6">
            <div className="bg-brand-dark rounded-3xl p-8 shadow-2xl relative overflow-hidden sticky top-28">
              <div className="absolute inset-0 opacity-10">
                <Megaphone className="w-48 h-48 -rotate-12 absolute -right-10 -bottom-10 text-white" />
              </div>
              <div className="relative z-10">
                <h2 className="text-2xl font-bold text-white mb-3">Broadcast Your Business</h2>
                <p className="text-gray-400 text-sm leading-relaxed mb-8">
                  Verified vendors can post requirements, updates, or offers directly to the SL-Business community.
                </p>
                <button
                  onClick={() => {
                    if (!user) {
                      toast.info("Please login to post news");
                      router.push("/login?redirect=/business-news");
                      return;
                    }
                    setShowPostForm(true);
                  }}
                  className="w-full py-4 bg-brand-gold hover:bg-brand-gold-light text-brand-dark rounded-2xl font-bold flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Plus size={20} /> Add News Update
                </button>
              </div>
            </div>
            
            <div className="p-6 bg-white rounded-3xl border border-gray-200 shadow-sm">
               <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                 <ShieldCheck size={14} className="text-brand-gold" /> Posting Rules
               </h4>
               <ul className="space-y-3">
                 <li className="text-[12px] text-gray-500 flex gap-3">
                   <div className="w-1.5 h-1.5 rounded-full bg-brand-gold mt-1.5 shrink-0" />
                   Only verified business profiles can post.
                 </li>
                 <li className="text-[12px] text-gray-500 flex gap-3">
                   <div className="w-1.5 h-1.5 rounded-full bg-brand-gold mt-1.5 shrink-0" />
                   Posts must be business-related (hiring, deals, etc).
                 </li>
                 <li className="text-[12px] text-gray-500 flex gap-3">
                   <div className="w-1.5 h-1.5 rounded-full bg-brand-gold mt-1.5 shrink-0" />
                   Maximum of 5 photos per post.
                 </li>
               </ul>
            </div>
          </div>
        </div>
      </div>

      {/* --- POST NEWS MODAL --- */}
      <AnimatePresence>
        {showPostModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-brand-dark/80 backdrop-blur-sm"
              onClick={() => !isPosting && setShowPostForm(false)}
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[32px] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-8 pb-0 flex items-center justify-between shrink-0">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">New Business Update</h2>
                  <p className="text-sm text-gray-400 mt-1">Broadcast to all users and vendors</p>
                </div>
                <button 
                  onClick={() => setShowPostForm(false)}
                  disabled={isPosting}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-gray-900 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
                {userBusinesses.length > 0 ? (
                  <form onSubmit={handlePostSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Select Business</label>
                        <select
                          value={selectedBusinessId}
                          onChange={(e) => setSelectedBusinessId(e.target.value)}
                          className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-brand-gold outline-none transition-all text-sm font-bold appearance-none cursor-pointer"
                          required
                        >
                          {userBusinesses.map((biz) => (
                            <option key={biz.id} value={biz.id}>{biz.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Type</label>
                        <div className="grid grid-cols-2 gap-2 bg-gray-50 p-1 rounded-2xl border border-gray-200">
                          <button
                            type="button"
                            onClick={() => setFormType('hiring')}
                            className={cn(
                              "py-2.5 rounded-xl text-xs font-bold transition-all",
                              formType === 'hiring' ? "bg-white text-brand-dark shadow-sm" : "text-gray-400 hover:text-gray-600"
                            )}
                          >
                            Hiring
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormType('looking')}
                            className={cn(
                              "py-2.5 rounded-xl text-xs font-bold transition-all",
                              formType === 'looking' ? "bg-white text-brand-dark shadow-sm" : "text-gray-400 hover:text-gray-600"
                            )}
                          >
                            Looking
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">District</label>
                        <select
                          value={formDistrict}
                          onChange={(e) => setFormDistrict(e.target.value)}
                          className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-brand-gold outline-none transition-all text-sm font-bold appearance-none cursor-pointer"
                          required
                        >
                          {SRI_LANKAN_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Category</label>
                        <select
                          value={formCategory}
                          onChange={(e) => setFormCategory(e.target.value)}
                          className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-brand-gold outline-none transition-all text-sm font-bold appearance-none cursor-pointer"
                          required
                        >
                          {MAIN_CATEGORY_GROUPS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Headline</label>
                      <input
                        type="text"
                        placeholder="e.g. Urgent Requirement: 2 Plumbers in Colombo"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-brand-gold outline-none transition-all text-sm font-medium"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Description</label>
                      <textarea
                        rows={4}
                        placeholder="What's the update? Be specific about the work, location and requirements..."
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-brand-gold outline-none transition-all text-sm resize-none"
                        required
                      />
                    </div>

                    <div className="space-y-4">
                      <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Photos (Up to 5)</label>
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                        {imagePreviews.map((preview, idx) => (
                          <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 group/img">
                            <Image src={preview} alt="preview" fill className="object-cover" />
                            <button
                              type="button"
                              onClick={() => removeImage(idx)}
                              className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                        {imagePreviews.length < 5 && (
                          <label className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-gray-50 hover:border-brand-gold transition-all text-gray-400 hover:text-brand-gold">
                            <Plus size={20} />
                            <span className="text-[10px] font-bold uppercase">Add</span>
                            <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageChange} />
                          </label>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Contact Phone</label>
                      <div className="relative">
                        <Phone size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="tel"
                          placeholder="e.g. +94 77 123 4567"
                          value={contactPhone}
                          onChange={(e) => setContactPhone(e.target.value)}
                          className="w-full pl-10 pr-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-brand-gold outline-none transition-all text-sm font-medium"
                          required
                        />
                      </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                      <button
                        type="button"
                        onClick={() => setShowPostForm(false)}
                        disabled={isPosting}
                        className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-2xl font-bold text-sm hover:bg-gray-200 transition-all disabled:opacity-50"
                      >
                        Discard
                      </button>
                      <button
                        type="submit"
                        disabled={isPosting}
                        className="flex-[2] py-4 bg-brand-dark text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-brand-blue transition-all disabled:opacity-50 shadow-xl shadow-brand-dark/10"
                      >
                        {isPosting ? (
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-full bg-white/20 h-1 rounded-full overflow-hidden">
                              <div 
                                className="bg-brand-gold h-full transition-all duration-300" 
                                style={{ width: `${uploadProgress}%` }}
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <Loader2 className="animate-spin" size={20} />
                              <span>{uploadProgress < 100 ? `Uploading Photos (${Math.round(uploadProgress)}%)...` : 'Broadcasting...'}</span>
                            </div>
                          </div>
                        ) : (
                          <>
                            <Send size={20} />
                            <span>Post Update</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="py-10 text-center">
                    <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <ShieldCheck size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Verification Required</h3>
                    <p className="text-gray-500 mt-2 max-w-sm mx-auto">Only verified business owners can broadcast news. Please ensure your business is approved and verified first.</p>
                    <Link 
                      href="/register-business" 
                      className="inline-block mt-6 px-8 py-3 bg-brand-dark text-white rounded-xl font-bold hover:bg-brand-blue transition-all"
                    >
                      Verify Business
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
