'use client';

import React from 'react';
import { Wrench, Code, Save, Layout, Smartphone } from 'lucide-react';

export default function CustomizationSettingsPage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-100">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Wrench className="h-5 w-5 text-indigo-600" /> Customization
          </h1>
          <p className="text-sm text-gray-500 mt-1 font-normal">Advanced UI overrides and global layout overrides.</p>
        </div>
        <button 
          className="flex items-center gap-2 px-6 py-2 bg-brand-dark hover:bg-brand-blue text-white rounded-[6px] transition-all text-sm font-bold shadow-md hover:shadow-lg"
        >
          <Save size={16} /> Save Changes
        </button>
      </div>

      <div className="grid gap-8">
        <div className="space-y-4">
          <label className="text-sm font-bold text-gray-700 flex items-center gap-2 tracking-tight">
             <Code size={14} className="text-gray-400" /> Global Custom CSS
          </label>
          <div className="bg-gray-900 rounded-[6px] p-4 font-mono text-xs text-brand-sand/80 h-48 border border-gray-800 shadow-inner">
             /* Inject custom styles into the platform */
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="p-6 bg-gray-50 rounded-[6px] border border-gray-100 space-y-4">
             <div className="flex items-center gap-3">
               <Layout className="h-5 w-5 text-gray-400" />
               <p className="text-sm font-bold text-gray-900">Sticky Navbar</p>
             </div>
             <p className="text-xs text-gray-500 font-normal">Keep the navigation bar visible while scrolling.</p>
             <div className="w-12 h-6 bg-green-500 rounded-full relative shadow-inner">
                <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
             </div>
          </div>

          <div className="p-6 bg-gray-50 rounded-[6px] border border-gray-100 space-y-4">
             <div className="flex items-center gap-3">
               <Smartphone className="h-5 w-5 text-gray-400" />
               <p className="text-sm font-bold text-gray-900">Mobile Tab Bar</p>
             </div>
             <p className="text-xs text-gray-500 font-normal">Display a bottom navigation bar on mobile devices.</p>
             <div className="w-12 h-6 bg-gray-200 rounded-full relative shadow-inner">
                <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
