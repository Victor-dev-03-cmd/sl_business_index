'use client';

import { useState } from 'react';
import { 
  Megaphone, 
  Image as ImageIcon, 
  Calendar, 
  Share2, 
  Download, 
  Type, 
  Palette, 
  Layout,
  Facebook,
  Instagram,
  Linkedin,
  Send
} from 'lucide-react';

export default function MarketingPage() {
  const [activeTab, setActiveTab] = useState<'create' | 'schedule' | 'history'>('create');
  const [bannerText, setBannerText] = useState('Special Offer!');
  const [bannerColor, setBannerColor] = useState('bg-emerald-600');
  const [selectedPlatform, setSelectedPlatform] = useState<string[]>([]);

  const togglePlatform = (platform: string) => {
    if (selectedPlatform.includes(platform)) {
      setSelectedPlatform(selectedPlatform.filter(p => p !== platform));
    } else {
      setSelectedPlatform([...selectedPlatform, platform]);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl text-gray-900">Marketing & Automation</h1>
        <p className="text-gray-500 mt-1">Create, schedule, and automate your business promotions.</p>
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
          {activeTab === 'create' && (
            <div className="bg-white p-6 rounded border border-gray-300 shadow-sm space-y-6">
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

              <div>
                <label className="block text-sm text-brand-dark mb-2">Add Image</label>
                <div className="border-2 border-dashed border-gray-300 rounded p-6 flex flex-col items-center justify-center text-gray-500 hover:border-blue-500 hover:bg-emerald-50 transition-colors cursor-pointer">
                  <ImageIcon className="h-8 w-8 mb-2" />
                  <span className="text-xs">Click to upload</span>
                </div>
              </div>
            </div>
          )}

          {/* Social Share Controls (Always visible for create/schedule) */}
          {(activeTab === 'create' || activeTab === 'schedule') && (
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
                  <input type="datetime-local" className="w-full px-4 py-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none" />
                </div>
              )}

              <button className="w-full py-2.5 bg-brand-dark text-white rounded transition-colors flex items-center justify-center gap-2 shadow">
                {activeTab === 'schedule' ? <Calendar size={16} /> : <Send size={16} />}
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
            <button className="text-sm text-gray-500 hover:text-[#053765] flex items-center gap-1 transition-colors">
              <Download size={16} /> Download Preview
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
