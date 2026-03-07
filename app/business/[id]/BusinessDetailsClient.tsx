'use client';

import React from 'react';
import { Business } from '@/lib/types';
import { 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  Clock, 
  Star, 
  Building2, 
  ShieldCheck,
  Share2,
  ExternalLink
} from 'lucide-react';
import Image from 'next/image';
import dynamic from 'next/dynamic';

const MapboxMap = dynamic(() => import('@/components/MapboxMap'), { 
  ssr: false,
  loading: () => <div className="h-[400px] w-full bg-gray-100 animate-pulse rounded-xl flex items-center justify-center text-gray-400">Loading Map...</div>
});

interface Props {
  business: Business;
}

export default function BusinessDetailsClient({ business }: Props) {
  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      {/* Hero Header */}
      <div className="relative h-[40vh] md:h-[50vh] w-full overflow-hidden">
        {business.image_url ? (
          <Image 
            src={business.image_url} 
            alt={business.name}
            fill
            className="object-cover"
            priority
          />
        ) : (
          <div className="w-full h-full bg-brand-dark flex items-center justify-center">
            <Building2 size={120} className="text-white/10" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        
        <div className="absolute bottom-0 left-0 w-full p-6 md:p-12">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <span className="px-3 py-1 bg-brand-gold text-white text-[10px] font-bold uppercase tracking-widest rounded-full">
                  {business.category}
                </span>
                {business.is_registered && (
                  <span className="flex items-center gap-1.5 px-3 py-1 bg-blue-500/20 backdrop-blur-md text-blue-200 text-[10px] font-bold uppercase tracking-widest rounded-full border border-blue-400/30">
                    <ShieldCheck size={12} /> Verified
                  </span>
                )}
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-normal text-white tracking-tight mb-4">
                {business.name}
              </h1>
              <div className="flex flex-wrap items-center gap-6 text-white/80">
                <div className="flex items-center gap-2">
                  <MapPin size={18} className="text-brand-gold" />
                  <span className="text-sm md:text-base font-normal">{business.address}</span>
                </div>
                {business.rating && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-amber-500 px-2 py-0.5 rounded text-white font-bold text-sm">
                      <Star size={14} className="fill-white" />
                      {business.rating}
                    </div>
                    <span className="text-sm font-normal text-white/60">({business.reviews_count} Reviews)</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex gap-3">
              <button className="p-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-white hover:bg-white/20 transition-all">
                <Share2 size={20} />
              </button>
              <a 
                href={`tel:${business.phone}`}
                className="flex items-center gap-2 px-8 py-3 bg-white text-brand-dark font-bold rounded-xl hover:bg-brand-sand transition-all shadow-xl"
              >
                <Phone size={20} /> Call Now
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="max-w-7xl mx-auto px-6 md:px-12 mt-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-12">
            <section>
              <h2 className="text-2xl font-normal text-gray-900 mb-6">About the Business</h2>
              <p className="text-gray-600 leading-relaxed text-lg font-normal">
                {business.description || "No description available for this business."}
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-normal text-gray-900 mb-6 flex items-center gap-3">
                <MapPin className="text-brand-dark" /> Location & Directions
              </h2>
              <div className="rounded-xl overflow-hidden shadow-2xl border border-gray-300">
                <MapboxMap 
                  userLat={business.latitude} 
                  userLng={business.longitude}
                  businesses={[business]}
                  zoom={15}
                  height="450px"
                />
              </div>
            </section>
          </div>

          {/* Sidebar Info */}
          <div className="space-y-8">
            <div className="bg-white rounded-xl border border-gray-300 p-8 shadow-sm space-y-8">
              <h3 className="text-xl font-normal text-gray-900 border-b border-gray-100 pb-4">Business Contact</h3>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-gray-50 rounded-xl text-brand-dark border border-gray-100">
                    <Phone size={20} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-1">Phone</p>
                    <p className="text-gray-900 font-medium">{business.phone || "Not provided"}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="p-3 bg-gray-50 rounded-xl text-brand-dark border border-gray-100">
                    <Mail size={20} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-1">Email</p>
                    <p className="text-gray-900 font-medium">{business.email || "Not provided"}</p>
                  </div>
                </div>

                {business.website_url && (
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-gray-50 rounded-xl text-brand-dark border border-gray-100">
                      <Globe size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-1">Website</p>
                      <a 
                        href={business.website_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-brand-blue hover:underline font-medium flex items-center gap-1 truncate"
                      >
                        {business.website_name || "Visit Website"} <ExternalLink size={14} />
                      </a>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-4">
                  <div className="p-3 bg-gray-50 rounded-xl text-brand-dark border border-gray-100">
                    <Clock size={20} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-1">Working Hours</p>
                    <p className="text-gray-900 font-medium">{business.working_hours || "Contact for hours"}</p>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-100">
                <button className="w-full py-4 bg-brand-dark text-white rounded-xl font-bold hover:bg-brand-blue transition-all shadow-lg shadow-brand-dark/10">
                  Write a Review
                </button>
              </div>
            </div>

            <div className="bg-brand-dark rounded-xl p-8 text-white shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
              <h3 className="text-xl font-normal mb-4 relative z-10">Owner Info</h3>
              <div className="flex items-center gap-4 relative z-10">
                <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center font-bold text-brand-sand">
                  {business.owner_name?.[0] || "O"}
                </div>
                <div>
                  <p className="text-white font-medium">{business.owner_name || "Business Owner"}</p>
                  <p className="text-white/50 text-xs tracking-wider uppercase">Verified Member</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
