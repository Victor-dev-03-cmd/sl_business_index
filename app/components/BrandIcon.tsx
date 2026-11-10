"use client";

import { createElement, useEffect, useRef, useState } from "react";
import {
  ArrowUpRight, BookOpen, Briefcase, Building2, CalendarDays,
  ChevronLeft, ChevronRight, CircleHelp, CirclePlus, Cpu, Heart,
  House, Info, LayoutGrid, LogIn, LogOut, MapPin, Monitor,
  Newspaper, Phone, Plane, Search, Shield, ShoppingCart, Star,
  Store, Users, type LucideIcon,
} from "lucide-react";

export type BrandIconProps = {
  name: string;
  size?: number | string;
  variant?: "linear" | "outline" | "twotone" | "bulk" | "bold" | "broken";
  color?: string;
  className?: string;
  title?: string;
};

// Keep the same reliable rendering approach as the vendor dashboard:
// the bundled Iconsax custom element is preferred, but a real SVG is visible
// immediately and stays visible if registration, an icon chunk, or a name fails.
let registration: Promise<unknown> | undefined;
const fallbacks: Readonly<Record<string, LucideIcon>> = {
  home: House,
  "home-2": House,
  category: LayoutGrid,
  "category-2": LayoutGrid,
  "element-3": LayoutGrid,
  location: MapPin,
  "note-2": Newspaper,
  "info-circle": Info,
  "message-question": CircleHelp,
  call: Phone,
  "search-normal": Search,
  "search-normal-1": Search,
  search: Search,
  building: Building2,
  buildings: Building2,
  "buildings-2": Building2,
  people: Users,
  heart: Heart,
  briefcase: Briefcase,
  cpu: Cpu,
  calendar: CalendarDays,
  airplane: Plane,
  shop: Store,
  monitor: Monitor,
  "book-1": BookOpen,
  "shopping-cart": ShoppingCart,
  shield: Shield,
  "star-1": Star,
  star: Star,
  add: CirclePlus,
  "add-circle": CirclePlus,
  "arrow-left-2": ChevronLeft,
  "arrow-right-2": ChevronRight,
  "arrow-right-3": ChevronRight,
  "arrow-up-right": ArrowUpRight,
  login: LogIn,
  logout: LogOut,
};

export default function BrandIcon({
  name,
  size = 20,
  variant = "linear",
  color = "currentColor",
  className = "",
  title,
}: BrandIconProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [rendered, setRendered] = useState(false);
  const Fallback = fallbacks[name] || CircleHelp;

  useEffect(() => {
    let cancelled = false;
    let observer: MutationObserver | undefined;
    setRendered(false);

    const attach = async () => {
      if (!registration) {
        registration = import("iconsax").catch(error => {
          registration = undefined;
          console.warn("Iconsax unavailable; keeping visible SVG fallbacks.", error);
        });
      }
      await registration;
      if (cancelled || !customElements.get("iconsax-icon")) return;
      const node = ref.current;
      if (!node) return;

      const check = () => {
        if (cancelled) return;
        const svg = node.shadowRoot?.querySelector("svg") || node.querySelector("svg");
        if (svg && !svg.querySelector("title[data-error]")) {
          setRendered(true);
          observer?.disconnect();
        }
      };

      check();
      if (!cancelled) {
        observer = new MutationObserver(check);
        observer.observe(node.shadowRoot || node, { childList: true, subtree: true });
        check();
      }
    };

    void attach();
    return () => {
      cancelled = true;
      observer?.disconnect();
    };
  }, [name, variant]);

  return (
    <span
      className={className}
      role={title ? "img" : undefined}
      aria-label={title}
      style={{
        position: "relative",
        display: "inline-flex",
        width: size,
        height: size,
        flexShrink: 0,
        verticalAlign: "middle",
        color,
      }}
    >
      <Fallback
        size={size}
        strokeWidth={1.9}
        aria-hidden="true"
        style={{ position: "absolute", inset: 0, opacity: rendered ? 0 : 1 }}
      />
      {createElement("iconsax-icon", {
        ref,
        name,
        type: variant,
        size: String(size),
        color: "currentColor",
        "aria-hidden": "true",
        style: {
          display: "inline-flex",
          width: size,
          height: size,
          opacity: rendered ? 1 : 0,
        },
      })}
    </span>
  );
}
