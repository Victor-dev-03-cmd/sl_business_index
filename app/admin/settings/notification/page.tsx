'use client';

import React from 'react';
import { Bell, Mail, MessageSquare, Save } from 'lucide-react';

export default function NotificationSettingsPage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-100">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="h-5 w-5 text-red-500" /> Notifications
          </h1>
          <p className="text-sm text-gray-500 mt-1 font-normal">Configure automated alerts and communication channels.</p>
        </div>
        <button 
          className="flex items-center gap-2 px-6 py-2 bg-brand-dark hover:bg-brand-blue text-white rounded-[6px] transition-all text-sm font-bold shadow-md hover:shadow-lg"
        >
          <Save size={16} /> Save Changes
        </button>
      </div>

      <div className="grid gap-6">
        <div className="p-6 bg-gray-50 rounded-[6px] border border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white rounded-full border border-gray-200">
              <Mail className="h-5 w-5 text-gray-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">Email Alerts</p>
              <p className="text-xs text-gray-500 font-normal">Send transactional emails for business approvals.</p>
            </div>
          </div>
          <div className="w-12 h-6 bg-green-500 rounded-full relative shadow-inner">
             <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
          </div>
        </div>

        <div className="p-6 bg-gray-50 rounded-[6px] border border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white rounded-full border border-gray-200">
              <MessageSquare className="h-5 w-5 text-gray-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">In-App Notifications</p>
              <p className="text-xs text-gray-500 font-normal">Display real-time alerts in the vendor dashboard.</p>
            </div>
          </div>
          <div className="w-12 h-6 bg-green-500 rounded-full relative shadow-inner">
             <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
          </div>
        </div>
      </div>
    </div>
  );
}
