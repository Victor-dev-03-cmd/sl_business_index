'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Hotel, Car, Utensils, Home, Briefcase, Heart, User, Factory, Wrench, Clapperboard, Plane, Palette, Stethoscope, Building, Landmark, Banknote, Bus, Hammer, Phone, Dog, Tv, ShoppingCart, Dumbbell, Rss, Tractor, Laptop, School, Baby, Building2, HeartPulse, Plug, Siren, Shield, HardHat, PiggyBank } from 'lucide-react';

const categories = [
  { name: 'Hotels & Restaurants', icon: <Hotel size={16} /> },
  { name: 'Vehicles & Automative', icon: <Car size={16} /> },
  { name: 'Food & Dinning', icon: <Utensils size={16} /> },
  { name: 'Home Appliances & Services', icon: <Home size={16} /> },
  { name: 'Office Equipment & Services', icon: <Briefcase size={16} /> },
  { name: 'Weddings Services', icon: <Heart size={16} /> },
  { name: 'Professional Services', icon: <User size={16} /> },
  { name: 'Industry & Manufacturing', icon: <Factory size={16} /> },
  { name: 'Repairing & Services', icon: <Wrench size={16} /> },
  { name: 'Arts, Entertainment & Leisure', icon: <Clapperboard size={16} /> },
  { name: 'Travel & Tourism', icon: <Plane size={16} /> },
  { name: 'Interior Design Services', icon: <Palette size={16} /> },
  { name: 'Health & Medical', icon: <Stethoscope size={16} /> },
  { name: 'Government & Services', icon: <Building size={16} /> },
  { name: 'Financial Services', icon: <Banknote size={16} /> },
  { name: 'Travel & Transportation', icon: <Bus size={16} /> },
  { name: 'Hardware Equipment', icon: <Hammer size={16} /> },
  { name: 'Telecommunication Services', icon: <Phone size={16} /> },
  { name: 'Pet Care', icon: <Dog size={16} /> },
  { name: 'Media & Advertising', icon: <Tv size={16} /> },
  { name: 'Shopping & Retail', icon: <ShoppingCart size={16} /> },
  { name: 'Sports & Recreation', icon: <Dumbbell size={16} /> },
  { name: 'Media & Communications', icon: <Rss size={16} /> },
  { name: 'Agriculture Products', icon: <Tractor size={16} /> },
  { name: 'Electronic Pheripherals', icon: <Laptop size={16} /> },
  { name: 'Educational institutes & Services', icon: <School size={16} /> },
  { name: 'Baby Care', icon: <Baby size={16} /> },
  { name: 'Embassies & High commision', icon: <Building2 size={16} /> },
  { name: 'Construction Services', icon: <HardHat size={16} /> },
  { name: 'Banking & Finance', icon: <PiggyBank size={16} /> },
  { name: 'Religious Organization', icon: <Landmark size={16} /> },
  { name: 'Beauty & Health', icon: <HeartPulse size={16} /> },
  { name: 'Electrical Equipment and Services', icon: <Plug size={16} /> },
  { name: 'Emergency Services', icon: <Siren size={16} /> },
  { name: 'Insurance Services', icon: <Shield size={16} /> },
];

export default function CategoriesMenu() {
  const [isMegaMenuOpen, setIsMegaMenuOpen] = useState(false);

  return (
    <div className="relative h-full flex items-center">
      <button
        onClick={() => setIsMegaMenuOpen(!isMegaMenuOpen)}
        className={`flex items-center space-x-1 text-gray-600 hover:text-green-700 transition-colors focus:outline-none ${isMegaMenuOpen ? 'text-green-700' : ''}`}
      >
        <span>Categories</span>
        <ChevronDown size={14} className={`transition-transform duration-200 ${isMegaMenuOpen ? 'rotate-180' : ''}`} />
      </button>

      {isMegaMenuOpen && (
        <>
          <div className="fixed inset-0 top-20 z-[-1]" onClick={() => setIsMegaMenuOpen(false)}></div>
          <div className="fixed top-20 left-1/2 -translate-x-1/2 w-[90%] max-w-6xl bg-white shadow-2xl rounded-b-md p-8 border-t border-gray-100 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-4 gap-x-8 gap-y-4">
              {categories.map((category) => (
                <Link
                  key={category.name}
                  href={`/categories/${category.name.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-')}`}
                  className="flex items-center space-x-3 text-sm text-gray-600 hover:text-green-700 transition-all hover:translate-x-1"
                  onClick={() => setIsMegaMenuOpen(false)}
                >
                  <span className="text-green-600">{category.icon}</span>
                  <span>{category.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
