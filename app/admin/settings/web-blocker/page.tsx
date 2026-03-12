'use client';

import React from 'react';
import { ShieldAlert, Globe, Save, Ban, Lock } from 'lucide-react';

export default function WebBlockerSettingsPage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-100">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-red-600" /> Web Blocker
          </h1>
          <p className="text-sm text-gray-500 mt-1 font-normal">Manage site security and access restrictions.</p>
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
             <Ban size={14} className="text-gray-400" /> Blacklisted Keywords
          </label>
          <textarea 
            rows={4}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-[6px] focus:outline-none focus:ring-1 focus:ring-brand-dark focus:bg-white transition-all font-normal text-sm"
            placeholder="Enter comma separated keywords to block in business names/descriptions..."
          />
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="p-6 bg-gray-50 rounded-[6px] border border-gray-100 space-y-4">
            <div className="flex items-center gap-3">
              <Globe className="h-5 w-5 text-gray-400" />
              <p className="text-sm font-bold text-gray-900">Spam Protection</p>
            </div>
            <p className="text-xs text-gray-500 font-normal">Automatically flag and hide business requests from suspicious domains.</p>
            <div className="w-12 h-6 bg-green-500 rounded-full relative shadow-inner">
               <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
            </div>
          </div>

          <div className="p-6 bg-gray-50 rounded-[6px] border border-gray-100 space-y-4">
            <div className="flex items-center gap-3">
              <Lock className="h-5 w-5 text-gray-400" />
              <p className="text-sm font-bold text-gray-900">Vendor Login Restrict</p>
            </div>
            <p className="text-xs text-gray-500 font-normal">Restrict vendor access during off-peak maintenance hours.</p>
            <div className="w-12 h-6 bg-gray-200 rounded-full relative shadow-inner">
               <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
