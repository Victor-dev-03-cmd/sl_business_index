import Link from 'next/link';
import Image from 'next/image';
import { Star, MapPin, Building2, ShieldCheck, ChevronRight } from 'lucide-react';
import VerifiedBadge from './VerifiedBadge';
import { Business } from '@/lib/types';

interface BusinessCardProps {
  business: Business;
}

export default function BusinessCard({ business }: BusinessCardProps) {
  return (
    <Link 
      href={`/business/${business.slug || business.id}`}
      className="group relative bg-white border border-gray-100 rounded overflow-hidden  hover:shadow-2xl hover:-translate-y-1 flex flex-col"
    >
      {/* Glassmorphism Hover Overlay */}
      <div className="absolute inset-0 bg-white/40 border border-gray-300 rounded duration-300 pointer-events-none z-10" />
      
      <div className="aspect-[4/3] bg-gray-50 relative overflow-hidden">
        {business.image_url ? (
          <Image 
            src={business.image_url} 
            alt={business.name} 
            fill 
            className="object-cover transition-transform duration-700 " 
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-200">
            <Building2 size={48} strokeWidth={1} />
          </div>
        )}
        
        {business.is_verified && (
          <div className="absolute top-3 right-3 z-20">
            <div className="bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1.5 border border-blue-50/50">
              <ShieldCheck size={14} className="text-green-600" />
              <span className="text-[10px] font-bold text-green-600 uppercase tracking-tight">Verified</span>
            </div>
          </div>
        )}

        {/* Rating Badge on Image */}
        <div className="absolute bottom-3 left-3 z-20">
          <div className="bg-black/50 backdrop-blur-md px-2 py-1 rounded flex items-center gap-1 border border-white/10">
            <Star size={12} className="text-amber-400 fill-amber-400" />
            <span className="text-xs text-white">{business.rating || 0}</span>
          </div>
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col relative z-20">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-brand-blue transition-colors line-clamp-1 leading-tight">
            {business.name}
          </h3>
          {business.can_show_badge && <VerifiedBadge size={16} />}
        </div>
        
        <div className="flex items-center gap-1.5 mb-3">
          <span className="text-xs font-medium text-brand-blue uppercase tracking-wider">{business.category}</span>
          <span className="w-1 h-1 rounded-full bg-gray-300"></span>
         
        </div>

        <p className="text-sm text-gray-500 line-clamp-2 mb-4 flex-1 leading-relaxed">
          {business.description || 'Professional business service in Sri Lanka.'}
        </p>

        <div className="pt-4 border-t border-gray-50 flex items-center justify-between mt-auto">
          <div className="flex items-center gap-1.5 text-gray-500">
            <MapPin size={14} className="text-brand-blue/70" />
            <span className="text-xs font-medium truncate max-w-[120px]">{business.city || 'Sri Lanka'}</span>
          </div>
          <div className="text-brand-blue text-xs font-bold flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
            Details <ChevronRight size={14} />
          </div>
        </div>
      </div>
    </Link>
  );
}
