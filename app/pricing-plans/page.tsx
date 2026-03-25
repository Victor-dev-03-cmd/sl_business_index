"use client";

import React from 'react';
import Link from 'next/link';
import { 
  CreditCard, 
  ArrowLeft, 
  Mail, 
  CheckCircle2, 
  MessageSquare, 
  Zap, 
  Star, 
  ShieldCheck, 
  BarChart3, 
  QrCode,
  TrendingUp,
  Target
} from 'lucide-react';
import { supabase } from "@/lib/supabaseClient";
import { useQuery } from "@tanstack/react-query";

export default function PricingPlansPage() {
  const { data: featureDefinitions = [] } = useQuery({
    queryKey: ["feature-definitions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'advanced_feature_definitions')
        .single();
      if (error) throw error;
      return data.value as { id: string; label: string }[];
    },
  });

  const { data: dbPlans = [], isLoading } = useQuery({
    queryKey: ["subscription-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .order("price_monthly", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const getTierIcon = (name: string) => {
    switch (name.toLowerCase()) {
      case 'professional':
      case 'plus':
        return <Zap size={18} className="text-brand-gold fill-brand-gold" />;
      case 'enterprise':
        return <Target size={18} className="text-purple-600" />;
      default:
        return <CheckCircle2 size={18} className="text-emerald-500" />;
    }
  };

  const getPlanFeatures = (tier: any) => {
    const list = [...(tier.features || [])];
    
    // Add max listings if present and not already in features
    if (tier.max_listings && !list.some(f => f.toLowerCase().includes('listing'))) {
      list.unshift(`${tier.max_listings === 9999 ? 'Unlimited' : tier.max_listings} Business Listing${tier.max_listings !== 1 ? 's' : ''}`);
    }

    // Add boolean features from definitions
    featureDefinitions.forEach(def => {
      if (tier[def.id] === true || tier.functional_features?.[def.id] === true) {
        if (!list.includes(def.label)) {
          list.push(def.label);
        }
      }
    });

    // Add advanced_feature_access explicitly if true
    if (tier.advanced_feature_access === true && !list.includes("Advanced Feature Access")) {
      list.push("Advanced Feature Access");
    }

    return list;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* Header Section */}
      <section className="bg-white border-b border-slate-300 pt-16 pb-24">
        <div className="max-w-7xl mx-auto px-6">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-brand-blue hover:text-brand-dark transition-colors mb-12 text-sm font-medium"
          >
            <ArrowLeft size={16} /> Back to Home
          </Link>
          
          <div className="max-w-3xl">
            <h1 className="text-3xl md:text-5xl text-slate-900 tracking-tight mb-6">
              Grow your business with <span className="text-brand-blue">SL Business Index</span>
            </h1>
            <p className="text-xl text-slate-600 leading-relaxed">
              Choose the perfect plan to showcase your business to thousands of daily visitors across Sri Lanka.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="-mt-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {isLoading ? (
              // Skeleton loaders
              [1, 2, 3].map((i) => (
                <div key={i} className="h-96 rounded bg-white border border-slate-300 animate-pulse shadow-sm" />
              ))
            ) : (
              dbPlans.map((tier: any) => {
                const isProfessional = tier.name.toLowerCase() === 'professional' || tier.name.toLowerCase() === 'plus';
                return (
                  <div 
                    key={tier.id}
                    className={`relative flex flex-col p-8 rounded bg-white border ${
                      isProfessional 
                        ? 'border-brand-blue ring-1 ring-brand-blue shadow scale-105 z-10' 
                        : 'border-slate-300 shadow-sm'
                    } transition-transform hover:translate-y-[-4px]`}
                  >
                    {isProfessional && (
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-brand-blue text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                        Most Popular
                      </div>
                    )}
                    
                    <div className="mb-8">
                      <h3 className="text-2xl text-slate-900 mb-2">{tier.name}</h3>
                      <p className="text-slate-500 text-sm leading-relaxed">{tier.description}</p>
                    </div>

                    <div className="mb-8">
                      <div className="flex items-baseline gap-1">
                        <span className="text-slate-500 font-medium text-lg">LKR</span>
                        <span className="text-4xl font-medium text-slate-900">
                          {tier.price_monthly === 0 ? '0' : tier.price_monthly.toLocaleString()}
                        </span>
                        {tier.price_monthly > 0 && <span className="text-slate-500 font-medium">/month</span>}
                      </div>
                    </div>

                    <ul className="space-y-4 flex-1">
                      {getPlanFeatures(tier).map((feature: string) => (
                        <li key={feature} className="flex items-start gap-3 text-slate-600 text-sm leading-tight">
                          <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* Feature Highlight Section */}
      <section className="py-24 max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl text-slate-900 mb-4">Why upgrade to Premium?</h2>
          <p className="text-slate-600">Unlock powerful tools to dominate your local market.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="bg-white p-6 rounded border border-slate-300 shadow-sm">
            <div className="w-12 h-12 bg-blue-50 rounded flex items-center justify-center text-brand-blue mb-4">
              <ShieldCheck size={24} />
            </div>
            <h4 className="font-medium mb-2">Build Trust</h4>
            <p className="text-sm text-slate-500">Get the blue verification badge and instantly win customer confidence.</p>
          </div>
          
          <div className="bg-white p-6 rounded border border-slate-300 shadow-sm">
            <div className="w-12 h-12 bg-amber-50 rounded flex items-center justify-center text-amber-600 mb-4">
              <TrendingUp size={24} />
            </div>
            <h4 className="font-medium mb-2">Rank Higher</h4>
            <p className="text-sm text-slate-500">Appear at the top of search results when customers look for your services.</p>
          </div>

          <div className="bg-white p-6 rounded border border-slate-300 shadow-sm">
            <div className="w-12 h-12 bg-emerald-50 rounded flex items-center justify-center text-emerald-600 mb-4">
              <QrCode size={24} />
            </div>
            <h4 className="font-medium mb-2">Offline Reach</h4>
            <p className="text-sm text-slate-500">Receive a professional QR poster to bridge your physical shop and digital profile.</p>
          </div>

          <div className="bg-white p-6 rounded border border-slate-300 shadow-sm">
            <div className="w-12 h-12 bg-purple-50 rounded flex items-center justify-center text-purple-600 mb-4">
              <BarChart3 size={24} />
            </div>
            <h4 className="font-medium mb-2">Smart Insights</h4>
            <p className="text-sm text-slate-500">Track how many customers called, visited, or searched for you.</p>
          </div>
        </div>
      </section>

      {/* Admin Billing / Help Section */}
      <section className="max-w-7xl mx-auto px-6">
        <div className="bg-slate-900 rounded p-8 md:p-16 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 opacity-10 translate-x-1/4 -translate-y-1/4">
            <Star size={300} strokeWidth={0.5} />
          </div>
          
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-gray-200 text-brand-blue px-4 py-1.5 rounded text-sm font-medium mb-6">
                <Target size={16} />
                <span>Enterprise Support</span>
              </div>
              <h2 className="text-3xl md:text-4xl mb-6 leading-tight">Admin Billing & Custom Connections</h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                Need a custom package for multiple branches? Or want to discuss bulk verification? Our admin team is ready to help you set up the perfect billing cycle and connection. Contact us at <span className="text-brand-blue font-bold">slbusinessindex@gmail.com</span> for more information.
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-sm">
                <p className="text-brand-blue font-bold mb-1">Billing Help</p>
                <p className="text-sm text-slate-400">Get invoices, receipts, and payment method assistance.</p>
              </div>
              <div className="bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-sm">
                <p className="text-brand-blue font-bold mb-1">Ad Campaigns</p>
                <p className="text-sm text-slate-400">Target specific districts or towns with featured ads.</p>
              </div>
              <div className="bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-sm">
                <p className="text-brand-blue font-bold mb-1">Verification</p>
                <p className="text-sm text-slate-400">Bulk verify multiple business locations in one go.</p>
              </div>
              <div className="bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-sm">
                <p className="text-brand-blue font-bold mb-1">API Setup</p>
                <p className="text-sm text-slate-400">Sync your local inventory with our search results.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

