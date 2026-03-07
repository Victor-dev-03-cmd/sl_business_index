'use client';

import { useState } from 'react';
import { 
  User, 
  ShieldCheck, 
  MapPin, 
  Bell,
  Zap, 
  Lock, 
  Save, 
  Upload, 
  Globe, 
  Search,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { Slider } from "@/components/ui/slider";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'verification' | 'optimization' | 'notifications'>('profile');
  const [radius, setRadius] = useState([5]);
  const [keywords, setKeywords] = useState(['Bakery', 'Cakes', 'Wedding']);
  const [newKeyword, setNewKeyword] = useState('');

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
                onClick={() => setActiveTab(item.id as any)}
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
                  <User size={30} className="text-gray-400" />
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
                  <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                  <input type="email" className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input type="tel" className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
                  <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm" />
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-gray-200 flex justify-end">
                <button className="px-6 py-2.5 bg-brand-dark text-white rounded text-sm hover:bg-brand-light transition-colors shadow-sm flex items-center gap-2">
                  <Save size={18} /> Save Changes
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
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs font-medium border border-amber-100">Pending</span>
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">Get the blue tick to build trust with customers.</p>
                </div>
                <ShieldCheck size={32} className="text-gray-300" />
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-8">
                <h4 className="text-sm font-medium text-brand-dark mb-2">Why verify?</h4>
                <ul className="text-sm text-brand-blue space-y-1 list-disc list-inside">
                  <li>Higher ranking in search results</li>
                  <li>"Verified" badge on your profile</li>
                  <li>Access to premium analytics</li>
                </ul>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-brand-dark mb-2">Business Registration (BR) Document</label>
                  <div className="border-2 border-dashed border-gray-300 rounded p-8 flex flex-col items-center justify-center text-gray-500 hover:border-blue-500 hover:bg-blue-50 transition-colors cursor-pointer">
                    <Upload size={24} className="mb-2" />
                    <p className="text-sm">Click to upload or drag and drop</p>
                    <p className="text-xs text-gray-400 mt-1">PDF, JPG up to 10MB</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-brand-dark mb-2">NIC / Passport (Owner)</label>
                  <div className="border-2 border-dashed border-gray-300 rounded p-8 flex flex-col items-center justify-center text-gray-500 hover:border-blue-500 hover:bg-blue-50 transition-colors cursor-pointer">
                    <Upload size={24} className="mb-2" />
                    <p className="text-sm">Click to upload or drag and drop</p>
                    <p className="text-xs text-gray-400 mt-1">Front & Back sides</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-gray-200 flex justify-end">
                <button className="px-6 py-2.5 bg-brand-dark text-white rounded text-sm font-medium  transition-colors shadow-sm">
                  Submit for Review
                </button>
              </div>
            </div>
          )}

          {/* Optimization (Radius & SEO) */}
          {activeTab === 'optimization' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              
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
                    defaultValue={[5]} 
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
                  <div className="w-32 h-32 rounded-full bg-blue-500/20 border-2 border-brand-blue flex items-center justify-center relative z-10 animate-pulse">
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

                <div className="mt-6 p-4 bg-blue-50 rounded border border-blue-100">
                  <p className="text-sm  text-brand-dark mb-2 flex items-center gap-1">
                    <Zap size={12} /> AI Suggestion
                  </p>
                  <div className="flex gap-2">
                    {['Catering', 'Events', 'Party'].map(s => (
                      <button key={s} onClick={() => { if(!keywords.includes(s)) setKeywords([...keywords, s]) }} className="text-xs bg-white text-brand-blue px-2 py-1 rounded border border-brand-blue hover:border-brand-dark transition-colors">
                        + {s}
                      </button>
                    ))}
                  </div>
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
