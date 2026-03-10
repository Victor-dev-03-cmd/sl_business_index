'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  CreditCard, 
  Search, 
  TrendingUp, 
  Users, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Download, 
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Receipt,
  Eye,
  Plus,
  Megaphone,
  LayoutGrid,
  Trash2,
  Edit2,
  Bell,
  Sparkles
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

export default function AdminBillingPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'revenue' | 'plans' | 'announcements'>('revenue');
  const [search, setSearch] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [showPlanDialog, setShowPlanDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any | null>(null);
  const [showAnnouncementDialog, setShowAnnouncementDialog] = useState(false);

  // Form States for Plan
  const [planForm, setPlanForm] = useState({
    name: '',
    description: '',
    price_monthly: 0,
    price_yearly: 0,
    features: [] as string[],
    max_listings: 1,
    show_verified_badge: false,
    priority_support: false,
    advanced_analytics: false,
    has_social_sharing: false,
    featured_boost: false,
    discount_percentage: 0
  });

  // Form States for Announcement
  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    message: '',
    type: 'info',
    target_role: 'all'
  });

  const resetPlanForm = (plan?: any) => {
    if (plan) {
      setPlanForm({
        name: plan.name || '',
        description: plan.description || '',
        price_monthly: plan.price_monthly || 0,
        price_yearly: plan.price_yearly || 0,
        features: plan.features || [],
        max_listings: plan.max_listings || 1,
        show_verified_badge: plan.show_verified_badge || false,
        priority_support: plan.priority_support || false,
        advanced_analytics: plan.advanced_analytics || false,
        has_social_sharing: plan.has_social_sharing || false,
        featured_boost: plan.featured_boost || false,
        discount_percentage: plan.discount_percentage || 0
      });
      setSelectedPlan(plan);
    } else {
      setPlanForm({
        name: '',
        description: '',
        price_monthly: 0,
        price_yearly: 0,
        features: [],
        max_listings: 1,
        show_verified_badge: false,
        priority_support: false,
        advanced_analytics: false,
        has_social_sharing: false,
        featured_boost: false,
        discount_percentage: 0
      });
      setSelectedPlan(null);
    }
    setShowPlanDialog(true);
  };

  // --- QUERIES ---

  const { data: subscriptions = [], isLoading: loading } = useQuery({
    queryKey: ['admin-subscriptions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*, profiles(full_name, email)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['admin-invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('*, subscriptions(user_id, profiles(full_name, email))')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['admin-plans'],
    queryFn: async () => {
      const { data, error } = await supabase.from('subscription_plans').select('*').order('price_monthly', { ascending: true });
      if (error) throw error;
      return data;
    }
  });

  const { data: announcements = [], isLoading: announcementsLoading } = useQuery({
    queryKey: ['admin-announcements'],
    queryFn: async () => {
      const { data, error } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // --- MUTATIONS ---

  const savePlanMutation = useMutation({
    mutationFn: async (formData: any) => {
      if (selectedPlan) {
        const { error } = await supabase.from('subscription_plans').update(formData).eq('id', selectedPlan.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('subscription_plans').insert(formData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-plans'] });
      setShowPlanDialog(false);
      setSelectedPlan(null);
    }
  });

  const createAnnouncementMutation = useMutation({
    mutationFn: async (formData: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('announcements').insert({
        ...formData,
        created_by: user?.id,
        starts_at: new Date().toISOString()
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
      setShowAnnouncementDialog(false);
    }
  });

  const togglePlanMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string, is_active: boolean }) => {
      const { error } = await supabase.from('subscription_plans').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-plans'] })
  });

  const deleteAnnouncementMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('announcements').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-announcements'] })
  });

  // --- HELPERS ---

  const totalRevenue = invoices.reduce((acc, inv) => acc + (inv.amount || 0), 0);
  const activeSubs = subscriptions.filter(s => s.status === 'active').length;

  return (
    <div className="min-h-full bg-gray-50/30 transition-colors">
      <main className="max-w-[1600px] mx-auto px-6 md:px-12 py-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div>
            <h1 className="text-2xl text-gray-900 tracking-tight">Billing & Growth</h1>
            <p className="text-base text-gray-500 mt-2">Manage plans, revenue, and platform-wide announcements.</p>
          </div>
          
          <div className="flex gap-2 p-1 bg-gray-100 rounded-xl border border-gray-200">
            {[
              { id: 'revenue', label: 'Revenue', icon: TrendingUp },
              { id: 'plans', label: 'Plans', icon: LayoutGrid },
              { id: 'announcements', label: 'Announcements', icon: Megaphone }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                  activeTab === tab.id ? 'bg-white text-brand-dark shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'revenue' && (
          <div className="space-y-12">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard title="Total Revenue" value={`LKR ${totalRevenue.toLocaleString()}`} trend="+12%" icon={TrendingUp} color="emerald" />
              <StatCard title="Active Subscriptions" value={activeSubs.toString()} trend="+5%" icon={Users} color="blue" />
              <StatCard title="Avg. Order Value" value={`LKR ${(totalRevenue / (invoices.length || 1)).toLocaleString()}`} icon={CreditCard} color="amber" />
              <StatCard title="Monthly Recurring" value={`LKR ${(activeSubs * 2500).toLocaleString()}`} icon={DollarSign} color="purple" />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
              <div className="xl:col-span-2 bg-white rounded-[6px] border border-gray-300 shadow-xl overflow-hidden">
                <div className="p-6 border-b border-gray-300 flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-widest">Active Subscriptions</h3>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                    <input type="text" placeholder="Filter customers..." className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-[6px] text-xs outline-none" />
                  </div>
                </div>
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b border-gray-300 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    <tr>
                      <th className="px-8 py-4">Customer</th>
                      <th className="px-8 py-4">Plan</th>
                      <th className="px-8 py-4">Status</th>
                      <th className="px-8 py-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {subscriptions.map(sub => (
                      <tr key={sub.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-8 py-5">
                          <p className="text-sm font-medium text-gray-900">{sub.profiles?.full_name}</p>
                          <p className="text-[11px] text-gray-400">{sub.profiles?.email}</p>
                        </td>
                        <td className="px-8 py-5">
                          <span className="text-xs font-bold text-brand-dark px-2 py-1 bg-gray-100 rounded-md uppercase tracking-tighter">{sub.plan_name}</span>
                        </td>
                        <td className="px-8 py-5">
                          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-emerald-600">
                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> {sub.status}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-right font-bold text-sm text-gray-900">LKR {sub.price.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-white rounded-[6px] border border-gray-300 shadow-xl overflow-hidden">
                <div className="p-6 border-b border-gray-300 flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-widest">Recent Invoices</h3>
                  <Receipt size={18} className="text-gray-300" />
                </div>
                <div className="divide-y divide-gray-100">
                  {invoices.slice(0, 8).map(inv => (
                    <div key={inv.id} className="p-5 hover:bg-gray-50 transition-all flex justify-between items-center group">
                      <div>
                        <p className="text-[10px] font-bold text-brand-blue uppercase tracking-widest mb-1">#{inv.id.slice(0, 8)}</p>
                        <p className="text-xs font-medium text-gray-900">{inv.subscriptions?.profiles?.full_name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900">LKR {inv.amount.toLocaleString()}</p>
                        <button onClick={() => setSelectedInvoice(inv)} className="text-[10px] font-bold text-brand-dark hover:text-brand-blue flex items-center gap-1 ml-auto">
                          Details <ArrowUpRight size={10} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'plans' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-normal text-gray-900">Subscription Plans</h3>
                <p className="text-sm text-gray-500">Configure what vendors see and pay.</p>
              </div>
              <button 
                onClick={() => resetPlanForm()}
                className="flex items-center gap-2 bg-brand-dark text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-brand-blue transition-all shadow-lg"
              >
                <Plus size={18} /> Create New Plan
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {plansLoading ? (
                [...Array(3)].map((_, i) => <Skeleton key={i} className="h-64 w-full rounded-2xl" />)
              ) : (
                plans.map(plan => (
                  <div key={plan.id} className={`bg-white rounded-2xl border-2 transition-all p-8 relative overflow-hidden ${plan.is_active ? 'border-gray-200' : 'border-dashed border-gray-300 opacity-60'}`}>
                    {!plan.is_active && (
                      <div className="absolute top-4 right-4 bg-gray-500 text-white text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded">Inactive</div>
                    )}
                    {plan.discount_percentage > 0 && (
                      <div className="absolute top-0 left-0 bg-brand-gold text-white text-[10px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-br-xl shadow-md">
                        {plan.discount_percentage}% OFF
                      </div>
                    )}
                    
                    <div className="mb-8 mt-4">
                      <h4 className="text-2xl font-normal text-gray-900">{plan.name}</h4>
                      <p className="text-sm text-gray-500 mt-2">{plan.description}</p>
                    </div>

                    <div className="mb-8">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-gray-900">LKR {plan.price_monthly.toLocaleString()}</span>
                        <span className="text-sm text-gray-400">/ month</span>
                      </div>
                      <p className="text-xs text-brand-blue font-bold mt-1">LKR {plan.price_yearly.toLocaleString()} billed yearly</p>
                    </div>

                    <div className="space-y-3 mb-10">
                      {plan.features?.map((f: string, idx: number) => (
                        <div key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                          <CheckCircle className="text-emerald-500 shrink-0 mt-0.5" size={14} />
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-3 pt-6 border-t border-gray-100">
                      <button 
                        onClick={() => resetPlanForm(plan)}
                        className="flex-1 py-2.5 bg-gray-50 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-100 flex items-center justify-center gap-2"
                      >
                        <Edit2 size={14} /> Edit
                      </button>
                      <button 
                        onClick={() => togglePlanMutation.mutate({ id: plan.id, is_active: !plan.is_active })}
                        className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${
                          plan.is_active ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                        }`}
                      >
                        {plan.is_active ? 'Disable' : 'Activate'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'announcements' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-normal text-gray-900">Global Announcements</h3>
                <p className="text-sm text-gray-500">Post notifications that appear as popups/banners for all users.</p>
              </div>
              <button 
                onClick={() => setShowAnnouncementDialog(true)}
                className="flex items-center gap-2 bg-brand-gold text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-brand-gold-light transition-all shadow-lg"
              >
                <Bell size={18} /> New Announcement
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {announcementsLoading ? (
                [...Array(2)].map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-2xl" />)
              ) : (
                announcements.map(ann => (
                  <div key={ann.id} className="bg-white rounded-2xl border border-gray-300 p-6 flex gap-6 group hover:border-brand-gold transition-all shadow-sm">
                    <div className={`h-14 w-14 rounded-2xl shrink-0 flex items-center justify-center ${
                      ann.type === 'promotion' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-brand-blue'
                    }`}>
                      {ann.type === 'promotion' ? <Sparkles size={28} /> : <Megaphone size={28} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-2">
                        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${
                          ann.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'
                        }`}>
                          {ann.is_active ? 'Live' : 'Ended'}
                        </span>
                        <button 
                          onClick={() => deleteAnnouncementMutation.mutate(ann.id)}
                          className="text-gray-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <h4 className="font-bold text-gray-900 truncate">{ann.title}</h4>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">{ann.message}</p>
                      <div className="mt-4 flex items-center gap-4 text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                        <span className="flex items-center gap-1"><Users size={12} /> Target: {ann.target_role}</span>
                        <span className="flex items-center gap-1"><Clock size={12} /> {new Date(ann.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>

      {/* --- MODALS --- */}

      <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
        <DialogContent className="max-w-md bg-white border-gray-300 p-8">
          {selectedInvoice && (
            <div className="space-y-6">
              <div className="text-center pb-6 border-b border-gray-100">
                <div className="h-16 w-16 bg-brand-sand/30 rounded-full flex items-center justify-center mx-auto mb-4 text-brand-gold">
                  <Receipt size={32} />
                </div>
                <h3 className="text-xl font-normal">Invoice Details</h3>
                <p className="text-sm text-gray-500 uppercase tracking-widest">ID: {selectedInvoice.id.slice(0, 12)}</p>
              </div>
              <div className="space-y-4">
                <InfoRow label="Customer" value={selectedInvoice.subscriptions?.profiles?.full_name} />
                <InfoRow label="Email" value={selectedInvoice.subscriptions?.profiles?.email} />
                <InfoRow label="Date" value={new Date(selectedInvoice.created_at).toLocaleString()} />
                <InfoRow label="Status" value={selectedInvoice.status} isStatus />
                <div className="pt-4 border-t border-gray-100 flex justify-between text-lg">
                  <span className="font-normal">Total Amount</span>
                  <span className="font-bold text-gray-900">LKR {selectedInvoice.amount.toLocaleString()}</span>
                </div>
              </div>
              <button className="w-full py-4 bg-brand-dark text-white rounded-xl font-bold hover:bg-brand-blue transition-all shadow-lg flex items-center justify-center gap-2">
                <Download size={18} /> Download Receipt
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Plan Dialog */}
      <Dialog open={showPlanDialog} onOpenChange={(open) => {
        setShowPlanDialog(open);
        if (!open) setSelectedPlan(null);
      }}>
        <DialogContent className="max-w-2xl bg-white border-gray-300 p-8 overflow-y-auto max-h-[90vh]">
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-normal text-gray-900">{selectedPlan ? 'Edit Plan' : 'Create New Plan'}</h3>
              <p className="text-sm text-gray-500">Define pricing and advanced feature limits.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Plan Name</label>
                <input 
                  type="text" 
                  value={planForm.name}
                  onChange={(e) => setPlanForm({...planForm, name: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-[6px] text-sm outline-none focus:border-brand-blue"
                  placeholder="e.g. Professional"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Max Listings</label>
                <input 
                  type="number" 
                  value={planForm.max_listings}
                  onChange={(e) => setPlanForm({...planForm, max_listings: parseInt(e.target.value)})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-[6px] text-sm outline-none focus:border-brand-blue"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Monthly Price (LKR)</label>
                <input 
                  type="number" 
                  value={planForm.price_monthly}
                  onChange={(e) => setPlanForm({...planForm, price_monthly: parseInt(e.target.value)})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-[6px] text-sm outline-none focus:border-brand-blue"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Yearly Price (LKR)</label>
                <input 
                  type="number" 
                  value={planForm.price_yearly}
                  onChange={(e) => setPlanForm({...planForm, price_yearly: parseInt(e.target.value)})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-[6px] text-sm outline-none focus:border-brand-blue"
                />
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block">Advanced Feature Access</label>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { id: 'show_verified_badge', label: 'Verified Badge' },
                  { id: 'priority_support', label: 'Priority Support' },
                  { id: 'advanced_analytics', label: 'Advanced Analytics' },
                  { id: 'has_social_sharing', label: 'Social Sharing' },
                  { id: 'featured_boost', label: 'Featured Listing Boost' }
                ].map((feature) => (
                  <label key={feature.id} className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg hover:bg-gray-50 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      checked={(planForm as any)[feature.id]}
                      onChange={(e) => setPlanForm({...planForm, [feature.id]: e.target.checked})}
                      className="h-4 w-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue"
                    />
                    <span className="text-sm text-gray-600 group-hover:text-gray-900">{feature.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <button 
              onClick={() => savePlanMutation.mutate(planForm)}
              disabled={savePlanMutation.isPending}
              className="w-full py-4 bg-brand-dark text-white rounded-xl font-bold hover:bg-black transition-all shadow-lg flex items-center justify-center gap-2"
            >
              {savePlanMutation.isPending ? 'Saving...' : 'Save Subscription Plan'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Announcement Dialog */}
      <Dialog open={showAnnouncementDialog} onOpenChange={setShowAnnouncementDialog}>
        <DialogContent className="max-w-md bg-white border-gray-300 p-8">
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-normal text-gray-900">Push New Announcement</h3>
              <p className="text-sm text-gray-500">Notify users immediately with a popup.</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Title</label>
              <input 
                type="text" 
                value={announcementForm.title}
                onChange={(e) => setAnnouncementForm({...announcementForm, title: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-[6px] text-sm outline-none focus:border-brand-blue"
                placeholder="New Year Promotion!"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Message</label>
              <textarea 
                rows={3}
                value={announcementForm.message}
                onChange={(e) => setAnnouncementForm({...announcementForm, message: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-[6px] text-sm outline-none focus:border-brand-blue"
                placeholder="Get 50% off on all pro plans today."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Target Role</label>
                <select 
                  value={announcementForm.target_role}
                  onChange={(e) => setAnnouncementForm({...announcementForm, target_role: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-[6px] text-sm outline-none focus:border-brand-blue bg-white"
                >
                  <option value="all">All Users</option>
                  <option value="vendor">Vendors Only</option>
                  <option value="customer">Customers Only</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Notice Type</label>
                <select 
                  value={announcementForm.type}
                  onChange={(e) => setAnnouncementForm({...announcementForm, type: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-[6px] text-sm outline-none focus:border-brand-blue bg-white"
                >
                  <option value="info">Information</option>
                  <option value="promotion">Promotion</option>
                  <option value="warning">Alert/Warning</option>
                  <option value="success">Success</option>
                </select>
              </div>
            </div>

            <button 
              onClick={() => createAnnouncementMutation.mutate(announcementForm)}
              disabled={createAnnouncementMutation.isPending}
              className="w-full py-4 bg-brand-gold text-white rounded-xl font-bold hover:bg-brand-gold-dark transition-all shadow-lg flex items-center justify-center gap-2"
            >
              {createAnnouncementMutation.isPending ? 'Sending...' : 'Publish & Notify Live'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ title, value, trend, icon: Icon, color }: any) {
  const colorClasses: any = {
    emerald: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-blue-50 text-brand-blue',
    amber: 'bg-amber-50 text-amber-600',
    purple: 'bg-purple-50 text-purple-600'
  };
  return (
    <div className="bg-white p-6 rounded-[6px] border border-gray-300 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2 rounded-[6px] ${colorClasses[color]}`}>
          <Icon size={20} />
        </div>
        {trend && (
          <span className={`text-[10px] font-bold ${trend.startsWith('+') ? 'text-emerald-600' : 'text-red-600'} flex items-center gap-1`}>
            {trend.startsWith('+') ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />} {trend}
          </span>
        )}
      </div>
      <p className="text-xs font-normal text-gray-400 uppercase tracking-wider">{title}</p>
      <h2 className="text-2xl font-medium text-gray-900 mt-2">{value}</h2>
    </div>
  );
}

function InfoRow({ label, value, isStatus }: any) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className={`font-medium ${isStatus ? 'text-emerald-600 font-bold uppercase text-xs' : 'text-gray-900'}`}>{value}</span>
    </div>
  );
}
