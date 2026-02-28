'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Script from 'next/script';
import { 
  Phone, 
  Mail, 
  MessageSquare, 
  AlertCircle, 
  Shield, 
  Zap, 
  Droplets, 
  Stethoscope, 
  GraduationCap, 
  Info, 
  Globe, 
  MapPin, 
  Search,
  ChevronRight,
  Clock,
  Navigation
} from 'lucide-react';
import { cn } from "@/lib/utils";

const publicServices = [
  {
    category: "Emergency Services",
    icon: <AlertCircle size={20} strokeWidth={1.5} />,
    services: [
      { name: "Suwa Seriya Ambulance", number: "1990", description: "24/7 Free Emergency Ambulance Service", lat: 6.9271, lng: 79.8612 },
      { name: "Police Emergency", number: "119", description: "National Police Hotline", lat: 6.9271, lng: 79.8612 },
      { name: "Fire & Rescue (Colombo)", number: "110", description: "General Fire Service", lat: 6.9319, lng: 79.8478 },
      { name: "Accident Service (General Hospital)", number: "0112691111", description: "National Hospital Accident Service", lat: 6.9189, lng: 79.8694 }
    ]
  },
  {
    category: "Electricity & Water (Utilities)",
    icon: <Zap size={20} strokeWidth={1.5} />,
    services: [
      { name: "CEB (Electricity) Breakdown", number: "1987", description: "National Electricity Complaint Center", lat: 6.9271, lng: 79.8612 },
      { name: "Vavuniya EB Office", number: "0242222244", description: "Local Electricity Board - Vavuniya", lat: 8.7514, lng: 80.4971 },
      { name: "Jaffna EB Office", number: "0212222271", description: "Local Electricity Board - Jaffna", lat: 9.6615, lng: 80.0070 },
      { name: "Water Board (NWSDB)", number: "1939", description: "National Water & Drainage Board Complaints", lat: 6.8912, lng: 79.9242 }
    ]
  },
  {
    category: "Education (Regional Offices)",
    icon: <GraduationCap size={20} strokeWidth={1.5} />,
    services: [
      { name: "Northern Province Education Dept", number: "0212222434", description: "Main Office - Jaffna", lat: 9.6615, lng: 80.0070 },
      { name: "Zonal Education Office - Vavuniya", number: "0242222340", description: "Vavuniya Education Management", lat: 8.7514, lng: 80.4971 },
      { name: "Zonal Education Office - Jaffna", number: "0212222384", description: "Jaffna City Education Inquiries", lat: 9.6615, lng: 80.0070 },
      { name: "University of Jaffna (General)", number: "0212222294", description: "Main Switchboard", lat: 9.6848, lng: 80.0214 }
    ]
  },
  {
    category: "Health (Regional Hospitals)",
    icon: <Stethoscope size={20} strokeWidth={1.5} />,
    services: [
      { name: "Jaffna Teaching Hospital", number: "0212222261", description: "Main General Hospital Jaffna", lat: 9.6658, lng: 80.0209 },
      { name: "Vavuniya General Hospital", number: "0242222261", description: "Main General Hospital Vavuniya", lat: 8.7542, lng: 80.4982 },
      { name: "Kilinochchi District Hospital", number: "0212285327", description: "General Health Inquiries", lat: 9.3872, lng: 80.3948 },
      { name: "Mullaitivu District Hospital", number: "0212290261", description: "General Health Inquiries", lat: 9.2671, lng: 80.8144 }
    ]
  },
  {
    category: "General Public Inquiries",
    icon: <Info size={20} strokeWidth={1.5} />,
    services: [
      { name: "Government Information Center", number: "1919", description: "General info on Govt. services", lat: 6.9271, lng: 79.8612 },
      { name: "Sri Lanka Railways", number: "1971", description: "Train schedules and seat booking", lat: 6.9344, lng: 79.8501 },
      { name: "Department of Immigration", number: "0112101500", description: "Passport and Visa inquiries", lat: 6.8912, lng: 79.8543 }
    ]
  }
];

export default function ContactPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [department, setDepartment] = useState('General Inquiry');
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isAttachingLocation, setIsAttachingLocation] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    location: ''
  });

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      });
    }
  }, []);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const sortedServices = userCoords ? publicServices.map(cat => ({
    ...cat,
    services: [...cat.services].sort((a, b) => {
      const distA = calculateDistance(userCoords.lat, userCoords.lng, a.lat, a.lng);
      const distB = calculateDistance(userCoords.lat, userCoords.lng, b.lat, b.lng);
      return distA - distB;
    })
  })) : publicServices;

  const filteredServices = sortedServices.map(cat => ({
    ...cat,
    services: cat.services.filter(s => 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cat.category.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(cat => cat.services.length > 0);

  const attachLocation = () => {
    if (navigator.geolocation) {
      setIsAttachingLocation(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setFormData({
            ...formData,
            location: `${pos.coords.latitude}, ${pos.coords.longitude}`
          });
          setIsAttachingLocation(false);
        },
        () => setIsAttachingLocation(false)
      );
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted:', { department, ...formData });
    alert('Thank you! Your message has been sent.');
    setFormData({ name: '', email: '', subject: '', message: '', location: '' });
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "GovernmentOrganization",
    "name": "SL Business Index - Public Services",
    "url": "https://slbusinessindex.lk/contact",
    "description": "Verified public service and emergency contacts for Sri Lanka including CEB, NWSDB, and Health services.",
    "contactPoint": publicServices.flatMap(cat => cat.services).map(s => ({
      "@type": "ContactPoint",
      "telephone": s.number,
      "contactType": s.name
    }))
  };

  return (
    <div className="min-h-screen bg-white font-normal text-gray-900">
      <Script
        id="contact-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Hero Section */}
      <section className="bg-gray-50 border-b border-gray-100 py-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <motion.span 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-block px-4 py-1.5 mb-6 text-[10px] tracking-[0.2em] uppercase text-emerald-600 border border-emerald-600/20 rounded-md"
          >
            Contact & Support
          </motion.span>
          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-normal mb-6 tracking-tight"
          >
            How can we help you?
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-gray-500 max-w-2xl mx-auto leading-relaxed"
          >
            Whether you're looking for public service contacts or need support with your business listing, we're here to help. Explore our directory or send us a message below.
          </motion.p>
        </div>
      </section>

      {/* Main Grid Content */}
      <section className="py-24 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
          
          {/* Left Column: Public Service Directory */}
          <div className="lg:col-span-2 space-y-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
              <div>
                <h2 className="text-2xl font-normal tracking-tight">Public Service Directory</h2>
                <p className="text-sm text-gray-400 mt-1 font-normal">Verified emergency and utility contacts in Sri Lanka</p>
              </div>
              <div className="relative w-full md:w-80">
                <Search size={18} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search service, area, or dept..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:ring-1 focus:ring-emerald-600 outline-none transition-all text-sm font-normal"
                />
              </div>
            </div>

            <div className="space-y-10">
              {filteredServices.length > 0 ? (
                filteredServices.map((cat, idx) => (
                  <div key={idx} className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${idx * 100}ms` }}>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                        {cat.icon}
                      </div>
                      <h2 className="text-lg font-normal text-gray-800">{cat.category} Details</h2>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {cat.services.map((service, sIdx) => (
                        <div 
                          key={sIdx}
                          className="p-5 border border-gray-100 rounded-xl hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-900/5 transition-all group bg-white"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="text-[15px] font-normal text-gray-900 group-hover:text-emerald-700 transition-colors">
                              {service.name}
                            </h3>
                          </div>
                          <p className="text-xs text-gray-400 font-normal mb-4 line-clamp-1">{service.description}</p>
                          <div className="flex items-center justify-between">
                            <a 
                              href={`tel:${service.number}`}
                              className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-normal transition-colors"
                            >
                              <Phone size={14} strokeWidth={1.5} />
                              <span className="text-[13px] tracking-wide">{service.number}</span>
                            </a>
                            {userCoords && (
                              <span className="text-[10px] text-gray-300 flex items-center gap-1 font-normal">
                                <Navigation size={10} />
                                {calculateDistance(userCoords.lat, userCoords.lng, service.lat, service.lng).toFixed(1)} km
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-20 text-center border-2 border-dashed border-gray-100 rounded-3xl">
                  <div className="inline-flex p-4 bg-gray-50 rounded-full mb-4">
                    <Search size={32} strokeWidth={1.5} className="text-gray-200" />
                  </div>
                  <h3 className="text-lg font-normal text-gray-900">No services found</h3>
                  <p className="text-gray-400 font-normal mt-1">Try searching for "EB", "Police", or "Hospital"</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Contact Form */}
          <div className="lg:col-span-1">
            <div className="sticky top-28 bg-white border border-gray-100 rounded-2xl shadow-xl shadow-gray-200/50 overflow-hidden">
              <div className="p-8 bg-emerald-950 text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
                <h3 className="text-xl font-normal relative z-10 mb-2">Send us a message</h3>
                <p className="text-emerald-100/60 text-xs font-normal relative z-10">Our team usually responds within 24 hours.</p>
              </div>
              
              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-xs text-gray-400 font-normal uppercase tracking-wider">Department</label>
                  <select 
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:ring-1 focus:ring-emerald-600 outline-none transition-all text-sm font-normal appearance-none cursor-pointer"
                  >
                    <option>General Inquiry</option>
                    <option>Add My Business</option>
                    <option>Report Location Error</option>
                    <option>Advertising / Pricing</option>
                    <option>Technical Support</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-gray-400 font-normal uppercase tracking-wider">Full Name</label>
                  <input 
                    type="text" 
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Laxsan Victor" 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:ring-1 focus:ring-emerald-600 outline-none transition-all text-sm font-normal"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-gray-400 font-normal uppercase tracking-wider">Email Address</label>
                  <input 
                    type="email" 
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="laxsan@example.com" 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:ring-1 focus:ring-emerald-600 outline-none transition-all text-sm font-normal"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-gray-400 font-normal uppercase tracking-wider">Location (Optional)</label>
                    <button 
                      type="button"
                      onClick={attachLocation}
                      disabled={isAttachingLocation}
                      className="text-[10px] text-emerald-600 hover:text-emerald-700 flex items-center gap-1 font-normal transition-colors disabled:opacity-50"
                    >
                      <Navigation size={10} className={cn(isAttachingLocation && "animate-pulse")} />
                      {formData.location ? 'Attached' : 'Attach My Location'}
                    </button>
                  </div>
                  <input 
                    type="text" 
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    placeholder="6.9271, 79.8612" 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:ring-1 focus:ring-emerald-600 outline-none transition-all text-sm font-normal"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-gray-400 font-normal uppercase tracking-wider">Message</label>
                  <textarea 
                    rows={4}
                    required
                    value={formData.message}
                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                    placeholder="How can we help you today?" 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:ring-1 focus:ring-emerald-600 outline-none transition-all text-sm font-normal resize-none"
                  ></textarea>
                </div>

                <button 
                  type="submit"
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-900/10 transition-all font-normal flex items-center justify-center gap-2 group"
                >
                  <MessageSquare size={18} strokeWidth={1.5} />
                  Send Message
                  <ChevronRight size={16} strokeWidth={1.5} className="group-hover:translate-x-0.5 transition-transform" />
                </button>

                <div className="pt-6 border-t border-gray-50">
                  <p className="text-xs text-center text-gray-400 font-normal mb-4">Or reach us instantly via</p>
                  <div className="grid grid-cols-2 gap-3">
                    <a 
                      href="https://wa.me/94771234567" 
                      target="_blank"
                      className="flex items-center justify-center gap-2 py-2.5 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#075E54] rounded-lg transition-all text-xs font-normal"
                    >
                      WhatsApp
                    </a>
                    <a 
                      href="mailto:developerconsole03@gmail.com"
                      className="flex items-center justify-center gap-2 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition-all text-xs font-normal"
                    >
                      Email Us
                    </a>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Office Locations / More Info */}
      <section className="py-24 bg-gray-50 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center text-emerald-600">
              <Mail size={24} strokeWidth={1.5} />
            </div>
            <div>
              <h4 className="text-sm font-normal text-gray-900 mb-1">Email Support</h4>
              <p className="text-xs text-gray-500 font-normal mb-2">General inquiries & feedback</p>
              <a href="mailto:developerconsole03@gmail.com" className="text-emerald-600 text-[13px] font-normal hover:underline underline-offset-4">
                developerconsole03@gmail.com
              </a>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center text-emerald-600">
              <Phone size={24} strokeWidth={1.5} />
            </div>
            <div>
              <h4 className="text-sm font-normal text-gray-900 mb-1">Office Hours</h4>
              <p className="text-xs text-gray-500 font-normal mb-2">Mon - Fri: 9am to 6pm</p>
              <p className="text-emerald-600 text-[13px] font-normal flex items-center gap-1">
                <Clock size={12} strokeWidth={1.5} />
                Response within 24h
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center text-emerald-600">
              <Globe size={24} strokeWidth={1.5} />
            </div>
            <div>
              <h4 className="text-sm font-normal text-gray-900 mb-1">Our Presence</h4>
              <p className="text-xs text-gray-500 font-normal mb-2">Jaffna | Vavuniya | Colombo</p>
              <p className="text-emerald-600 text-[13px] font-normal">Sri Lanka's trusted directory</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
