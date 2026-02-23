'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { categories } from '@/lib/categories';

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
