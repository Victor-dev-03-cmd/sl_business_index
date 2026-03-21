'use client';

import Link from 'next/link';
import Image from 'next/image';
import { AlertCircle, ArrowLeft } from 'lucide-react';

export default function AuthCodeError() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-lg text-center">
        {/* Logo Integration */}
        <div className="flex justify-center mb-4">
          <Link href="/">
            <Image src="/logo.png" alt="Logo" width={140} height={45} />
          </Link>
        </div>

        <div className="flex justify-center">
          <AlertCircle className="w-16 h-16 text-red-500" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-800">Authentication Error</h1>
        
        <div className="bg-red-50 border border-red-100 p-4 rounded-lg text-left">
          <p className="text-sm text-red-700 font-medium">
            We couldn't verify your login link. This can happen if:
          </p>
          <ul className="text-xs text-red-600 mt-2 list-disc list-inside space-y-1">
            <li>The link has expired (they are only valid for a limited time)</li>
            <li>The link has already been used</li>
            <li>The link was copied incorrectly</li>
          </ul>
        </div>
        
        <p className="text-gray-600 text-sm">
          Please try requesting a new link or log in with your credentials.
        </p>
        
        <div className="pt-4 space-y-3">
          <Link
            href="/login"
            className="block w-full px-4 py-3 text-sm font-bold text-white bg-brand-dark rounded-lg hover:bg-brand-blue transition-all shadow-sm"
          >
            Back to Login
          </Link>
          
          <Link
            href="/"
            className="flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-brand-dark transition-colors"
          >
            <ArrowLeft size={14} />
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
