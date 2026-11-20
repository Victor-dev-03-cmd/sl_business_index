"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useSession } from "./SessionContext";
import CategoriesMenu from "./CategoriesMenu";
import CategorySubNavbar from "./CategorySubNavbar";
import AuthButton from "./AuthButton";
import LogoLink from "./LogoLink";
import MobileGreeting from "./MobileGreeting";
import { googleIdentityProfile } from "@/lib/auth/google-profile";
import BrandIcon from "./BrandIcon";
import NotificationBell from "./NotificationBell";
import LiveCounter from "./LiveCounter";
import {
  X,
  Home,
  Info,
  Phone,
  Building2,
  LayoutGrid,
  LogIn,
  LogOut,
  ChevronDown,
  ChevronRight,
  LayoutDashboard,
  Briefcase,
  MapPin,
  Moon,
  HelpCircle as HelpIcon,
  Megaphone,
  Plus,
  Search,
  ArrowUpRight,
  Newspaper,
  type LucideIcon,
} from "lucide-react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface UserProfile {
  id?: string;
  email?: string;
  full_name?: string;
  username?: string;
  role?: string;
  avatar_url?: string;
  user_metadata?: { full_name?: string; avatar_url?: string };
}

interface Category {
  name: string;
  image_url?: string;
  icon?: string;
}

export default function Navbar() {
  const { user, loading: sessionLoading } = useSession();
  const pathname = usePathname();
  const [fullUserData, setFullUserData] = useState<
    UserProfile | null | undefined
  >(undefined);
  const [categories, setCategories] = useState<Category[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [categOpen, setCategOpen] = useState(false);
  const [isLegacy, setIsLegacy] = useState(false);
  const [subNavbarOpen, setSubNavbarOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [hasNewNews, setHasNewNews] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const headerRootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const closeMegaMenu = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setSubNavbarOpen(false);
    setActiveCategory(null);
  };

  const handleMouseEnter = (group: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setActiveCategory(group);
    setSubNavbarOpen(true);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(closeMegaMenu, 180);
  };

  // Outside interactions, Escape and route changes close the menu without
  // installing an overlay or preventing the page from scrolling.
  useEffect(() => {
    if (!subNavbarOpen) return;
    const onOutside = (event: PointerEvent) => {
      if (!headerRootRef.current?.contains(event.target as Node)) {
        setSubNavbarOpen(false);
        setActiveCategory(null);
      }
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSubNavbarOpen(false);
        setActiveCategory(null);
      }
    };
    document.addEventListener("pointerdown", onOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("pointerdown", onOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, [subNavbarOpen]);

  useEffect(() => {
    setSubNavbarOpen(false);
    setActiveCategory(null);
  }, [pathname]);

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

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

  useEffect(() => {
    if (typeof window !== "undefined") {
      const ua = navigator.userAgent;
      if (ua.indexOf("iPad") !== -1 && ua.indexOf("Version/12") !== -1) {
        setIsLegacy(true);
      }
    }
  }, []);

  /* ── lock body scroll when panel is open ── */
  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    const checkNewNews = async () => {
      if (!user?.id) return;
      
      try {
        // 1. Get user's last check time
        const { data: profile } = await supabase
          .from("profiles")
          .select("last_news_check")
          .eq("id", user.id)
          .single();
          
        const lastCheck = profile?.last_news_check || new Date(0).toISOString();
        
        // 2. Check for news after that time
        const { count, error } = await supabase
          .from("business_news")
          .select("id", { count: 'exact', head: true })
          .gt("created_at", lastCheck);
          
        if (!error && count && count > 0) {
          setHasNewNews(true);
        }
      } catch (err) {
        console.error("Error checking for new news:", err);
      }
    };
    
    checkNewNews();
    
    // Set up realtime subscription for new news
    const channel = supabase
      .channel("new_business_news")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "business_news",
        },
        () => {
          setHasNewNews(true);
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  useEffect(() => {
    if (pathname === "/business-news") {
      setHasNewNews(false);
      
      const updateCheck = async () => {
        if (user?.id) {
          await supabase
            .from("profiles")
            .update({ last_news_check: new Date().toISOString() })
            .eq("id", user.id);
        }
      };
      updateCheck();
    }
  }, [pathname, user?.id]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const { data, error } = await supabase
          .from("categories")
          .select("*")
          .order("name", { ascending: true });
        if (!error) {
          setCategories(data || []);
        }
      } catch (err) {
        console.error("Error fetching categories in Navbar:", err);
      }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        const google = googleIdentityProfile(user);
        try {
          const { data, error } = await supabase
            .from("profiles")
            .select("username, full_name, role, avatar_url")
            .eq("id", user.id)
            .single();
          if (error) throw error;
          setFullUserData({
            id: user.id,
            email: user.email,
            ...data,
            full_name: data.full_name?.trim() || google.name,
            avatar_url: data.avatar_url?.trim() || google.avatar,
          } as UserProfile);
        } catch {
          setFullUserData({
            id: user.id, email: user.email,
            full_name: google.name, avatar_url: google.avatar,
          } as UserProfile);
        }
      } else {
        setFullUserData(null);
      }
    };
    fetchUserProfile();
  }, [user]);

  const close = () => setMobileMenuOpen(false);
  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      close();
      window.location.assign("/");
    } catch (error) {
      console.error("Sign out failed:", error);
      toast.error("Unable to sign out. Please try again.");
      setIsSigningOut(false);
    }
  };

  /* profileData: merged profile — fullUserData when loaded, raw auth user
     as immediate fallback so the card renders the moment session resolves */
  const profileData: UserProfile | null =
    fullUserData && fullUserData !== null
      ? fullUserData
      : user
        ? {
            id: user.id,
            email: user.email,
            full_name: googleIdentityProfile(user).name ||
              (user.user_metadata && user.user_metadata.full_name) as string | undefined,
            avatar_url: googleIdentityProfile(user).avatar,
          }
        : null;

  const isVendorOrAdmin =
    (profileData && profileData.role && profileData.role.toLowerCase() === "vendor") ||
    (profileData && profileData.role && profileData.role.toLowerCase() === "admin") ||
    (profileData && profileData.role && profileData.role.toLowerCase() === "ceo");

  const showRegister = !user || !isVendorOrAdmin;

  const slugify = (name: string) =>
    name
      .toLowerCase()
      .trim()
      .replace(/ & /g, "-")
      .replace(/ /g, "-")
      .replace(/,/g, "")
      .replace(/[^\w-]+/g, "");

  /* ── stagger variants ── */
  const listVariants = {
    open: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
    closed: {},
  };
  const itemVariants = {
    open: { opacity: 1, x: 0 },
    closed: { opacity: 0, x: 24 },
  };

  return (
    <>
      {/* ════════════════════════════════════
          HEADER
      ════════════════════════════════════ */}
      <div
        ref={headerRootRef}
        className="sticky top-0 z-50 w-full"
        onMouseLeave={handleMouseLeave}
        onKeyDown={(event) => {
          if (event.key === "Escape") closeMegaMenu();
        }}
      >
        <header
          data-home-mobile={pathname === "/" ? "true" : undefined}
          className={cn("relative z-[90] border-b bg-[#FCFAF6] transition-[border-color,box-shadow] duration-150", scrolled ? "border-stone-200 shadow-[0_2px_10px_rgba(15,23,42,0.055)]" : "border-stone-100")}
          onMouseEnter={closeMegaMenu}
          onFocusCapture={closeMegaMenu}
        >
        <div className="mx-auto flex h-[76px] max-w-[1440px] items-center justify-between gap-2.5 px-4 sm:gap-4 sm:px-6 lg:px-8">
          {/* Mobile only: personalized two-line welcome. Keep the actual
              SLBI wordmark unchanged from tablet/desktop breakpoints onward. */}
          <MobileGreeting
            username={profileData?.username}
            fullName={profileData?.full_name}
            email={profileData?.email}
          />
          <div className="hidden shrink-0 sm:block">
            <LogoLink />
          </div>

          {/* Premium desktop navigation */}
           <nav aria-label="Main navigation" className="hidden lg:flex min-w-0 flex-1 items-center justify-center gap-0.5">
             {[
               { href: "/", label: "Explore", icon: "home-2" },
               { href: "/category", label: "Categories", icon: "category-2" },
               { href: "/nearby", label: "Nearby", icon: "location" },
               { href: "/business-news", label: "Business News", icon: "note-2" },
               { href: "/about", label: "About", icon: "info-circle" },
             ].map(item => {
               const active = pathname === item.href || (item.href === "/category" && pathname.startsWith("/category/"));
               return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={cn("inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-xl px-3 text-[13px] font-semibold tracking-tight transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500", active ? "bg-stone-100 text-[#1B3430]" : "text-stone-600 hover:bg-stone-50 hover:text-stone-950")}><BrandIcon name={item.icon} size={17} variant={active ? "bulk" : "linear"} className="text-current" /><span>{item.label}</span>{item.href === "/business-news" && hasNewNews && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}</Link>;
             })}
             <div className="group relative">
               <button type="button" aria-label="Resources menu" aria-haspopup="true" className="flex h-10 items-center gap-1 rounded-xl px-3 text-[13px] font-semibold text-stone-600 hover:bg-stone-50 hover:text-stone-950"><BrandIcon name="element-3" size={17} /><span>Resources</span><ChevronDown size={14} /></button>
               <div className="invisible pointer-events-none absolute left-0 top-full z-[120] w-48 rounded-2xl border border-stone-200 bg-white p-2 opacity-0 shadow-xl transition-opacity duration-150 group-hover:visible group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:visible group-focus-within:pointer-events-auto group-focus-within:opacity-100">
                 <Link href="/faq" className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-stone-700 hover:bg-stone-50"><BrandIcon name="message-question" size={17} />Help & FAQ</Link>
                 <Link href="/contact" className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-stone-700 hover:bg-stone-50"><BrandIcon name="call" size={17} />Contact Us</Link>
               </div>
             </div>
           </nav>

           {/* Right: icons + toggle */}
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {profileData?.role?.toLowerCase() === "vendor" && (
              <Link
                href="/business-news?post=true"
                className="hidden 2xl:flex h-10 items-center gap-1.5 rounded-xl border border-stone-200 px-3 text-xs font-semibold text-stone-700 hover:bg-stone-50"
              >
                <BrandIcon name="add" size={15} /> Add News
              </Link>
            )}
            <div className="hidden 2xl:block"><LiveCounter /></div>
             <Link href="/search" aria-label="Search businesses" className="hidden lg:flex h-10 w-10 items-center justify-center rounded-xl text-stone-600 hover:bg-stone-100 hover:text-stone-950"><BrandIcon name="search-normal-1" size={19} /></Link>
            <div className="hidden sm:block">{fullUserData && <NotificationBell />}</div>
            <Link href="/notifications" aria-label="View notifications"
              className="flex h-10 w-10 items-center justify-center rounded-full text-[#244238] transition-colors hover:bg-[#EAF0E9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#B49161] sm:hidden">
              <BrandIcon name="notification" size={21}/>
            </Link>
            
            <div className="hidden sm:block"><AuthButton user={fullUserData} /></div>
             {showRegister && <Link href="/register-business" className="hidden xl:inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-xl bg-[#1B3430] px-4 text-xs font-semibold text-white shadow-md transition-all hover:bg-[#26483B] hover:shadow-lg"><BrandIcon name="buildings-2" size={16} /> List Your Business <ArrowUpRight size={15} /></Link>}

            {/* Mobile reference: profile-shaped menu control instead of a hamburger.
                The existing complete menu drawer stays accessible on tap. */}
            <button type="button"
              onClick={() => setMobileMenuOpen(value => !value)}
              aria-label={mobileMenuOpen ? "Close account and navigation menu" : "Open account and navigation menu"}
              aria-expanded={mobileMenuOpen}
              className={cn(
                "relative z-[110] flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#DBE3D8] bg-[#EEF2EB] text-[#244339] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#B49161] lg:hidden",
                mobileMenuOpen && "border-[#244339] bg-[#244339] text-white"
              )}>
              {mobileMenuOpen ? <X size={20} strokeWidth={1.8}/> :
                profileData?.avatar_url ?
                  <Image src={profileData.avatar_url} width={40} height={40} alt="Your profile" className="size-full object-cover" unoptimized /> :
                profileData?.full_name?.trim() ?
                  <span className="text-[15px] font-semibold" aria-hidden="true">{profileData.full_name.trim().charAt(0).toUpperCase()}</span>:
                  <BrandIcon name="profile-circle" size={25} />}
            </button>
          </div>
        </div>
      </header>

      {/* Refined industry ribbon — hover, click and keyboard focus open mega menu. */}
      <div className="hidden border-b border-stone-200 bg-[#F2EFE7] lg:block">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
          <nav aria-label="Business industries" className="flex h-12 items-center gap-1 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <span className="mr-2 inline-flex shrink-0 items-center gap-2 border-r border-stone-200 pr-4 text-[10px] font-bold uppercase tracking-[0.14em] text-[#36785E]">
              <BrandIcon name="category-2" size={16} /> Industries
            </span>
            {MAIN_CATEGORY_GROUPS.map((group) => {
              const selected = activeCategory === group && subNavbarOpen;
              return (
                <button
                  key={group}
                  type="button"
                  aria-controls="industry-mega-menu"
                  aria-expanded={selected}
                  aria-haspopup="true"
                  onMouseEnter={() => handleMouseEnter(group)}
                  onFocus={() => handleMouseEnter(group)}
                  onClick={() => {
                    if (selected) closeMegaMenu();
                    else handleMouseEnter(group);
                  }}
                  className={cn(
                    "group relative inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-[11px] font-semibold tracking-[-0.005em] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
                    selected
                      ? "bg-white text-[#1B3430] shadow-sm ring-1 ring-[#E0EADB]"
                      : "text-stone-500 hover:bg-white hover:text-[#1B3430]"
                  )}
                >
                  <BrandIcon
                    name={{
                      "Manpower Services": "people",
                      "Care & Lifestyle": "heart",
                      "Professional & Finance": "briefcase",
                      "Construction & Industrial": "buildings",
                      "Technical & Electronics": "cpu",
                      "Events, Food & Leisure": "calendar",
                      "Travel & Transport": "airplane",
                      "Retail & Others": "shop",
                    }[group] || "category-2"}
                    size={15}
                    variant={selected ? "bulk" : "linear"}
                  />
                  <span>{group}</span>
                  <ChevronDown size={12} strokeWidth={2} className={cn("shrink-0 transition-transform duration-150", selected && "rotate-180")} />
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      <CategorySubNavbar
        isOpen={subNavbarOpen}
        activeCategory={activeCategory}
        categories={categories as any}
        onClose={closeMegaMenu}
      />
    </div>

      {/* ════════════════════════════════════
          MOBILE SLIDE PANEL
      ════════════════════════════════════ */}
      {isLegacy ? (
        mobileMenuOpen && (
          <div className="fixed inset-0 z-[100] flex">
            <div className="fixed inset-0 bg-black opacity-40" onClick={close}></div>
            <div className="relative ml-auto h-full w-full max-w-[320px] bg-white shadow-2xl flex flex-col overflow-y-auto">
              <div className="flex items-center justify-between h-16 px-5 border-b border-gray-100 shrink-0">
                <LogoLink />
              </div>
              
              <nav className="flex-1 px-4 py-3 space-y-2">
                <Link href="/" onClick={close} className="flex items-center gap-3 p-3 text-gray-700 hover:bg-gray-50 rounded-lg">
                  <BrandIcon name="home-2" size={20} /> <span className="font-medium">Home</span>
                </Link>
                <Link href="/category" onClick={close} className="flex items-center gap-3 p-3 text-gray-700 hover:bg-gray-50 rounded-lg">
                  <BrandIcon name="category-2" size={20} /> <span className="font-medium">Categories</span>
                </Link>
                <Link href="/business-news" onClick={close} className="flex items-center gap-3 p-3 text-gray-700 hover:bg-gray-50 rounded-lg">
                  <BrandIcon name="note-2" size={20} /> <span className="font-medium">Business News</span>
                </Link>
                <Link href="/nearby" onClick={close} className="flex items-center gap-3 p-3 text-gray-700 hover:bg-gray-50 rounded-lg">
                  <BrandIcon name="location" size={20} /> <span className="font-medium">Nearby</span>
                </Link>
                <Link href="/about" onClick={close} className="flex items-center gap-3 p-3 text-gray-700 hover:bg-gray-50 rounded-lg">
                  <BrandIcon name="info-circle" size={20} /> <span className="font-medium">About</span>
                </Link>
                <Link href="/faq" onClick={close} className="flex items-center gap-3 p-3 text-gray-700 hover:bg-gray-50 rounded-lg">
                  <BrandIcon name="message-question" size={20} /> <span className="font-medium">FAQ</span>
                </Link>
                <Link href="/contact" onClick={close} className="flex items-center gap-3 p-3 text-gray-700 hover:bg-gray-50 rounded-lg">
                  <BrandIcon name="call" size={20} /> <span className="font-medium">Contact</span>
                </Link>
                <Link href="/register-business" onClick={close} className="flex items-center gap-3 p-3 text-gray-700 hover:bg-gray-50 rounded-lg">
                  <BrandIcon name="buildings-2" size={20} /> <span className="font-medium">List Your Business</span>
                </Link>
              </nav>
            </div>
          </div>
        )
      ) : (
        <AnimatePresence>
          {mobileMenuOpen && (
            <>
              {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="fixed inset-0 z-[99] bg-stone-950/50 backdrop-blur-[3px]"
              onClick={close}
            />

            {/* Panel */}
            <motion.div
              key="panel"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="fixed top-0 right-0 z-[100] h-full w-full max-w-[360px] bg-[#FCFAF6] shadow-[0_25px_80px_rgba(15,23,42,0.24)] flex flex-col max-sm:h-[100dvh] max-sm:w-[calc(100vw-18px)] max-sm:overflow-hidden max-sm:rounded-l-[26px] max-sm:bg-white"
            >
              {/* ── Panel header ── */}
              <div className="flex items-center justify-between h-16 px-5 border-b border-gray-100 shrink-0 max-sm:h-[78px] max-sm:px-4 max-sm:border-[#E8EDEA]">
                <LogoLink />
                <div className="flex items-center gap-2">
                  <button type="button" onClick={close} aria-label="Close menu" className="flex h-10 w-10 items-center justify-center rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-50 max-sm:rounded-full max-sm:border-[#E1E8E3] max-sm:bg-white"><X size={19} /></button>
                </div>
              </div>

              {/* ── User card ── */}
              {/* Show skeleton while session is still loading */}
              {sessionLoading && (
                <div className="mx-4 mt-4 shrink-0">
                  <div className="flex items-center gap-3 p-3.5 bg-gray-50 rounded-xl border border-gray-100 animate-pulse">
                    <div className="w-10 h-10 rounded-full bg-gray-200 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-gray-200 rounded w-2/3" />
                      <div className="h-2.5 bg-gray-200 rounded w-1/3" />
                    </div>
                  </div>
                </div>
              )}

              {/* Show card as soon as session user is confirmed */}
              {!sessionLoading && user && (
                <div className="mx-4 mt-4 shrink-0">
                  <div className="flex items-center gap-3 p-3.5 bg-brand-dark/5 rounded-xl border border-brand-dark/10 max-sm:rounded-[16px] max-sm:border-[#E0E7E4] max-sm:bg-[#F7F8F8]">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-brand-dark flex items-center justify-center text-white text-sm font-semibold overflow-hidden shrink-0">
                      {(profileData && profileData.avatar_url) ? (
                        <img
                          src={profileData.avatar_url}
                          alt="avatar"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        (profileData && profileData.full_name ||
                          (profileData && profileData.username) ||
                          (user && user.email) ||
                          "U")[0].toUpperCase()
                      )}
                    </div>

                    {/* Name + role */}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        {(profileData && profileData.full_name) ||
                          (profileData && profileData.username) ||
                          (user && user.email && user.email.split("@")[0]) ||
                          "User"}
                      </p>
                      <span className="inline-flex items-center px-1.5 py-0.5 bg-brand-dark text-white text-[9px] uppercase tracking-widest rounded-full mt-0.5">
                        {(profileData && profileData.role) || "customer"}
                      </span>
                    </div>

                    {/* Dashboard shortcut */}
                    {((profileData && profileData.role === "admin") ||
                      (profileData && profileData.role === "ceo")) && (
                      <Link
                        href="/admin/dashboard"
                        aria-label="Open admin dashboard"
                        onClick={close}
                        className="ml-auto shrink-0 p-3 bg-white rounded-lg border border-gray-200 text-brand-dark hover:bg-brand-dark hover:text-white transition-colors flex items-center justify-center min-w-[44px] min-h-[44px] max-sm:border-transparent max-sm:bg-transparent max-sm:p-2 max-sm:hover:bg-[#EAF0EC]"
                      >
                        <BrandIcon name="element-3" size={20} />
                        <ChevronRight size={15} aria-hidden="true" className="ml-1 hidden text-[#9EA9A3] max-sm:block" />
                      </Link>
                    )}
                    {(profileData && profileData.role === "vendor") && (
                      <Link
                        href="/vendor/dashboard"
                        aria-label="Open vendor dashboard"
                        onClick={close}
                        className="ml-auto shrink-0 p-3 bg-white rounded-lg border border-gray-200 text-brand-dark hover:bg-brand-dark hover:text-white transition-colors flex items-center justify-center min-w-[44px] min-h-[44px] max-sm:border-transparent max-sm:bg-transparent max-sm:p-2 max-sm:hover:bg-[#EAF0EC]"
                      >
                        <BrandIcon name="briefcase" size={20} />
                        <ChevronRight size={15} aria-hidden="true" className="ml-1 hidden text-[#9EA9A3] max-sm:block" />
                      </Link>
                    )}
                  </div>
                </div>
              )}

              {/* Native phone-only menu, leaving tablet navigation unchanged. */}
              <nav aria-label="Mobile account navigation"
                className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 pt-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:hidden"
                style={{ fontFamily: "var(--font-inter), sans-serif" }}>
                <p className="mb-2 px-1 text-[11px] font-medium uppercase tracking-[0.07em] text-[#727D77]">Discover</p>
                <div className="space-y-0.5">
                  <MobileDrawerLink href="/" label="Home" icon={Home} onClick={close} />
                  <MobileDrawerLink href="/nearby" label="Nearby" icon={MapPin} onClick={close} />
                  <div>
                    <button type="button" onClick={() => setCategOpen(v => !v)}
                      aria-expanded={categOpen} aria-controls="slbi-phone-drawer-categories"
                      className="flex min-h-[55px] w-full items-center gap-3 rounded-xl px-1 text-left text-[#22332D] transition-colors hover:bg-[#F6F8F6] active:bg-[#EFF3F0]">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-[#F4F6F7] text-[#244238]">
                        <LayoutGrid size={19} strokeWidth={1.7} aria-hidden="true" />
                      </span>
                      <span className="flex-1 text-[14px] font-medium">Categories</span>
                      <ChevronDown size={16} aria-hidden="true"
                        className={cn("mr-2 text-[#B1B9B4] transition-transform duration-150", categOpen && "rotate-180")} />
                    </button>
                    {categOpen && (
                      <div id="slbi-phone-drawer-categories"
                        className="mb-3 ml-4 grid grid-cols-2 gap-2 border-l border-[#E5EAE7] pb-1 pl-4 pt-2">
                        {categories.slice(0, 10).map(cat => (
                          <Link key={cat.name} href={"/category/" + slugify(cat.name)}
                            onClick={close}
                            className="min-w-0 truncate rounded-lg bg-[#F6F8F7] px-2.5 py-2.5 text-[11px] font-medium text-[#395044] hover:bg-[#ECF3EE]">
                            {cat.name}
                          </Link>
                        ))}
                        <Link href="/category" onClick={close}
                          className="col-span-2 rounded-lg bg-[#EAF2ED] px-3 py-2.5 text-center text-[12px] font-medium text-[#245941]">
                          Browse all categories
                        </Link>
                      </div>
                    )}
                  </div>
                  <MobileDrawerLink href="/business-news" label="SL-News" icon={Newspaper} onClick={close} />
                  {showRegister && (
                    <MobileDrawerLink href="/register-business" label="Register Business" icon={Building2} onClick={close} />
                  )}
                </div>
                <p className="mb-2 mt-7 px-1 text-[11px] font-medium uppercase tracking-[0.07em] text-[#727D77]">Support &amp; Info</p>
                <div className="space-y-0.5">
                  <MobileDrawerLink href="/about" label="About" icon={Info} onClick={close} />
                  <MobileDrawerLink href="/faq" label="FAQ" icon={HelpIcon} onClick={close} />
                  <MobileDrawerLink href="/contact" label="Contact" icon={Phone} onClick={close} />
                </div>
              </nav>

              {/* Tablet nav: keep previous layout and category dropdown. */}
              <motion.nav
                className="hidden flex-1 overflow-y-auto px-5 py-5 space-y-1 sm:block"
                variants={listVariants}
                initial="closed"
                animate="open"
              >
                {/* Home */}
                <MobileNavLink
                  href="/"
                  iconName="home-2"
                  label="Home"
                  onClick={close}
                  variants={itemVariants}
                />

                {/* Nearby */}
                <MobileNavLink
                  href="/nearby"
                  iconName="location"
                  label="Nearby"
                  onClick={close}
                  variants={itemVariants}
                />

                {/* About */}
                <MobileNavLink
                  href="/about"
                  iconName="info-circle"
                  label="About"
                  onClick={close}
                  variants={itemVariants}
                />

                {/* SL-News */}
                <MobileNavLink
                  href="/business-news"
                  iconName="note-2"
                  label="SL-News"
                  onClick={close}
                  variants={itemVariants}
                />

                {/* FAQ */}
                <MobileNavLink
                  href="/faq"
                  iconName="message-question"
                  label="FAQ"
                  onClick={close}
                  variants={itemVariants}
                />

                {/* Contact */}
                <MobileNavLink
                  href="/contact"
                  iconName="call"
                  label="Contact"
                  onClick={close}
                  variants={itemVariants}
                />

                {/* Register Business */}
                {showRegister && (
                  <MobileNavLink
                    href="/register-business"
                    iconName="buildings-2"
                    label="Register Business"
                    onClick={close}
                    variants={itemVariants}
                    highlight
                  />
                )}

                {/* ── Categories accordion ── */}
                <motion.div variants={itemVariants}>
                  <button
                    onClick={() => setCategOpen((v) => !v)}
                    className="w-full flex items-center gap-3 px-3 py-3.5 rounded-xl text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                  >
                    <span className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-brand-blue shrink-0">
                      <BrandIcon name="category-2" size={18} />
                    </span>
                    <span className="flex-1 text-sm font-medium text-left">
                      Categories
                    </span>
                    <ChevronDown
                      size={16}
                      className={cn(
                        "text-gray-400 transition-transform duration-200",
                        categOpen && "rotate-180",
                      )}
                    />
                  </button>

                  <AnimatePresence>
                    {categOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="px-2 pb-3 grid grid-cols-2 gap-1.5 mt-1">
                          {categories.slice(0, 10).map((cat) => (
                            <Link
                              key={String(cat.name)}
                              href={`/category/${slugify(String(cat.name))}`}
                              onClick={close}
                              className="flex items-center gap-2 px-2.5 py-2 bg-gray-50 hover:bg-brand-dark/5 border border-gray-100 rounded-lg transition-colors"
                            >
                              <span className="w-6 h-6 rounded-md bg-white border border-gray-200 flex items-center justify-center overflow-hidden shrink-0">
                                {cat.image_url ? (
                                  <Image
                                    src={String(cat.image_url)}
                                    alt={String(cat.name)}
                                    width={16}
                                    height={16}
                                    className="object-contain"
                                  />
                                ) : (
                                  <BrandIcon name="category-2" size={14} />
                                )}
                              </span>
                              <span className="text-[11px] text-gray-700 font-medium truncate leading-tight">
                                {String(cat.name)}
                              </span>
                            </Link>
                          ))}

                          {categories.length > 10 && (
                            <Link
                              href="/category"
                              onClick={close}
                              className="col-span-2 flex items-center justify-center gap-1.5 py-2.5 bg-brand-dark/5 hover:bg-brand-dark/10 rounded-lg text-xs font-semibold text-brand-dark transition-colors border border-brand-dark/10"
                            >
                              View all {categories.length} categories
                              <ChevronRight size={13} />
                            </Link>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </motion.nav>

              {/* The sign-out action never scrolls behind the site bottom dock. */}
              <div className="shrink-0 border-t border-[#E5EAE7] bg-white px-4 pt-4 sm:hidden"
                style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom, 0px))" }}>
                {user ? (
                  <button type="button" onClick={handleSignOut} disabled={isSigningOut}
                    className="flex h-[49px] w-full items-center justify-center gap-2 rounded-full bg-[#FDF0EE] text-[14px] font-medium text-[#B33B42] transition-colors hover:bg-[#F9E6E4] active:bg-[#F5DEDB] disabled:opacity-60">
                    <LogOut size={17} strokeWidth={1.8} aria-hidden="true" />
                    {isSigningOut ? "Signing out…" : "Sign Out"}
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <Link href="/login" onClick={close}
                      className="flex h-[47px] flex-1 items-center justify-center rounded-full bg-[#235B45] text-[13px] font-medium text-white">Sign In</Link>
                    <Link href="/signup" onClick={close}
                      className="flex h-[47px] flex-1 items-center justify-center rounded-full border border-[#DFE7E2] text-[13px] font-medium text-[#244638]">Create Account</Link>
                  </div>
                )}
                <p className="mt-3 text-center text-[10px] tracking-[0.01em] text-[#929D96]">SL Business Index</p>
              </div>

              {/* Tablet auth footer: original layout. */}
              <div
                className="hidden shrink-0 px-4 py-4 border-t border-gray-100 space-y-2 sm:block"
                style={{
                  paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)",
                }}
              >
                {user ? (
                  <button
                    onClick={handleSignOut}
                    disabled={isSigningOut}
                    className="w-full flex items-center justify-center gap-2 h-11 border border-red-200 text-red-500 rounded-[6px] text-sm font-semibold hover:bg-red-50 active:bg-red-100 transition-colors"
                  >
                    <BrandIcon name="logout" size={17} />
                    Sign Out
                  </button>
                ) : (
                  <>
                    <Link
                      href="/login"
                      onClick={close}
                      className="w-full flex items-center justify-center gap-2 h-11 bg-brand-dark text-white rounded-[6px] text-sm font-semibold hover:bg-brand-blue transition-colors shadow-sm"
                    >
                      <BrandIcon name="login" size={17} />
                      Sign In
                    </Link>
                    <Link
                      href="/signup"
                      onClick={close}
                      className="w-full flex items-center justify-center gap-2 h-11 border border-gray-300 text-gray-700 rounded-[6px] text-sm font-medium hover:bg-gray-50 transition-colors"
                    >
                      Create Account
                    </Link>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    )}
  </>
);
}

/* ────────────────────────────────────────
   Helper: single mobile nav link row
──────────────────────────────────────── */
function MobileNavLink({
  href,
  iconName,
  label,
  onClick,
  variants,
  highlight = false,
}: {
  href: string;
  iconName: string;
  label: string;
  onClick: () => void;
  variants: Variants;
  highlight?: boolean;
}) {
  return (
    <motion.div variants={variants}>
      <Link
        href={href}
        onClick={onClick}
        className={cn(
          "flex items-center gap-3 px-3 py-3.5 rounded-xl transition-colors active:scale-[0.98]",
          highlight
            ? "bg-brand-dark/5 hover:bg-brand-dark/10 border border-brand-dark/10"
            : "hover:bg-gray-50 active:bg-gray-100",
        )}
      >
        <span
          className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
            highlight
              ? "bg-brand-dark text-white"
              : "bg-gray-100 text-brand-dark",
          )}
        >
          <BrandIcon name={iconName} size={17} variant="linear" />
        </span>
        <span
          className={cn(
            "text-sm font-medium",
            highlight ? "text-brand-dark" : "text-gray-700",
          )}
        >
          {label}
        </span>
        <ChevronRight size={14} className="ml-auto text-gray-300" />
      </Link>
    </motion.div>
  );
}


/** Icons stay bundled Lucide SVGs; no new asset fetch or per-row motion. */
function MobileDrawerLink({
  href, label, icon: Icon, onClick,
}: {
  href: string; label: string; icon: LucideIcon; onClick: () => void;
}) {
  return (
    <Link href={href} onClick={onClick}
      className="flex min-h-[55px] items-center gap-3 rounded-xl px-1 text-[#22332D] transition-colors hover:bg-[#F6F8F6] active:bg-[#EFF3F0]">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-[#F4F6F7] text-[#244238]">
        <Icon size={19} strokeWidth={1.7} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1 text-[14px] font-medium">{label}</span>
      <ChevronRight size={16} aria-hidden="true" className="mr-2 shrink-0 text-[#B8C1BC]" />
    </Link>
  );
}
