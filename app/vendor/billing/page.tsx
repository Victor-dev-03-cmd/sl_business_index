'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { 
  CreditCard, 
  CheckCircle2, 
  Download, 
  ChevronRight,
  Loader2
} from 'lucide-react';

interface Subscription {
  id: string;
  plan_name: string;
  price: number;
  billing_cycle: string;
  renews_at: string;
}

interface Invoice {
  id: string;
  amount: number;
  status: string;
  created_at: string;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  features: string[];
  is_active: boolean;
  discount_percentage?: number;
  max_listings: number;
  show_verified_badge: boolean;
  priority_support: boolean;
  advanced_analytics: boolean;
  has_social_sharing: boolean;
  featured_boost: boolean;
  advanced_feature_access: boolean;
  functional_features?: Record<string, boolean>;
}

export default function BillingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [businessCount, setBusinessCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [featureDefinitions, setFeatureDefinitions] = useState<{ id: string; label: string }[]>([]);

  useEffect(() => {
    fetchBillingData();
    fetchFeatureDefinitions();
  }, []);

  const fetchFeatureDefinitions = async () => {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'advanced_feature_definitions')
      .single();
    if (!error && data) {
      setFeatureDefinitions(data.value as { id: string; label: string }[]);
    }
  };

  const fetchBillingData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch Plans
      const { data: plansData } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price_monthly', { ascending: true });
      
      if (plansData) setPlans(plansData);

      // Fetch subscription
      const { data: subData } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();
      
      setSubscription(subData);

      // Fetch business count
      const { count } = await supabase
        .from('businesses')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', user.id);
      
      setBusinessCount(count || 0);

      // Fetch invoices
      if (subData) {
        const { data: invData } = await supabase
          .from('invoices')
          .select('*')
          .eq('subscription_id', subData.id)
          .order('created_at', { ascending: false });
        
        setInvoices(invData || []);
      }
    } catch (error) {
      console.error('Error fetching billing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (plan: SubscriptionPlan) => {
    const price = billingCycle === 'monthly' ? plan.price_monthly : plan.price_yearly;
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: newSub, error: subError } = await supabase
        .from('subscriptions')
        .insert({
          user_id: user.id,
          plan_name: plan.name,
          price: price,
          billing_cycle: billingCycle,
          status: 'active',
          renews_at: new Date(Date.now() + (billingCycle === 'monthly' ? 30 : 365) * 24 * 60 * 60 * 1000).toISOString()
        })
        .select()
        .single();

      if (subError) throw subError;

      await supabase.from('invoices').insert({
        id: `INV-${Date.now()}`,
        subscription_id: newSub.id,
        amount: price,
        status: 'paid'
      });

      toast.success(`Successfully upgraded to ${plan.name} plan!`);
      fetchBillingData();
    } catch (error) {
      console.error('Error upgrading:', error);
      toast.error('Failed to upgrade plan');
    } finally {
      setSubmitting(false);
    }
  };

  const currentPlan = subscription?.plan_name || 'Free';
  const activePlanDetails = plans.find(p => p.name === currentPlan);
  const planLimit = activePlanDetails?.max_listings || (currentPlan === 'Enterprise' ? 9999 : (currentPlan === 'Professional' ? 3 : 1));

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl text-gray-900">Billing & Subscription</h1>
        <p className="text-gray-500 mt-1">Manage your plan, payment methods, and invoices.</p>
      </div>

      {/* Current Plan Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Plan Details */}
        <div className="md:col-span-2 bg-gradient-to-br from-gray-900 to-gray-800 rounded p-6 text-white shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-32 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
          
          {loading ? (
            <div className="h-40 flex items-center justify-center">
              <Loader2 className="animate-spin" />
            </div>
          ) : (
            <>
              <div className="relative z-10 flex justify-between items-start">
                <div>
                  <p className="text-gray-400 text-sm uppercase tracking-wider mb-1">Current Plan</p>
                  <h2 className="text-3xl font-medium flex items-center gap-2">
                    {currentPlan} Plan <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-full border border-emerald-500/30">Active</span>
                  </h2>
                  <p className="text-gray-400 text-sm mt-2">
                    {subscription?.renews_at ? `Renews on ${new Date(subscription.renews_at).toLocaleDateString()}` : 'Free forever'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold">LKR {subscription?.price || 0}<span className="text-lg text-gray-400 font-normal">/{subscription?.billing_cycle === 'yearly' ? 'yr' : 'mo'}</span></p>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-gray-700/50 grid grid-cols-2 gap-8">
                <div>
                  <p className="text-gray-400 text-xs uppercase mb-2">Listings Used</p>
                  <div className="flex items-end gap-2">
                    <span className="text-2xl font-medium">{businessCount}</span>
                    <span className="text-gray-500 mb-1">/ {planLimit === 9999 ? '∞' : planLimit}</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-700 rounded-full mt-2 overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                      style={{ width: `${Math.min((businessCount / planLimit) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
                <div>
                  <p className="text-gray-400 text-xs uppercase mb-2">Leads This Month</p>
                  <div className="flex items-end gap-2">
                    <span className="text-2xl font-medium">0</span>
                    <span className="text-gray-500 mb-1">/ 100</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-700 rounded-full mt-2 overflow-hidden">
                    <div className="h-full bg-blue-500 w-0 rounded-full"></div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Payment Method */}
        <div className="bg-white rounded border border-gray-300 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-gray-900 mb-4 flex items-center gap-2">
              <CreditCard size={18} className="text-gray-500" /> Payment Method
            </h3>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded border border-gray-300">
              <div className="w-10 h-6 bg-brand-dark rounded flex items-center justify-center text-[10px] font-bold text-gray-100">VISA</div>
              <div>
                <p className="text-sm font-medium text-gray-900">•••• 4242</p>
                <p className="text-xs text-gray-500">Expires 12/29</p>
              </div>
            </div>
          </div>
          <button 
            onClick={() => toast.info('Secure payment portal integration is in progress. Please contact billing@slbusiness.com to update your details.')}
            className="w-full py-2 mt-4 text-sm  text-gray-100 hover:text-gray-200 border border-gray-300 rounded bg-brand-dark transition-colors"
          >
            Update Payment Method
          </button>
        </div>
      </div>

      {/* Upgrade Section */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <h2 className="text-xl text-brand-dark">Available Plans</h2>
          
          {/* Toggle */}
          <div className="bg-gray-200 p-1 rounded flex items-center">
            <button 
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-1.5 rounded text-sm transition-all ${billingCycle === 'monthly' ? 'bg-white text-brand-dark shadow-sm' : 'text-gray-500 hover:text-brand-dark'}`}
            >
              Monthly
            </button>
            <button 
              onClick={() => setBillingCycle('yearly')}
              className={`px-4 py-1.5 rounded text-sm transition-all ${billingCycle === 'yearly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Yearly <span className="text-[10px] text-blue-500 font-bold ml-1">-20%</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const basePrice = billingCycle === 'monthly' ? plan.price_monthly : plan.price_yearly;
            const discount = plan.discount_percentage || 0;
            const price = discount > 0 ? Math.floor(basePrice * (1 - discount / 100)) : basePrice;
            const isProfessional = plan.name === 'Professional';
            
            return (
              <div 
                key={plan.id} 
                className={`relative rounded p-6 border transition-all duration-300 ${
                  isProfessional 
                    ? 'border-brand-gold bg-brand-sand/5 ring-1 ring-brand-gold/20' 
                    : 'border-gray-300 bg-white hover:border-brand-gold/50 hover:shadow-md'
                }`}
              >
                {isProfessional && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-gold text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wide shadow-sm">
                    Most Popular
                  </div>
                )}
                
                <div className="mb-4">
                  <h3 className="text-lg text-gray-900">{plan.name}</h3>
                  <p className="font-medium text-sm text-gray-500 mt-1">{plan.description}</p>
                </div>
                
                <div className="mb-6">
                  {discount > 0 && (
                    <p className="text-xs text-gray-400 line-through mb-1">LKR {basePrice.toLocaleString()}</p>
                  )}
                  <span className="text-3xl text-gray-900">LKR {price.toLocaleString()}</span>
                  <span className="text-gray-500 text-sm">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
                  {discount > 0 && (
                    <p className="text-xs text-green-600 font-bold mt-1 uppercase tracking-widest">{discount}% Promotional Discount Applied</p>
                  )}
                  {plan.discount_percentage && plan.discount_percentage > 0 && billingCycle === 'yearly' && (
                    <p className="text-xs text-green-600 font-medium mt-1">Save {plan.discount_percentage}% with annual billing</p>
                  )}
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <CheckCircle2 size={16} className="text-brand-gold mt-0.5 shrink-0" />
                      {feature}
                    </li>
                  ))}
                  {featureDefinitions.map((f) => {
                    const isEnabled = plan.functional_features?.[f.id] || (plan as any)[f.id];
                    if (!isEnabled) return null;
                    return (
                      <li key={f.id} className="flex items-start gap-2 text-sm text-brand-blue font-bold">
                        <CheckCircle2 size={16} className="text-brand-gold mt-0.5 shrink-0" />
                        {f.label}
                      </li>
                    );
                  })}
                </ul>

                <button 
                  onClick={() => handleUpgrade(plan)}
                  className={`w-full py-2.5 rounded text-sm transition-colors ${
                    plan.name === currentPlan
                      ? 'bg-gray-200 text-gray-400 cursor-default' 
                      : 'bg-brand-dark text-white hover:bg-black'
                  }`}
                  disabled={plan.name === currentPlan || submitting}
                >
                  {submitting ? <Loader2 className="animate-spin mx-auto" size={18} /> : (plan.name === currentPlan ? 'Current Plan' : 'Upgrade')}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Invoice History */}
      <div className="bg-white rounded border border-gray-300 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-300 flex justify-between items-center">
          <h3 className=" text-gray-900">Invoice History</h3>
          <button className="text-sm text-brand-dark hover:text-brand-blue flex items-center gap-1">
            View All <ChevronRight size={16} />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50 text-xs uppercase text-gray-500 font-semibold">
              <tr>
                <th className="px-6 py-4 text-gray-800">Invoice ID</th>
                <th className="px-6 py-4 text-gray-800">Date</th>
                <th className="px-6 py-4 text-gray-800">Amount</th>
                <th className="px-6 py-4 text-gray-800">Status</th>
                <th className="px-6 py-4 text-gray-800 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500 italic">Loading invoices...</td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500 italic">No invoices found.</td>
                </tr>
              ) : (
                invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 text-brand-blue text-sm">{invoice.id}</td>
                    <td className="px-6 py-4 text-gray-500 text-sm">{new Date(invoice.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-gray-900 font-medium text-sm">LKR {invoice.amount}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                        invoice.status === 'paid' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'
                      }`}>
                        <CheckCircle2 size={10} /> {invoice.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => toast.info(`Downloading PDF for invoice ${invoice.id}...`)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <Download size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
