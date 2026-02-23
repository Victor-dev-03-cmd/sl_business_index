'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ChevronDown, Search, X } from 'lucide-react';
import { categories } from '@/lib/categories';

export default function CategoriesMenu() {
  const [isMegaMenuOpen, setIsMegaMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCategories = useMemo(() => {
    return categories.filter(cat => 
      cat.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  const slugify = (name: string) => {
    return name.toLowerCase()
      .replace(/ & /g, '-')
      .replace(/ /g, '-')
      .replace(/,/g, '');
  };

  return (
    <div className="relative h-full flex items-center">
      <button
        onClick={() => setIsMegaMenuOpen(!isMegaMenuOpen)}
        className={`flex items-center space-x-1 text-gray-600 hover:text-green-700 transition-all font-medium focus:outline-none ${isMegaMenuOpen ? 'text-green-700 scale-105' : ''}`}
      >
        <span>Categories</span>
        <ChevronDown size={14} className={`transition-transform duration-300 ${isMegaMenuOpen ? 'rotate-180' : ''}`} />
      </button>

      {isMegaMenuOpen && (
        <>
          <div className="fixed inset-0 top-20 z-[40] bg-black/5 backdrop-blur-[2px]" onClick={() => setIsMegaMenuOpen(false)}></div>
          <div className="fixed top-20 left-1/2 -translate-x-1/2 w-[95%] max-w-6xl bg-white shadow-2xl rounded-b-2xl p-8 border-t border-gray-100 z-[50] animate-in fade-in slide-in-from-top-4 duration-300">
            
            {/* Search Header */}
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-50 pb-6">
              <div>
                <h3 className="text-xl font-normal text-gray-900">Browse by Category</h3>
                <p className="text-sm text-gray-400 mt-1">Explore {categories.length} industry segments in Sri Lanka</p>
              </div>
              <div className="relative w-full md:w-80">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Find a category..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:ring-1 focus:ring-green-600 outline-none transition-all text-sm"
                  autoFocus
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-10 gap-y-2 max-h-[60vh] overflow-y-auto pr-4 custom-scrollbar">
              {filteredCategories.length > 0 ? (
                filteredCategories.map((category) => (
                  <Link
                    key={category.name}
                    href={`/categories/${slugify(category.name)}`}
                    className="flex items-center group py-2 text-sm text-gray-600 hover:text-green-700 transition-all"
                    onClick={() => setIsMegaMenuOpen(false)}
                  >
                    <span className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-green-600 mr-3 group-hover:bg-green-50 transition-colors shadow-sm">
                      {category.icon}
                    </span>
                    <span className="font-normal border-b border-transparent group-hover:border-green-100 transition-all">{category.name}</span>
                  </Link>
                ))
              ) : (
                <div className="col-span-full py-12 text-center">
                  <p className="text-gray-400">No categories matching "<span className="text-gray-900 font-medium">{searchQuery}</span>"</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
