'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabaseClient';
import { Business } from '@/lib/types';
import { sanitizeFilename } from '@/lib/utils';
import { Camera, Upload, Globe, Timer, Building2, Save, ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

const AddressAutocomplete = dynamic(() => import('@/components/AddressAutocomplete'), { ssr: false });
const CategorySelector = dynamic(() => import('@/components/CategorySelector'), { ssr: false });

export default function EditBusinessForm({ business }: { business: Business }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form State
  const [businessName, setBusinessName] = useState(business.name);
  const [description, setDescription] = useState(business.description || '');
  const [category, setCategory] = useState(business.category || '');
  const [email, setEmail] = useState(business.email || '');
  const [phone, setPhone] = useState(business.phone || '');
  const [websiteName, setWebsiteName] = useState(business.website_name || '');
  const [websiteUrl, setWebsiteUrl] = useState(business.website_url || '');
  const [workingHours, setWorkingHours] = useState(business.working_hours || '');
  const [ownerName, setOwnerName] = useState(business.owner_name || '');
  const [detailedAddress, setDetailedAddress] = useState(business.detailed_address || '');
  
  // Location State
  const [location, setLocation] = useState<{ lat: number; lng: number; address: string } | null>({
    lat: business.latitude,
    lng: business.longitude,
    address: business.address || ''
  });

  // Image State
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(business.logo_url || null);
  const [hoverImage, setHoverImage] = useState<File | null>(null);
  const [hoverImagePreview, setHoverImagePreview] = useState<string | null>(business.image_url || null);

  const handleLocationSelect = useCallback((lat: number, lng: number, address: string) => {
    setLocation({ lat, lng, address });
  }, []);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files[0];
    if (file) {
      setLogo(file);
      const reader = new FileReader();
      reader.onloadend = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleHoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files[0];
    if (file) {
      setHoverImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setHoverImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      let logoUrl = business.logo_url;
      if (logo) {
        const sanitizedName = sanitizeFilename(logo.name);
        const filePath = `${business.owner_id}/${Date.now()}_logo_${sanitizedName}`;
        const { error: uploadError } = await supabase.storage
            .from('business-logos')
            .upload(filePath, logo);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('business-logos').getPublicUrl(filePath);
        logoUrl = urlData.publicUrl;
      }

      let hoverImageUrl = business.image_url;
      if (hoverImage) {
        const sanitizedName = sanitizeFilename(hoverImage.name);
        const filePath = `${business.owner_id}/${Date.now()}_hover_${sanitizedName}`;
        const { error: uploadError } = await supabase.storage
            .from('business-logos')
            .upload(filePath, hoverImage);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('business-logos').getPublicUrl(filePath);
        hoverImageUrl = urlData.publicUrl;
      }

      const { error: updateError } = await supabase
        .from('businesses')
        .update({
          name: businessName,
          description,
          category,
          email,
          phone,
          website_name: websiteName,
          website_url: websiteUrl,
          working_hours: workingHours,
          owner_name: ownerName,
          address: location.address,
          detailed_address: detailedAddress,
          latitude: location.lat,
          longitude: location.lng,
          location: location ? `POINT(${location.lng} ${location.lat})` : business.location,
          logo_url: logoUrl,
          image_url: hoverImageUrl,
          // We don't update status here, as edits might need re-approval depending on your policy
          // For now, let's keep the status as is
        })
        .eq('id', business.id);

      if (updateError) throw updateError;

      setSuccess(true);
      router.refresh();
      // Optional: Redirect back to list after a delay
      // setTimeout(() => router.push('/vendor/my-businesses'), 2000);

    } catch (err: any) {
      setError(err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-8 space-y-10">
      
      {/* Basic Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-1">
          <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>
          <p className="text-sm text-gray-500 mt-1">Update your brand identity and core details.</p>
          
          {/* Image Uploads */}
          <div className="mt-6 space-y-6">
             {/* Logo */}
             <div>
               <label className="block text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">Logo</label>
               <div className="relative group w-32 h-32 rounded-lg bg-gray-50 border-2 border-dashed border-gray-300 overflow-hidden cursor-pointer hover:border-emerald-500 transition-all flex items-center justify-center">
                  {logoPreview ? (
                    <Image src={logoPreview} alt="Logo preview" fill className="object-cover" />
                  ) : (
                    <Building2 size={32} className="text-gray-400" />
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white">
                    <Camera size={24} />
                    <span className="text-[10px] mt-1 font-medium">Change</span>
                  </div>
                  <input type="file" accept="image/*" onChange={handleLogoChange} className="absolute inset-0 opacity-0 cursor-pointer" />
               </div>
             </div>

             {/* Cover Image */}
             <div>
               <label className="block text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">Cover Image</label>
               <div className="relative group w-full h-40 rounded-lg bg-gray-50 border-2 border-dashed border-gray-300 overflow-hidden cursor-pointer hover:border-emerald-500 transition-all flex items-center justify-center">
                  {hoverImagePreview ? (
                    <Image src={hoverImagePreview} alt="Cover preview" fill className="object-cover" />
                  ) : (
                    <Upload size={32} className="text-gray-400" />
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white">
                    <Camera size={24} />
                    <span className="text-[10px] mt-1 font-medium">Change</span>
                  </div>
                  <input type="file" accept="image/*" onChange={handleHoverImageChange} className="absolute inset-0 opacity-0 cursor-pointer" />
               </div>
             </div>
          </div>
        </div>

        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
            <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)} required className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm" />
          </div>
          <div className="md:col-span-1">
            <CategorySelector value={category} onChange={setCategory} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm" />
          </div>
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Website Name</label>
            <input type="text" value={websiteName} onChange={(e) => setWebsiteName(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm" />
          </div>
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Website URL</label>
            <input type="url" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm" />
          </div>
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Working Hours</label>
            <input type="text" value={workingHours} onChange={(e) => setWorkingHours(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm" />
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-10 grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-1">
          <h2 className="text-lg font-semibold text-gray-900">Contact & Location</h2>
          <p className="text-sm text-gray-500 mt-1">Ensure customers can find and reach you easily.</p>
        </div>

        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Owner Name</label>
            <input type="text" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} required className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm" />
          </div>
          <div className="md:col-span-2">
            <AddressAutocomplete 
              onLocationSelectAction={handleLocationSelect} 
              initialAddress={location.address} 
              initialLat={location.lat}
              initialLng={location.lng}
              detailedAddress={detailedAddress}
              onDetailedAddressChange={setDetailedAddress}
            />
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="border-t border-gray-200 pt-8 flex items-center justify-between">
        <Link href="/vendor/my-businesses" className="text-gray-600 hover:text-gray-900 font-medium text-sm flex items-center gap-2">
          <ArrowLeft size={16} /> Cancel
        </Link>
        
        <div className="flex items-center gap-4">
          {success && <span className="text-emerald-600 text-sm font-medium animate-in fade-in">Changes saved successfully!</span>}
          {error && <span className="text-red-600 text-sm font-medium animate-in fade-in">{error}</span>}
          
          <button 
            type="submit" 
            disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm shadow-emerald-200 disabled:opacity-50"
          >
            {loading ? (
              <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save size={18} />
            )}
            Save Changes
          </button>
        </div>
      </div>
    </form>
  );
}
