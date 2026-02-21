'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import {
  Bell, Menu, Hotel, Car, Utensils, Home, Briefcase, Heart, User, Factory, Wrench, Clapperboard, Plane,
  Palette, Stethoscope, Building, Landmark, Banknote, Bus, Hammer, Phone, Dog, Tv, ShoppingCart, Dumbbell,
  Rss, Tractor, Laptop, School, Baby, Building2, HeartPulse, Plug, Siren, Shield, HardHat, PiggyBank,
  ChevronDown
} from 'lucide-react';

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

const Navbar = () => {
  const [isMegaMenuOpen, setIsMegaMenuOpen] = useState(false);

  return (
      <header className="sticky top-0 z-50 bg-white shadow-md">
        <div className="container mx-auto flex items-center justify-between h-20 px-4">

          {/* Left: Logo Section - Modified Alignment */}
          <div className="relative flex-shrink-0 h-full" style={{ width: '180px' }}>
            {/* changed top-1/2 to top-[52%] to nudge it down by 0.5 */}
            <Link href="/" className="absolute top-[65%] -translate-y-1/2 left-0 transition-transform active:scale-95">
              <Image
                  src="/logo.svg"
                  alt="SL Business Index Logo"
                  width={180}
                  height={60}
                  className="drop-shadow-md object-contain"
                  priority
              />
            </Link>
          </div>

          {/* Center: Navigation Menus */}
          <nav className="hidden md:flex flex-grow justify-center items-center space-x-8">
            <Link href="/" className="text-gray-600 hover:text-green-700 transition-colors">
              Home
            </Link>

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

            <Link href="/about" className="text-gray-600 hover:text-green-700 transition-colors">
              About
            </Link>
            <Link href="/contact" className="text-gray-600 hover:text-green-700 transition-colors">
              Contact
            </Link>
          </nav>

          {/* Right: Action Buttons */}
          <div className="flex items-center space-x-3">
            <button className="p-2 rounded-full hover:bg-gray-100 transition-all relative">
              <Bell className="h-5 w-5 text-gray-600" />
              <span className="absolute top-2 right-2.5 h-2 w-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>

            <Link href="/signin" className="hidden sm:block px-4 py-2 text-sm text-gray-600 hover:text-green-700">
              Sign In
            </Link>

            <Link
                href="/signup"
                className="px-5 py-2.5 text-sm text-white bg-green-700 rounded-lg hover:bg-green-800 transition-shadow shadow-md hover:shadow-lg active:scale-95"
            >
              Register Business
            </Link>

            {/* Mobile Menu Icon */}
            <button className="md:hidden p-2">
              <Menu className="h-6 w-6 text-gray-700" />
            </button>
          </div>

        </div>
      </header>
  );
};

export default Navbar;