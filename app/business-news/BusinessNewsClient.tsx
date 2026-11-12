"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useSession } from "@/app/components/SessionContext";
import VerifiedBadge from "@/app/components/VerifiedBadge";
import ReportModal from "@/app/components/ReportModal";
import {
  ArrowDown, ArrowRight, ArrowUpRight, BookOpen, Building2,
  CalendarDays, ChevronDown, Flag, Image as ImageIcon,
  Megaphone, Newspaper, PenLine, Phone, Search, Share2,
} from "lucide-react";
import { toast } from "sonner";

const NewsEditorModal = dynamic(() => import("./NewsEditorModal"), { ssr: false });

type NewsFormat = "article" | "poster" | "brief";
type NewsType = "news" | "hiring" | "looking";
type NewsPost = {
  id: string;
  title: string;
  content: string;
  created_at: string;
  owner_id: string;
  business_id: string;
  category: string | null;
  district: string | null;
  post_type: NewsType;
  content_format?: NewsFormat | null;
  contact_phone?: string | null;
  images: string[] | null;
  businesses: { name: string; logo_url: string | null; is_verified: boolean; status: string } | null;
};

const CATEGORIES = ["Manpower Services", "Care & Lifestyle", "Professional & Finance", "Construction & Industrial", "Technical & Electronics", "Events, Food & Leisure", "Travel & Transport", "Retail & Others"];
const DISTRICTS = ["Ampara", "Anuradhapura", "Badulla", "Batticaloa", "Colombo", "Galle", "Gampaha", "Hambantota", "Jaffna", "Kalutara", "Kandy", "Kegalle", "Kilinochchi", "Kurunegala", "Mannar", "Matale", "Matara", "Monaragala", "Mullaitivu", "Nuwara Eliya", "Polonnaruwa", "Puttalam", "Ratnapura", "Trincomalee", "Vavuniya"];
const typeLabel: Record<NewsType, string> = { news: "Business news", hiring: "Hiring", looking: "Opportunity sought" };
const kickerClass = "text-[10px] font-extrabold uppercase tracking-[.17em] text-[#9b754f]";
const serif = "font-serif tracking-[-.045em] text-[#1c3026]";

function displayDate(date: string, options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }): string {
  return new Date(date).toLocaleDateString("en-LK", options);
}
function formatPhone(phone?: string | null) {
  const value = (phone || "").replace(/[^\d+]/g, "");
  return value.length >= 8 ? value : null;
}

function StoryImage({ post, lead = false }: { post: NewsPost; lead?: boolean }) {
  const src = post.images?.[0];
  if (!src) {
    return <div className="flex h-full min-h-[220px] w-full items-center justify-center bg-[repeating-linear-gradient(135deg,#edf0e7_0px,#edf0e7_3px,#f7f6f0_3px,#f7f6f0_18px)] text-[#8caa94]">
      <div className="flex flex-col items-center gap-4 border-y border-[#c5d0c0] px-10 py-6">
        <Newspaper size={lead ? 52 : 37} strokeWidth={1.2}/>
        <span className="text-[10px] font-bold uppercase tracking-[.25em] text-[#557866]">Business journal</span>
      </div>
    </div>;
  }
  return <div className={"relative h-full w-full overflow-hidden bg-[#f2eee6] " + (post.content_format === "poster" ? "p-3" : "")}>
    <Image src={src} alt={"Illustration for " + post.title} fill
      sizes={lead ? "(max-width: 900px) 100vw, 46vw" : "(max-width: 640px) 100vw, (max-width: 1280px) 320px, 360px"}
      quality={65} loading={lead ? "eager" : "lazy"} fetchPriority={lead ? "high" : "auto"} className={post.content_format === "poster" ? "object-contain p-3" : "object-cover"} />
    {(post.images?.length || 0) > 1 && <span className="absolute bottom-3 right-3 rounded-md bg-[#132a20]/90 px-2.5 py-1.5 text-[10px] font-bold text-white">
      +{(post.images?.length || 1) - 1} photos
    </span>}
  </div>;
}

function StoryByline({ post, compact = false }: { post: NewsPost; compact?: boolean }) {
  return <div className="flex min-w-0 items-center gap-2.5">
    <span className={"flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#e3e4da] bg-[#eef1e9] " + (compact ? "h-8 w-8" : "h-10 w-10")}>
      {post.businesses?.logo_url ? (
        // Logos are business-supplied and may use non-CDN object storage providers.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.businesses.logo_url} loading="lazy" decoding="async" className="h-full w-full object-cover" alt=""/>
      ) : <Building2 size={compact ? 14 : 19} className="text-[#708675]"/>}
    </span>
    <span className="min-w-0">
      <span className="flex items-center gap-1.5 truncate text-[11px] font-bold text-[#2a4737]">
        <span className="truncate">{post.businesses?.name || "Local business"}</span>
        {post.businesses?.is_verified && <VerifiedBadge size={13}/>}
      </span>
      <span className="block text-[10px] text-[#929087]">{displayDate(post.created_at)}{post.district ? " · " + post.district : ""}</span>
    </span>
  </div>;
}

function StoryActions({ post, onReport, onShare }: { post: NewsPost; onReport: (post: NewsPost) => void; onShare: (post: NewsPost) => void }) {
  const phone = formatPhone(post.contact_phone);
  return <div className="flex flex-wrap items-center gap-2.5 border-t border-[#e8e6db] pt-4">
    <button type="button" onClick={() => onShare(post)} className="inline-flex min-h-9 items-center gap-2 rounded-md border border-[#e0e3d9] bg-white px-3 text-[11px] font-semibold text-[#40654d] hover:bg-[#eff5ee]"><Share2 size={14}/> Share</button>
    {phone && <a href={"tel:" + phone} className="inline-flex min-h-9 items-center gap-2 rounded-md border border-[#e0e3d9] bg-white px-3 text-[11px] font-semibold text-[#40654d] hover:bg-[#eff5ee]"><Phone size={14}/> Contact</a>}
    <button type="button" onClick={() => onReport(post)} className="ml-auto inline-flex min-h-9 items-center gap-1.5 text-[11px] font-medium text-[#908b80] hover:text-[#af5946]"><Flag size={13}/> Report</button>
  </div>;
}

function FullStory({ post }: { post: NewsPost }) {
  return <div className="mt-5 border-t border-[#e8e6dc] pt-5">
    <div className="whitespace-pre-line break-words text-[14px] leading-[1.95] text-[#494f47]">{post.content}</div>
    {(post.images?.length || 0) > 1 && <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
      {post.images?.slice(1).map((src, index) => <div key={src} className="relative aspect-[4/3] overflow-hidden rounded-md bg-[#f4f0e9]">
        <Image src={src} fill alt={"Additional photo " + (index + 2) + " for " + post.title} quality={65} loading="lazy" sizes="(max-width: 640px) 45vw, 230px" className="object-cover"/>
      </div>)}
    </div>}
  </div>;
}

function LeadStory({ post, expanded, onToggle, onReport, onShare, highlighted }: {
  post: NewsPost; expanded: boolean; onToggle: () => void; onReport: (post: NewsPost) => void; onShare: (post: NewsPost) => void; highlighted: boolean;
}) {
  return <article id={"post-" + post.id} className={"scroll-mt-[148px] overflow-hidden border border-[#e3e1d5] bg-white " + (highlighted ? "ring-2 ring-[#d4a367]" : "")}>
    <div className="grid lg:grid-cols-[1.07fr_0.93fr]">
      <div className="flex min-w-0 flex-col px-6 py-7 sm:px-9 sm:py-9 lg:px-10 lg:py-11">
        <div className="flex items-center gap-2.5"><span className="h-1.5 w-1.5 rounded-full bg-[#c87c49]"/><span className={kickerClass}>Lead story</span>
          <span className="text-[10px] text-[#898b82]">/ {typeLabel[post.post_type] || "Business news"}</span></div>
        <h2 className={"mt-5 text-[clamp(2.15rem,3.5vw,4.5rem)] leading-[1.08] " + serif}>{post.title}</h2>
        <p className="mt-5 line-clamp-4 whitespace-pre-line text-[14px] leading-[1.8] text-[#687065] sm:text-[15px]">{post.content}</p>
        <div className="mt-auto pt-8"><StoryByline post={post}/>
          <button type="button" onClick={onToggle} aria-expanded={expanded} className="mt-7 inline-flex min-h-11 items-center gap-2 border-b-2 border-[#2b6650] pb-1 text-[12px] font-extrabold uppercase tracking-[.08em] text-[#2b6650] hover:text-[#16402d]">
            {expanded ? "Close article" : "Read full story"} <ArrowUpRight size={16}/>
          </button></div>
      </div>
      <div className="relative min-h-[300px] border-t border-[#e2dfd4] lg:min-h-[470px] lg:border-l lg:border-t-0">
        <StoryImage post={post} lead/>
        <div className="pointer-events-none absolute left-4 top-4 rounded-sm bg-[#fffefb]/95 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.13em] text-[#335b45] shadow-sm">
          {post.content_format === "poster" ? "Photo story" : post.content_format === "article" ? "In depth" : "Community dispatch"}
        </div>
      </div>
    </div>
    {expanded && <div className="border-t border-[#e8e4db] px-6 pb-8 pt-1 sm:px-10"><FullStory post={post}/></div>}
    <div className="border-t border-[#e8e5db] px-6 py-4 sm:px-10"><StoryActions post={post} onReport={onReport} onShare={onShare}/></div>
  </article>;
}

function FeedStory({ post, expanded, onToggle, onReport, onShare, highlighted }: {
  post: NewsPost; expanded: boolean; onToggle: () => void; onReport: (post: NewsPost) => void; onShare: (post: NewsPost) => void; highlighted: boolean;
}) {
  return <article id={"post-" + post.id} className={"scroll-mt-[148px] border-b border-[#e1dfd5] py-7 first:pt-0 " + (highlighted ? "rounded-md bg-[#fbf2e2] px-3 ring-2 ring-[#d4a367]" : "")}>
    <div className="grid items-start gap-5 sm:grid-cols-[minmax(0,1fr)_210px] md:gap-7">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[10px] font-bold uppercase tracking-[.12em]">
          <span className="text-[#b36c40]">{typeLabel[post.post_type] || "News"}</span><span className="text-[#97998f]">{post.category || "Business"}</span>
          {post.content_format === "poster" && <span className="inline-flex items-center gap-1 text-[#68816c]"><ImageIcon size={13}/> Poster</span>}
        </div>
        <h3 className={"mt-3 text-[clamp(1.55rem,2.2vw,2.3rem)] leading-[1.15] " + serif}>{post.title}</h3>
        <p className="mt-3 line-clamp-3 whitespace-pre-line text-[13px] leading-[1.85] text-[#697167]">{post.content}</p>
        <div className="mt-5"><StoryByline post={post} compact/></div>
        <button onClick={onToggle} aria-expanded={expanded} type="button" className="mt-4 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.1em] text-[#2b7154] hover:underline">
          {expanded ? "Show less" : "Read story"} <ArrowRight size={14}/></button>
      </div>
      <button onClick={onToggle} aria-label={"Read " + post.title} type="button"
        className={"relative order-first w-full overflow-hidden bg-[#eaece2] sm:order-last " + (post.content_format === "poster" ? "aspect-[4/5]" : "aspect-[16/11]")}>
        <StoryImage post={post}/>
      </button>
    </div>
    {expanded && <FullStory post={post}/>}
    <div className="mt-5"><StoryActions post={post} onReport={onReport} onShare={onShare}/></div>
  </article>;
}

async function loadNews(): Promise<NewsPost[]> {
  const { data, error } = await supabase.from("business_news")
    .select("id,title,content,created_at,owner_id,business_id,category,district,post_type,content_format,contact_phone,images,businesses!inner(name,logo_url,is_verified,status)")
    .eq("businesses.status", "approved")
    .order("created_at", { ascending: false }).limit(84);
  if (error) throw error;
  return (data || []) as unknown as NewsPost[];
}

export default function BusinessNewsClient() {
  const { user } = useSession();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const postLinkId = searchParams.get("post_id");
  const [editorOpen, setEditorOpen] = useState(searchParams.get("post") === "true");
  const [reporting, setReporting] = useState<NewsPost | null>(null);
  const [searchText, setSearchText] = useState("");
  const [category, setCategory] = useState("all");
  const [district, setDistrict] = useState("all");
  const [kind, setKind] = useState<"all" | NewsType>("all");
  const [visibleCount, setVisibleCount] = useState(12);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const lastDeepLink = useRef<string | null>(null);
  const { data: posts = [], isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ["business-news-editorial"],
    queryFn: loadNews,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const closeEditor = useCallback(() => setEditorOpen(false), []);
  const onPublished = useCallback(() => { void queryClient.invalidateQueries({ queryKey: ["business-news-editorial"] }); }, [queryClient]);

  useEffect(() => {
    const subscription = supabase.channel("business-news-editorial-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "business_news" },
        () => { void queryClient.invalidateQueries({ queryKey: ["business-news-editorial"] }); })
      .subscribe();
    return () => { void supabase.removeChannel(subscription); };
  }, [queryClient]);
  useEffect(() => {
    if (!user?.id) return;
    void supabase.from("profiles").update({ last_news_check: new Date().toISOString() }).eq("id", user.id);
  }, [user?.id]);
  useEffect(() => {
    if (!postLinkId || !posts.some(post => post.id === postLinkId) || lastDeepLink.current === postLinkId) return;
    lastDeepLink.current = postLinkId;
    setExpandedId(postLinkId);
    setHighlightId(postLinkId);
    const frame = requestAnimationFrame(() => document.getElementById("post-" + postLinkId)?.scrollIntoView({ behavior: "smooth", block: "center" }));
    const timeout = window.setTimeout(() => setHighlightId(null), 5000);
    return () => { cancelAnimationFrame(frame); clearTimeout(timeout); };
  }, [postLinkId, posts]);

  const filteredPosts = useMemo(() => {
    const needle = searchText.trim().toLocaleLowerCase();
    return posts.filter(post => {
      if (category !== "all" && post.category !== category) return false;
      if (district !== "all" && post.district !== district) return false;
      if (kind !== "all" && post.post_type !== kind) return false;
      if (!needle) return true;
      return [post.title, post.content, post.category, post.district, post.businesses?.name].some(value => (value || "").toLocaleLowerCase().includes(needle));
    });
  }, [posts, searchText, category, district, kind]);
  const lead = filteredPosts[0] || null;
  const remainder = filteredPosts.slice(1);
  const visible = remainder.slice(0, visibleCount);
  const latest = posts.slice(0, 5);
  const posterCount = posts.filter(p => p.content_format === "poster").length;
  const articleCount = posts.filter(p => p.content_format === "article").length;
  const filtersActive = Boolean(searchText.trim()) || category !== "all" || district !== "all" || kind !== "all";
  const clearFilters = () => { setSearchText(""); setCategory("all"); setDistrict("all"); setKind("all"); setVisibleCount(12); };
  const onReport = (post: NewsPost) => setReporting(post);
  const onShare = async (post: NewsPost) => {
    const url = window.location.origin + "/business-news?post_id=" + encodeURIComponent(post.id);
    try {
      if (navigator.share) {
        await navigator.share({ title: post.title, text: "Business update from " + (post.businesses?.name || "SL Business Index"), url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Story link copied");
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      toast.error("Unable to share this story.");
    }
  };
  const day = new Date().toLocaleDateString("en-LK", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Colombo" });

  return <div className="min-h-screen bg-[#f8f7f2] pb-24 text-[#24372d]">
    <div className="mx-auto max-w-[1480px] px-4 sm:px-7 lg:px-10">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#d9d8cf] py-3 text-[10px] font-bold uppercase tracking-[.13em] text-[#667467]">
        <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#cc8556]"/> Sri Lanka&apos;s business community</span>
        <span className="flex items-center gap-2"><CalendarDays size={13}/> {day}</span>
      </div>
      <header className="border-b-[3px] border-double border-[#283e32] pb-7 pt-9 text-center sm:pb-9 sm:pt-11">
        <div className="mx-auto mb-3 flex w-fit items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.29em] text-[#b18459]"><span className="h-px w-7 bg-[#b18459]"/> SL Business Index <span className="h-px w-7 bg-[#b18459]"/></div>
        <h1 className="font-serif text-[clamp(3.1rem,7.5vw,7.5rem)] font-bold leading-[.95] tracking-[-.065em] text-[#193528]">
          The Business <span className="italic text-[#59816a]">Journal.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-[660px] text-[13px] leading-6 text-[#6d766c] sm:text-[15px]">
          Local stories, industry insights, business opportunities and photo updates — contributed by verified Sri Lankan businesses.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <button type="button" onClick={() => setEditorOpen(true)} className="inline-flex min-h-11 items-center gap-2 rounded-[8px] bg-[#203d2e] px-5 text-[12px] font-bold text-white transition-colors hover:bg-[#315f43]"><PenLine size={16}/> Publish a story <ArrowUpRight size={15}/></button>
          <a href="#latest-edition" className="inline-flex min-h-11 items-center gap-2 rounded-[8px] border border-[#d8dbcf] bg-white px-5 text-[12px] font-semibold text-[#325641] hover:bg-[#f0f3eb]">Explore the edition <ArrowDown size={15}/></a>
        </div>
      </header>
      <nav aria-label="Journal categories" className="flex gap-1.5 overflow-x-auto border-b border-[#dad9ce] py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button type="button" onClick={() => { setCategory("all"); setVisibleCount(12); }} aria-current={category === "all" ? "page" : undefined}
          className={"shrink-0 rounded-md px-4 py-2 text-[11px] font-bold transition-colors " + (category === "all" ? "bg-[#203e2d] text-white" : "text-[#626c61] hover:bg-[#ebece4]")}>All industries</button>
        {CATEGORIES.map(value => <button type="button" key={value} onClick={() => { setCategory(value); setVisibleCount(12); }}
          aria-current={category === value ? "page" : undefined}
          className={"shrink-0 rounded-md px-4 py-2 text-[11px] font-bold transition-colors " + (category === value ? "bg-[#203e2d] text-white" : "text-[#626c61] hover:bg-[#ebece4]")}>{value}</button>)}
      </nav>

      <main id="latest-edition" className="scroll-mt-[120px] pt-8 sm:pt-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div><p className={kickerClass}>Community dispatches</p>
            <h2 className={"mt-1 text-[30px] leading-tight sm:text-[38px] " + serif}>The latest edition</h2></div>
          <div className="flex items-center gap-2 text-[11px] font-semibold text-[#69766a]"><Newspaper size={15}/> {isLoading ? "Loading stories" : filteredPosts.length + " " + (filteredPosts.length === 1 ? "story" : "stories")}</div>
        </div>
        <div className="mb-7 grid gap-3 rounded-[11px] border border-[#e2e0d5] bg-white p-3 sm:grid-cols-[minmax(0,1fr)_180px_150px] sm:gap-4 sm:p-4">
          <label className="relative flex min-w-0 items-center">
            <Search size={17} className="absolute left-3.5 text-[#9a9e93]"/>
            <input aria-label="Search business journal stories" value={searchText} onChange={e => { setSearchText(e.target.value); setVisibleCount(12); }}
              placeholder="Search headlines, businesses, stories…" className="min-h-11 w-full rounded-[8px] border border-[#e2e3d9] bg-[#fafaf7] py-2 pl-10 pr-3 text-[12px] text-[#2b4033] outline-none placeholder:text-[#96998d] focus:border-[#448266]"/>
          </label>
          <select aria-label="Filter district" value={district} onChange={e => { setDistrict(e.target.value); setVisibleCount(12); }}
            className="min-h-11 rounded-[8px] border border-[#e2e3d9] bg-[#fafaf7] px-3 text-[12px] font-semibold text-[#596e5d] outline-none focus:border-[#448266]">
            <option value="all">All districts</option>{DISTRICTS.map(d => <option key={d}>{d}</option>)}
          </select>
          <select aria-label="Filter story type" value={kind} onChange={e => { setKind(e.target.value as typeof kind); setVisibleCount(12); }}
            className="min-h-11 rounded-[8px] border border-[#e2e3d9] bg-[#fafaf7] px-3 text-[12px] font-semibold text-[#596e5d] outline-none focus:border-[#448266]">
            <option value="all">All stories</option><option value="news">Business news</option><option value="hiring">Hiring</option><option value="looking">Looking for</option>
          </select>
        </div>

        {isLoading ? <div role="status" className="grid gap-5 lg:grid-cols-3">
          <div className="h-[390px] animate-pulse rounded-[8px] bg-[#e9e9df] lg:col-span-2"/>
          <div className="h-[390px] animate-pulse rounded-[8px] bg-[#ededdf]"/>
        </div>
        : isError ? <div role="alert" className="rounded-[12px] border border-[#edc1b7] bg-white p-10 text-center">
          <h3 className="font-serif text-2xl text-[#814b39]">Could not load the news edition</h3>
          <p className="mt-2 text-sm text-[#7e776a]">Please check your connection and retry.</p>
          <button type="button" onClick={() => void refetch()} className="mt-5 rounded-md bg-[#234333] px-5 py-3 text-sm font-semibold text-white">Try again</button>
        </div>
        : !lead ? <div className="rounded-[12px] border border-dashed border-[#d8ddce] bg-white px-6 py-20 text-center">
          <BookOpen size={42} className="mx-auto text-[#91af98]"/><h3 className="mt-5 font-serif text-[29px] text-[#224532]">No stories for these filters</h3>
          <p className="mt-2 text-[13px] text-[#7d847b]">Try another industry, district or search term. Verified owners can contribute a story.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {filtersActive && <button type="button" onClick={clearFilters} className="rounded-md border border-[#cfd8ce] px-5 py-2.5 text-sm font-semibold text-[#315f42]">Clear filters</button>}
            <button type="button" onClick={() => setEditorOpen(true)} className="rounded-md bg-[#254632] px-5 py-2.5 text-sm font-semibold text-white">Publish an update</button>
          </div>
        </div>
        : <>
          <LeadStory post={lead} expanded={expandedId === lead.id} highlighted={highlightId === lead.id}
            onToggle={() => setExpandedId(id => id === lead.id ? null : lead.id)} onReport={onReport} onShare={onShare}/>
          <div className="mt-10 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_310px] xl:gap-14">
            <section aria-labelledby="more-stories-title" className="min-w-0">
              <div className="mb-5 flex items-center justify-between border-b-2 border-[#223b2d] pb-4">
                <div><p className={kickerClass}>The community newsroom</p><h2 id="more-stories-title" className={"mt-1 text-[29px] " + serif}>More from the journal</h2></div>
                <span className="text-[11px] font-semibold text-[#8b8c80]">{remainder.length} more</span>
              </div>
              {visible.length ? visible.map(post => <FeedStory key={post.id} post={post} expanded={expandedId === post.id}
                highlighted={highlightId === post.id} onToggle={() => setExpandedId(id => id === post.id ? null : post.id)}
                onReport={onReport} onShare={onShare}/>)
                : <div className="border-b border-[#deded3] py-10 text-[13px] leading-6 text-[#768176]">You&apos;re caught up. New business updates will appear here when published.</div>}
              {remainder.length > visibleCount && <button onClick={() => setVisibleCount(count => count + 12)} type="button"
                className="mt-7 flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-[#cad9cd] bg-white text-[12px] font-bold text-[#2b6043] hover:bg-[#eff5ef]">Load more stories <ChevronDown size={15}/></button>}
            </section>
            <aside className="min-w-0 space-y-6 lg:sticky lg:top-[98px]" aria-label="Journal sidebar">
              <div className="overflow-hidden border border-[#dde3d7] bg-[#1c3528] p-7 text-white">
                <span className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.18em] text-[#c6c7a5]"><PenLine size={15}/> The publisher&apos;s desk</span>
                <h3 className="mt-5 font-serif text-[30px] leading-[1.13] tracking-tight">Your story belongs here.</h3>
                <p className="mt-4 text-[12px] leading-6 text-[#c1d1c5]">Business articles, announcements, posters and opportunities from verified local owners.</p>
                <button type="button" onClick={() => setEditorOpen(true)} className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[7px] bg-[#f2ecdc] px-4 text-[12px] font-bold text-[#234132] hover:bg-white">Publish a story <ArrowUpRight size={15}/></button>
              </div>
              <div className="border border-[#e0dfd4] bg-white px-6 py-6">
                <div className="flex items-center justify-between"><p className={kickerClass}>On the record</p><Newspaper size={17} className="text-[#8b9d8b]"/></div>
                <h3 className={"mt-2 text-[27px] " + serif}>Latest dispatches</h3>
                <div className="mt-5 divide-y divide-[#ecebe3]">{latest.map((post, i) => <button key={post.id} type="button"
                  onClick={() => { setExpandedId(post.id); document.getElementById("post-" + post.id)?.scrollIntoView({ behavior: "smooth", block: "center" }); }}
                  className="flex w-full items-start gap-3 py-4 text-left first:pt-0">
                  <span className="font-serif text-[26px] text-[#c4c5b5]">{String(i + 1).padStart(2, "0")}</span>
                  <span className="min-w-0"><span className="line-clamp-2 font-serif text-[16px] font-bold leading-5 text-[#234130]">{post.title}</span>
                    <span className="mt-1 block text-[10px] text-[#898d82]">{displayDate(post.created_at)}</span></span>
                </button>)}</div>
              </div>
              <div className="border border-[#e0dfd4] bg-white px-6 py-6">
                <p className={kickerClass}>The edition in numbers</p>
                <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                  {[{value:posts.length,label:"Updates"},{value:articleCount,label:"Articles"},{value:posterCount,label:"Posters"}].map(item =>
                    <div key={item.label} className="border-y border-[#e5e4da] py-3"><span className="block font-serif text-[27px] font-bold text-[#224632]">{item.value}</span>
                      <span className="text-[10px] font-semibold text-[#82887d]">{item.label}</span></div>)}
                </div>
                <p className="mt-4 text-[11px] leading-5 text-[#85877e]">These are business-contributed updates, not independently verified reporting. Check details with the publisher.</p>
              </div>
              <div className="border-t-[3px] border-[#284938] pt-5">
                <p className={kickerClass}>Explore the directory</p>
                <h3 className={"mt-2 text-[23px] " + serif}>Find the businesses behind the stories.</h3>
                <Link href="/nearby" className="mt-4 inline-flex items-center gap-2 text-[12px] font-bold text-[#2f7152] hover:underline">Explore businesses <ArrowUpRight size={15}/></Link>
              </div>
            </aside>
          </div>
        </>}
        {isFetching && !isLoading && <p aria-live="polite" className="mt-5 text-[11px] text-[#878f83]">Refreshing the edition…</p>}
      </main>
    </div>
    <section className="mt-16 border-y border-[#dde1d5] bg-white py-10">
      <div className="mx-auto grid max-w-[1480px] gap-7 px-4 sm:px-7 lg:grid-cols-[1fr_auto] lg:items-center lg:px-10">
        <div><p className={kickerClass}>Your business. Your voice.</p>
          <h2 className={"mt-2 text-[clamp(1.8rem,3vw,2.8rem)] " + serif}>From storefronts to stories.</h2>
          <p className="mt-3 max-w-[660px] text-[13px] leading-6 text-[#778075]">Publish an illustrated update, a longer article or a job opportunity — credited to your approved and verified business.</p></div>
        <button type="button" onClick={() => setEditorOpen(true)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[7px] bg-[#244533] px-6 text-[12px] font-bold text-white hover:bg-[#336a4a]"><Megaphone size={17}/> Submit a story <ArrowUpRight size={15}/></button>
      </div>
    </section>
    {editorOpen && <NewsEditorModal onClose={closeEditor} onPublished={onPublished}/>}
    <ReportModal isOpen={Boolean(reporting)} onClose={() => setReporting(null)}
      targetId={reporting?.id || ""} targetType="news" targetName={reporting?.title}/>
  </div>;
}
