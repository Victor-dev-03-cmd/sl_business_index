import React from 'react';
import Link from 'next/link';
import { Shield, ArrowLeft, Mail, MapPin, Globe } from 'lucide-react';

export default function PrivacyPolicyPage() {
  const effectiveDate = "March 25, 2026";

  return (
    <div className="min-h-screen bg-white font-normal">
      {/* Header */}
      <section className="relative py-20 bg-gray-50 border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-brand-blue hover:text-brand-dark transition-colors mb-8 text-sm font-medium"
          >
            <ArrowLeft size={16} /> Back to Home
          </Link>
          <div className="flex items-center gap-4 mb-4 text-brand-blue">
            <div className="p-3 bg-white rounded-xl border border-blue-100 shadow-sm">
              <Shield size={32} />
            </div>
            <h1 className="text-4xl md:text-5xl font-normal text-gray-900 tracking-tight">
              Privacy Policy
            </h1>
          </div>
          <p className="text-gray-500 text-lg">
            Effective Date: {effectiveDate}
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-6 prose prose-blue prose-lg">
          <p className="text-gray-600 leading-relaxed mb-12">
            At SL Business Index, we are committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you visit our website and use our services.
          </p>

          <div className="space-y-12">
            <div>
              <h2 className="text-2xl font-normal text-gray-900 mb-4 flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-blue/10 text-brand-blue text-sm font-bold">1</span>
                Information We Collect
              </h2>
              <p className="text-gray-600 mb-4">We collect information to provide better services to all our users:</p>
              <ul className="list-none space-y-4 text-gray-600 pl-4 border-l-2 border-blue-50">
                <li><strong className="text-gray-900">Business Owners:</strong> When you register a business, we collect your name, business name, address, contact numbers, email, and business location (GPS coordinates).</li>
                <li><strong className="text-gray-900">Users/Visitors:</strong> We collect information about how you interact with our site, including search queries, viewed listings, and device information (IP address, browser type).</li>
                <li><strong className="text-gray-900">QR Code Usage:</strong> When you scan a physical QR code from our platform, we may collect the time of the scan and the specific business accessed.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-normal text-gray-900 mb-4 flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-blue/10 text-brand-blue text-sm font-bold">2</span>
                How We Use Your Information
              </h2>
              <p className="text-gray-600 mb-4">We use the collected data for the following purposes:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-600">
                <li>To maintain and display your business profile in our directory.</li>
                <li>To enable "Nearby Search" features using your location data.</li>
                <li>To provide analytics to business owners (e.g., how many people viewed your profile).</li>
                <li>To improve our website's performance and user experience.</li>
                <li>To communicate important updates or promotional offers.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-normal text-gray-900 mb-4 flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-blue/10 text-brand-blue text-sm font-bold">3</span>
                Data Sharing & Disclosure
              </h2>
              <p className="text-gray-600 mb-4">We do not sell your personal data. However, please note:</p>
              <ul className="list-none space-y-4 text-gray-600 pl-4 border-l-2 border-blue-50">
                <li><strong className="text-gray-900">Public Profiles:</strong> Business information you provide (phone numbers, addresses) is intended to be public so users can find and contact you.</li>
                <li><strong className="text-gray-900">Service Providers:</strong> We may share data with trusted third-party services (like Supabase for database management or Mapbox for maps) to operate our platform.</li>
                <li><strong className="text-gray-900">Legal Requirements:</strong> We may disclose information if required by the laws of Sri Lanka or to protect our legal rights.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-normal text-gray-900 mb-4 flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-blue/10 text-brand-blue text-sm font-bold">4</span>
                Cookies and Tracking
              </h2>
              <p className="text-gray-600 leading-relaxed">
                We use cookies to enhance your experience, remember your preferences, and analyze site traffic. You can choose to disable cookies through your browser settings, but it may affect some features of our website.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-normal text-gray-900 mb-4 flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-blue/10 text-brand-blue text-sm font-bold">5</span>
                Data Security
              </h2>
              <p className="text-gray-600 leading-relaxed">
                We implement industry-standard security measures (such as SSL encryption and secure database protocols via Supabase) to protect your data from unauthorized access, alteration, or disclosure.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-normal text-gray-900 mb-4 flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-blue/10 text-brand-blue text-sm font-bold">6</span>
                Your Rights
              </h2>
              <p className="text-gray-600 mb-4">You have the right to:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-600">
                <li>Access, update, or delete your business information at any time via your Dashboard.</li>
                <li>Opt-out of marketing communications.</li>
                <li>Request a copy of the personal data we hold about you.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-normal text-gray-900 mb-4 flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-blue/10 text-brand-blue text-sm font-bold">7</span>
                Changes to This Policy
              </h2>
              <p className="text-gray-600 leading-relaxed">
                We may update our Privacy Policy from time to time. Any changes will be posted on this page with an updated effective date.
              </p>
            </div>

            <div className="bg-gray-50 p-8 rounded-2xl border border-gray-200">
              <h2 className="text-2xl font-normal text-gray-900 mb-6 flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-blue/10 text-brand-blue text-sm font-bold">8</span>
                Contact Us
              </h2>
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-gray-600">
                  <Mail size={18} className="text-brand-blue" />
                  <span>Email: contact@slbusinessindex.com</span>
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <MapPin size={18} className="text-brand-blue" />
                  <span>Location: Sri Lanka</span>
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <Globe size={18} className="text-brand-blue" />
                  <Link href="https://slbusinessindex.com" className="hover:underline">slbusinessindex.com</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
