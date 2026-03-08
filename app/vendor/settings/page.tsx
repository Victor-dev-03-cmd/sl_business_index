'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  User, 
  ShieldCheck, 
  MapPin, 
  Bell,
  Save, 
  Upload, 
  Globe, 
  Search,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { Slider } from "@/components/ui/slider";

interface Profile {
  full_name: string;
  email: string;
  phone: string;
  job_title: string;
  avatar_url: string;
}

interface Business {
  id: string;
  name: string;
  service_radius: number;
  seo_keywords: string[];
}

interface Verification {
  id: string;
  status: string;
  br_document_url?: string;
  nic_passport_url?: string;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'verification' | 'optimization' | 'notifications'>('profile');
  const [submitting, setSubmitting] = useState(false);
  
  // Profile State
  const [profile, setProfile] = useState<Profile>({
    full_name: '',
    email: '',
    phone: '',
    job_title: '',
    avatar_url: ''
  });

  // Optimization State
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>('');
  const [radius, setRadius] = useState([5]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState('');

  // Verification State
  const [verification, setVerification] = useState<Verification | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch Profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (profileData) {
        setProfile({
          full_name: profileData.full_name || '',
          email: profileData.email || user.email || '',
          phone: profileData.phone || '',
          job_title: profileData.job_title || '',
          avatar_url: profileData.avatar_url || ''
        });
      }

      // Fetch Businesses for Optimization
      const { data: businessData } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', user.id);
      
      if (businessData) {
        setBusinesses(businessData);
        if (businessData.length > 0) {
          const first = businessData[0];
          setSelectedBusinessId(first.id);
          setRadius([first.service_radius || 5]);
          setKeywords(first.seo_keywords || []);
          
          // Fetch Verification for the first business
          const { data: verData } = await supabase
            .from('verifications')
            .select('*')
            .eq('business_id', first.id)
            .maybeSingle();
          setVerification(verData);
        }
      }
    } catch (error) {
      console.error('Error fetching settings data:', error);
    }
  };

  const handleSaveProfile = async () => {
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profile.full_name,
          phone: profile.phone,
          job_title: profile.job_title,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveOptimization = async () => {
    if (!selectedBusinessId) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('businesses')
        .update({
          service_radius: radius[0],
          seo_keywords: keywords,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedBusinessId);

      if (error) throw error;
      alert('Optimization settings saved!');
    } catch (error) {
      console.error('Error saving optimization:', error);
      alert('Failed to save settings');
    } finally {
      setSubmitting(false);
    }
  };

  const addKeyword = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newKeyword.trim()) {
      if (!keywords.includes(newKeyword.trim())) {
        setKeywords([...keywords, newKeyword.trim()]);
      }
      setNewKeyword('');
    }
  };

  const removeKeyword = (keyword: string) => {
    setKeywords(keywords.filter(k => k !== keyword));
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl text-gray-900">Settings & Optimization</h1>
        <p className="text-gray-500 mt-1">Manage your account, verify your business, and optimize reach.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Sidebar Navigation */}
        <div className="w-full lg:w-64 flex-shrink-0">
          <nav className="space-y-1">
            {[
              { id: 'profile', label: 'Profile & Branding', icon: User },
              { id: 'verification', label: 'Verification Center', icon: ShieldCheck },
              { id: 'optimization', label: 'Radius & SEO', icon: Globe },
              { id: 'notifications', label: 'Notifications', icon: Bell },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as 'profile' | 'verification' | 'optimization' | 'notifications')}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm rounded transition-all ${
                  activeTab === item.id 
                    ? 'bg-blue-50 text-brand-blue shadow-sm ring-1 ring-blue-200' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 space-y-6">
          
          {/* Profile Settings */}
          {activeTab === 'profile' && (
            <div className="bg-white rounded border border-gray-300 shadow-sm p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-lg text-brand-dark mb-6">Profile Details</h2>
              
              <div className="flex items-center gap-6 mb-8">
                <div className="h-24 w-24 rounded-full bg-gray-100 border-4 border-white shadow-lg flex items-center justify-center overflow-hidden relative group cursor-pointer">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User size={30} className="text-gray-400" />
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                    <Upload size={20} />
                  </div>
                </div>
                <div>
                  <h3 className="text-brand-dark">Profile Picture</h3>
                  <p className="text-xs text-gray-500 mb-3 pt-1">PNG, JPG up to 5MB</p>
                  <button className="px-4 py-2 bg-brand-dark border border-gray-300 rounded text-sm font-medium text-gray-100 hover:bg-gray-50 transition-colors">
                    Upload New
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input 
                    type="text" 
                    value={profile.full_name}
                    onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                  <input 
                    type="email" 
                    value={profile.email}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded bg-gray-50 text-gray-500 outline-none text-sm" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input 
                    type="tel" 
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
                  <input 
                    type="text" 
                    value={profile.job_title}
                    onChange={(e) => setProfile({ ...profile, job_title: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm" 
                  />
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-gray-200 flex justify-end">
                <button 
                  onClick={handleSaveProfile}
                  disabled={submitting}
                  className="px-6 py-2.5 bg-brand-dark text-white rounded text-sm hover:bg-brand-light transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Save Changes
                </button>
              </div>
            </div>
          )}

          {/* Verification Center */}
          {activeTab === 'verification' && (
            <div className="bg-white rounded border border-gray-300 shadow-sm p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-lg text-brand-dark flex items-center gap-2">
                    Verification Status
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                      verification?.status === 'approved' ? 'bg-green-50 text-green-700 border-green-100' :
                      verification?.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-100' :
                      'bg-amber-50 text-amber-700 border-amber-100'
                    }`}>
                      {verification?.status || 'Not Started'}
                    </span>
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">Get the blue tick to build trust with customers.</p>
                </div>
                <ShieldCheck size={32} className={verification?.status === 'approved' ? "text-blue-500" : "text-gray-300"} />
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-8">
                <h4 className="text-sm font-medium text-brand-dark mb-2">Why verify?</h4>
                <ul className="text-sm text-brand-blue space-y-1 list-disc list-inside">
                  <li>Higher ranking in search results</li>
                  <li>&quot;Verified&quot; badge on your profile</li>
                  <li>Access to premium analytics</li>
                </ul>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-brand-dark mb-2">Business Registration (BR) Document</label>
                  <div className="border-2 border-dashed border-gray-300 rounded p-8 flex flex-col items-center justify-center text-gray-500 hover:border-blue-500 hover:bg-blue-50 transition-colors cursor-pointer">
                    <Upload size={24} className="mb-2" />
                    <p className="text-sm">{verification?.br_document_url ? 'Document uploaded' : 'Click to upload or drag and drop'}</p>
                    <p className="text-xs text-gray-400 mt-1">PDF, JPG up to 10MB</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-brand-dark mb-2">NIC / Passport (Owner)</label>
                  <div className="border-2 border-dashed border-gray-300 rounded p-8 flex flex-col items-center justify-center text-gray-500 hover:border-blue-500 hover:bg-blue-50 transition-colors cursor-pointer">
                    <Upload size={24} className="mb-2" />
                    <p className="text-sm">{verification?.nic_passport_url ? 'Document uploaded' : 'Click to upload or drag and drop'}</p>
                    <p className="text-xs text-gray-400 mt-1">Front & Back sides</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-gray-200 flex justify-end">
                <button 
                  disabled={verification?.status === 'pending' || verification?.status === 'approved'}
                  className="px-6 py-2.5 bg-brand-dark text-white rounded text-sm font-medium  transition-colors shadow-sm disabled:opacity-50"
                >
                  {verification?.status === 'pending' ? 'Under Review' : 'Submit for Review'}
                </button>
              </div>
            </div>
          )}

          {/* Optimization (Radius & SEO) */}
          {activeTab === 'optimization' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              <div className="bg-white rounded border border-gray-300 shadow-sm p-6 md:p-8">
                <label className="block text-sm font-medium text-brand-dark mb-2">Select Business to Optimize</label>
                <select 
                  value={selectedBusinessId}
                  onChange={(e) => {
                    const b = businesses.find(bus => bus.id === e.target.value);
                    if (b) {
                      setSelectedBusinessId(b.id);
                      setRadius([b.service_radius || 5]);
                      setKeywords(b.seo_keywords || []);
                    }
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm bg-white"
                >
                  {businesses.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              {/* Radius Card */}
              <div className="bg-white rounded border border-gray-300 shadow-sm p-6 md:p-8">
                <h2 className="text-lg text-brand-dark mb-4 flex items-center gap-2">
                  <MapPin size={16} className="text-brand-blue" /> Service Radius
                </h2>
                <p className="text-sm text-gray-500 mb-8">Define how far your business reaches. Customers within this range will see your ads more often.</p>

                <div className="mb-8 px-2">
                  <div className="flex justify-between mb-4">
                    <span className="text-sm font-medium text-brand-dark">Range</span>
                    <span className="text-sm font-medium text-brand-dark bg-blue-50 px-2 py-0.5 rounded">{radius[0]} km</span>
                  </div>
                  <Slider 
                    value={radius} 
                    max={50} 
                    step={1} 
                    onValueChange={(val) => setRadius(val)}
                    className="py-4"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-2">
                    <span>1 km</span>
                    <span>50 km</span>
                  </div>
                </div>

                {/* Mock Map Preview */}
                <div className="h-48 bg-gray-100 rounded border border-gray-300 flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 opacity-20 bg-[url('https://upload.wikimedia.org/wikipedia/commons/e/ec/Colombo_city_map.png')] bg-cover bg-center"></div>
                  <div 
                    className="rounded-full bg-blue-500/20 border-2 border-brand-blue flex items-center justify-center relative z-10 animate-pulse transition-all duration-300"
                    style={{ width: `${radius[0] * 6}px`, height: `${radius[0] * 6}px`, maxWidth: '100%', maxHeight: '100%' }}
                  >
                    <div className="w-3 h-3 bg-brand-blue rounded-full shadow-lg"></div>
                  </div>
                  <p className="absolute bottom-2 right-2 text-[10px] text-gray-500 bg-white/80 px-2 py-1 rounded">Map Preview</p>
                </div>
              </div>

              {/* SEO Card */}
              <div className="bg-white rounded border border-gray-300 shadow-sm p-6 md:p-8">
                <h2 className="text-lg text-brand-dark mb-4 flex items-center gap-2">
                  <Search size={16} className="text-brand-blue" /> Local SEO Keywords
                </h2>
                <p className="text-sm text-gray-500 mb-6">Add keywords to help customers find you. We recommend 5-10 relevant tags.</p>

                <div className="relative mb-4">
                  <input 
                    type="text" 
                    placeholder="Type a keyword and press Enter..." 
                    className="w-full pl-4 pr-12 py-2.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm"
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    onKeyDown={addKeyword}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                    ↵ Enter
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {keywords.map((keyword) => (
                    <span key={keyword} className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-brand-blue rounded text-sm font-medium border border-gray-300 group hover:bg-gray-100 transition-colors">
                      {keyword}
                      <button onClick={() => removeKeyword(keyword)} className="text-gray-400 hover:text-red-500 transition-colors">
                        &times;
                      </button>
                    </span>
                  ))}
                </div>

                <div className="mt-8 pt-8 border-t border-gray-200 flex justify-end">
                  <button 
                    onClick={handleSaveOptimization}
                    disabled={submitting || !selectedBusinessId}
                    className="px-6 py-2.5 bg-brand-dark text-white rounded text-sm hover:bg-brand-light transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50"
                  >
                    {submitting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Save Optimization
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Notifications */}
          {activeTab === 'notifications' && (
            <div className="bg-white rounded border border-gray-300 shadow-sm p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-lg text-brand-dark mb-6">Notification Preferences</h2>
              
              <div className="space-y-6">
                {[
                  { title: 'New Reviews', desc: 'Get notified when a customer writes a review.' },
                  { title: 'New Leads', desc: 'Instant alert for new customer enquiries.' },
                  { title: 'Weekly Report', desc: 'A summary of your business performance.' },
                  { title: 'Marketing Tips', desc: 'Tips to improve your reach and sales.' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between pb-6 border-b border-gray-100 last:border-0 last:pb-0">
                    <div>
                      <h4 className="text-sm text-brand-blue">{item.title}</h4>
                      <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked={i < 2} />
                      <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-1 peer-focus:ring-[#2a7db4] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2a7db4]"></div>
                    </label>
                  </div>
                ))}
              </div>

              <div className="mt-8 pt-8 border-t border-gray-300">
                <h3 className="text-sm text-red-600 mb-4 flex items-center gap-2">
                  <AlertTriangle size={16} /> Danger Zone
                </h3>
                <div className="flex items-center justify-between p-4 bg-red-50 rounded border border-red-100">
                  <div>
                    <p className="text-sm text-red-900">Deactivate Account</p>
                    <p className="text-xs text-red-700 mt-1">Temporarily hide your businesses.</p>
                  </div>
                  <button className="px-4 py-2 bg-white border border-red-200 text-red-600 rounded text-xs  hover:bg-red-600 hover:text-white transition-colors">
                    Deactivate
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
