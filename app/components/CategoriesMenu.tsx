'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronDown, Search, X, Tags } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

export default function CategoriesMenu({ initialCategories = [] }: { initialCategories?: any[] }) {
  const [isMegaMenuOpen, setIsMegaMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const categories = initialCategories;

  const IconComponent = ({ name, size = 20 }: { name: string | null, size?: number }) => {
    if (!name) return <Tags size={size} />;
    const Icon = (LucideIcons as any)[name];
    return Icon ? <Icon size={size} /> : <Tags size={size} />;
  };

  const filteredCategories = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return categories.filter((cat: any) =>
      cat.name.toLowerCase().includes(query) ||
      cat.keywords?.some((kw: string) => kw.toLowerCase().includes(query))
    );
  }, [categories, searchQuery]);

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
        className={`flex items-center space-x-1 text-gray-600 hover:text-brand-gold transition-all font-normal focus:outline-none ${isMegaMenuOpen ? 'text-brand-dark scale-105' : ''}`}
      >
        <span>Categories</span>
        <ChevronDown size={14} strokeWidth={1.5} className={`transition-transform duration-200 ${isMegaMenuOpen ? 'rotate-180' : ''}`} />
      </button>

      {isMegaMenuOpen && (
        <>
          <div className="fixed inset-0 top-30 z-[30] bg-black/5 backdrop-blur-[2px]" onClick={() => setIsMegaMenuOpen(false)}></div>
          <div className="absolute top-[calc(100%+0.5rem)] left-1/2 -translate-x-1/2 w-[95vw] max-w-7xl bg-white shadow-2xl p-8 border border-gray-200 rounded-xl z-[40] animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="max-w-full mx-auto">
              {/* Search Header */}
              <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-300 pb-6">
                <div>
                  <h3 className="text-xl font-normal text-gray-900">Browse by Category</h3>
                  <p className="text-sm text-gray-400 mt-1 font-normal">Explore {categories.length} industry segments in Sri Lanka</p>
                </div>
                <div className="relative w-full md:w-80">
                  <Search size={18} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Find a category..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-300 rounded-[6px] focus:bg-white focus:ring-1 focus:ring-brand-dark outline-none transition-all text-sm font-normal"
                    autoFocus
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X size={16} strokeWidth={1.5} />
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
                      className="flex items-center group py-2 text-sm text-gray-600 hover:text-brand-gold-light transition-all"
                      onClick={() => setIsMegaMenuOpen(false)}
                    >
                      <span className="w-10 h-10 rounded-[8px] bg-gray-50 border border-gray-300 flex items-center justify-center text-brand-blue mr-3 group-hover:bg-brand-sand/30 transition-colors shadow-sm overflow-hidden flex-shrink-0">
                        {category.image_url ? (
                          <Image
                            src={category.image_url}
                            alt={category.name}
                            width={28}
                            height={28}
                            className="object-contain select-none pointer-events-none"
                            draggable={false}
                            onContextMenu={(e) => e.preventDefault()}
                          />
                        ) : (
                          <IconComponent name={category.icon} />
                        )}
                      </span>
                      <span className="font-normal border-b border-transparent group-hover:border-brand-sand transition-all line-clamp-1">{category.name}</span>
                    </Link>
                  ))
                ) : (
                  <div className="col-span-full py-12 text-center">
                    <p className="text-gray-400 font-normal">No categories matching "<span className="text-gray-900 font-normal">{searchQuery}</span>"</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
