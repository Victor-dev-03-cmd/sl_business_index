'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabaseClient';
import { useQuery } from '@tanstack/react-query';
import { sanitizeFilename } from '@/lib/utils';

const AddressAutocomplete = dynamic(() => import('@/components/AddressAutocomplete'), { ssr: false });
const CategorySelector = dynamic(() => import('@/components/CategorySelector'), { ssr: false });

import { CheckCircle2, Clock, Home, ArrowRight, ShieldCheck, Camera, Upload, Globe, Timer, Building2 } from 'lucide-react';
import Image from 'next/image';

export default function RegisterBusinessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [businessName, setBusinessName] = useState('');
  const [description, setDescription] = useState('');
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [hoverImage, setHoverImage] = useState<File | null>(null);
  const [hoverImagePreview, setHoverImagePreview] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [category, setCategory] = useState('');
  const [websiteName, setWebsiteName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [workingHours, setWorkingHours] = useState('');
  const [registrationType, setRegistrationType] = useState<'registered' | 'unregistered'>('registered');
  const [brNumber, setBrNumber] = useState('');
  const [nicNumber, setNicNumber] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [detailedAddress, setDetailedAddress] = useState('');

  useEffect(() => {
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const address = searchParams.get('address');

    if (lat && lng && address) {
      setLocation({
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        address: address
      });
    }
  }, [searchParams]);

  const [loading, setLoading] = useState(false);
  const [isUnauthenticated, setIsUnauthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Sri Lankan NIC Validation
  const validateNIC = (nic: string): boolean => {
    const oldNicRegex = /^[5-9][0-9]{8}[vVxX]$/;
    const newNicRegex = /^(19|20)[0-9]{10}$/;
    return oldNicRegex.test(nic) || newNicRegex.test(nic);
  };

  // Sri Lankan Business Registration (BR) Validation
  const validateBR = (br: string): boolean => {
    const brRegex = /^(PV|PB|PC|GA|GB|WP|W|CP|C|SP|S|NP|N|EP|E|NW|NC|UVA|U|SG)(\s|\/)?\d+$/i;
    return brRegex.test(br);
  };

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsUnauthenticated(true);
      }
      return user;
    },
  });

  const { data: existingBusiness, isLoading: businessLoading } = useQuery({
    queryKey: ['existing-business', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('businesses')
        .select('id, status, name')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      return data || null;
    },
    enabled: !!user,
  });

  const fetchingStatus = userLoading || (!!user && businessLoading);

  const handleLocationSelect = useCallback((lat: number, lng: number, address: string) => {
    setLocation({ lat, lng, address });
  }, []);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogo(file);
      // Revoke the old URL to prevent memory leaks
      if (logoPreview) URL.revokeObjectURL(logoPreview);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleHoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setHoverImage(file);
      // Revoke the old URL to prevent memory leaks
      if (hoverImagePreview) URL.revokeObjectURL(hoverImagePreview);
      setHoverImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('handleSubmit called');
    setLoading(true);
    setError(null);

    console.log('Form data:', {
      businessName,
      category,
      location,
      registrationType,
      brNumber,
      nicNumber
    });

    if (!businessName.trim()) {
      setError('Business Name is required.');
      setLoading(false);
      return;
    }

    if (!category) {
      setError('Please select a category for your business.');
      setLoading(false);
      return;
    }

    if (!location) {
      setError('Please select a valid business address.');
      setLoading(false);
      return;
    }

    if (!ownerName.trim()) {
      setError('Owner Name is required.');
      setLoading(false);
      return;
    }

    if (!contactNumber.trim()) {
      setError('Contact Number is required.');
      setLoading(false);
      return;
    }

    if (!email.trim()) {
      setError('Business Email is required.');
      setLoading(false);
      return;
    }

    if (registrationType === 'registered') {
      if (!brNumber.trim()) {
        setError('BR Number is required for registered companies.');
        setLoading(false);
        return;
      }
      if (!validateBR(brNumber)) {
        setError('Invalid BR Number format. (e.g., PV 1234, WP/1234)');
        setLoading(false);
        return;
      }
    }

    if (registrationType === 'unregistered') {
      if (!nicNumber.trim()) {
        setError('NIC or Passport Number is required.');
        setLoading(false);
        return;
      }
      // If it looks like an NIC (10 or 12 chars), validate it. 
      // If it's a passport, we might allow it, but the user specifically asked for NIC validation rules.
      if (!validateNIC(nicNumber)) {
        setError('Invalid Sri Lankan NIC format.');
        setLoading(false);
        return;
      }
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      console.log('User check:', user?.id);
      if (!user) throw new Error('You must be logged in to register a business.');

      let logoUrl = null;
      if (logo) {
        const sanitizedName = sanitizeFilename(logo.name);
        const filePath = `${user.id}/${Date.now()}_logo_${sanitizedName}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('business-logos')
            .upload(filePath, logo);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('business-logos').getPublicUrl(filePath);
        logoUrl = urlData.publicUrl;
      }

      let hoverImageUrl = null;
      if (hoverImage) {
        const sanitizedName = sanitizeFilename(hoverImage.name);
        const filePath = `${user.id}/${Date.now()}_hover_${sanitizedName}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('business-logos')
            .upload(filePath, hoverImage);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('business-logos').getPublicUrl(filePath);
        hoverImageUrl = urlData.publicUrl;
      }

      const { error: insertError } = await supabase.from('businesses').insert([
        {
          name: businessName,
          description,
          logo_url: logoUrl,
          image_url: hoverImageUrl,
          email,
          owner_name: ownerName,
          phone: contactNumber,
          category,
          website_name: websiteName,
          website_url: websiteUrl,
          working_hours: workingHours,
          is_registered: registrationType === 'registered',
          registration_number: registrationType === 'registered' ? brNumber : nicNumber,
          owner_id: user.id,
          location: `POINT(${location.lng} ${location.lat})`,
          address: location.address,
          detailed_address: detailedAddress,
          latitude: location.lat,
          longitude: location.lng,
          status: 'pending'
        },
      ]);

      if (insertError) throw insertError;

      setIsSubmitted(true);
      window.scrollTo(0, 0);

    } catch (err: any) {
      setError(err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (fetchingStatus) {
    return (
      <div className="min-h-screen bg-gray-50/50 py-12 px-6">
        <div className="max-w-6xl mx-auto bg-white p-8 md:p-12 border border-gray-300 shadow-sm rounded-[6px] space-y-12">
          {/* Header Skeleton */}
          <div className="border-b border-gray-50 pb-8 space-y-4">
            <div className="h-10 w-64 bg-gray-200 animate-pulse rounded-[6px]" />
            <div className="h-6 w-96 bg-gray-100 animate-pulse rounded-[6px]" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Sidebar Skeleton */}
            <div className="lg:col-span-1 space-y-8">
              <div className="space-y-3">
                <div className="h-7 w-48 bg-gray-200 animate-pulse rounded-[6px]" />
                <div className="h-4 w-full bg-gray-100 animate-pulse rounded-[6px]" />
              </div>
              <div className="flex gap-6">
                <div className="w-32 h-32 bg-gray-100 animate-pulse rounded-[6px]" />
                <div className="w-48 h-32 bg-gray-100 animate-pulse rounded-[6px]" />
              </div>
            </div>

            {/* Form Fields Skeleton */}
            <div className="lg:col-span-2 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 w-24 bg-gray-100 animate-pulse rounded-[6px]" />
                    <div className="h-12 w-full bg-gray-50 animate-pulse border border-gray-200 rounded-[6px]" />
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <div className="h-4 w-24 bg-gray-100 animate-pulse rounded-[6px]" />
                <div className="h-32 w-full bg-gray-50 animate-pulse border border-gray-200 rounded-[6px]" />
              </div>
              <div className="h-14 w-full bg-brand-dark/20 animate-pulse rounded-[6px]" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isUnauthenticated) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center py-12 px-6">
        <div className="max-w-2xl w-full bg-white p-10 md:p-16 border border-gray-300 shadow-2xl rounded-[6px] text-center transition-all animate-in fade-in zoom-in duration-500">
          <div className="flex justify-center mb-8">
            <div className="p-6 rounded-[6px] bg-brand-sand/20 text-brand-dark">
              <ShieldCheck size={64} strokeWidth={1.5} />
            </div>
          </div>
          <h1 className="text-3xl font-normal text-gray-900 mb-4 tracking-tight">Login Required</h1>
          <p className="text-gray-500 text-lg font-normal mb-10 leading-relaxed">
            Please log in to your account to continue with business registration.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login?redirect=/register-business" prefetch={false} className="flex items-center justify-center gap-2 px-8 py-4 bg-brand-dark text-white rounded-[6px] text-sm font-medium hover:bg-brand-blue transition-all shadow-lg active:scale-95">
               Login to Continue
            </Link>
            <Link href="/" prefetch={false} className="flex items-center justify-center gap-2 px-8 py-4 bg-white border border-gray-300 text-gray-600 rounded-[6px] text-sm font-medium hover:bg-gray-50 transition-all active:scale-95">
              <Home size={18} /> Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (existingBusiness && (existingBusiness.status === 'pending' || existingBusiness.status === 'approved') && !isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center py-12 px-6">
        <div className="max-w-2xl w-full bg-white p-10 md:p-16 border border-gray-300 shadow-2xl rounded-[6px] text-center transition-all animate-in fade-in zoom-in duration-500">
          <div className="flex justify-center mb-8">
            <div className={`p-6 rounded-[6px] ${existingBusiness.status === 'approved' ? 'bg-brand-sand/20 text-brand-dark' : 'bg-amber-50 text-amber-600'}`}>
              {existingBusiness.status === 'approved' ? <CheckCircle2 size={64} strokeWidth={1.5} /> : <Clock size={64} strokeWidth={1.5} />}
            </div>
          </div>
          <h1 className="text-3xl font-normal text-gray-900 mb-4 tracking-tight">
            {existingBusiness.status === 'approved' ? 'Business Already Approved' : 'Application Pending'}
          </h1>
          <p className="text-gray-500 text-lg font-normal mb-10 leading-relaxed">
            {existingBusiness.status === 'approved' 
              ? `Your business "${existingBusiness.name}" is already active in our directory.` 
              : `We've already received your application for "${existingBusiness.name}". It's currently being reviewed.`}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/" prefetch={false} className="flex items-center justify-center gap-2 px-8 py-4 bg-brand-dark text-white rounded-[6px] text-sm font-medium hover:bg-brand-blue transition-all shadow-lg active:scale-95">
              <Home size={18} /> Go to Home
            </Link>
            {existingBusiness.status === 'approved' && (
              <Link href="/admin/dashboard" prefetch={false} className="flex items-center justify-center gap-2 px-8 py-4 bg-white border border-gray-300 text-gray-600 rounded-[6px] text-sm font-medium hover:bg-gray-50 transition-all active:scale-95">
                Go to Dashboard <ArrowRight size={18} />
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center py-12 px-6">
        <div className="max-w-2xl w-full bg-white p-10 md:p-16 border border-gray-300 shadow-2xl rounded-[6px] text-center">
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="absolute inset-0 bg-brand-sand rounded-[6px] animate-ping opacity-25"></div>
              <div className="relative bg-brand-sand/20 p-6 rounded-[6px] text-brand-dark">
                <CheckCircle2 size={64} strokeWidth={1.5} />
              </div>
            </div>
          </div>

          <h1 className="text-3xl font-normal text-gray-900 mb-4 tracking-tight">Registration Submitted</h1>
          <p className="text-gray-500 text-lg font-normal mb-10 leading-relaxed">
            Thank you for registering <span className="text-brand-blue font-medium">{businessName}</span>. 
            Our team is reviewing your application.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            <div className="p-6 bg-gray-50/50 rounded-[6px] border border-gray-300 flex flex-col items-center text-center">
              <Clock className="text-brand-dark mb-3" size={24} strokeWidth={1.5} />
              <h3 className="text-sm font-medium text-gray-900 mb-1">Approval Time</h3>
              <p className="text-xs text-gray-500 font-normal">Applications are typically reviewed within 48 hours.</p>
            </div>
            <div className="p-6 bg-gray-50/50 rounded-[6px] border border-gray-300 flex flex-col items-center text-center">
              <ShieldCheck className="text-brand-dark mb-3" size={24} strokeWidth={1.5} />
              <h3 className="text-sm font-medium text-gray-900 mb-1">Status Tracking</h3>
              <p className="text-xs text-gray-500 font-normal">You'll be notified via email once approved.</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
                  onClick={() => {
                    router.refresh();
                    router.push('/');
                  }}
                  className="flex items-center justify-center gap-2 px-8 py-4 bg-white border border-gray-300 text-gray-600 rounded-[6px] text-sm font-medium hover:bg-gray-50 transition-all active:scale-95"
                >
                  <Home size={18} />
                  Go to Home
                </button>
            <button
                  onClick={() => {
                    router.refresh();
                    router.push('/vendor/dashboard');
                  }}
                  className="flex items-center justify-center gap-2 px-8 py-4 bg-brand-dark text-white rounded-[6px] text-sm font-medium hover:bg-brand-blue transition-all shadow-lg shadow-brand-dark/10 active:scale-95"
                >
                  Go to Dashboard
                  <ArrowRight size={18} />
                </button>
          </div>
        </div>
      </div>
    );
  }

  return (
      <div className="min-h-screen bg-gray-50/50 py-12 px-6">
        <div className="max-w-6xl mx-auto bg-white p-8 md:p-12 border border-gray-300 shadow-sm rounded-[6px]">

          <div className="mb-12 border-b border-gray-50 pb-8 text-center md:text-left">
            <h1 className="text-4xl font-normal text-gray-900 tracking-tight">Register Your Business</h1>
            <p className="text-gray-500 mt-3 text-lg font-normal">Join Sri Lanka's leading professional business directory.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-12">

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              <div className="lg:col-span-1">
                <h2 className="text-xl font-normal text-brand-dark">Basic Information</h2>
                <p className="text-sm text-gray-400 mt-2 font-normal">Tell us the core details about your brand and services.</p>
                
                {/* Image Uploads Section */}
                <div className="mt-8 flex flex-col sm:flex-row justify-center lg:justify-start gap-6">
                   {/* Logo Upload */}
                   <div className="flex flex-col items-center lg:items-start gap-2">
                     <span className="text-[10px] uppercase tracking-widest text-gray-400 font-medium ml-1">Logo</span>
                     <div className="relative group w-32 h-32 rounded-[6px] bg-gray-50 border-2 border-dashed border-gray-300 overflow-hidden cursor-pointer hover:border-brand-gold transition-all flex items-center justify-center">
                        {logoPreview ? (
                          <Image src={logoPreview} alt="Logo preview" fill className="object-cover" />
                        ) : (
                          <div className="flex flex-col items-center text-gray-400 group-hover:text-brand-gold">
                            <Building2 size={32} strokeWidth={1} />
                            <span className="text-[10px] mt-2 uppercase tracking-widest">Logo</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white">
                          <Camera size={24} className="mb-1" />
                          <span className="text-[10px] uppercase font-medium">Change</span>
                        </div>
                        <input type="file" accept="image/*" onChange={handleLogoChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                     </div>
                   </div>

                   {/* Hover/Business Image Upload */}
                   <div className="flex flex-col items-center lg:items-start gap-2">
                     <span className="text-[10px] uppercase tracking-widest text-gray-400 font-medium ml-1">Business Image</span>
                     <div className="relative group w-48 h-32 rounded-[6px] bg-gray-50 border-2 border-dashed border-gray-300 overflow-hidden cursor-pointer hover:border-brand-gold transition-all flex items-center justify-center">
                        {hoverImagePreview ? (
                          <Image src={hoverImagePreview} alt="Hover preview" fill className="object-cover" />
                        ) : (
                          <div className="flex flex-col items-center text-gray-400 group-hover:text-brand-gold">
                            <Upload size={32} strokeWidth={1} />
                            <span className="text-[10px] mt-2 uppercase tracking-widest text-center px-2">Hover Image</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white">
                          <Camera size={24} className="mb-1" />
                          <span className="text-[10px] uppercase font-medium">Change</span>
                        </div>
                        <input type="file" accept="image/*" onChange={handleHoverImageChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                     </div>
                   </div>
                </div>
              </div>

              <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-1">
                  <label className="block text-sm font-normal text-gray-600 mb-2">
                    Business Name <span className="text-red-500">*</span>
                  </label>
                  <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)} required className="w-full px-4 py-3.5 rounded-[6px] border border-gray-300 bg-gray-50/50 focus:bg-white focus:ring-1 focus:ring-blue-900 outline-none transition-all font-normal text-sm" />
                </div>
                <div className="md:col-span-1">
                  <CategorySelector value={category} onChange={setCategory} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-normal text-gray-600 mb-2">Description</label>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="w-full px-4 py-3.5 rounded-[6px] border border-gray-300 bg-gray-50/50 focus:bg-white focus:ring-1 focus:ring-blue-900 outline-none transition-all font-normal text-sm" placeholder="Write a brief overview of your business..."></textarea>
                </div>
                <div className="md:col-span-1">
                  <label className="block text-sm font-normal text-gray-600 mb-2 flex items-center gap-2">
                    <Globe size={14} className="text-gray-400" /> Website Name (Optional)
                  </label>
                  <input type="text" value={websiteName} onChange={(e) => setWebsiteName(e.target.value)} placeholder="e.g. My Portfolio" className="w-full px-4 py-3.5 rounded-[6px] border border-gray-300 bg-gray-50/50 focus:bg-white focus:ring-1 focus:ring-blue-900 outline-none transition-all font-normal text-sm" />
                </div>
                <div className="md:col-span-1">
                  <label className="block text-sm font-normal text-gray-600 mb-2 flex items-center gap-2">
                    <Globe size={14} className="text-gray-400" /> Website URL (Optional)
                  </label>
                  <input type="url" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://other-site.com" className="w-full px-4 py-3.5 rounded-[6px] border border-gray-300 bg-gray-50/50 focus:bg-white focus:ring-1 focus:ring-blue-900 outline-none transition-all font-normal text-sm" />
                </div>
                <div className="md:col-span-1">
                  <label className="block text-sm font-normal text-gray-600 mb-2 flex items-center gap-2">
                    <Timer size={14} className="text-gray-400" /> Working Hours (Optional)
                  </label>
                  <input type="text" value={workingHours} onChange={(e) => setWorkingHours(e.target.value)} placeholder="e.g. 9 AM - 6 PM" className="w-full px-4 py-3.5 rounded-[6px] border border-gray-300 bg-gray-50/50 focus:bg-white focus:ring-1 focus:ring-blue-900 outline-none transition-all font-normal text-sm" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 border-t border-gray-50 pt-12">
              <div className="lg:col-span-1">
                <h2 className="text-xl font-normal text-brand-dark">Contact & Location</h2>
                <p className="text-sm text-gray-400 mt-2 font-normal">Provide your official contact info and business address for the map.</p>
              </div>

              <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-normal text-gray-600 mb-2">
                    Owner Name <span className="text-red-500">*</span>
                  </label>
                  <input type="text" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} required className="w-full px-4 py-3.5 rounded-[6px] border border-gray-300 bg-gray-50/50 focus:bg-white focus:ring-1 focus:ring-blue-900 outline-none transition-all font-normal text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-normal text-gray-600 mb-2">
                    Contact Number <span className="text-red-500">*</span>
                  </label>
                  <input type="tel" value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} required className="w-full px-4 py-3.5 rounded-[6px] border border-gray-300 bg-gray-50/50 focus:bg-white focus:ring-1 focus:ring-blue-900 outline-none transition-all font-normal text-sm" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-normal text-gray-600 mb-2">
                    Business Email <span className="text-red-500">*</span>
                  </label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-4 py-3.5 rounded-[6px] border border-gray-300 bg-gray-50/50 focus:bg-white focus:ring-1 focus:ring-blue-900 outline-none transition-all font-normal text-sm" />
                </div>

                <div className="md:col-span-2">
                  <AddressAutocomplete 
                    onLocationSelectAction={handleLocationSelect} 
                    detailedAddress={detailedAddress}
                    onDetailedAddressChange={setDetailedAddress}
                    initialAddress={location?.address}
                    initialLat={location?.lat}
                    initialLng={location?.lng}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 border-t border-gray-50 pt-12">
              <div className="lg:col-span-1">
                <h2 className="text-xl font-normal text-brand-dark">Legal Verification</h2>
                <p className="text-sm text-gray-400 mt-2 font-normal">Choose your registration type and provide ID for verification.</p>
              </div>

              <div className="lg:col-span-2 space-y-8 bg-gray-50/30 p-8 rounded-[6px]">
                <div className="flex flex-wrap gap-8">
                  <label className="flex items-center cursor-pointer group">
                    <input type="radio" name="regType" value="registered" checked={registrationType === 'registered'} onChange={() => setRegistrationType('registered')} className="h-4 w-4 text-green-700 focus:ring-blue-900 border-gray-300" />
                    <span className="ml-3 text-sm text-gray-600 group-hover:text-gray-900 transition-colors font-normal">Registered Company</span>
                  </label>
                  <label className="flex items-center cursor-pointer group">
                    <input type="radio" name="regType" value="unregistered" checked={registrationType === 'unregistered'} onChange={() => setRegistrationType('unregistered')} className="h-4 w-4 text-green-700 focus:ring-blue-900 border-gray-300" />
                    <span className="ml-3 text-sm text-gray-600 group-hover:text-gray-900 transition-colors font-normal">Individual / Freelancer</span>
                  </label>
                </div>

                <div className="animate-in fade-in duration-500">
                  {registrationType === 'registered' ? (
                      <div>
                        <label className="block text-sm font-normal text-gray-600 mb-2">
                          BR Number <span className="text-red-500">*</span>
                        </label>
                        <input type="text" value={brNumber} onChange={(e) => setBrNumber(e.target.value)} className="w-full px-4 py-3.5 rounded-[6px] border border-gray-300 bg-white focus:ring-1 focus:ring-blue-900 outline-none transition-all font-normal text-sm" placeholder="e.g. PV 1234 or WP/1234" />
                        <p className="mt-1.5 text-[10px] text-gray-400 font-normal">Format: Prefix (PV, PB, WP, etc.) followed by number.</p>
                      </div>
                  ) : (
                      <div>
                        <label className="block text-sm font-normal text-gray-600 mb-2">
                          NIC or Passport Number <span className="text-red-500">*</span>
                        </label>
                        <input type="text" value={nicNumber} onChange={(e) => setNicNumber(e.target.value)} className="w-full px-4 py-3.5 rounded-[6px] border border-gray-300 bg-white focus:ring-1 focus:ring-blue-900 outline-none transition-all font-normal text-sm" placeholder="Enter NIC Number" />
                        <p className="mt-1.5 text-[10px] text-gray-400 font-normal">Old NIC: 9 digits + V/X. New NIC: 12 digits.</p>
                      </div>
                  )}
                </div>
              </div>
            </div>

            {error && (
                <div className="p-4 bg-red-50 rounded-[6px] border border-red-100 flex items-center space-x-3">
                  <span className="text-red-600 text-sm font-normal">⚠️ {error}</span>
                </div>
            )}

            <div className="pt-10 flex flex-col md:flex-row gap-4 items-center justify-between">
              <p className="text-xs text-gray-400 max-w-sm font-normal">By submitting, you agree to our terms of service and business directory guidelines.</p>
              <button type="submit" disabled={loading} className="w-full md:w-auto min-w-[240px] bg-brand-text text-white py-4 px-10 rounded-[5px] text-lg shadow-md transition-all disabled:opacity-50 font-normal">
                {loading ? 'Submitting Details...' : 'Register Business'}
              </button>
            </div>
          </form>
        </div>
      </div>
  );
}
