'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import IconsaxIcon from '../components/IconsaxIcon';

type BillingCycle = 'monthly' | 'yearly';
type Subscription = {
  id: string;
  user_id: string;
  plan_name: string;
  price: number | null;
  billing_cycle: string | null;
  status: string | null;
  renews_at: string | null;
  created_at: string;
};
type Plan = {
  id: string;
  name: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number;
  features: string[] | null;
  is_active: boolean;
  discount_percentage?: number | null;
  max_listings?: number | null;
  show_verified_badge?: boolean | null;
  priority_support?: boolean | null;
  advanced_analytics?: boolean | null;
  has_social_sharing?: boolean | null;
  featured_boost?: boolean | null;
  advanced_feature_access?: boolean | null;
  functional_features?: Record<string, boolean> | null;
};
type Invoice = {
  id: string;
  subscription_id: string;
  amount: number | null;
  status: string | null;
  created_at: string;
};
type FeatureDefinition = { id: string; label: string };
type InvoiceFilter = 'all' | 'paid' | 'pending' | 'failed';
const panel = 'rounded-xl border border-[#e7ebef] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.025)]';
const actionButton = 'inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-[#e1e6eb] bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-[#baccc4] hover:bg-[#f7faf8] disabled:cursor-not-allowed disabled:opacity-50';
const money = (n: number) => 'LKR ' + new Intl.NumberFormat('en-LK', { maximumFractionDigits: 2 }).format(n);
const nfmt = (n: number) => new Intl.NumberFormat('en-LK').format(n);
const billingEmail = 'slbusinessindex@gmail.com';
function formatDate(date: string | null | undefined) {
  if (!date || Number.isNaN(new Date(date).getTime())) return 'Not recorded';
  return new Date(date).toLocaleDateString('en-LK', { year: 'numeric', month: 'short', day: '2-digit' });
}
function csvCell(value: string | number) {
  let text = String(value);
  if (/^\s*[=+@-]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}
function featuresFor(plan: Plan, definitions: FeatureDefinition[]) {
  const result = [...(Array.isArray(plan.features) ? plan.features : [])];
  const add = (value: string) => { if (!result.some(x => x.toLowerCase() === value.toLowerCase())) result.push(value); };
  if (typeof plan.max_listings === 'number') add((plan.max_listings === 9999 ? 'Unlimited' : nfmt(plan.max_listings)) + ' business listings');
  const flags: { key: keyof Plan; label: string }[] = [
    { key: 'show_verified_badge', label: 'Verified badge eligibility' },
    { key: 'priority_support', label: 'Priority support' },
    { key: 'advanced_analytics', label: 'Advanced analytics' },
    { key: 'has_social_sharing', label: 'Social sharing features' },
    { key: 'featured_boost', label: 'Featured placement benefits' },
    { key: 'advanced_feature_access', label: 'Advanced feature access' },
  ];
  flags.forEach(f => { if (plan[f.key] === true) add(f.label); });
  definitions.forEach(f => {
    if (plan.functional_features?.[f.id] === true || (plan as unknown as Record<string, unknown>)[f.id] === true) add(f.label);
  });
  return result;
}

export default function VendorBillingPage() {
  const [cycle, setCycle] = useState<BillingCycle>('yearly');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [definitions, setDefinitions] = useState<FeatureDefinition[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [businessCount, setBusinessCount] = useState(0);
  const [monthlyLeads, setMonthlyLeads] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [signedIn, setSignedIn] = useState(true);
  const [requestPlan, setRequestPlan] = useState<Plan | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [invoiceStatus, setInvoiceStatus] = useState<InvoiceFilter>('all');
  const [invoicePage, setInvoicePage] = useState(1);
  const [exportingId, setExportingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) {
        setSignedIn(false);
        setSubscriptions([]); setInvoices([]); setBusinessCount(0); setMonthlyLeads(null);
        return;
      }
      setSignedIn(true);
      const [planRes, subRes, ownedRes] = await Promise.all([
        supabase.from('subscription_plans').select('*').eq('is_active', true).order('price_monthly', { ascending: true }),
        supabase.from('subscriptions').select('id,user_id,plan_name,price,billing_cycle,status,renews_at,created_at')
          .eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('businesses').select('id').eq('owner_id', user.id),
      ]);
      if (planRes.error) throw planRes.error;
      if (subRes.error) throw subRes.error;
      if (ownedRes.error) throw ownedRes.error;
      setPlans((planRes.data || []) as Plan[]);
      const ownedSubs = (subRes.data || []) as Subscription[];
      setSubscriptions(ownedSubs);
      const businessIds = (ownedRes.data || []).map(b => b.id);
      setBusinessCount(businessIds.length);

      const invoiceQuery = ownedSubs.length
        ? supabase.from('invoices').select('id,subscription_id,amount,status,created_at')
          .in('subscription_id', ownedSubs.map(s => s.id))
          .order('created_at', { ascending: false }).limit(100)
        : Promise.resolve({ data: [] as Invoice[], error: null });

      const now = new Date();
      const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
      const leadsQuery = businessIds.length
        ? supabase.from('leads').select('id', { head: true, count: 'exact' })
          .in('business_id', businessIds).gte('created_at', monthStart)
        : Promise.resolve({ count: 0, error: null });

      const [invoiceRes, leadsRes] = await Promise.all([invoiceQuery, leadsQuery]);
      if (invoiceRes.error) throw invoiceRes.error;
      setInvoices((invoiceRes.data || []) as Invoice[]);
      if (leadsRes.error) {
        console.warn('Monthly lead count unavailable', leadsRes.error);
        setMonthlyLeads(null);
      } else {
        setMonthlyLeads(leadsRes.count ?? 0);
      }

      // Older sites may not have dynamic feature definitions; plans remain usable.
      const { data: featureSettings } = await supabase.from('app_settings').select('value')
        .eq('key', 'advanced_feature_definitions').maybeSingle();
      setDefinitions(Array.isArray(featureSettings?.value)
        ? (featureSettings.value as FeatureDefinition[]).filter(f => typeof f?.id === 'string' && typeof f?.label === 'string')
        : []);
    } catch (caught) {
      console.error('Vendor billing load failed', caught);
      setError('Could not load billing records. Please refresh and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!requestPlan) return;
    const close = (e: KeyboardEvent) => { if (e.key === 'Escape' && !requesting) setRequestPlan(null); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [requestPlan, requesting]);

  const active = subscriptions.find(s => s.status === 'active') || null;
  const activePlan = plans.find(p => p.name === active?.plan_name) || null;
  const maxListings = typeof activePlan?.max_listings === 'number' ? activePlan.max_listings : null;
  const invoiceTotal = invoices.reduce((sum, i) => sum + (Number.isFinite(Number(i.amount)) ? Number(i.amount) : 0), 0);
  const filteredInvoices = useMemo(() => {
    const search = invoiceSearch.trim().toLowerCase();
    return invoices.filter(i => {
      const related = subscriptions.find(s => s.id === i.subscription_id);
      return (invoiceStatus === 'all' || i.status === invoiceStatus) &&
        (!search || [i.id, i.status, related?.plan_name].some(v => String(v || '').toLowerCase().includes(search)));
    });
  }, [invoiceSearch, invoiceStatus, invoices, subscriptions]);
  const invoicePages = Math.max(1, Math.ceil(filteredInvoices.length / 8));
  const page = Math.min(invoicePage, invoicePages);
  const visibleInvoices = filteredInvoices.slice((page - 1) * 8, page * 8);
  const positivePlans = plans.filter(p => Number(p.price_monthly) > 0 || Number(p.price_yearly) > 0);
  const requestedPrice = requestPlan ? Number(cycle === 'yearly' ? requestPlan.price_yearly : requestPlan.price_monthly) : 0;

  function openUpgrade(plan: Plan) {
    if (active?.plan_name === plan.name) return;
    if (Number(plan.price_monthly) <= 0 && Number(plan.price_yearly) <= 0) {
      toast.info('Complimentary plans are managed by the billing team.');
      return;
    }
    setRequestId(null);
    setRequestPlan(plan);
  }

  async function submitUpgradeRequest() {
    if (!requestPlan || requesting) return;
    setRequesting(true);
    try {
      const response = await fetch('/api/billing/upgrade-request', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: requestPlan.id, billingCycle: cycle }),
      });
      const result: { success?: boolean; requestId?: string; error?: string } = await response.json();
      if (!response.ok || !result.success || !result.requestId) {
        throw new Error(result.error || 'The request was not accepted.');
      }
      setRequestId(result.requestId);
      toast.success('Subscription request registered for review.');
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : 'Could not submit the request.');
    } finally {
      setRequesting(false);
    }
  }

  async function downloadStatement(invoice: Invoice) {
    if (exportingId) return;
    setExportingId(invoice.id);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const sub = subscriptions.find(s => s.id === invoice.subscription_id);
      const safeText = (value: unknown) => String(value ?? 'Not recorded').replace(/[^\x20-\x7E]/g, ' ');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(17);
      doc.text('SL BUSINESS INDEX', 17, 22);
      doc.setFontSize(12); doc.text('Billing account record', 17, 34);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
      doc.text('www.slbusinessindex.com', 17, 42);
      doc.setDrawColor(220, 230, 224); doc.line(17, 48, 193, 48);
      const fields: [string, string][] = [
        ['Record ID', safeText(invoice.id)],
        ['Date', formatDate(invoice.created_at)],
        ['Subscription plan', safeText(sub?.plan_name)],
        ['Subscription ID', safeText(invoice.subscription_id)],
        ['Billing period', safeText(sub?.billing_cycle)],
        ['Recorded amount', money(Number(invoice.amount || 0))],
        ['Database status', safeText(invoice.status)],
      ];
      let y = 60;
      fields.forEach(([label, value]) => {
        doc.setFont('helvetica', 'bold'); doc.text(label, 17, y);
        doc.setFont('helvetica', 'normal');
        const lines = doc.splitTextToSize(value, 102);
        doc.text(lines, 82, y);
        y += Math.max(9, lines.length * 5 + 4);
      });
      doc.setDrawColor(220, 230, 224); doc.line(17, y + 5, 193, y + 5);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
      doc.text('Important verification notice', 17, y + 17);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
      const disclaimer = 'This document is a copy of an existing account billing record only. It is not a tax invoice or proof that a payment has been independently verified. For a certified invoice or receipt, please contact the billing team.';
      doc.text(doc.splitTextToSize(disclaimer, 176), 17, y + 25);
      doc.text('Billing support: ' + billingEmail, 17, 275);
      doc.save('slbi-billing-record-' + String(invoice.id).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 45) + '.pdf');
      toast.success('Billing record PDF generated.');
    } catch (caught) {
      console.error('Invoice export failed', caught);
      toast.error('Unable to create the billing record PDF.');
    } finally {
      setExportingId(null);
    }
  }

  function exportInvoicesCsv() {
    if (!filteredInvoices.length) return;
    const rows: (string | number)[][] = [
      ['Record ID', 'Date', 'Plan', 'Amount LKR', 'Recorded status'],
      ...filteredInvoices.map(i => [
        i.id, i.created_at,
        subscriptions.find(s => s.id === i.subscription_id)?.plan_name || '',
        Number(i.amount || 0), i.status || '',
      ]),
    ];
    const csv = '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url; link.download = 'slbi-billing-history.csv';
    document.body.appendChild(link); link.click(); link.remove();
    URL.revokeObjectURL(url);
  }

  if (!loading && !signedIn) return (
    <div className="mx-auto max-w-xl py-16 text-center">
      <h1 className="text-xl font-bold text-[#1c3f2f]">Sign in to view billing</h1>
      <p className="mt-2 text-sm text-slate-500">Subscription and billing records are available to account owners.</p>
      <Link href="/login?redirect=/vendor/billing" className="mt-5 inline-flex rounded-lg bg-[#1c4d3b] px-5 py-2.5 text-xs font-bold text-white">Sign in</Link>
    </div>
  );

  return (
    <div className="-m-4 min-h-full bg-[#f8f9fb] p-4 text-slate-800 md:-m-8 md:p-6 xl:p-7">
      <div className="mx-auto max-w-[1600px] space-y-5">
        <header className="flex flex-col gap-4 border-b border-[#e7ebef] pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
              <IconsaxIcon name="category" size={15} /> Vendor workspace
              <IconsaxIcon name="arrow-right-2" size={12} /> Billing & subscription
            </div>
            <h1 className="text-[24px] font-bold tracking-tight text-[#172d26]">Billing & subscription</h1>
            <p className="text-[12px] text-slate-500">Review your plan, listing allowance and recorded billing history.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => void load()} disabled={loading} className={actionButton}>
              <IconsaxIcon name="refresh" size={15} /> Refresh
            </button>
            <a href={'mailto:' + billingEmail + '?subject=SL%20Business%20Index%20Billing%20Support'}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#1c4d3b] px-3.5 text-xs font-bold text-white transition hover:bg-[#2d664f]">
              <IconsaxIcon name="sms" size={16} color="#fff" /> Billing support
            </a>
          </div>
        </header>

        {error && (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800">
            <span>{error}</span>
            <button type="button" onClick={() => void load()} className="font-bold underline">Retry loading</button>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[13px] font-bold text-[#1d3f31]">Account overview</h2>
          <span className="rounded-md border border-[#e9edf0] bg-white px-2 py-1 text-[10px] font-semibold text-slate-500">Database-backed billing</span>
        </div>

        <section aria-label="Billing account summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { title: 'Current plan', value: active?.plan_name || 'Not assigned', icon: 'card', tone: '#15956c', hint: active ? 'Recorded active subscription' : 'No active subscription record' },
            { title: 'Business listings', value: loading ? '—' : nfmt(businessCount), icon: 'shop', tone: '#2563eb', hint: maxListings === null ? 'Allowance not available' : nfmt(businessCount) + ' of ' + (maxListings === 9999 ? 'unlimited' : nfmt(maxListings)) + ' listings' },
            { title: 'Enquiries this month', value: loading || monthlyLeads === null ? '—' : nfmt(monthlyLeads), icon: 'people', tone: '#8561c2', hint: 'Actual recorded enquiries (UTC month)' },
            { title: 'Billing records', value: loading ? '—' : nfmt(invoices.length), icon: 'document-download', tone: '#c1903b', hint: 'Latest 100 historical records' },
          ].map(kpi => (
            <div key={kpi.title} className={panel + ' min-w-0 p-4'}>
              <div className="flex items-start justify-between gap-2">
                <span className="text-[11px] font-semibold text-slate-500">{kpi.title}</span>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: kpi.tone + '12', color: kpi.tone }}><IconsaxIcon name={kpi.icon} size={18}/></span>
              </div>
              <p className="mt-1.5 break-words text-[23px] font-bold tracking-[-0.04em] text-[#182b25]">{loading ? '—' : kpi.value}</p>
              <p className="mt-2 text-[10px] leading-4 text-slate-400">{kpi.hint}</p>
            </div>
          ))}
        </section>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(275px,0.85fr)]">
          <section className={panel + ' min-w-0 overflow-hidden'}>
            <div className="flex items-center justify-between border-b border-[#eef0f2] px-5 py-4">
              <div><h2 className="text-[13px] font-bold text-[#23392f]">Subscription details</h2><p className="mt-1 text-[11px] text-slate-400">Plan and renewal information from your account</p></div>
              <span className={'rounded-md border px-2.5 py-1 text-[10px] font-bold ' + (active ? 'border-[#d5eadc] bg-[#eff8f2] text-[#287b51]' : 'border-[#e9d9c0] bg-[#fff8ee] text-[#aa792c]')}>
                {loading ? 'Loading' : active ? 'Active record' : 'No active record'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-5 px-5 py-5 sm:grid-cols-4">
              {[
                { label: 'Plan', value: active?.plan_name || 'Not assigned' },
                { label: 'Billing period', value: active?.billing_cycle === 'yearly' ? 'Annual' : active?.billing_cycle === 'monthly' ? 'Monthly' : 'Not recorded' },
                { label: 'Recorded charge', value: active ? money(Number(active.price || 0)) : '—' },
                { label: 'Renewal / expiry', value: formatDate(active?.renews_at) },
                { label: 'Subscription started', value: formatDate(active?.created_at) },
                { label: 'Listing allowance', value: maxListings === null ? 'Not configured' : maxListings === 9999 ? 'Unlimited' : nfmt(maxListings) },
                { label: 'Available listings', value: maxListings === null ? '—' : maxListings === 9999 ? 'Unlimited' : nfmt(Math.max(0, maxListings - businessCount)) },
                { label: 'Account invoices', value: nfmt(invoices.length) },
              ].map(row => (
                <div key={row.label} className="min-w-0">
                  <p className="text-[10px] font-semibold text-slate-400">{row.label}</p>
                  <p className="mt-1.5 break-words text-[12px] font-bold text-[#233f30]">{loading ? '—' : row.value}</p>
                </div>
              ))}
            </div>
            <div className="border-t border-[#eff1f0] bg-[#fbfcfb] px-5 py-4">
              <div className="mb-2 flex justify-between gap-2 text-[11px]">
                <span className="font-semibold text-slate-600">Listing allowance used</span>
                <span className="font-bold tabular-nums text-[#2c7150]">
                  {maxListings === null ? 'Not configured' : maxListings === 9999 ? 'Unlimited plan' : nfmt(businessCount) + ' / ' + nfmt(maxListings)}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[#e9f0eb]">
                <div className="h-full rounded-full bg-[#39835e]" style={{ width: maxListings === null || maxListings === 0 || maxListings === 9999 ? '0%' : Math.min(100, businessCount / maxListings * 100) + '%' }} />
              </div>
              {maxListings !== null && maxListings !== 9999 && businessCount >= maxListings && <p className="mt-2 text-[10px] font-semibold text-[#9d732e]">Your listing allowance is full. Compare the available subscription options below.</p>}
            </div>
          </section>

          <section className={panel + ' min-w-0 overflow-hidden'}>
            <div className="border-b border-[#eef0f2] px-5 py-4">
              <div className="flex items-center gap-2"><IconsaxIcon name="shield-tick" size={18} color="#247352"/><h2 className="text-[13px] font-bold text-[#23392f]">Payment & verification</h2></div>
              <p className="mt-1 text-[11px] text-slate-400">Transparent subscription management</p>
            </div>
            <div className="space-y-4 px-5 py-5">
              <div className="rounded-lg border border-[#e2ebe4] bg-[#f5faf6] p-3">
                <p className="text-[11px] font-bold text-[#295f45]">Manual payment verification</p>
                <p className="mt-1 text-[11px] leading-5 text-[#607565]">Online checkout is not connected. Submitting an upgrade request does not charge your card or activate paid features.</p>
              </div>
              <div className="flex items-start gap-2 text-[11px] leading-5 text-slate-600"><IconsaxIcon name="tick-circle" size={16} color="#44846a"/><span>Your requested plan is reviewed by the billing team.</span></div>
              <div className="flex items-start gap-2 text-[11px] leading-5 text-slate-600"><IconsaxIcon name="tick-circle" size={16} color="#44846a"/><span>Payment confirmation and plan activation require trusted administrator verification.</span></div>
              <Link href="/vendor/growth" className="inline-flex items-center gap-2 text-[11px] font-bold text-[#28704e] hover:underline">View Growth OS entitlements <IconsaxIcon name="arrow-right-2" size={13}/></Link>
            </div>
          </section>
        </div>

        <section className={panel + ' overflow-hidden'}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e9edf0] px-5 py-4">
            <div><h2 className="text-[13px] font-bold text-[#23392f]">Subscription plans</h2><p className="mt-1 text-[11px] text-slate-400">Prices are loaded directly from the active plan catalogue</p></div>
            <div className="flex h-9 items-center rounded-lg border border-[#e2e8e3] bg-[#f5f8f6] p-1" role="group" aria-label="Plan billing period">
              {(['monthly', 'yearly'] as BillingCycle[]).map(opt => (
                <button type="button" key={opt} onClick={() => setCycle(opt)} aria-pressed={cycle === opt}
                  className={'h-7 rounded-md px-3 text-[11px] font-bold transition ' + (cycle === opt ? 'bg-white text-[#246041] shadow-sm' : 'text-slate-500 hover:text-[#234b37]')}>
                  {opt === 'yearly' ? 'Yearly' : 'Monthly'}
                </button>
              ))}
            </div>
          </div>
          {loading ? (
            <div role="status" className="grid grid-cols-1 gap-3 p-5 md:grid-cols-3">{[0, 1, 2].map(i => <div key={i} className="h-64 animate-pulse rounded-lg bg-slate-100"/>)}</div>
          ) : !plans.length ? (
            <div className="px-5 py-12 text-center text-[12px] text-slate-500">No active subscription plans are available. Contact billing support.</div>
          ) : (
            <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
              {plans.map(plan => {
                const listPrice = Number(cycle === 'yearly' ? plan.price_yearly : plan.price_monthly);
                const current = active?.plan_name === plan.name;
                const features = featuresFor(plan, definitions);
                const isPaid = Number(plan.price_monthly) > 0 || Number(plan.price_yearly) > 0;
                return (
                  <article key={plan.id} className={'flex min-w-0 flex-col rounded-xl border p-5 transition ' + (current ? 'border-[#8db89f] bg-[#f7faf8] shadow-[0_0_0_1px_#d8e8dc]' : 'border-[#e5eaeb] bg-white hover:border-[#bad3c4]')}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold text-[#377354]">{isPaid ? 'Premium plan' : 'Complimentary tier'}</span>
                      {current && <span className="rounded-md bg-[#e5f2e9] px-2 py-1 text-[10px] font-bold text-[#2e744d]">Current plan</span>}
                    </div>
                    <h3 className="mt-2 text-[17px] font-bold text-[#1f3d2d]">{plan.name}</h3>
                    <p className="mt-1 min-h-[32px] text-[11px] leading-5 text-slate-500">{plan.description || 'Subscription benefits configured by the administrator.'}</p>
                    <div className="mt-4">
                      <p className="text-[25px] font-bold tracking-tight text-[#1a3126]">{money(listPrice)}</p>
                      <p className="mt-1 text-[10px] text-slate-400">Listed price / {cycle === 'yearly' ? 'year' : 'month'}</p>
                      {!!plan.discount_percentage && plan.discount_percentage > 0 && <p className="mt-1 text-[10px] font-medium text-[#ad7c2e]">{plan.discount_percentage}% promotion configured · confirm final quote with billing</p>}
                    </div>
                    <div className="my-4 h-px bg-[#e9efea]" />
                    <p className="mb-3 text-[11px] font-bold text-[#2e4939]">Plan includes</p>
                    <ul className="mb-5 flex-1 space-y-2.5">
                      {features.length ? features.map((feature, i) => (
                        <li key={feature + i} className="flex items-start gap-2 text-[11px] leading-5 text-slate-600">
                          <IconsaxIcon name="tick-circle" size={14} color="#45906a" />
                          <span>{feature}</span>
                        </li>
                      )) : <li className="text-[11px] text-slate-400">Feature list not configured.</li>}
                    </ul>
                    <button type="button" disabled={current} onClick={() => openUpgrade(plan)}
                      className={'inline-flex h-10 items-center justify-center gap-2 rounded-lg text-[11px] font-bold transition disabled:cursor-not-allowed ' +
                        (current ? 'bg-[#e5f1e9] text-[#367451]' : 'bg-[#1c4d3b] text-white hover:bg-[#2d664f]')}>
                      {current ? 'Current subscription' : isPaid ? 'Request this plan' : 'Contact for plan change'}
                      {!current && <IconsaxIcon name="arrow-right-2" size={14} color="#fff"/>}
                    </button>
                  </article>
                );
              })}
            </div>
          )}
          <p className="border-t border-[#edf0ee] px-5 py-3 text-[10px] leading-5 text-slate-400">Plan benefits and prices reflect database configuration, not a payment confirmation. A verified payment and staff approval are required before paid features are enabled.</p>
        </section>

        <section className={panel + ' overflow-hidden'}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e9edf0] px-5 py-4">
            <div>
              <h2 className="text-[13px] font-bold text-[#23392f]">Billing records & history</h2>
              <p className="mt-1 text-[11px] text-slate-400">Records from all subscriptions belonging to this account</p>
            </div>
            <button type="button" onClick={exportInvoicesCsv} disabled={!filteredInvoices.length || loading} className={actionButton}>
              <IconsaxIcon name="document-download" size={15}/> Export CSV
            </button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#edf0ee] px-5 py-3">
            <label className="relative min-w-[180px] flex-1 sm:max-w-[340px]">
              <span className="sr-only">Find billing record</span>
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><IconsaxIcon name="search-normal" size={15}/></span>
              <input type="search" value={invoiceSearch} onChange={e => { setInvoiceSearch(e.target.value); setInvoicePage(1); }}
                placeholder="Search record ID, plan or status…" className="h-9 w-full rounded-lg border border-[#e1e6ec] bg-white pl-9 pr-3 text-[11px] text-slate-700 outline-none focus:border-[#9cb9aa]" />
            </label>
            <select aria-label="Billing record status" value={invoiceStatus} onChange={e => { setInvoiceStatus(e.target.value as InvoiceFilter); setInvoicePage(1); }}
              className="h-9 rounded-lg border border-[#e1e6ec] bg-white px-2.5 text-[11px] font-medium text-slate-600">
              <option value="all">All statuses</option><option value="paid">Recorded paid</option>
              <option value="pending">Pending</option><option value="failed">Failed</option>
            </select>
          </div>
          {loading ? (
            <div role="status" className="space-y-3 p-5">{[0, 1, 2].map(i => <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100"/>)}</div>
          ) : error ? (
            <div className="px-5 py-10 text-center text-xs text-slate-500">Billing records could not be loaded.</div>
          ) : !invoices.length ? (
            <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
              <IconsaxIcon name="document-download" size={26} color="#8da99a"/>
              <p className="text-[12px] font-bold text-[#294938]">No billing records yet</p>
              <p className="text-[11px] text-slate-400">Invoices and account billing records will appear here when they exist.</p>
            </div>
          ) : !filteredInvoices.length ? (
            <div className="px-5 py-10 text-center text-xs text-slate-500">No records match your filters.</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-left">
                  <thead className="border-b border-[#edf0f3] bg-[#fbfcfc] text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <tr><th className="px-5 py-3">Record ID</th><th className="px-3 py-3">Date</th><th className="px-3 py-3">Plan</th><th className="px-3 py-3">Recorded amount</th><th className="px-3 py-3">Status</th><th className="px-5 py-3 text-right">Document</th></tr>
                  </thead>
                  <tbody className="divide-y divide-[#edf0f2]">
                    {visibleInvoices.map(i => {
                      const sub = subscriptions.find(s => s.id === i.subscription_id);
                      return <tr key={i.id} className="hover:bg-[#fbfcfb]">
                        <td className="max-w-[175px] truncate px-5 py-3.5 text-[11px] font-semibold text-[#2c6044]" title={i.id}>{i.id}</td>
                        <td className="whitespace-nowrap px-3 py-3.5 text-[11px] text-slate-500">{formatDate(i.created_at)}</td>
                        <td className="px-3 py-3.5 text-[11px] font-semibold text-slate-700">{sub?.plan_name || 'Not recorded'}</td>
                        <td className="whitespace-nowrap px-3 py-3.5 text-[11px] font-semibold tabular-nums text-slate-700">{money(Number(i.amount || 0))}</td>
                        <td className="px-3 py-3.5"><span className={'inline-flex rounded-md border px-2 py-1 text-[10px] font-bold ' + (i.status === 'paid' ? 'border-[#d6eadc] bg-[#eff8f2] text-[#397b54]' : i.status === 'pending' ? 'border-[#f0e1c5] bg-[#fff9eb] text-[#9a742a]' : 'border-[#e7e9ed] bg-[#f5f6f8] text-[#717d86]')}>{i.status || 'Unknown'}</span></td>
                        <td className="px-5 py-3.5 text-right">
                          <button type="button" onClick={() => void downloadStatement(i)} disabled={Boolean(exportingId)}
                            className={actionButton} title="Download a copy of this recorded entry; not a tax invoice">
                            <IconsaxIcon name="document-download" size={14}/> {exportingId === i.id ? 'Creating…' : 'PDF record'}
                          </button>
                        </td>
                      </tr>;
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#edf0f2] px-5 py-3">
                <p className="text-[10px] text-slate-400">Showing {nfmt((page - 1) * 8 + 1)}–{nfmt(Math.min(page * 8, filteredInvoices.length))} of {nfmt(filteredInvoices.length)} records</p>
                <div className="flex items-center gap-2">
                  <button type="button" disabled={page <= 1} onClick={() => setInvoicePage(page - 1)} className={actionButton} aria-label="Previous billing records"><IconsaxIcon name="arrow-left-2" size={14}/></button>
                  <span className="text-[11px] font-semibold text-slate-500">{page} / {invoicePages}</span>
                  <button type="button" disabled={page >= invoicePages} onClick={() => setInvoicePage(page + 1)} className={actionButton} aria-label="Next billing records"><IconsaxIcon name="arrow-right-2" size={14}/></button>
                </div>
              </div>
            </>
          )}
          <div className="border-t border-[#edf0ee] bg-[#fbfcfb] px-5 py-3 text-[10px] leading-5 text-slate-400">
            Showing up to 100 recent records. PDF downloads are account record copies only—not official tax invoices or payment-verification certificates.
            {invoiceTotal > 0 && <span className="ml-1">Total recorded face value in loaded history: {money(invoiceTotal)} (not verified revenue).</span>}
          </div>
        </section>
      </div>

      {requestPlan && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#152e22]/50 p-3"
          onMouseDown={e => { if (e.target === e.currentTarget && !requesting) setRequestPlan(null); }}>
          <section role="dialog" aria-modal="true" aria-label="Subscription change request"
            className="w-full max-w-[480px] rounded-xl border border-[#dce6df] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#ebefed] p-5">
              <div><h2 className="text-[14px] font-bold text-[#223e2e]">Request subscription change</h2><p className="mt-1 text-[11px] text-slate-500">Manual review · No payment collected</p></div>
              <button type="button" disabled={requesting} onClick={() => setRequestPlan(null)} aria-label="Close subscription request" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"><IconsaxIcon name="close-circle" size={19}/></button>
            </div>
            {requestId ? (
              <div className="space-y-3 p-5">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#eaf5ee] text-[#28794f]"><IconsaxIcon name="tick-circle" size={22}/></span>
                <h3 className="text-[14px] font-bold text-[#224d33]">Your request was recorded</h3>
                <p className="text-[11px] leading-6 text-slate-600">Billing staff can now review this request in their dashboard. No money has been taken and your plan has not changed.</p>
                <p className="break-all rounded-lg bg-[#f5f8f6] p-3 text-[10px] text-slate-500">Reference: {requestId}</p>
                <button type="button" onClick={() => setRequestPlan(null)} className="h-10 w-full rounded-lg bg-[#1c4d3b] text-[11px] font-bold text-white">Done</button>
              </div>
            ) : (
              <div className="space-y-4 p-5">
                <div className="grid grid-cols-2 gap-3 rounded-lg border border-[#e6ece7] bg-[#f8faf8] p-4">
                  <div><p className="text-[10px] text-slate-400">Requested plan</p><p className="mt-1 text-[13px] font-bold text-[#274e36]">{requestPlan.name}</p></div>
                  <div><p className="text-[10px] text-slate-400">Billing period</p><p className="mt-1 text-[13px] font-bold text-[#274e36]">{cycle === 'yearly' ? 'Annual' : 'Monthly'}</p></div>
                  <div className="col-span-2"><p className="text-[10px] text-slate-400">Listed price (subject to billing confirmation)</p><p className="mt-1 text-[22px] font-bold text-[#213f2f]">{money(requestedPrice)}</p></div>
                </div>
                <p className="text-[11px] leading-6 text-slate-600">This creates a tracked support request. The billing team will confirm the final amount and provide official payment instructions. Paid entitlements remain unchanged until independently verified.</p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" disabled={requesting} onClick={() => setRequestPlan(null)} className={actionButton + ' flex-1'}>Cancel</button>
                  <button type="button" disabled={requesting || !positivePlans.some(p => p.id === requestPlan.id)} onClick={() => void submitUpgradeRequest()}
                    className="inline-flex h-9 flex-[1.5] items-center justify-center gap-2 rounded-lg bg-[#1c4d3b] px-3 text-[11px] font-bold text-white hover:bg-[#2d664f] disabled:opacity-50">
                    <IconsaxIcon name="tick-circle" size={15} color="#fff"/> {requesting ? 'Submitting…' : 'Submit request'}
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
