import { X, Filter, Star, ShieldCheck, MapPin, Search, ChevronRight, Navigation, ChevronsUpDown, Check, Tags } from 'lucide-react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Slider } from '@/components/ui/slider';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import * as LucideIcons from 'lucide-react';

interface FilterSidebarProps {
  onFilterChange: (filters: any) => void;
  isOpen: boolean;
  onClose: () => void;
  towns: string[];
  allCategories: any[];
  currentCategory: string;
}

export default function CategoryFilterSidebar({ 
  onFilterChange, 
  isOpen, 
  onClose,
  towns,
  allCategories,
  currentCategory
}: FilterSidebarProps) {
  const router = useRouter();
  const [rating, setRating] = useState<number | null>(null);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [selectedTown, setSelectedTown] = useState<string>('');
  const [townSearch, setTownSearch] = useState('');
  const [distance, setDistance] = useState(50);
  const [debouncedTownSearch, setDebouncedTownSearch] = useState('');
  const [categoryOpen, setCategoryOpen] = useState(false);

  // Debounce town search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTownSearch(townSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [townSearch]);

  useEffect(() => {
    onFilterChange({ rating, verifiedOnly, selectedTown, distance });
  }, [rating, verifiedOnly, selectedTown, distance, onFilterChange]);

  const resetFilters = () => {
    setRating(null);
    setVerifiedOnly(false);
    setSelectedTown('');
    setTownSearch('');
    setDistance(50);
  };

  const filteredTowns = towns.filter(town => 
    town.toLowerCase().includes(debouncedTownSearch.toLowerCase())
  ).slice(0, 5);

  const slugify = (name: string) => {
    return name
      .toLowerCase()
      .trim()
      .replace(/ & /g, '-')
      .replace(/ /g, '-')
      .replace(/,/g, '')
      .replace(/[^\w-]+/g, '');
  };

  const IconComponent = ({ name, size = 16 }: { name: string | null, size?: number }) => {
    if (!name) return <Tags size={size} />;
    const Icon = (LucideIcons as any)[name];
    return Icon ? <Icon size={size} /> : <Tags size={size} />;
  };

  const sidebarContent = (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gray-900 uppercase tracking-widest text-[10px]">Filters</h3>
        <button 
          onClick={resetFilters}
          className="text-[10px] text-brand-blue hover:underline uppercase tracking-widest"
        >
          Clear All
        </button>
      </div>

      {/* Category Dropdown (Selector style) */}
      <div className="relative">
        <label className="flex items-center gap-2 text-xs text-brand-dark uppercase tracking-wider mb-4">
          <Filter size={14} className="text-brand-blue" />
          Category
        </label>
        
        <button
          type="button"
          onClick={() => setCategoryOpen(!categoryOpen)}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 hover:bg-white hover:border-brand-blue/30 transition-all text-left shadow-sm group"
        >
          <span className="block truncate text-sm text-gray-700">
            {currentCategory || "Select a category..."}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50 group-hover:opacity-100 transition-opacity" />
        </button>

        {categoryOpen && (
          <div className="absolute z-50 w-full mt-2 bg-white rounded border border-gray-300 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <Command shouldFilter={true}>
              <CommandInput placeholder="Search categories..." className="h-11 border-none" />
              <CommandList className="max-h-[300px] custom-scrollbar">
                <CommandEmpty>No category found.</CommandEmpty>
                <CommandGroup>
                  {allCategories.map((cat) => (
                    <CommandItem
                      key={cat.id || cat.name}
                      value={cat.name}
                      onSelect={(currentValue) => {
                        router.push(`/category/${slugify(currentValue)}`);
                        setCategoryOpen(false);
                      }}
                      className="flex items-center px-4 py-3 hover:bg-brand-blue cursor-pointer transition-colors"
                    >
                      <div className="flex items-center flex-1">
                        <span className="text-brand-blue mr-3 opacity-70">
                          <IconComponent name={cat.icon} />
                        </span>
                        <span className={cn(
                          "text-sm font-medium",
                          currentCategory === cat.name ? "text-brand-blue" : "text-gray-700"
                        )}>
                          {cat.name}
                        </span>
                      </div>
                      <Check
                        className={cn(
                          "ml-auto h-4 w-4 text-brand-blue",
                          currentCategory === cat.name ? "opacity-100" : "opacity-0"
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </div>
        )}
        {categoryOpen && (
          <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setCategoryOpen(false)} />
        )}
      </div>

      {/* Town Search & Selection */}
      <div>
        <label className="flex items-center gap-2 text-xs text-brand-dark uppercase tracking-wider mb-4">
          <MapPin size={14} className="text-brand-blue" />
          Town / City
        </label>
        <div className="relative mb-3">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text"
            placeholder="Search town..."
            value={townSearch}
            onChange={(e) => setTownSearch(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/10 transition-all"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {townSearch && filteredTowns.map(town => (
            <button
              key={town}
              onClick={() => {
                setSelectedTown(town);
                setTownSearch('');
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                selectedTown === town 
                  ? 'bg-brand-blue border-brand-blue text-white shadow-sm' 
                  : 'bg-white border-gray-300 text-gray-600 hover:border-gray-200'
              }`}
            >
              {town}
            </button>
          ))}
          {!townSearch && selectedTown && (
             <button
              onClick={() => setSelectedTown('')}
              className="px-3 py-1.5 rounded-full text-xs font-medium bg-brand-blue border-brand-blue text-white shadow-sm flex items-center gap-1.5"
            >
              {selectedTown} <X size={10} />
            </button>
          )}
        </div>
      </div>

      {/* Distance Slider */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <label className="flex items-center gap-2 text-xs text-brand-dark uppercase tracking-wider">
            <Navigation size={14} className="text-brand-blue" />
            Distance (Radius)
          </label>
          <span className="text-xs text-brand-blue bg-brand-blue/5 px-2.5 py-0.5 rounded-full">
            {distance === 50 ? '50+ km' : `${distance} km`}
          </span>
        </div>
        <Slider 
          value={[distance]} 
          min={1} 
          max={50} 
          step={1} 
          onValueChange={(val) => setDistance(val[0])}
          className="mt-6"
        />
        <div className="flex justify-between mt-3 text-[10px] text-gray-600 uppercase tracking-widest">
          <span>1km</span>
          <span>50km+</span>
        </div>
      </div>

      {/* Rating Slider (Visual Bar) */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <label className="flex items-center gap-2 text-xs text-brand-dark uppercase tracking-wider">
            <Star size={14} className="text-brand-blue" />
            Min. Rating
          </label>
          <span className="text-xs text-amber-500 bg-amber-50 px-2.5 py-0.5 rounded-full flex items-center gap-1">
            {rating || 0} <Star size={10} className="fill-amber-500" />
          </span>
        </div>
        <Slider 
          value={[rating || 0]} 
          min={0} 
          max={5} 
          step={0.5} 
          onValueChange={(val) => setRating(val[0] || null)}
          className="mt-6"
        />
        <div className="flex justify-between mt-3 text-[10px] text-gray-600 uppercase tracking-widest">
          <span>Any</span>
          <span>5 Stars</span>
        </div>
      </div>

      {/* Verification Filter */}
      <div>
        <button
          onClick={() => setVerifiedOnly(!verifiedOnly)}
          className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border transition-all text-sm ${
            verifiedOnly 
              ? 'bg-brand-blue border-brand-blue text-white font-bold shadow-lg shadow-brand-blue/20' 
              : 'bg-white border-gray-100 text-gray-600 hover:border-gray-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className={verifiedOnly ? "text-white" : "text-brand-blue"} />
            <span>Verified Only</span>
          </div>
          {verifiedOnly && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Drawer Overlay */}
      <div 
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] transition-opacity duration-300 lg:hidden ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      
      {/* Mobile Drawer (Bottom Sheet Style) */}
      <div 
        className={`fixed inset-x-0 bottom-0 bg-white z-[101] p-8 shadow-2xl transition-transform duration-500 ease-out lg:hidden rounded-t-[32px] max-h-[90dvh] overflow-y-auto ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="w-12 h-1.5 bg-gray-100 rounded-full mx-auto mb-8" />
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Filters</h2>
          <button 
            onClick={onClose}
            className="p-2 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        {sidebarContent}
        <button
          onClick={onClose}
          className="w-full mt-10 bg-brand-dark text-white py-4 rounded-2xl font-bold text-sm hover:opacity-90 transition-opacity shadow-xl shadow-brand-dark/20"
        >
          View Results
        </button>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-[300px] shrink-0">
        <div className="sticky top-24 bg-white border border-gray-100 rounded-[32px] p-8">
          {sidebarContent}
        </div>
      </aside>
    </>
  );
}
