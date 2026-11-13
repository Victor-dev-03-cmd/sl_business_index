'use client';
import { neo } from '../components/neumorphic';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabaseClient';
import IconsaxIcon from '../components/IconsaxIcon';

type ReviewReply = { id: string; reply_text: string; created_at: string };
type Review = {
  id: string;
  business_id: string;
  rating: number | null;
  comment: string | null;
  user_name: string | null;
  created_at: string;
  review_replies: ReviewReply[] | null;
};
type OwnedBusiness = { id: string; name: string };
type RatingFilter = 'all' | '1' | '2' | '3' | '4' | '5';
type ReplyFilter = 'all' | 'pending' | 'replied';
type PeriodFilter = 'all' | '7' | '30' | '90';
type Sort = 'newest' | 'oldest' | 'highest' | 'lowest';

const panel = neo.card;
const actionButton = neo.button;
const REVIEW_PAGE_SIZE = 250;
const MAX_REVIEW_ROWS = 5000;
const formatNumber = (value: number) => new Intl.NumberFormat('en-LK').format(value);

function validRating(value: number | null): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 1 && value <= 5 ? value : null;
}

function reviewHasReply(review: Review) {
  return Boolean(review.review_replies?.length);
}

function formatDate(value: string, time = false): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'Date unavailable';
  return new Intl.DateTimeFormat('en-LK', {
    day: '2-digit', month: 'short', year: 'numeric',
    ...(time ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(d);
}

function csvCell(value: string | number) {
  let data = String(value);
  // Protect spreadsheet users against formula injection from untrusted review text.
  if (/^\s*[=+@-]/.test(data)) data = "'" + data;
  return '"' + data.replace(/"/g, '""') + '"';
}

function Stars({ rating, size = 'text-[14px]' }: { rating: number | null; size?: string }) {
  const score = validRating(rating) || 0;
  return (
    <span className={'inline-flex items-center gap-0.5 ' + size} role="img" aria-label={score ? rating + ' out of 5 stars' : 'Rating unavailable'}>
      {[1, 2, 3, 4, 5].map(star => (
        <span key={star} aria-hidden="true" className={star <= score ? 'text-[#d6a041]' : 'text-[#dfe4e5]'}>★</span>
      ))}
    </span>
  );
}

export default function VendorReviewsPage() {
  const [businesses, setBusinesses] = useState<OwnedBusiness[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [search, setSearch] = useState('');
  const [rating, setRating] = useState<RatingFilter>('all');
  const [replyFilter, setReplyFilter] = useState<ReplyFilter>('all');
  const [businessId, setBusinessId] = useState('all');
  const [period, setPeriod] = useState<PeriodFilter>('all');
  const [sort, setSort] = useState<Sort>('newest');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [authenticated, setAuthenticated] = useState(true);
  const [reviewLimitReached, setReviewLimitReached] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setReviewLimitReached(false);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) {
        setAuthenticated(false);
        setReviews([]);
        setBusinesses([]);
        setSelectedId(null);
        return;
      }
      setAuthenticated(true);
      const { data: owned, error: ownedError } = await supabase
        .from('businesses')
        .select('id,name')
        .eq('owner_id', user.id)
        .order('name', { ascending: true });
      if (ownedError) throw ownedError;
      const rows = (owned || []) as OwnedBusiness[];
      setBusinesses(rows);
      if (!rows.length) {
        setReviews([]);
        setSelectedId(null);
        return;
      }
      // The default PostgREST row cap can silently truncate metrics.
      // Fetch stable pages; fail closed if more than 5,000 rows exist.
      const next: Review[] = [];
      for (let offset = 0; offset < MAX_REVIEW_ROWS; offset += REVIEW_PAGE_SIZE) {
        const { data: reviewData, error: reviewsError, count } = await supabase
          .from('reviews')
          .select('id,business_id,rating,comment,user_name,created_at,review_replies(id,reply_text,created_at)', {
            count: offset === 0 ? 'exact' : undefined,
          })
          .in('business_id', rows.map(b => b.id))
          .eq('is_approved', true)
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(offset, offset + REVIEW_PAGE_SIZE - 1);
        if (reviewsError) throw reviewsError;
        if (offset === 0 && typeof count === 'number' && count > MAX_REVIEW_ROWS) {
          setReviewLimitReached(true);
          setReviews([]);
          setSelectedId(null);
          return;
        }
        next.push(...((reviewData || []) as Review[]));
        if ((reviewData?.length || 0) < REVIEW_PAGE_SIZE) break;
      }
      if (next.length >= MAX_REVIEW_ROWS) {
        // The exact count cannot be trusted if it was unavailable: do not
        // accidentally show a capped sample as the complete review universe.
        setReviewLimitReached(true);
        setReviews([]);
        setSelectedId(null);
        return;
      }
      setReviews(next);
      setSelectedId(previous => next.some(r => r.id === previous) ? previous : null);
    } catch (caught) {
      console.error('Reviews and reputation fetch failed:', caught);
      setReviews([]);
      setError('Unable to load your reviews. Check the connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!selectedId) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !submittingId) setSelectedId(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedId, submittingId]);

  const businessNames = useMemo(
    () => new Map(businesses.map(b => [String(b.id), b.name])),
    [businesses]
  );
  const selected = useMemo(() => reviews.find(r => r.id === selectedId) || null, [reviews, selectedId]);
  const total = reviews.length;
  const rated = reviews.map(r => validRating(r.rating)).filter((n): n is number => n !== null);
  const average = rated.length ? rated.reduce((sum, n) => sum + n, 0) / rated.length : 0;
  const replied = reviews.filter(reviewHasReply).length;
  const awaiting = total - replied;
  const responseRate = total ? replied / total * 100 : 0;
  const replyDurationsHours = reviews.flatMap(review => {
    const earliest = (review.review_replies || [])
      .map(reply => new Date(reply.created_at).getTime())
      .filter(time => Number.isFinite(time))
      .sort((a, b) => a - b)[0];
    const received = new Date(review.created_at).getTime();
    return earliest !== undefined && Number.isFinite(received) && earliest >= received
      ? [(earliest - received) / 3_600_000] : [];
  });
  const avgReplyHours = replyDurationsHours.length
    ? replyDurationsHours.reduce((sum, h) => sum + h, 0) / replyDurationsHours.length : null;
  const ratingCounts = [5, 4, 3, 2, 1].map(stars => ({ stars, count: rated.filter(v => Math.round(v) === stars).length }));

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const earliest = period === 'all' ? null : Date.now() - Number(period) * 24 * 60 * 60 * 1000;
    return reviews.filter(r => {
      const matchesText = !needle || [r.user_name, r.comment, businessNames.get(String(r.business_id))]
        .some(v => String(v || '').toLowerCase().includes(needle));
      const matchesRating = rating === 'all' || validRating(r.rating) === Number(rating);
      const matchesReply = replyFilter === 'all' || (replyFilter === 'replied' ? reviewHasReply(r) : !reviewHasReply(r));
      const matchesBusiness = businessId === 'all' || String(r.business_id) === businessId;
      const matchesDate = earliest === null || new Date(r.created_at).getTime() >= earliest;
      return matchesText && matchesRating && matchesReply && matchesBusiness && matchesDate;
    }).sort((a, b) => {
      if (sort === 'highest') return (validRating(b.rating) || 0) - (validRating(a.rating) || 0);
      if (sort === 'lowest') return (validRating(a.rating) || 0) - (validRating(b.rating) || 0);
      const left = new Date(a.created_at).getTime() || 0;
      const right = new Date(b.created_at).getTime() || 0;
      return sort === 'oldest' ? left - right : right - left;
    });
  }, [reviews, search, rating, replyFilter, businessId, period, sort, businessNames]);

  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function openReview(id: string) {
    setSelectedId(id);
    setReplyText('');
  }

  function clearFilters() {
    setSearch('');
    setRating('all');
    setReplyFilter('all');
    setBusinessId('all');
    setPeriod('all');
    setSort('newest');
    setPage(1);
  }

  function exportCsv() {
    if (loading || error || reviewLimitReached || !filtered.length) return;
    const rows: (string | number)[][] = [
      ['Customer', 'Business', 'Rating', 'Comment', 'Received', 'Reply status', 'Replies'],
      ...filtered.map(r => [
        r.user_name || 'Anonymous',
        businessNames.get(String(r.business_id)) || 'Business',
        validRating(r.rating) ?? '',
        r.comment || '',
        r.created_at,
        reviewHasReply(r) ? 'Replied' : 'Awaiting reply',
        (r.review_replies || []).map(x => x.reply_text).join(' | '),
      ]),
    ];
    const csv = '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'slbi-vendor-reviews.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function submitReply() {
    if (!selected || submittingId) return;
    const text = replyText.trim();
    if (!text) return;
    if (text.length > 2000) {
      toast.error('The reply must be 2,000 characters or fewer.');
      return;
    }
    const current = selected;
    if (reviewHasReply(current)) {
      toast.info('A reply already exists for this review.');
      return;
    }
    if (!businesses.some(b => String(b.id) === String(current.business_id))) {
      toast.error('This review does not belong to one of your businesses.');
      return;
    }

    setSubmittingId(current.id);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw authError || new Error('Sign in required');
      // Refresh reply state before posting to reduce duplicate posts across tabs.
      const { data: existingReplies, error: readError } = await supabase
        .from('review_replies')
        .select('id')
        .eq('review_id', current.id)
        .limit(1);
      if (readError) throw readError;
      if (existingReplies?.length) {
        toast.error('This review has already been replied to. Refresh to see the reply.');
        void load();
        return;
      }
      const { data, error: insertError } = await supabase
        .from('review_replies')
        .insert({ review_id: current.id, vendor_id: user.id, reply_text: text })
        .select('id,reply_text,created_at')
        .single();
      if (insertError || !data) throw insertError || new Error('Reply could not be saved');
      const newReply = data as ReviewReply;
      setReviews(previous => previous.map(r => r.id === current.id
        ? { ...r, review_replies: [...(r.review_replies || []), newReply] }
        : r));
      setReplyText('');
      toast.success('Reply published successfully');
    } catch (caught) {
      console.error('Unable to post vendor review reply:', caught);
      // A database UNIQUE(review_id) constraint is the definitive
      // cross-tab duplication guard. Refresh when it detects a race.
      if (caught && typeof caught === 'object' && 'code' in caught && caught.code === '23505') {
        toast.info('Another session already replied to this review. Refreshing.');
        await load();
      } else {
        toast.error('Reply could not be published. Please try again.');
      }
    } finally {
      setSubmittingId(null);
    }
  }

  const kpis = [
    { label: 'Total reviews', value: formatNumber(total), icon: 'message-text', color: '#2563eb', description: 'Reviews received across your listings' },
    { label: 'Average rating', value: rated.length ? average.toFixed(1) + ' / 5' : '—', icon: 'star', color: '#c79537', description: 'Mean of available customer ratings' },
    { label: 'Awaiting reply', value: formatNumber(awaiting), icon: 'calendar', color: '#a87d3d', description: 'Reviews without a response' },
    { label: 'Response rate', value: responseRate.toFixed(1) + '%', icon: 'tick-circle', color: '#16946a', description: 'Reviews with at least one reply' },
  ];

  if (!loading && !authenticated) return (
    <div className="mx-auto max-w-xl py-16 text-center">
      <h1 className="text-xl font-bold text-[#2C2C31]">Sign in to manage reviews</h1>
      <p className="mt-2 text-sm text-slate-500">Customer reviews are available to their registered business owners.</p>
      <Link href="/login?redirect=/vendor/reviews" className="mt-5 inline-flex rounded-lg bg-[#202024] px-5 py-2.5 text-xs font-bold text-white">Sign in</Link>
    </div>
  );

  return (
    <div className={neo.page + " mx-auto min-h-full w-full  pb-7 text-[#28282D]"}>
      <div className="space-y-5">
        <header className={neo.hero + " flex flex-col gap-5 px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6 sm:py-6"}>
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
              <IconsaxIcon name="category" size={15} /> Vendor workspace
              <IconsaxIcon name="arrow-right-2" size={12} /> Reviews & reputation
            </div>
            <h1 className="text-[24px] font-bold tracking-tight text-[#1B1B1F]">Reviews & reputation</h1>
            <p className="text-[12px] text-slate-500">Understand customer feedback, monitor ratings and manage your public replies.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => void load()} disabled={loading} className={actionButton}>
              <IconsaxIcon name="refresh" size={15} /> Refresh
            </button>
            <button type="button" onClick={exportCsv} disabled={loading || !!error || reviewLimitReached || !filtered.length} className={actionButton}>
              <IconsaxIcon name="document-download" size={15} /> Export CSV
            </button>
          </div>
        </header>

        {error && (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800">
            <span>{error}</span>
            <button type="button" onClick={() => void load()} className="font-bold underline">Retry loading</button>
          </div>
        )}
        {reviewLimitReached && (
          <div role="alert" className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-900">
            More than {formatNumber(MAX_REVIEW_ROWS)} published reviews exist. To avoid incorrect totals and partial exports,
            this overview requires a server-side aggregated reporting endpoint for this volume.
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[13px] font-bold text-[#2C2C32]">Reputation overview</h2>
          <span className="rounded-md border border-[#e9edf0] bg-white px-2 py-1 text-[10px] font-semibold text-slate-500">Published reviews · All-time</span>
        </div>
        <section aria-label="Reputation statistics" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {kpis.map(kpi => (
            <div key={kpi.label} className={panel + ' min-w-0 p-4'}>
              <div className="flex items-start justify-between gap-2">
                <span className="text-[11px] font-semibold text-slate-500">{kpi.label}</span>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: kpi.color + '12', color: kpi.color }}>
                  <IconsaxIcon name={kpi.icon} size={18} />
                </span>
              </div>
              <p className="mt-1.5 text-[26px] font-bold tabular-nums tracking-[-0.04em] text-[#1D1D20]">
                {loading || error || reviewLimitReached ? '—' : kpi.value}
              </p>
              <p className="mt-2 text-[10px] leading-4 text-slate-400">{kpi.description}</p>
            </div>
          ))}
        </section>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.9fr)]">
          <section className={panel + ' min-w-0 overflow-hidden'}>
            <div className="flex items-center justify-between border-b border-[#eef0f2] px-5 py-4">
              <div>
                <h2 className="text-[13px] font-bold text-[#313137]">Rating distribution</h2>
                <p className="mt-1 text-[11px] text-slate-400">Breakdown by submitted star rating</p>
              </div>
              <IconsaxIcon name="star" size={19} color="#bc9047" />
            </div>
            <div className="space-y-3 px-5 py-4">
              {ratingCounts.map(item => (
                <button type="button" key={item.stars} onClick={() => { setRating(String(item.stars) as RatingFilter); setPage(1); }}
                  aria-label={'Filter ' + item.stars + ' star reviews'}
                  className="grid w-full grid-cols-[38px_minmax(0,1fr)_32px] items-center gap-3 rounded-md text-left transition hover:bg-[#f6faf7]">
                  <span className="flex items-center gap-1 text-[11px] font-bold text-slate-600">{item.stars} <span className="text-[#d6a041]">★</span></span>
                  <span className="h-2 overflow-hidden rounded-full bg-[#edf1ef]">
                    <span className="block h-full rounded-full bg-[#d8a44b]" style={{ width: (rated.length ? item.count / rated.length * 100 : 0) + '%' }} />
                  </span>
                  <span className="text-right text-[11px] font-semibold tabular-nums text-slate-500">{formatNumber(item.count)}</span>
                </button>
              ))}
              {!rated.length && <p className="text-[10px] text-slate-400">No rated feedback yet.</p>}
            </div>
          </section>

          <section className={panel + ' flex min-w-0 flex-col overflow-hidden'}>
            <div className="border-b border-[#eef0f2] px-5 py-4">
              <h2 className="text-[13px] font-bold text-[#313137]">Response performance</h2>
              <p className="mt-1 text-[11px] text-slate-400">Response coverage for recorded reviews</p>
            </div>
            <div className="flex flex-1 flex-col justify-center px-5 py-5">
              <p className="text-[11px] font-semibold text-slate-500">Reviews answered</p>
              <p className="mt-2 text-[34px] font-bold tabular-nums tracking-[-0.05em] text-[#2C2C31]">
                {loading || error || reviewLimitReached ? '—' : formatNumber(replied)} <span className="text-base font-medium text-slate-400">/ {loading || error || reviewLimitReached ? '—' : formatNumber(total)}</span>
              </p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#F8F8FA]">
                <div className="h-full rounded-full bg-[#242428]" style={{ width: responseRate + '%' }} />
              </div>
              <p className="mt-3 text-[10px] leading-5 text-slate-400">
                Response rate counts published reviews with a reply, not customer satisfaction.
                {avgReplyHours !== null && !error && !reviewLimitReached
                  ? ' · Average first reply: ' + (avgReplyHours < 24
                    ? avgReplyHours.toFixed(1) + ' hours' : (avgReplyHours / 24).toFixed(1) + ' days')
                  : ''}
              </p>
            </div>
          </section>
        </div>

        <section className={panel + ' overflow-hidden'}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e9edf0] px-5 py-4">
            <div>
              <h2 className="text-[13px] font-bold text-[#313137]">Customer reviews</h2>
              <p className="mt-1 text-[11px] text-slate-400">Review feedback and respond from your vendor workspace</p>
            </div>
            <span className="text-[11px] font-semibold text-slate-500">{loading ? 'Loading…' : formatNumber(filtered.length) + ' results'}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-b border-[#edf0f3] px-4 py-3 sm:px-5">
            <label className="relative min-w-[180px] flex-1 sm:max-w-[320px]">
              <span className="sr-only">Search reviews</span>
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><IconsaxIcon name="search-normal" size={15} /></span>
              <input type="search" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search customer, feedback or business…"
                className="h-9 w-full rounded-lg border border-[#e1e6ec] bg-white pl-9 pr-3 text-[11px] text-slate-700 outline-none focus:border-[#FF7900]" />
            </label>
            <select value={businessId} aria-label="Filter reviews by business"
              onChange={e => { setBusinessId(e.target.value); setPage(1); }}
              className="h-9 max-w-[175px] rounded-lg border border-[#e1e6ec] bg-white px-2.5 text-[11px] font-medium text-slate-600">
              <option value="all">All businesses</option>
              {businesses.map(b => <option key={String(b.id)} value={String(b.id)}>{b.name}</option>)}
            </select>
            <select value={replyFilter} aria-label="Filter response status"
              onChange={e => { setReplyFilter(e.target.value as ReplyFilter); setPage(1); }}
              className="h-9 rounded-lg border border-[#e1e6ec] bg-white px-2.5 text-[11px] font-medium text-slate-600">
              <option value="all">All responses</option><option value="pending">Awaiting reply</option><option value="replied">Replied</option>
            </select>
            <select value={period} aria-label="Filter review dates"
              onChange={e => { setPeriod(e.target.value as PeriodFilter); setPage(1); }}
              className="h-9 rounded-lg border border-[#e1e6ec] bg-white px-2.5 text-[11px] font-medium text-slate-600">
              <option value="all">All time</option><option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option><option value="90">Last 90 days</option>
            </select>
            <select value={sort} aria-label="Sort reviews"
              onChange={e => { setSort(e.target.value as Sort); setPage(1); }}
              className="h-9 rounded-lg border border-[#e1e6ec] bg-white px-2.5 text-[11px] font-medium text-slate-600">
              <option value="newest">Newest first</option><option value="oldest">Oldest first</option>
              <option value="highest">Highest rated</option><option value="lowest">Lowest rated</option>
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 border-b border-[#edf0f3] px-4 py-2.5 sm:px-5" aria-label="Star rating filters">
            {(['all', '5', '4', '3', '2', '1'] as RatingFilter[]).map(stars => (
              <button type="button" key={stars} aria-pressed={rating === stars}
                onClick={() => { setRating(stars); setPage(1); }}
                className={'inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[10px] font-bold transition ' +
                  (rating === stars ? 'bg-[#F8F8FA] text-[#2C2C31]' : 'text-slate-500 hover:bg-slate-100')}>
                {stars === 'all' ? 'All ratings' : <>{stars} <span className="text-[#d2a051]">★</span></>}
              </button>
            ))}
          </div>

          {loading ? (
            <div role="status" className="space-y-3 p-5">{[0, 1, 2, 3].map(i => <div key={i} className="h-14 animate-pulse rounded-lg bg-slate-100" />)}</div>
          ) : error || reviewLimitReached ? (
            <div className="px-5 py-12 text-center text-[12px] text-slate-500">
              {reviewLimitReached ? 'Review reporting is unavailable at this volume. Partial reviews will not be exported.' : 'Review records are temporarily unavailable.'}
            </div>
          ) : !businesses.length ? (
            <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F8F8FA] text-[#2C2C31]"><IconsaxIcon name="shop" size={23} /></span>
              <h3 className="text-[13px] font-bold text-[#2C2C31]">Register a business to receive reviews</h3>
              <p className="max-w-sm text-[11px] leading-5 text-slate-500">Customer feedback will appear here when reviews are recorded for your listings.</p>
              <Link href="/vendor/my-businesses" className="mt-1 rounded-lg bg-[#202024] px-4 py-2.5 text-[11px] font-bold text-white">Manage businesses</Link>
            </div>
          ) : !reviews.length ? (
            <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F8F8FA] text-[#2C2C31]"><IconsaxIcon name="star" size={23} /></span>
              <h3 className="text-[13px] font-bold text-[#2C2C31]">No reviews received yet</h3>
              <p className="max-w-sm text-[11px] leading-5 text-slate-500">Your customer reviews and ratings will be collected in this reputation workspace.</p>
            </div>
          ) : !filtered.length ? (
            <div className="px-5 py-12 text-center">
              <p className="text-[12px] font-bold text-[#2C2C31]">No matching reviews</p>
              <p className="mt-1 text-[11px] text-slate-400">Adjust your search or filter selections.</p>
              <button type="button" onClick={clearFilters} className="mt-3 text-[11px] font-bold text-[#2C2C31] hover:underline">Clear all filters</button>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[880px] text-left">
                  <thead className="border-b border-[#edf0f3] bg-[#fbfcfc] text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <tr>
                      <th scope="col" className="px-5 py-3">Customer / Business</th>
                      <th scope="col" className="px-3 py-3">Rating</th>
                      <th scope="col" className="px-3 py-3">Feedback</th>
                      <th scope="col" className="px-3 py-3">Received</th>
                      <th scope="col" className="px-3 py-3">Reply status</th>
                      <th scope="col" className="px-5 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#edf0f2]">
                    {visible.map(review => (
                      <tr key={review.id} className="hover:bg-[#fbfcfb]">
                        <td className="max-w-[230px] px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F8F8FA] text-[12px] font-bold text-[#2C2C31]">{(review.user_name?.trim().charAt(0) || 'A').toUpperCase()}</span>
                            <div className="min-w-0">
                              <p className="truncate text-[12px] font-bold text-[#2C2C31]">{review.user_name || 'Anonymous'}</p>
                              <p className="mt-1 truncate text-[10px] text-slate-400">{businessNames.get(String(review.business_id)) || 'Your business'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3.5"><Stars rating={review.rating} size="text-[13px]" /></td>
                        <td className="max-w-[290px] px-3 py-3.5">
                          <p className="truncate text-[11px] text-slate-600">{review.comment || 'No written comment'}</p>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3.5 text-[11px] text-slate-500">{formatDate(review.created_at)}</td>
                        <td className="px-3 py-3.5">
                          {reviewHasReply(review) ? (
                            <span className="inline-flex items-center gap-1 rounded-md border border-[#d5eadc] bg-[#eff8f2] px-2 py-1 text-[10px] font-semibold text-[#287b51]"><IconsaxIcon name="tick-circle" size={12} /> Replied</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-md border border-[#f0e1c5] bg-[#fff9eb] px-2 py-1 text-[10px] font-semibold text-[#9a742a]"><IconsaxIcon name="calendar" size={12} /> Awaiting reply</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button type="button" onClick={() => openReview(review.id)} className={actionButton}>
                            <IconsaxIcon name={reviewHasReply(review) ? 'eye' : 'message-text'} size={14} />
                            {reviewHasReply(review) ? 'View review' : 'Reply'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="divide-y divide-[#eef0f2] lg:hidden">
                {visible.map(review => (
                  <article key={review.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#F8F8FA] text-[13px] font-bold text-[#2C2C31]">{(review.user_name?.trim().charAt(0) || 'A').toUpperCase()}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12px] font-bold text-[#2C2C31]">{review.user_name || 'Anonymous'}</p>
                        <p className="mt-1 truncate text-[10px] text-slate-400">{businessNames.get(String(review.business_id)) || 'Your business'}</p>
                        <div className="mt-2"><Stars rating={review.rating} /></div>
                      </div>
                      <span className="shrink-0 text-[10px] text-slate-400">{formatDate(review.created_at)}</span>
                    </div>
                    <p className="mt-3 line-clamp-2 text-[11px] leading-5 text-slate-600">{review.comment || 'No written comment'}</p>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <span className={'rounded-md border px-2 py-1 text-[10px] font-semibold ' + (reviewHasReply(review) ? 'border-[#d5eadc] bg-[#eff8f2] text-[#287b51]' : 'border-[#f0e1c5] bg-[#fff9eb] text-[#9a742a]')}>
                        {reviewHasReply(review) ? 'Replied' : 'Awaiting reply'}
                      </span>
                      <button type="button" onClick={() => openReview(review.id)} className={actionButton}>
                        {reviewHasReply(review) ? 'View review' : 'Respond'} <IconsaxIcon name="arrow-right-2" size={13} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#edf0f2] px-5 py-3">
                <p className="text-[10px] text-slate-400">
                  Showing {formatNumber((currentPage - 1) * pageSize + 1)}–{formatNumber(Math.min(currentPage * pageSize, filtered.length))} of {formatNumber(filtered.length)} reviews
                </p>
                <div className="flex items-center gap-2">
                  <button type="button" className={actionButton} disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)} aria-label="Previous page"><IconsaxIcon name="arrow-left-2" size={14} /></button>
                  <span className="text-[11px] font-semibold text-slate-500">{currentPage} / {pageCount}</span>
                  <button type="button" className={actionButton} disabled={currentPage >= pageCount} onClick={() => setPage(currentPage + 1)} aria-label="Next page"><IconsaxIcon name="arrow-right-2" size={14} /></button>
                </div>
              </div>
            </>
          )}
        </section>
        <p className="text-[10px] leading-5 text-slate-400">Your reputation metrics are calculated from reviews returned for businesses you own. Review publication and moderation remain subject to site policies.</p>
      </div>

      {selected && (
        <div className="fixed inset-0 z-[90] flex justify-end bg-[#242428]/40"
          onMouseDown={event => { if (event.target === event.currentTarget && !submittingId) setSelectedId(null); }}>
          <section role="dialog" aria-modal="true" aria-label={'Review details for ' + (selected.user_name || 'Anonymous')}
            className="flex h-full w-full max-w-[510px] flex-col overflow-hidden bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#edf0ee] px-5 py-4">
              <div>
                <h2 className="text-[14px] font-bold text-[#2C2C31]">Review details</h2>
                <p className="mt-1 text-[11px] text-slate-400">Customer feedback & public response</p>
              </div>
              <button type="button" onClick={() => setSelectedId(null)} disabled={Boolean(submittingId)}
                aria-label="Close review details" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50">
                <IconsaxIcon name="close-circle" size={20} />
              </button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
              <div className="flex items-start gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#F8F8FA] text-[17px] font-bold text-[#2C2C31]">{(selected.user_name?.trim().charAt(0) || 'A').toUpperCase()}</span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-[16px] font-bold text-[#2C2C31]">{selected.user_name || 'Anonymous'}</h3>
                  <p className="mt-1 text-[11px] text-slate-500">{businessNames.get(String(selected.business_id)) || 'Your business'}</p>
                  <p className="mt-1 text-[10px] text-slate-400">Reviewed {formatDate(selected.created_at, true)}</p>
                </div>
                <span className={'rounded-md border px-2 py-1 text-[10px] font-semibold ' + (reviewHasReply(selected) ? 'border-[#d5eadc] bg-[#eff8f2] text-[#287b51]' : 'border-[#f0e1c5] bg-[#fff9eb] text-[#9a742a]')}>
                  {reviewHasReply(selected) ? 'Replied' : 'Awaiting reply'}
                </span>
              </div>

              <div className={panel + ' p-4'}>
                <p className="text-[11px] font-bold text-[#2C2C31]">Customer rating</p>
                <div className="mt-2 flex items-center gap-3">
                  <Stars rating={selected.rating} size="text-xl" />
                  <span className="text-[13px] font-bold text-[#2C2C31]">{validRating(selected.rating) ?? '—'} / 5</span>
                </div>
              </div>

              <div>
                <h4 className="text-[12px] font-bold text-[#2C2C31]">Customer feedback</h4>
                <p className="mt-2 whitespace-pre-wrap break-words rounded-lg border border-[#e9eeeb] bg-[#fafcfa] p-4 text-[12px] leading-6 text-slate-600">
                  {selected.comment || 'This customer left a rating without a written comment.'}
                </p>
              </div>

              <div>
                <h4 className="text-[12px] font-bold text-[#2C2C31]">Public reply</h4>
                <p className="mt-1 text-[10px] leading-5 text-slate-400">Replies may be visible to customers. Keep your response respectful and professional.</p>
                {reviewHasReply(selected) ? (
                  <div className="mt-3 space-y-2">
                    {[...(selected.review_replies || [])]
                      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                      .map(reply => (
                        <div key={reply.id} className="rounded-lg border border-[#E7E7EC] bg-[#f5faf6] p-4">
                          <div className="flex items-center gap-2 text-[11px] font-bold text-[#2C2C31]">
                            <IconsaxIcon name="tick-circle" size={14} /> Vendor response
                          </div>
                          <p className="mt-2 whitespace-pre-wrap break-words text-[12px] leading-6 text-slate-700">{reply.reply_text}</p>
                          <p className="mt-2 text-[10px] text-slate-400">Published {formatDate(reply.created_at, true)}</p>
                        </div>
                      ))}
                  </div>
                ) : (
                  <form className="mt-3 space-y-3" onSubmit={event => { event.preventDefault(); void submitReply(); }}>
                    <label htmlFor="vendor-review-reply" className="sr-only">Public review reply</label>
                    <textarea id="vendor-review-reply" value={replyText} maxLength={2000} rows={5}
                      disabled={Boolean(submittingId)}
                      onChange={event => setReplyText(event.target.value)}
                      placeholder="Thank your customer, address their feedback and offer helpful follow-up…"
                      className="w-full resize-y rounded-lg border border-[#E7E7EC] bg-white px-3 py-2.5 text-[12px] leading-5 text-slate-700 outline-none focus:border-[#FF7900] disabled:opacity-50" />
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="text-[10px] text-slate-400">{replyText.length} / 2000 characters</span>
                      <button type="submit" disabled={Boolean(submittingId) || !replyText.trim()}
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[#202024] px-4 text-[11px] font-bold text-white transition hover:bg-[#39393E] disabled:cursor-not-allowed disabled:opacity-50">
                        <IconsaxIcon name="message-text" size={15} color="#fff" />
                        {submittingId ? 'Publishing…' : 'Publish reply'}
                      </button>
                    </div>
                    <p className="text-[10px] leading-5 text-slate-400">The reply is submitted to your existing review system. Review reply editing is not available here.</p>
                  </form>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-[#edf0ee] bg-white px-5 py-3">
              <p className="text-[10px] text-slate-400">Only reviews associated with your business</p>
              <button type="button" onClick={() => setSelectedId(null)} disabled={Boolean(submittingId)}
                className={actionButton}>Close</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
