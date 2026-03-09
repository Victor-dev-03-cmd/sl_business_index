'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import MarketingDesignEditor from './components/MarketingDesignEditor';
import { 
  Calendar, 
  Share2, 
  Download, 
  Type, 
  Palette, 
  Facebook,
  Instagram,
  Linkedin,
  Send,
  Loader2,
  CheckCircle2,
  Clock,
  Sparkles
} from 'lucide-react';

interface Business {
  id: string;
  name: string;
}

interface Campaign {
  id: string;
  business_id: string;
  banner_text: string;
  banner_color: string;
  platforms: string[];
  scheduled_at: string | null;
  status: string;
  created_at: string;
  businesses: { name: string };
}

export default function MarketingPage() {
  const [activeTab, setActiveTab] = useState<'create' | 'schedule' | 'history'>('create');
  const [showEditor, setShowEditor] = useState(false);
  const [bannerText, setBannerText] = useState('Special Offer!');
  const [bannerColor, setBannerColor] = useState('bg-emerald-600');
  const [selectedPlatform, setSelectedPlatform] = useState<string[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>('');
  const [scheduledAt, setScheduledAt] = useState<string>('');
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch businesses
      const { data: businessData } = await supabase
        .from('businesses')
        .select('id, name')
        .eq('owner_id', user.id);
      
      if (businessData) {
        setBusinesses(businessData);
        if (businessData.length > 0) {
          setSelectedBusinessId(businessData[0].id);
        }
      }

      // Fetch campaign history
      const { data: campaignData } = await supabase
        .from('marketing_campaigns')
        .select('*, businesses(name)')
        .order('created_at', { ascending: false });
      
      if (campaignData) {
        setCampaigns(campaignData);
      }
    } catch (error) {
      console.error('Error fetching marketing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePlatform = (platform: string) => {
    if (selectedPlatform.includes(platform)) {
      setSelectedPlatform(selectedPlatform.filter(p => p !== platform));
    } else {
      setSelectedPlatform([...selectedPlatform, platform]);
    }
  };

  const handleCampaignAction = async (isSchedule: boolean) => {
    if (!selectedBusinessId) {
      alert('Please select a business');
      return;
    }

    if (isSchedule && !scheduledAt) {
      alert('Please select a schedule date');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('marketing_campaigns')
        .insert({
          business_id: selectedBusinessId,
          banner_text: bannerText,
          banner_color: bannerColor,
          platforms: selectedPlatform,
          scheduled_at: isSchedule ? scheduledAt : null,
          status: isSchedule ? 'scheduled' : 'posted'
        });

      if (error) throw error;

      alert(isSchedule ? 'Campaign scheduled successfully!' : 'Campaign posted successfully!');
      setActiveTab('history');
      fetchData();
    } catch (error) {
      console.error('Error saving campaign:', error);
      alert('Failed to save campaign');
    } finally {
      setSubmitting(false);
    }
  };

  if (showEditor) {
    return <MarketingDesignEditor onBackAction={() => setShowEditor(false)} />;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl text-gray-900 font-bold">Marketing & Automation</h1>
          <p className="text-gray-500 mt-1">Create, schedule, and automate your business promotions.</p>
        </div>
        <button 
          onClick={() => setShowEditor(true)}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 hover:scale-[1.02] transition-all"
        >
          <Sparkles size={20} /> Open Pro Design Editor
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-300">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('create')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 text-sm flex items-center gap-2 ${
              activeTab === 'create'
                ? 'botext-brand-dark text-brand-dark'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Palette size={18} /> Banner Creator
          </button>
          <button
            onClick={() => setActiveTab('schedule')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 text-sm flex items-center gap-2 ${
              activeTab === 'schedule'
                ? 'border-brand-dark text-brand-dark'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Calendar size={18} /> Scheduler
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 text-sm flex items-center gap-2 ${
              activeTab === 'history'
                ? 'border-brand-dark text-brand-dark'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Share2 size={18} /> History
          </button>
        </nav>
      </div>

      {/* Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left: Editor / Controls */}
        <div className="lg:col-span-1 space-y-6">
          {activeTab !== 'history' && (
            <div className="bg-white p-6 rounded border border-gray-300 shadow-sm space-y-6">
              <div>
                <label className="block text-sm text-brand-dark mb-2">Target Business</label>
                <select 
                  value={selectedBusinessId}
                  onChange={(e) => setSelectedBusinessId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm bg-white"
                >
                  {businesses.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-brand-dark mb-2">Banner Text</label>
                <div className="relative">
                  <Type className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input 
                    type="text" 
                    value={bannerText}
                    onChange={(e) => setBannerText(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-brand-dark mb-2">Background Color</label>
                <div className="flex gap-2 flex-wrap">
                  {['bg-emerald-600', 'bg-blue-600', 'bg-purple-600', 'bg-rose-600', 'bg-amber-500', 'bg-gray-900'].map((color) => (
                    <button
                      key={color}
                      onClick={() => setBannerColor(color)}
                      className={`w-8 h-8 rounded-full ${color} ${bannerColor === color ? 'ring-2 ring-offset-2 ring-gray-400' : ''}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="bg-white rounded border border-gray-300 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-300 bg-gray-50 font-bold text-sm">Recent Campaigns</div>
              <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
                {loading ? (
                  <div className="p-8 text-center text-gray-500 flex justify-center items-center gap-2">
                    <Loader2 className="animate-spin" size={16} /> Loading history...
                  </div>
                ) : campaigns.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 italic text-sm">No campaigns found.</div>
                ) : (
                  campaigns.map((c) => (
                    <div key={c.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-bold text-gray-900 truncate pr-2">{c.businesses?.name}</span>
                        {c.status === 'posted' ? (
                          <span className="text-[10px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded flex items-center gap-1 border border-green-100">
                            <CheckCircle2 size={10} /> Live
                          </span>
                        ) : (
                          <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded flex items-center gap-1 border border-amber-100">
                            <Clock size={10} /> {c.status}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">&quot;{c.banner_text}&quot;</p>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-gray-400">{new Date(c.created_at).toLocaleDateString()}</span>
                        <div className="flex gap-1">
                          {c.platforms?.map((p: string) => (
                            <div key={p} className="w-4 h-4 text-gray-400">
                              {p === 'facebook' && <Facebook size={12} />}
                              {p === 'instagram' && <Instagram size={12} />}
                              {p === 'linkedin' && <Linkedin size={12} />}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Social Share Controls (Only for create/schedule) */}
          {activeTab !== 'history' && (
            <div className="bg-white p-6 rounded border border-gray-300 shadow-sm space-y-4">
              <h3 className="text-sm text-brand-dark">Share to Social Media</h3>
              <div className="flex gap-3">
                <button 
                  onClick={() => togglePlatform('facebook')}
                  className={`flex-1 py-2 rounded border flex items-center justify-center gap-2 transition-all ${selectedPlatform.includes('facebook') ? 'bg-blue-50 border-blue-200 text-blue-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                >
                  <Facebook size={18} />
                </button>
                <button 
                  onClick={() => togglePlatform('instagram')}
                  className={`flex-1 py-2 rounded border flex items-center justify-center gap-2 transition-all ${selectedPlatform.includes('instagram') ? 'bg-pink-50 border-pink-200 text-pink-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                >
                  <Instagram size={18} />
                </button>
                <button
                  onClick={() => togglePlatform('linkedin')}
                  className={`flex-1 py-2 rounded border flex items-center justify-center gap-2 transition-all ${selectedPlatform.includes('linkedin') ? 'bg-blue-50 border-blue-200 text-blue-800' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                >
                  <Linkedin size={18} />
                </button>
              </div>
              
              {activeTab === 'schedule' && (
                <div>
                  <label className="block text-sm text-brand-dark mb-2">Schedule Date & Time</label>
                  <input 
                    type="datetime-local" 
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none" 
                  />
                </div>
              )}

              <button 
                onClick={() => handleCampaignAction(activeTab === 'schedule')}
                disabled={submitting}
                className="w-full py-2.5 bg-brand-dark text-white rounded transition-colors flex items-center justify-center gap-2 shadow disabled:opacity-50"
              >
                {submitting ? <Loader2 className="animate-spin" size={16} /> : (activeTab === 'schedule' ? <Calendar size={16} /> : <Send size={16} />)}
                {activeTab === 'schedule' ? 'Schedule Post' : 'Post Now'}
              </button>
            </div>
          )}
        </div>

        {/* Right: Preview Area */}
        <div className="lg:col-span-2">
          <div className="bg-gray-100 rounded border border-gray-300 p-8 flex items-center justify-center min-h-[500px]">
            {/* Banner Preview */}
            <div className={`w-full max-w-lg aspect-square ${bannerColor} rounded shadow-2xl flex flex-col items-center justify-center p-8 text-center transition-colors duration-300 relative overflow-hidden group`}>
              <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors"></div>
              
              {/* Mock Content */}
              <div className="relative z-10">
                <h2 className="text-4xl md:text-5xl text-white mb-4 drop-shadow-md">{bannerText}</h2>
                <p className="text-white/90 text-lg mb-8">Limited time offer. Visit us today!</p>
                <div className="bg-white text-gray-900 px-6 py-2 rounded font-bold text-sm uppercase tracking-wider shadow-lg">
                  Shop Now
                </div>
              </div>

              {/* Watermark */}
              <div className="absolute bottom-4 right-4 text-white/30 text-xs">
                Powered by SL Business
              </div>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button 
              onClick={() => alert('Banner download functionality is currently being optimized. Please use the "Post Now" feature to go live immediately.')}
              className="text-sm text-gray-500 hover:text-[#053765] flex items-center gap-1 transition-colors"
            >
              <Download size={16} /> Download Preview
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
