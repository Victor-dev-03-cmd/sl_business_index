"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useSession } from "./SessionContext";
import CategoriesMenu from "./CategoriesMenu";
import AuthButton from "./AuthButton";
import LogoLink from "./LogoLink";
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
} from "lucide-react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import Image from "next/image";
import { cn } from "@/lib/utils";

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
  const [fullUserData, setFullUserData] = useState<
    UserProfile | null | undefined
  >(undefined);
  const [categories, setCategories] = useState<Category[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [categOpen, setCategOpen] = useState(false);

  /* ── lock body scroll when panel is open ── */
  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const { data, error } = await supabase
          .from("categories")
          .select("*")
          .order("name", { ascending: true });
        if (!error) setCategories(data || []);
      } catch (err) {
        console.error("Error fetching categories in Navbar:", err);
      }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
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
          } as UserProfile);
        } catch {
          setFullUserData({ id: user.id, email: user.email } as UserProfile);
        }
      } else {
        setFullUserData(null);
      }
    };
    fetchUserProfile();
  }, [user]);

  const close = () => setMobileMenuOpen(false);

  /* profileData: merged profile — fullUserData when loaded, raw auth user
     as immediate fallback so the card renders the moment session resolves */
  const profileData: UserProfile | null =
    fullUserData && fullUserData !== null
      ? fullUserData
      : user
        ? {
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name as string | undefined,
            avatar_url: user.user_metadata?.avatar_url as string | undefined,
          }
        : null;

  const isVendorOrAdmin =
    profileData?.role === "vendor" ||
    profileData?.role === "admin" ||
    profileData?.role === "ceo";

  const showRegister = !user || !isVendorOrAdmin;

  const slugify = (name: string) =>
    name
      .toLowerCase()
      .replace(/ & /g, "-")
      .replace(/ /g, "-")
      .replace(/,/g, "");

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
      <header className="sticky top-0 z-50 bg-white shadow-md border-b border-transparent transition-colors">
        <div className="container mx-auto flex items-center justify-between h-20 px-4">
          {/* Logo */}
          <div className="flex-shrink-0">
            <LogoLink />
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex flex-grow justify-center items-center space-x-8">
            <Link
              href="/"
              className="text-gray-600 hover:text-[#2a7db4] transition-colors"
            >
              Home
            </Link>
            {showRegister && (
              <Link
                href="/register-business"
                className="text-gray-600 hover:text-[#2a7db4] transition-colors"
                >
                Register Business
              </Link>
            )}
            <CategoriesMenu initialCategories={categories} />
            <Link
              href="/about"
              className="text-gray-600 hover:text-[#2a7db4] transition-colors"
            >
              About
            </Link>
            <Link
              href="/contact"
              className="text-gray-600 hover:text-[#2a7db4] transition-colors"
            >
              Contact
            </Link>
          </nav>

          {/* Right: icons + toggle */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="hidden sm:block">
              <LiveCounter />
            </div>
            {fullUserData && <NotificationBell />}
            
            <AuthButton user={fullUserData} />

            {/* ── Animated hamburger toggle ── */}
            <button
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              className="md:hidden relative w-10 h-10 flex flex-col items-center justify-center gap-[5px] rounded-[8px] border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm hover:border-brand-dark hover:shadow-md active:scale-95 transition-all duration-200"
            >
              <span
                className={cn(
                  "block w-[18px] h-[1.5px] bg-brand-dark dark:bg-gray-300 rounded-full transition-all duration-300 origin-center",
                  mobileMenuOpen && "rotate-45 translate-y-[6.5px]",
                )}
              />
              <span
                className={cn(
                  "block w-[18px] h-[1.5px] bg-brand-dark dark:bg-gray-300 rounded-full transition-all duration-300",
                  mobileMenuOpen && "opacity-0 scale-x-0",
                )}
              />
              <span
                className={cn(
                  "block w-[18px] h-[1.5px] bg-brand-dark dark:bg-gray-300 rounded-full transition-all duration-300 origin-center",
                  mobileMenuOpen && "-rotate-45 -translate-y-[6.5px]",
                )}
              />
            </button>
          </div>
        </div>
      </header>

      {/* ════════════════════════════════════
          MOBILE SLIDE PANEL
      ════════════════════════════════════ */}
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
              className="fixed inset-0 z-[99] bg-black/40 backdrop-blur-sm"
              onClick={close}
            />

            {/* Panel */}
            <motion.div
              key="panel"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="fixed top-0 right-0 z-[100] h-full w-full max-w-[320px] bg-white dark:bg-slate-900 shadow-2xl flex flex-col"
            >
              {/* ── Panel header ── */}
              <div className="flex items-center justify-between h-16 px-5 border-b border-gray-100 dark:border-slate-800 shrink-0">
                <LogoLink />
                <div className="flex items-center gap-2">
                  <button
                    onClick={close}
                    aria-label="Close menu"
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 text-gray-500 dark:text-gray-400 transition-colors"
                  >
                    <X size={16} strokeWidth={2} />
                  </button>
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
                  <div className="flex items-center gap-3 p-3.5 bg-brand-dark/5 dark:bg-slate-800/50 rounded-xl border border-brand-dark/10 dark:border-slate-700">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-brand-dark flex items-center justify-center text-white text-sm font-semibold overflow-hidden shrink-0">
                      {profileData?.avatar_url ? (
                        <img
                          src={profileData.avatar_url}
                          alt="avatar"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        (profileData?.full_name ||
                          profileData?.username ||
                          user.email ||
                          "U")[0].toUpperCase()
                      )}
                    </div>

                    {/* Name + role */}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
                        {profileData?.full_name ||
                          profileData?.username ||
                          user.email?.split("@")[0] ||
                          "User"}
                      </p>
                      <span className="inline-flex items-center px-1.5 py-0.5 bg-brand-dark text-white text-[9px] uppercase tracking-widest rounded-full mt-0.5">
                        {profileData?.role || "customer"}
                      </span>
                    </div>

                    {/* Dashboard shortcut */}
                    {(profileData?.role === "admin" ||
                      profileData?.role === "ceo") && (
                      <Link
                        href="/admin/dashboard"
                        onClick={close}
                        className="ml-auto shrink-0 p-2 bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-700 text-brand-dark dark:text-gray-300 hover:bg-brand-dark hover:text-white transition-colors"
                      >
                        <LayoutDashboard size={15} />
                      </Link>
                    )}
                    {profileData?.role === "vendor" && (
                      <Link
                        href="/vendor/dashboard"
                        onClick={close}
                        className="ml-auto shrink-0 p-2 bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-700 text-brand-dark dark:text-gray-300 hover:bg-brand-dark hover:text-white transition-colors"
                      >
                        <Briefcase size={15} />
                      </Link>
                    )}
                  </div>
                </div>
              )}

              {/* ── Nav links (scrollable) ── */}
              <motion.nav
                className="flex-1 overflow-y-auto px-4 py-3 space-y-0.5"
                variants={listVariants}
                initial="closed"
                animate="open"
              >
                {/* Home */}
                <MobileNavLink
                  href="/"
                  icon={Home}
                  label="Home"
                  onClick={close}
                  variants={itemVariants}
                />

                {/* Nearby */}
                <MobileNavLink
                  href="/nearby"
                  icon={MapPin}
                  label="Nearby"
                  onClick={close}
                  variants={itemVariants}
                />

                {/* About */}
                <MobileNavLink
                  href="/about"
                  icon={Info}
                  label="About"
                  onClick={close}
                  variants={itemVariants}
                />

                {/* Contact */}
                <MobileNavLink
                  href="/contact"
                  icon={Phone}
                  label="Contact"
                  onClick={close}
                  variants={itemVariants}
                />

                {/* Register Business */}
                {showRegister && (
                  <MobileNavLink
                    href="/register-business"
                    icon={Building2}
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
                    className="w-full flex items-center gap-3 px-3 py-3.5 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 active:bg-gray-100 dark:active:bg-slate-700 transition-colors"
                  >
                    <span className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-brand-blue shrink-0">
                      <LayoutGrid size={16} />
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
                              href={`/categories/${slugify(String(cat.name))}`}
                              onClick={close}
                              className="flex items-center gap-2 px-2.5 py-2 bg-gray-50 dark:bg-slate-800/50 hover:bg-brand-dark/5 dark:hover:bg-slate-700 border border-gray-100 dark:border-slate-800 rounded-lg transition-colors"
                            >
                              <span className="w-6 h-6 rounded-md bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                                {cat.image_url ? (
                                  <Image
                                    src={String(cat.image_url)}
                                    alt={String(cat.name)}
                                    width={16}
                                    height={16}
                                    className="object-contain"
                                  />
                                ) : (
                                  <LayoutGrid
                                    size={12}
                                    className="text-brand-blue"
                                  />
                                )}
                              </span>
                              <span className="text-[11px] text-gray-700 dark:text-gray-300 font-medium truncate leading-tight">
                                {String(cat.name)}
                              </span>
                            </Link>
                          ))}

                          {categories.length > 10 && (
                            <Link
                              href="/categories"
                              onClick={close}
                              className="col-span-2 flex items-center justify-center gap-1.5 py-2.5 bg-brand-dark/5 dark:bg-slate-800/50 hover:bg-brand-dark/10 dark:hover:bg-slate-800 rounded-lg text-xs font-semibold text-brand-dark dark:text-gray-300 transition-colors border border-brand-dark/10 dark:border-slate-700"
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

              {/* ── Auth footer ── */}
              <div
                className="shrink-0 px-4 py-4 border-t border-gray-100 dark:border-slate-800 space-y-2"
                style={{
                  paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)",
                }}
              >
                {user ? (
                  <button
                    onClick={async () => {
                      await supabase.auth.signOut();
                      close();
                      window.location.href = "/";
                    }}
                    className="w-full flex items-center justify-center gap-2 h-11 border border-red-200 dark:border-red-900/30 text-red-500 rounded-[6px] text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-900/20 active:bg-red-100 transition-colors"
                  >
                    <LogOut size={16} />
                    Sign Out
                  </button>
                ) : (
                  <>
                    <Link
                      href="/login"
                      onClick={close}
                      className="w-full flex items-center justify-center gap-2 h-11 bg-brand-dark text-white rounded-[6px] text-sm font-semibold hover:bg-brand-blue transition-colors shadow-sm"
                    >
                      <LogIn size={16} />
                      Sign In
                    </Link>
                    <Link
                      href="/signup"
                      onClick={close}
                      className="w-full flex items-center justify-center gap-2 h-11 border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-gray-300 rounded-[6px] text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
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
    </>
  );
}

/* ────────────────────────────────────────
   Helper: single mobile nav link row
──────────────────────────────────────── */
function MobileNavLink({
  href,
  icon: Icon,
  label,
  onClick,
  variants,
  highlight = false,
}: {
  href: string;
  icon: React.ElementType;
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
            ? "bg-brand-dark/5 dark:bg-slate-800/50 hover:bg-brand-dark/10 dark:hover:bg-slate-800 border border-brand-dark/10 dark:border-slate-700"
            : "hover:bg-gray-50 dark:hover:bg-slate-800 active:bg-gray-100 dark:active:bg-slate-700",
        )}
      >
        <span
          className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
            highlight
              ? "bg-brand-dark text-white"
              : "bg-gray-100 dark:bg-slate-800 text-brand-dark dark:text-gray-300",
          )}
        >
          <Icon size={16} />
        </span>
        <span
          className={cn(
            "text-sm font-medium",
            highlight ? "text-brand-dark dark:text-gray-200" : "text-gray-700 dark:text-gray-300",
          )}
        >
          {label}
        </span>
        <ChevronRight size={14} className="ml-auto text-gray-300 dark:text-gray-600" />
      </Link>
    </motion.div>
  );
}
