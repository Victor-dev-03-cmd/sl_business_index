'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import AddressAutocomplete from '@/components/AddressAutocomplete';
import CategorySelector from '@/components/CategorySelector';

export default function RegisterBusinessPage() {
  const router = useRouter();
  const [businessName, setBusinessName] = useState('');
  const [description, setDescription] = useState('');
  const [logo, setLogo] = useState<File | null>(null);
  const [email, setEmail] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [category, setCategory] = useState('');
  const [registrationType, setRegistrationType] = useState<'registered' | 'unregistered'>('registered');
  const [brNumber, setBrNumber] = useState('');
  const [nicNumber, setNicNumber] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLocationSelect = useCallback((lat: number, lng: number, address: string) => {
    setLocation({ lat, lng, address });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!location) {
      setError('Please select a valid business address.');
      setLoading(false);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('You must be logged in to register a business.');

      let logoUrl = null;
      if (logo) {
        const filePath = `${user.id}/${Date.now()}_${logo.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('business-logos')
            .upload(filePath, logo);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('business-logos').getPublicUrl(filePath);
        logoUrl = urlData.publicUrl;
      }

      const { error: insertError } = await supabase.from('businesses').insert([
        {
          name: businessName,
          description,
          logo_url: logoUrl,
          email,
          owner_name: ownerName,
          phone: contactNumber,
          category,
          is_registered: registrationType === 'registered',
          registration_number: registrationType === 'registered' ? brNumber : nicNumber,
          owner_id: user.id,
          location: `POINT(${location.lng} ${location.lat})`,
          address: location.address,
          latitude: location.lat,
          longitude: location.lng,
        },
      ]);

      if (insertError) throw insertError;

      alert('Business registered successfully!');
      router.push('/dashboard');

    } catch (err: any) {
      setError(err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
      <div className="min-h-screen bg-gray-50/50 py-12 px-6">
        <div className="max-w-6xl mx-auto bg-white p-8 md:p-12 border border-gray-100 shadow-sm">

          <div className="mb-12 border-b border-gray-50 pb-8 text-center md:text-left">
            <h1 className="text-4xl font-normal text-gray-900 tracking-tight">Register Your Business</h1>
            <p className="text-gray-500 mt-3 text-lg font-normal">Join Sri Lanka's leading professional business directory.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-12">

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              <div className="lg:col-span-1">
                <h2 className="text-xl font-normal text-green-900">Basic Information</h2>
                <p className="text-sm text-gray-400 mt-2 font-normal">Tell us the core details about your brand and services.</p>
              </div>

              <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-1">
                  <label className="block text-sm font-normal text-gray-600 mb-2">Business Name</label>
                  <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)} required className="w-full px-4 py-3.5 rounded-[6px] border border-gray-100 bg-gray-50/50 focus:bg-white focus:ring-1 focus:ring-green-600 outline-none transition-all" />
                </div>
                <div className="md:col-span-1">
                  <CategorySelector value={category} onChange={setCategory} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-normal text-gray-600 mb-2">Description</label>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="w-full px-4 py-3.5 rounded-[6px] border border-gray-100 bg-gray-50/50 focus:bg-white focus:ring-1 focus:ring-green-600 outline-none transition-all" placeholder="Write a brief overview of your business..."></textarea>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-normal text-gray-600 mb-2">Business Logo</label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-100 border-dashed rounded-[6px] hover:bg-gray-50 transition-all cursor-pointer">
                    <input type="file" onChange={(e) => setLogo(e.target.files ? e.target.files[0] : null)} className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-[6px] file:border-0 file:text-xs file:font-semibold file:bg-green-50 file:text-green-700 cursor-pointer"/>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 border-t border-gray-50 pt-12">
              <div className="lg:col-span-1">
                <h2 className="text-xl font-normal text-green-900">Contact & Location</h2>
                <p className="text-sm text-gray-400 mt-2 font-normal">Provide your official contact info and business address for the map.</p>
              </div>

              <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-normal text-gray-600 mb-2">Owner Name</label>
                  <input type="text" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} required className="w-full px-4 py-3.5 rounded-[6px] border border-gray-100 bg-gray-50/50 focus:bg-white focus:ring-1 focus:ring-green-600 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-normal text-gray-600 mb-2">Contact Number</label>
                  <input type="tel" value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} required className="w-full px-4 py-3.5 rounded-[6px] border border-gray-100 bg-gray-50/50 focus:bg-white focus:ring-1 focus:ring-green-600 outline-none transition-all" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-normal text-gray-600 mb-2">Business Email</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-4 py-3.5 rounded-[6px] border border-gray-100 bg-gray-50/50 focus:bg-white focus:ring-1 focus:ring-green-600 outline-none transition-all" />
                </div>

                <div className="md:col-span-2">
                  <AddressAutocomplete onLocationSelectAction={handleLocationSelect} />
                  <p className="mt-2 text-[11px] text-gray-400 font-normal italic">* Select from the dropdown for accurate map pinning.</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 border-t border-gray-50 pt-12">
              <div className="lg:col-span-1">
                <h2 className="text-xl font-normal text-green-900">Legal Verification</h2>
                <p className="text-sm text-gray-400 mt-2 font-normal">Choose your registration type and provide ID for verification.</p>
              </div>

              <div className="lg:col-span-2 space-y-8 bg-gray-50/30 p-8 rounded-2xl">
                <div className="flex flex-wrap gap-8">
                  <label className="flex items-center cursor-pointer group">
                    <input type="radio" name="regType" value="registered" checked={registrationType === 'registered'} onChange={() => setRegistrationType('registered')} className="h-4 w-4 text-green-700 focus:ring-green-600 border-gray-300" />
                    <span className="ml-3 text-sm text-gray-600 group-hover:text-gray-900 transition-colors">Registered Company</span>
                  </label>
                  <label className="flex items-center cursor-pointer group">
                    <input type="radio" name="regType" value="unregistered" checked={registrationType === 'unregistered'} onChange={() => setRegistrationType('unregistered')} className="h-4 w-4 text-green-700 focus:ring-green-600 border-gray-300" />
                    <span className="ml-3 text-sm text-gray-600 group-hover:text-gray-900 transition-colors">Individual / Freelancer</span>
                  </label>
                </div>

                <div className="animate-in fade-in duration-500">
                  {registrationType === 'registered' ? (
                      <div>
                        <label className="block text-sm font-normal text-gray-600 mb-2">BR Number</label>
                        <input type="text" value={brNumber} onChange={(e) => setBrNumber(e.target.value)} className="w-full px-4 py-3.5 rounded-[6px] border border-gray-200 bg-white focus:ring-1 focus:ring-green-600 outline-none transition-all" placeholder="Enter Registration Number" />
                      </div>
                  ) : (
                      <div>
                        <label className="block text-sm font-normal text-gray-600 mb-2">NIC or Passport Number</label>
                        <input type="text" value={nicNumber} onChange={(e) => setNicNumber(e.target.value)} className="w-full px-4 py-3.5 rounded-[6px] border border-gray-200 bg-white focus:ring-1 focus:ring-green-600 outline-none transition-all" placeholder="Enter NIC Number" />
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
              <button type="submit" disabled={loading} className="w-full md:w-auto min-w-[240px] bg-green-700 text-white py-4 px-10 rounded-[5px] text-lg hover:bg-green-800 shadow-md transition-all disabled:opacity-50">
                {loading ? 'Submitting Details...' : 'Register Business'}
              </button>
            </div>
          </form>
        </div>
      </div>
  );
}
