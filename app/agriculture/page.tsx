'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search, Tags, Zap, Filter, MapPin } from 'lucide-react';

const AGRI_SUBGROUPS = [
  {
    group: 'Cereals & Grains',
    items: ['Wheat', 'Rice', 'Corn (Maize)', 'Barley', 'Oats', 'Sorghum']
  },
  {
    group: 'Legumes & Pulses',
    items: ['Beans', 'Peas', 'Lentils', 'Chickpeas']
  },
  {
    group: 'Oilseeds & Oil-Bearing Crops',
    items: ['Soybeans', 'Canola', 'Sunflower seeds', 'Peanuts', 'Oil palm']
  },
  {
    group: 'Fruits (Temperate)',
    items: ['Apples', 'Pears', 'Grapes', 'Berries']
  },
  {
    group: 'Fruits (Tropical/Subtropical)',
    items: ['Bananas', 'Mangoes', 'Citrus', 'Pineapple']
  },
  {
    group: 'Vegetables (Leafy/Stem)',
    items: ['Lettuce', 'Spinach', 'Cabbage']
  },
  {
    group: 'Vegetables (Root, Bulb & Tuber)',
    items: ['Potatoes', 'Carrots', 'Onions', 'Cassava']
  },
  {
    group: 'Vegetables (Fruit-bearing)',
    items: ['Tomatoes', 'Peppers', 'Cucumbers']
  },
  {
    group: 'Sugar & Fiber Crops',
    items: ['Sugarcane', 'Sugar beet', 'Cotton', 'Jute', 'Flax', 'Hemp']
  },
  {
    group: 'Beverage & Stimulant Crops',
    items: ['Coffee', 'Tea', 'Cocoa', 'Tobacco']
  },
  {
    group: 'Spices & Aromatic Herbs',
    items: ['Black pepper', 'Vanilla', 'Cinnamon', 'Ginger', 'Cardamom']
  },
  {
    group: 'Forage & Ornamental Crops',
    items: ['Alfalfa', 'Clover', 'Grasses', 'Flowers', 'Nursery plants', 'Foliage']
  },
  {
    group: 'Meat & Poultry',
    items: ['Beef', 'Pork', 'Lamb', 'Chicken', 'Turkey', 'Goat']
  },
  {
    group: 'Dairy & Eggs',
    items: ['Milk', 'Cheese', 'Yogurt', 'Butter', 'Eggs']
  },
  {
    group: 'Animal Fibers & By-products',
    items: ['Wool', 'Mohair', 'Silk', 'Hides', 'Leather', 'Tallow', 'Manure']
  },
  {
    group: 'Forestry',
    items: ['Timber', 'Rubber', 'Resin', 'Firewood', 'Charcoal']
  },
  {
    group: 'Aquaculture',
    items: ['Fish (Tilapia, Catfish)', 'Shellfish (Shrimp, Oysters)']
  }
];

export default function AgriculturePage() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSubgroups = useMemo(() => {
    if (!searchQuery) return AGRI_SUBGROUPS;
    const lowerQuery = searchQuery.toLowerCase();
    return AGRI_SUBGROUPS.map(group => ({
      ...group,
      items: group.items.filter(item => item.toLowerCase().includes(lowerQuery))
    })).filter(group => group.items.length > 0);
  }, [searchQuery]);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar Navigation */}
      <div className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <Link href="/nearby" className="flex items-center gap-2 text-brand-dark hover:text-brand-blue transition-colors font-medium">
            <ArrowLeft size={18} />
            <span>Back to Nearby</span>
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Quick Links</h3>
            <div className="space-y-2">
              <button className="w-full flex items-center gap-3 p-2 rounded-lg bg-blue-50 text-brand-dark font-medium text-sm">
                <Tags size={16} />
                <span>All Categories</span>
              </button>
              <button className="w-full flex items-center gap-3 p-2 rounded-lg text-gray-600 hover:bg-gray-50 transition-all text-sm">
                <Zap size={16} />
                <span>Trending Now</span>
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Jump to Section</h3>
            <div className="space-y-1">
              {AGRI_SUBGROUPS.slice(0, 10).map(group => (
                <button key={group.group} className="w-full text-left p-2 rounded-lg text-gray-600 hover:bg-gray-50 transition-all text-sm truncate">
                  {group.group}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 p-4 md:p-6 sticky top-0 z-10">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Agriculture Products</h1>
              <p className="text-sm text-gray-500 mt-1">Browse agricultural specialties, forestry, and aquaculture categories</p>
            </div>
            
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search sub-categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-100 border border-transparent rounded-full focus:bg-white focus:border-brand-dark outline-none transition-all text-sm"
              />
            </div>
          </div>
        </header>

        {/* Categories Grid */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar bg-white">
          <div className="max-w-6xl mx-auto">
            {filteredSubgroups.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredSubgroups.map((group, idx) => (
                  <div key={idx} className="bg-gray-50/50 rounded-2xl p-6 border border-gray-100 hover:border-brand-blue/20 transition-all group/card shadow-sm hover:shadow-md">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2.5 bg-white rounded-xl shadow-sm group-hover/card:bg-brand-blue/5 transition-colors">
                        <Filter size={18} className="text-brand-dark" />
                      </div>
                      <h2 className="text-base font-semibold text-gray-800 tracking-tight">{group.group}</h2>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {group.items.map(item => (
                        <Link
                          key={item}
                          href={`/nearby?q=${encodeURIComponent(item)}`}
                          className="px-3 py-1.5 bg-white hover:bg-brand-blue text-gray-600 hover:text-white rounded-lg text-xs transition-all border border-gray-200 hover:border-brand-blue shadow-sm font-medium"
                        >
                          {item}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Search size={24} className="text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">No categories found</h3>
                <p className="text-gray-500 max-w-xs mt-2">Try adjusting your search query to find what you're looking for.</p>
                <button 
                  onClick={() => setSearchQuery('')}
                  className="mt-6 text-brand-dark font-semibold hover:underline"
                >
                  Clear search
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Sidebar - Dynamic Info (Hover simulation or fixed) */}
      <div className="w-80 bg-white border-l border-gray-200 hidden xl:flex flex-col p-6 overflow-y-auto custom-scrollbar">
        <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
          <MapPin size={20} className="text-brand-dark" />
          Market Statistics
        </h2>
        
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-green-50 border border-green-100">
            <p className="text-xs text-green-600 font-bold uppercase tracking-wider mb-1">Top Region</p>
            <p className="text-lg font-bold text-gray-900">Nuwara Eliya</p>
            <p className="text-xs text-gray-500 mt-1">Leading in Vegetable production</p>
          </div>
          
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-100">
            <p className="text-xs text-amber-600 font-bold uppercase tracking-wider mb-1">Seasonal Focus</p>
            <p className="text-lg font-bold text-gray-900">Spices & Herbs</p>
            <p className="text-xs text-gray-500 mt-1">High export demand this month</p>
          </div>

          <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
            <p className="text-xs text-blue-600 font-bold uppercase tracking-wider mb-1">Fisheries</p>
            <p className="text-lg font-bold text-gray-900">Negombo & Jaffna</p>
            <p className="text-xs text-gray-500 mt-1">Expanding aquaculture zones</p>
          </div>
        </div>

        <div className="mt-8">
          <h3 className="text-sm font-bold text-gray-900 mb-4">Featured Businesses</h3>
          <div className="space-y-3">
             {[1, 2, 3].map(i => (
               <div key={i} className="flex gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-gray-100">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Agri Enterprise {i}</p>
                    <p className="text-xs text-gray-500">Colombo, Sri Lanka</p>
                  </div>
               </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
}
