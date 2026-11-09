'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import {
  Activity, ArrowRight, ArrowUpRight, CheckCircle2, ChevronRight,
  Eye, ExternalLink, LayoutDashboard, Megaphone, MessageCircle,
  MessageSquare, PhoneCall, Plus, RefreshCw, Search,
  ShieldCheck, Sparkles, Star, Store, Zap, type LucideIcon
} from 'lucide-react';
import VendorAnalytics from './VendorAnalytics';
import PushNotificationToggle from '@/components/PushNotificationToggle';

interface Business {
  id: string;
  name: string;
  logo_url: string | null;
  status: string | null;
  is_open: boolean | null;
  views: number | null;
  calls: number | null;
}

interface RecentReview {
  id: string;
  user_name: string;
  businessName: string;
  rating: number | null;
  date: string;
}

interface Totals {
  views: number;
  calls: number;
  reviews: number;
  leads: number;
}

const emptyTotals: Totals = { views: 0, calls: 0, reviews: 0, leads: 0 };
const fmt = (value: number) => new Intl.NumberFormat('en-LK').format(value);

type MetricTint = 'blue' | 'mint' | 'gold' | 'violet';
const metricStyles: Record<MetricTint, { icon: string; marker: string }> = {
  blue: { icon: 'bg-[#eaf2ff] text-[#316de6]', marker: 'bg-[#316de6]' },
  mint: { icon: 'bg-[#e6f6ee] text-[#16845b]', marker: 'bg-[#16845b]' },
  gold: { icon: 'bg-[#fff3de] text-[#b88032]', marker: 'bg-[#c99750]' },
  violet: { icon: 'bg-[#f1ebff] text-[#7556c7]', marker: 'bg-[#7556c7]' },
};

function MetricCard({ label, count, icon: Icon, tint, description, loading }: {
  label: string;
  count: number;
  icon: LucideIcon;
  tint: MetricTint;
  description: string;
  loading: boolean;
}) {
  const tone = metricStyles[tint];

  return (
    <div className="group relative min-w-0 overflow-hidden rounded-[22px] border border-[#e7ece9] bg-white p-5 shadow-[0_9px_26px_-16px_rgba(13,51,38,0.22)] transition-all duration-300 hover:-translate-y-1 hover:border-[#cadbd2] hover:shadow-[0_18px_35px_-18px_rgba(13,51,38,0.25)] sm:p-6">
      <div className="flex items-start justify-between">
        <div className={'flex h-11 w-11 items-center justify-center rounded-2xl ' + tone.icon}>
          <Icon size={21} strokeWidth={1.85} />
        </div>
        <span className="flex items-center gap-1.5 text-[10px] font-semibold tracking-wide text-[#83928b]">
          <span className={'h-1.5 w-1.5 rounded-full ' + tone.marker} />
          ALL TIME
        </span>
      </div>
      <div className="mt-6">
        <p className="text-[12px] font-semibold text-[#64766d]">{label}</p>
        {loading ? (
          <div className="mt-2 h-10 w-24 animate-pulse rounded-lg bg-[#eef2f0]" />
        ) : (
          <p className="mt-1 text-[34px] font-bold leading-none tracking-[-0.055em] text-[#17382d] sm:text-[38px]">{fmt(count)}</p>
        )}
        <p className="mt-3 text-[11px] leading-5 text-[#8b9a93]">{description}</p>
      </div>
      <div className={'absolute bottom-0 left-6 right-6 h-[2px] rounded-full opacity-50 ' + tone.marker} />
    </div>
  );
}

const quickActions: { title: string; description: string; href: string; icon: LucideIcon; color: string }[] = [
  { title: 'My listings', description: 'Manage business profiles', href: '/vendor/my-businesses', icon: Store, color: 'bg-[#e5f4ec] text-[#267452]' },
  { title: 'View enquiries', description: 'Follow up with customers', href: '/vendor/leads', icon: MessageCircle, color: 'bg-[#e9efff] text-[#4b68b7]' },
  { title: 'Create promotion', description: 'Build your next campaign', href: '/vendor/marketing', icon: Megaphone, color: 'bg-[#fff1e0] text-[#b77b36]' },
  { title: 'Customer reviews', description: 'Strengthen your reputation', href: '/vendor/reviews', icon: Star, color: 'bg-[#f2edff] text-[#7862be]' },
];

export default function VendorDashboard() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [stats, setStats] = useState<Totals>(emptyTotals);
  const [recentReviews, setRecentReviews] = useState<RecentReview[]>([]);
  const [planName, setPlanName] = useState('Basic');
  const [advancedAnalytics, setAdvancedAnalytics] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'overview' | 'performance'>('overview');
  const [query, setQuery] = useState('');
  const [updatingIds, setUpdatingIds] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) throw new Error('Please sign in to view your dashboard.');

      const [owned, subscription] = await Promise.all([
        supabase.from('businesses').select('id,name,logo_url,status,is_open,views,calls').eq('owner_id', user.id),
        supabase.from('subscriptions').select('plan_name').eq('user_id', user.id).eq('status', 'active').maybeSingle(),
      ]);
      if (owned.error) throw owned.error;

      const list = (owned.data || []) as Business[];
      setBusinesses(list);
      setStats({
        ...emptyTotals,
        views: list.reduce((sum, b) => sum + Number(b.views || 0), 0),
        calls: list.reduce((sum, b) => sum + Number(b.calls || 0), 0),
      });
      setRecentReviews([]);

      const selectedPlan = subscription.data?.plan_name || 'Basic';
      setPlanName(selectedPlan);
      const details = await supabase.from('subscription_plans').select('advanced_analytics').eq('name', selectedPlan).maybeSingle();
      setAdvancedAnalytics(Boolean(details.data?.advanced_analytics));

      if (list.length === 0) return;

      const ids = list.map(b => b.id);
      const [reviewCount, leadCount, recent] = await Promise.all([
        supabase.from('reviews').select('*', { head: true, count: 'exact' }).in('business_id', ids),
        supabase.from('leads').select('*', { head: true, count: 'exact' }).in('business_id', ids),
        supabase.from('reviews').select('id,user_name,rating,created_at,businesses(name)').in('business_id', ids).order('created_at', { ascending: false }).limit(4),
      ]);
      if (reviewCount.error) throw reviewCount.error;
      if (leadCount.error) throw leadCount.error;
      if (recent.error) throw recent.error;

      setStats({
        views: list.reduce((sum, b) => sum + Number(b.views || 0), 0),
        calls: list.reduce((sum, b) => sum + Number(b.calls || 0), 0),
        reviews: reviewCount.count || 0,
        leads: leadCount.count || 0,
      });
      setRecentReviews((recent.data || []).map(r => {
        const joined = r.businesses as unknown as { name?: string } | { name?: string }[] | null;
        const businessName = Array.isArray(joined) ? joined[0]?.name : joined?.name;
        return {
          id: r.id,
          user_name: r.user_name || 'A customer',
          businessName: businessName || 'Your business',
          rating: typeof r.rating === 'number' ? r.rating : null,
          date: r.created_at,
        };
      }));
    } catch (e) {
      console.error('Vendor dashboard error', e);
      setError(e instanceof Error ? e.message : 'Could not load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function toggleOpen(business: Business) {
    if (updatingIds.includes(business.id)) return;
    setUpdatingIds(previous => [...previous, business.id]);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw authError || new Error('Sign in required');
      const { error: saveError } = await supabase.from('businesses')
        .update({ is_open: !business.is_open })
        .eq('owner_id', user.id)
        .eq('id', business.id)
        .select('id').single();
      if (saveError) throw saveError;
      setBusinesses(previous => previous.map(item =>
        item.id === business.id ? { ...item, is_open: !business.is_open } : item
      ));
      toast.success('Business opening status updated');
    } catch (e) {
      console.error('Could not update business', e);
      toast.error('Unable to update business status. Please retry.');
    } finally {
      setUpdatingIds(previous => previous.filter(id => id !== business.id));
    }
  }

  const ids = useMemo(() => businesses.map(b => b.id), [businesses]);
  const filtered = useMemo(() =>
    businesses.filter(b => b.name.toLowerCase().includes(query.trim().toLowerCase())),
    [businesses, query]);
  const approvedCount = businesses.filter(b => b.status === 'approved').length;
  const openCount = businesses.filter(b => b.is_open).length;

  const tip = businesses.length === 0
    ? { title: 'Put your business on the map', detail: 'Create your first listing so customers can discover your services.', href: '/register-business', cta: 'Register a business' }
    : businesses.some(b => b.status !== 'approved')
      ? { title: 'Your listing is on its way', detail: 'Check your business details while the verification review is in progress.', href: '/vendor/my-businesses', cta: 'Review my listings' }
      : stats.reviews === 0
        ? { title: 'Turn visits into trust', detail: 'Customer feedback helps new visitors feel confident choosing your business.', href: '/vendor/reviews', cta: 'Manage reviews' }
        : stats.views > 0 && stats.calls === 0
          ? { title: 'Make every visit count', detail: 'You have profile views. Check your contact details so customers can reach you easily.', href: '/vendor/my-businesses', cta: 'Review contact details' }
          : { title: 'Keep building momentum', detail: 'Share a fresh offer or promotion to give customers another reason to visit.', href: '/vendor/marketing', cta: 'Create a promotion' };

  return (
    <div className="-m-4 min-h-full bg-[#f5f8f6] p-4 text-[#18352b] md:-m-8 md:p-8">
      <div className="mx-auto max-w-[1510px] space-y-6 lg:space-y-7">

        {/* Workspace heading */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#6d877a]">
              <LayoutDashboard size={13} /> Workspace <ChevronRight size={11} /> Overview
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-[-0.035em] text-[#14372c] sm:text-[29px]">Business dashboard</h1>
            <p className="mt-1 text-[13px] text-[#82938a]">One place to understand your reach, customers and progress.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <PushNotificationToggle />
            <button onClick={() => void load()} disabled={loading} className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#dfe8e3] bg-white px-4 text-xs font-bold text-[#38584a] shadow-sm transition hover:bg-[#eef5f0] disabled:opacity-50">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
            <Link href="/vendor/marketing" className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#173e32] px-4 text-xs font-bold text-white shadow-[0_6px_18px_rgba(23,62,50,0.18)] transition hover:bg-[#235d48]">
              <Plus size={15} /> New promotion
            </Link>
          </div>
        </div>

        {error && (
          <div role="alert" className="flex flex-wrap items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <span className="flex-1">{error}</span>
            <button onClick={() => void load()} className="font-bold underline">Retry</button>
          </div>
        )}

        {/* Hero */}
        <section className="relative isolate overflow-hidden rounded-[28px] bg-gradient-to-br from-[#163b30] via-[#20533f] to-[#103127] px-6 pb-12 pt-7 text-white shadow-[0_22px_55px_-30px_rgba(16,57,42,0.5)] sm:px-8 lg:px-10 lg:pb-14 lg:pt-9">
          <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-48 h-[420px] w-[420px] rounded-full border border-white/10 bg-gradient-to-b from-[#b8ddad]/15 to-transparent blur-[1px]" />
          <div aria-hidden="true" className="pointer-events-none absolute -right-12 top-8 h-64 w-64 rounded-full border-[32px] border-[#c8a66b]/10" />
          <div aria-hidden="true" className="pointer-events-none absolute bottom-0 right-[18%] h-40 w-40 rounded-full bg-[#4da17d]/15 blur-3xl" />
          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-[610px]">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#d4bf86]/25 bg-white/[0.07] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#dfc892]">
                <Sparkles size={13} /> Your growth workspace
              </div>
              <h2 className="text-[28px] font-bold leading-[1.15] tracking-[-0.045em] sm:text-[36px] lg:text-[42px]">
                More visibility. <span className="text-[#e7c993]">More opportunity.</span>
              </h2>
              <p className="mt-3 max-w-[500px] text-[13px] leading-[1.85] text-[#c1d5ca] sm:text-sm">
                See how people discover your business, keep your listings up to date and take the next step toward more customer connections.
              </p>
              <Link href="/vendor/growth" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#f0d7a7] px-5 py-3 text-xs font-extrabold text-[#193b30] shadow-lg shadow-black/10 transition hover:bg-white">
                Explore growth tools <ArrowUpRight size={15} />
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-3 rounded-2xl border border-white/15 bg-white/[0.075] p-4 backdrop-blur-sm sm:min-w-[365px] sm:gap-5 sm:p-5">
              <div>
                <p className="text-2xl font-bold tracking-tight text-white">{loading ? '—' : fmt(businesses.length)}</p>
                <p className="mt-1 text-[10px] leading-4 text-[#b6d0c1]">Registered</p>
              </div>
              <div className="border-l border-white/15 pl-3 sm:pl-5">
                <p className="text-2xl font-bold tracking-tight text-white">{loading ? '—' : fmt(approvedCount)}</p>
                <p className="mt-1 text-[10px] leading-4 text-[#b6d0c1]">Live listings</p>
              </div>
              <div className="border-l border-white/15 pl-3 sm:pl-5">
                <p className="text-2xl font-bold tracking-tight text-white">{loading ? '—' : fmt(openCount)}</p>
                <p className="mt-1 text-[10px] leading-4 text-[#b6d0c1]">Open now*</p>
              </div>
              <p className="col-span-3 border-t border-white/10 pt-2 text-[10px] text-[#9fbcad]">*Based on your manually set business status</p>
            </div>
          </div>
        </section>

        {/* KPI cards */}
        <section aria-label="Business statistics" className="relative z-10 -mt-10 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <MetricCard label="Profile views" count={stats.views} icon={Eye} tint="blue" description="People viewing your listings" loading={loading} />
          <MetricCard label="Call clicks" count={stats.calls} icon={PhoneCall} tint="mint" description="Clicks to your phone number" loading={loading} />
          <MetricCard label="Customer enquiries" count={stats.leads} icon={MessageSquare} tint="violet" description="Leads received across listings" loading={loading} />
          <MetricCard label="Total reviews" count={stats.reviews} icon={Star} tint="gold" description="Feedback from your customers" loading={loading} />
        </section>

        {/* Navigation and context */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex w-fit items-center gap-1 rounded-xl border border-[#e2eae5] bg-white p-1 shadow-sm" role="tablist" aria-label="Dashboard view">
            <button type="button" role="tab" aria-selected={tab === 'overview'} onClick={() => setTab('overview')}
              className={tab === 'overview' ? 'rounded-lg bg-[#1d4b3a] px-4 py-2 text-xs font-bold text-white shadow-sm' : 'rounded-lg px-4 py-2 text-xs font-bold text-[#71857a] hover:bg-[#f0f5f2]'}>
              Overview
            </button>
            <button type="button" role="tab" aria-selected={tab === 'performance'} onClick={() => setTab('performance')}
              className={tab === 'performance' ? 'rounded-lg bg-[#1d4b3a] px-4 py-2 text-xs font-bold text-white shadow-sm' : 'rounded-lg px-4 py-2 text-xs font-bold text-[#71857a] hover:bg-[#f0f5f2]'}>
              Performance
            </button>
          </div>
          <p className="flex items-center gap-2 text-[11px] text-[#8a9991]">
            <Activity size={13} /> KPI totals are all-time; the chart shows recorded daily events.
          </p>
        </div>

        <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1.8fr)_minmax(310px,1fr)]">
          <div className="min-w-0 overflow-hidden rounded-[24px] border border-[#e3eae6] bg-white p-5 shadow-[0_10px_35px_-25px_rgba(16,57,42,0.2)] sm:p-6">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#b18a50]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#cba56d]" /> Performance analytics
                </div>
                <h3 className="text-[19px] font-bold tracking-[-0.03em] text-[#173a2d]">{tab === 'performance' ? 'Detailed audience engagement' : 'Your audience over time'}</h3>
                <p className="mt-1 text-xs text-[#85968c]">Real interactions recorded on your business profiles</p>
              </div>
              <Link href="/vendor/growth" className="inline-flex items-center gap-1 text-xs font-bold text-[#2a7653] hover:underline">
                Growth OS <ArrowUpRight size={13} />
              </Link>
            </div>
            <VendorAnalytics businessIds={ids} embedded />
          </div>

          <div className="space-y-5">
            <div className="relative overflow-hidden rounded-[24px] border border-[#d9e8df] bg-gradient-to-br from-[#ebf5ec] to-[#f7f9f2] p-6 shadow-[0_10px_35px_-25px_rgba(16,57,42,0.15)]">
              <div aria-hidden="true" className="absolute -right-12 -top-12 h-36 w-36 rounded-full border-[24px] border-[#dbeadd]" />
              <div className="relative">
                <div className="inline-flex items-center gap-2 rounded-full bg-[#d9ebd9] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[#3a7154]">
                  <Zap size={12} /> Growth opportunity
                </div>
                <h3 className="mt-5 max-w-[280px] text-[21px] font-bold leading-tight tracking-[-0.035em] text-[#174530]">{tip.title}</h3>
                <p className="mt-3 max-w-[310px] text-[12px] leading-6 text-[#638071]">{tip.detail}</p>
                <Link href={tip.href} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#194935] px-4 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-[#2a674d]">
                  {tip.cta} <ArrowRight size={14} />
                </Link>
              </div>
            </div>
            <div className="rounded-[24px] border border-[#e3eae6] bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-[#244c39]">
                  <ShieldCheck size={17} className="text-[#b99353]" /> Your membership
                </div>
                <span className="rounded-full bg-[#eff5f0] px-2.5 py-1 text-[10px] font-semibold text-[#346b4e]">{planName}</span>
              </div>
              <p className="mt-4 text-[12px] leading-6 text-[#788b7e]">
                {advancedAnalytics ? 'Advanced analytics are enabled on your plan.' : 'Explore additional tools and reporting options available with higher plans.'}
              </p>
              <Link href="/vendor/billing" className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-[#2c7253] hover:underline">
                View plan & billing <ArrowUpRight size={13} />
              </Link>
            </div>
          </div>
        </div>

        {tab === 'performance' && (
          <section className="overflow-hidden rounded-[24px] border border-[#e2eae5] bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eef2ee] p-5 sm:p-6">
              <div>
                <h3 className="text-lg font-bold text-[#153c2e]">Performance by business</h3>
                <p className="mt-1 text-xs text-[#8a9b90]">All-time recorded views and call clicks for each of your listings.</p>
              </div>
              <Link href="/vendor/my-businesses" className="inline-flex items-center gap-2 text-xs font-bold text-[#2e7555] hover:underline">Manage listings <ArrowUpRight size={14} /></Link>
            </div>
            {businesses.length === 0 ? (
              <p className="p-8 text-center text-sm text-[#87988d]">Register a business to see its performance breakdown.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-left">
                  <thead className="bg-[#f7faf8] text-[10px] uppercase tracking-wider text-[#849b8b]">
                    <tr><th className="px-6 py-4">Business</th><th className="px-4 py-4">Listing</th><th className="px-4 py-4 text-right">Views</th><th className="px-6 py-4 text-right">Call clicks</th></tr>
                  </thead>
                  <tbody className="divide-y divide-[#edf2ee]">
                    {businesses.map(b => (
                      <tr key={b.id} className="text-[12px] text-[#31513d] hover:bg-[#f9fbfa]">
                        <td className="px-6 py-4 font-bold">{b.name}</td>
                        <td className="px-4 py-4">{b.status === 'approved' ? 'Live' : 'Under review'}</td>
                        <td className="px-4 py-4 text-right font-semibold">{fmt(Number(b.views || 0))}</td>
                        <td className="px-6 py-4 text-right font-semibold">{fmt(Number(b.calls || 0))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* Actions */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold tracking-[-0.025em] text-[#173a2e]">Your next move</h3>
              <p className="mt-1 text-[12px] text-[#899a90]">Everything you need, one click away.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {quickActions.map(action => {
              const Icon = action.icon;
              return (
                <Link key={action.href} href={action.href} className="group flex min-w-0 flex-col rounded-[20px] border border-[#e4ebe6] bg-white p-4 shadow-[0_8px_24px_-20px_rgba(9,47,30,0.25)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#c8ded0] hover:shadow-lg sm:p-5">
                  <div className="flex items-center justify-between">
                    <span className={'flex h-10 w-10 items-center justify-center rounded-xl ' + action.color}><Icon size={19} /></span>
                    <ArrowUpRight size={15} className="text-[#a9b8af] transition group-hover:text-[#22694a]" />
                  </div>
                  <span className="mt-4 text-[13px] font-bold text-[#244535]">{action.title}</span>
                  <span className="mt-1 text-[11px] leading-5 text-[#92a098]">{action.description}</span>
                </Link>
              );
            })}
          </div>
        </section>

        <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1.8fr)_minmax(310px,1fr)]">
          {/* Listing management */}
          <section className="min-w-0 overflow-hidden rounded-[24px] border border-[#e2eae5] bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-[#edf1ee] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div>
                <h3 className="text-lg font-bold tracking-tight text-[#153c2e]">My businesses</h3>
                <p className="mt-1 text-xs text-[#91a098]">Manage your listings and opening status</p>
              </div>
              <Link href="/vendor/my-businesses" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2f7455] hover:underline">View all <ArrowUpRight size={14} /></Link>
            </div>
            <div className="border-b border-[#edf1ee] px-5 py-3 sm:px-6">
              <div className="relative max-w-sm">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#96a79b]" />
                <input aria-label="Search your businesses" value={query} onChange={event => setQuery(event.target.value)}
                  placeholder="Search your businesses..." className="h-10 w-full rounded-xl border border-[#e1e9e3] bg-[#f8faf8] pl-10 pr-4 text-xs text-[#244736] outline-none transition focus:border-[#8cb99c] focus:bg-white" />
              </div>
            </div>
            {loading ? (
              <div className="space-y-3 p-6">{[1, 2].map(i => <div key={i} className="h-16 animate-pulse rounded-xl bg-[#f2f5f2]" />)}</div>
            ) : businesses.length === 0 ? (
              <div className="flex flex-col items-center px-6 py-12 text-center">
                <div className="rounded-2xl bg-[#e9f5ee] p-4"><Store size={26} className="text-[#3b8260]" /></div>
                <h4 className="mt-4 font-bold text-[#1d4634]">Your first listing starts here</h4>
                <p className="mt-2 max-w-sm text-xs leading-6 text-[#82968b]">Register your business to start reaching customers across Sri Lanka.</p>
                <Link href="/register-business" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#1d4e39] px-4 py-2.5 text-xs font-bold text-white"><Plus size={15} /> Add a business</Link>
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-10 text-center text-sm text-[#859a8d]">No businesses match your search.</div>
            ) : (
              <div className="divide-y divide-[#f0f3f0]">
                {filtered.map(business => {
                  const isApproved = business.status === 'approved';
                  const busy = updatingIds.includes(business.id);
                  return (
                    <div key={business.id} className="flex flex-wrap items-center gap-3 px-5 py-4 transition hover:bg-[#fbfcfb] sm:gap-4 sm:px-6">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#e3eae5] bg-[#f1f6f2]">
                        {business.logo_url
                          ? <img src={business.logo_url} alt={business.name} className="h-full w-full object-cover" />
                          : <Store size={20} className="text-[#69927b]" />}
                      </div>
                      <div className="min-w-0 flex-[1_1_135px]">
                        <p className="truncate text-[13px] font-bold text-[#244535]">{business.name}</p>
                        <span className={'mt-1 inline-flex items-center gap-1.5 text-[10px] font-semibold ' + (isApproved ? 'text-[#3e9465]' : 'text-[#bc8b40]')}>
                          <span className={'h-1.5 w-1.5 rounded-full ' + (isApproved ? 'bg-[#45ad77]' : 'bg-[#d8a052]')} />
                          {isApproved ? 'Live listing' : business.status === 'rejected' ? 'Needs attention' : 'Under review'}
                        </span>
                      </div>
                      <div className="hidden items-center gap-6 sm:flex">
                        <div className="text-right"><p className="text-sm font-bold text-[#244535]">{fmt(Number(business.views || 0))}</p><p className="text-[10px] text-[#9cad9f]">Views</p></div>
                        <div className="text-right"><p className="text-sm font-bold text-[#244535]">{fmt(Number(business.calls || 0))}</p><p className="text-[10px] text-[#9cad9f]">Calls</p></div>
                      </div>
                      <div className="ml-auto flex items-center gap-2">
                        <button type="button" onClick={() => void toggleOpen(business)} disabled={busy}
                          aria-label={(business.is_open ? 'Mark closed: ' : 'Mark open: ') + business.name}
                          className={'rounded-full border px-3 py-1.5 text-[10px] font-bold transition disabled:opacity-40 ' + (business.is_open ? 'border-[#ccefd9] bg-[#ecf9f0] text-[#278550]' : 'border-[#e4e8e4] bg-[#f5f6f4] text-[#76857b]')}>
                          {busy ? 'Saving…' : business.is_open ? 'Open' : 'Closed'}
                        </button>
                        <Link href={'/vendor/my-businesses/' + business.id + '/edit'} aria-label={'Edit ' + business.name} className="rounded-lg p-2 text-[#758e7c] transition hover:bg-[#eef5f0] hover:text-[#226442]">
                          <ExternalLink size={16} />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <Link href="/vendor/my-businesses" className="flex items-center justify-center gap-2 border-t border-[#edf1ee] py-3.5 text-xs font-bold text-[#48745c] transition hover:bg-[#f6faf7]">Manage all businesses <ArrowRight size={14} /></Link>
          </section>

          {/* Reviews stream */}
          <section className="overflow-hidden rounded-[24px] border border-[#e2eae5] bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-[#edf1ee] p-5 sm:p-6">
              <div>
                <h3 className="text-lg font-bold tracking-tight text-[#153c2e]">Customer voice</h3>
                <p className="mt-1 text-xs text-[#91a098]">Recent feedback on your listings</p>
              </div>
              <div className="rounded-xl bg-[#fff3df] p-2.5 text-[#ba8d3e]"><MessageSquare size={19} /></div>
            </div>
            {loading ? (
              <div className="p-6"><div className="h-28 animate-pulse rounded-xl bg-[#f1f6f2]" /></div>
            ) : recentReviews.length === 0 ? (
              <div className="px-6 py-9 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff5e6]"><Star size={23} className="text-[#c99b53]" /></div>
                <h4 className="mt-4 text-sm font-bold text-[#284b39]">No reviews yet</h4>
                <p className="mx-auto mt-2 max-w-[260px] text-xs leading-6 text-[#8b9d92]">When customers leave a review, you will see their feedback here.</p>
              </div>
            ) : (
              <div className="divide-y divide-[#eef2ee]">
                {recentReviews.map(review => (
                  <div key={review.id} className="px-5 py-4 sm:px-6">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-[#244735]">{review.user_name}</p>
                        <p className="mt-1 truncate text-[11px] text-[#95a39a]">{review.businessName}</p>
                      </div>
                      <span className="whitespace-nowrap text-[10px] text-[#9aa99f]">{new Date(review.date).toLocaleDateString('en-LK', { day: 'numeric', month: 'short' })}</span>
                    </div>
                    {review.rating !== null && <div className="mt-2 flex items-center gap-1 text-[#c6974a]"><Star size={13} fill="currentColor" /><span className="text-xs font-bold">{review.rating.toFixed(1)}</span><span className="text-[10px] text-[#a5b0a8]">/ 5</span></div>}
                  </div>
                ))}
              </div>
            )}
            <Link href="/vendor/reviews" className="flex items-center justify-center gap-2 border-t border-[#edf1ee] py-3.5 text-xs font-bold text-[#48745c] hover:bg-[#f6faf7]">View all reviews <ArrowRight size={14} /></Link>
          </section>
        </div>

        <div className="flex flex-col items-start justify-between gap-3 border-t border-[#e2eae4] pt-5 text-[11px] text-[#9aaa9f] sm:flex-row sm:items-center">
          <p>SL Business Index · Vendor Workspace</p>
          <p className="flex items-center gap-1.5"><CheckCircle2 size={13} /> Statistics reflect your own business data.</p>
        </div>
      </div>
    </div>
  );
}
