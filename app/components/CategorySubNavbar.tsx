"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface Category {
  id: string;
  name: string;
  parent_id: string | null;
}

interface CategorySubNavbarProps {
  isOpen: boolean;
  activeCategory: string | null;
  categories: Category[];
  onClose: () => void;
  topOffset?: number;
}

export default function CategorySubNavbar({
  isOpen,
  activeCategory,
  categories,
  onClose,
  topOffset = 121,
}: CategorySubNavbarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      gsap.to(containerRef.current, {
        height: "auto",
        opacity: 1,
        duration: 0.4,
        ease: "power3.out",
        display: "block",
      });
      gsap.fromTo(
        contentRef.current,
        { y: -10, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4, ease: "power3.out" }
      );
    } else {
      gsap.to(containerRef.current, {
        height: 0,
        opacity: 0,
        duration: 0.3,
        ease: "power3.in",
        display: "none",
      });
    }
  }, [isOpen, activeCategory]);

  const parent = categories.find((p) => {
    if (!activeCategory || p.parent_id) return false;
    
    const dbName = p.name.toLowerCase().trim();
    const activeName = activeCategory.toLowerCase().trim();
    
    // Exact match or partial match (for handling "Events, Food & Leisure" vs "Events Food & Leisure")
    return dbName === activeName || 
           dbName.replace(/,/g, '') === activeName.replace(/,/g, '') ||
           activeName.includes(dbName) || 
           dbName.includes(activeName);
  });

  const subCategories = categories.filter((cat) => cat.parent_id === parent?.id);

  // Fallback data from user prompt if dynamic fetch yields nothing
  const FALLBACK_DATA: Record<string, string[]> = {
    "Manpower Services": ["Mason", "Painter", "Plumber", "Carpenter", "Welder", "Electrician", "Cleaner", "Laborer / Helper"],
    "Care & Lifestyle": ["Health & Medical", "Baby Care", "Pet Care", "Beauty & Health", "Religious Organization"],
    "Professional & Finance": ["Banking & Finance", "Insurance Services", "Financial Services", "Legal, Government & Services", "Media & Advertising", "Professional Services"],
    "Construction & Industrial": ["Construction Services", "Hardware Equipment", "Industry & Manufacturing", "Interior Design Services", "Office Equipment & Services"],
    "Technical & Electronics": ["Electronic Peripherals", "Electrical Equipment & Services", "Repairing & Services", "Media & Communications"],
    "Events, Food & Leisure": ["Event Planner", "Weddings Services", "Food & Dining", "Arts, Entertainment & Leisure", "Hotels & Restaurants"],
    "Travel & Transport": ["Travel & Tourism", "Travel & Transportation", "Vehicles & Automotive", "Telecommunication Services"],
    "Retail & Others": ["Shopping & Retail", "Agriculture Products", "Sports & Recreation", "Home Appliances & Services", "Educational Institutes & Services"]
  };

  const getSubCategories = () => {
    if (subCategories.length > 0) return subCategories.map(s => ({ name: s.name, id: s.id }));
    
    // Fallback logic
    if (activeCategory && FALLBACK_DATA[activeCategory]) {
        return FALLBACK_DATA[activeCategory].map(name => ({ name, id: name }));
    }
    
    // Try fuzzy match for fallback
    const fallbackKey = Object.keys(FALLBACK_DATA).find(key => 
        key.toLowerCase().includes(activeCategory?.toLowerCase() || "") ||
        activeCategory?.toLowerCase().includes(key.toLowerCase())
    );
    
    if (fallbackKey) {
        return FALLBACK_DATA[fallbackKey].map(name => ({ name, id: name }));
    }

    return [];
  };

  const displaySubs = getSubCategories();

  const slugify = (name: string) =>
    name
      .toLowerCase()
      .trim()
      .replace(/ & /g, "-")
      .replace(/ /g, "-")
      .replace(/,/g, "")
      .replace(/[^\w-]+/g, "");

  if (!activeCategory) return null;

  return (
    <div
      ref={containerRef}
      className="fixed left-0 right-0 z-40 overflow-hidden bg-white border-b border-gray-200 shadow-2xl transition-all duration-300"
      style={{ height: 0, display: "none", top: `${topOffset}px` }}
    >
      <div ref={contentRef} className="container mx-auto py-8 px-4 relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600"
        >
          <X size={20} />
        </button>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {displaySubs.length > 0 ? (
            displaySubs.map((sub) => (
              <Link
                key={sub.id}
                href={`/category/${slugify(sub.name)}`}
                className="group flex flex-col p-3 rounded-xl transition-all hover:bg-gray-50 border border-transparent hover:border-gray-200 hover:shadow-sm"
                onClick={onClose}
              >
                <span className="text-sm font-semibold text-gray-800 group-hover:text-brand-dark transition-colors">
                  {sub.name}
                </span>
              </Link>
            ))
          ) : (
            <p className="col-span-full text-center text-gray-500 py-4">
              No sub-categories found for {activeCategory}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
