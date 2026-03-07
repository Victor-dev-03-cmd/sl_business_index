'use client';

import { useState } from 'react';
import { 
  CreditCard, 
  CheckCircle2, 
  Download, 
  Zap, 
  Shield, 
  Clock, 
  AlertCircle,
  ChevronRight
} from 'lucide-react';

export default function BillingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const plans = [
    {
      name: 'Free',
      price: 0,
      description: 'Perfect for getting started',
      features: ['1 Business Listing', 'Basic Analytics', 'Standard Support'],
      current: false,
    },
    {
      name: 'Pro',
      price: billingCycle === 'monthly' ? 29 : 290,
      description: 'Best for growing businesses',
      features: ['5 Business Listings', 'Advanced Analytics', 'Priority Support', 'Verified Badge', 'Social Media Auto-Post'],
      current: true,
      popular: true,
    },
    {
      name: 'Enterprise',
      price: billingCycle === 'monthly' ? 99 : 990,
      description: 'For large scale operations',
      features: ['Unlimited Listings', 'Dedicated Account Manager', 'API Access', 'Custom Branding', 'All Pro Features'],
      current: false,
    },
  ];

  const invoices = [
    { id: 'INV-2024-001', date: 'Oct 1, 2024', amount: '$29.00', status: 'Paid' },
    { id: 'INV-2024-002', date: 'Sep 1, 2024', amount: '$29.00', status: 'Paid' },
    { id: 'INV-2024-003', date: 'Aug 1, 2024', amount: '$29.00', status: 'Paid' },
  ];

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing & Subscription</h1>
        <p className="text-gray-500 mt-1">Manage your plan, payment methods, and invoices.</p>
      </div>

      {/* Current Plan Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Plan Details */}
        <div className="md:col-span-2 bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-32 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
          
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <p className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-1">Current Plan</p>
              <h2 className="text-3xl font-bold flex items-center gap-2">
                Pro Plan <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-full border border-emerald-500/30">Active</span>
              </h2>
              <p className="text-gray-400 text-sm mt-2">Renews on November 1, 2024</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold">$29<span className="text-lg text-gray-400 font-normal">/mo</span></p>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-700/50 grid grid-cols-2 gap-8">
            <div>
              <p className="text-gray-400 text-xs uppercase font-bold mb-2">Listings Used</p>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-bold">3</span>
                <span className="text-gray-500 mb-1">/ 5</span>
              </div>
              <div className="w-full h-1.5 bg-gray-700 rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-emerald-500 w-3/5 rounded-full"></div>
              </div>
            </div>
            <div>
              <p className="text-gray-400 text-xs uppercase font-bold mb-2">Leads This Month</p>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-bold">42</span>
                <span className="text-gray-500 mb-1">/ 100</span>
              </div>
              <div className="w-full h-1.5 bg-gray-700 rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-blue-500 w-2/5 rounded-full"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Method */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <CreditCard size={18} className="text-gray-500" /> Payment Method
            </h3>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
              <div className="w-10 h-6 bg-gray-200 rounded flex items-center justify-center text-[10px] font-bold text-gray-500">VISA</div>
              <div>
                <p className="text-sm font-medium text-gray-900">•••• 4242</p>
                <p className="text-xs text-gray-500">Expires 12/25</p>
              </div>
            </div>
          </div>
          <button className="w-full py-2 mt-4 text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            Update Payment Method
          </button>
        </div>
      </div>

      {/* Upgrade Section */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <h2 className="text-xl font-bold text-gray-900">Available Plans</h2>
          
          {/* Toggle */}
          <div className="bg-gray-100 p-1 rounded-lg flex items-center">
            <button 
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${billingCycle === 'monthly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Monthly
            </button>
            <button 
              onClick={() => setBillingCycle('yearly')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${billingCycle === 'yearly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Yearly <span className="text-[10px] text-emerald-600 font-bold ml-1">-20%</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div 
              key={plan.name} 
              className={`relative rounded-xl p-6 border transition-all duration-300 ${
                plan.current 
                  ? 'border-emerald-500 bg-emerald-50/30 ring-1 ring-emerald-500/20' 
                  : 'border-gray-200 bg-white hover:border-emerald-200 hover:shadow-md'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wide shadow-sm">
                  Most Popular
                </div>
              )}
              
              <div className="mb-4">
                <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{plan.description}</p>
              </div>
              
              <div className="mb-6">
                <span className="text-3xl font-bold text-gray-900">${plan.price}</span>
                <span className="text-gray-500 text-sm">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              <button 
                className={`w-full py-2.5 rounded-lg text-sm font-bold transition-colors ${
                  plan.current 
                    ? 'bg-gray-100 text-gray-400 cursor-default' 
                    : 'bg-gray-900 text-white hover:bg-gray-800 shadow-lg shadow-gray-900/10'
                }`}
                disabled={plan.current}
              >
                {plan.current ? 'Current Plan' : 'Upgrade'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Invoice History */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h3 className="font-bold text-gray-900">Invoice History</h3>
          <button className="text-sm text-emerald-600 font-medium hover:text-emerald-700 flex items-center gap-1">
            View All <ChevronRight size={16} />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50 text-xs uppercase text-gray-500 font-semibold">
              <tr>
                <th className="px-6 py-4">Invoice ID</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900 text-sm">{invoice.id}</td>
                  <td className="px-6 py-4 text-gray-500 text-sm">{invoice.date}</td>
                  <td className="px-6 py-4 text-gray-900 font-medium text-sm">{invoice.amount}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-100">
                      <CheckCircle2 size={10} /> {invoice.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-gray-400 hover:text-gray-600 transition-colors">
                      <Download size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
