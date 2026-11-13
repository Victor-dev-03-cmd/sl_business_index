import { createClient } from '@/lib/supabase/server';
import { isSameOrigin } from '@/lib/growth/ingestion-contract';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const reply = (status: number, data: Record<string, unknown>) => Response.json(data, {
  status,
  headers: { 'Cache-Control': 'private, no-store, max-age=0' },
});

async function requireModerator() {
  const client = await createClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) return { client, user: null, status: 401 } as const;
  // Role must come from a server-verified Postgres row, not mutable user_metadata.
  const { data: profile, error: roleError } = await client.from('profiles')
    .select('role').eq('id', user.id).maybeSingle();
  if (roleError) return { client, user: null, status: 503 } as const;
  if (!profile || !['admin', 'ceo'].includes(profile.role)) {
    return { client, user: null, status: 403 } as const;
  }
  return { client, user, status: 200 } as const;
}

/** Pending reviews are never exposed to ordinary users or vendors. */
export async function GET(request: Request) {
  if (process.env.SLBI_REVIEW_MODERATION_READY !== 'true') {
    return reply(503, { error: 'Review moderation security gate is not enabled.' });
  }
  const access = await requireModerator();
  if (!access.user) return reply(access.status, { error: 'Admin review access required.' });
  const pageRaw = Number(new URL(request.url).searchParams.get('page') || '1');
  if (!Number.isInteger(pageRaw) || pageRaw < 1 || pageRaw > 200) {
    return reply(400, { error: 'Invalid review queue page.' });
  }
  const limit = 50;
  const { data, error, count } = await access.client.from('reviews')
    .select('id,business_id,user_name,rating,comment,created_at,moderation_status', { count: 'exact' })
    .eq('moderation_status', 'pending')
    .order('created_at', { ascending: true })
    .order('id', { ascending: true })
    .range((pageRaw - 1) * limit, pageRaw * limit - 1);
  if (error || typeof count !== 'number') {
    console.error('Pending reviews queue unavailable:', error?.code || 'count');
    return reply(503, { error: 'Review queue temporarily unavailable.' });
  }
  return reply(200, { reviews: data || [], total: count, page: pageRaw, pageSize: limit });
}

/** Only authenticated staff can transition pending reviews to approved/rejected. */
export async function POST(request: Request) {
  if (process.env.SLBI_REVIEW_MODERATION_READY !== 'true') {
    return reply(503, { error: 'Review moderation security gate is not enabled.' });
  }
  if (!isSameOrigin(request.url, request.headers.get('origin'))) {
    return reply(403, { error: 'Cross-origin moderation rejected.' });
  }
  if (!(request.headers.get('content-type') || '').toLowerCase().startsWith('application/json')) {
    return reply(415, { error: 'JSON required.' });
  }
  const length = Number(request.headers.get('content-length') || 0);
  if (!Number.isFinite(length) || length > 2_000) return reply(413, { error: 'Request too large.' });
  const access = await requireModerator();
  if (!access.user) return reply(access.status, { error: 'Admin review access required.' });

  let body: unknown;
  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw, 'utf8') > 2_000) return reply(413, { error: 'Request too large.' });
    body = JSON.parse(raw);
  } catch { return reply(400, { error: 'Invalid request.' }); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return reply(400, { error: 'Invalid moderation request.' });
  }
  const row = body as Record<string, unknown>;
  if (Object.keys(row).some(k => !['reviewId', 'action', 'note'].includes(k))) {
    return reply(400, { error: 'Unexpected moderation fields.' });
  }
  const reviewId = row.reviewId, action = row.action;
  const note = typeof row.note === 'string' ? row.note.trim() : '';
  if (typeof reviewId !== 'string' || !uuid.test(reviewId)
      || (action !== 'approve' && action !== 'reject')
      || note.length > 500 || (action === 'reject' && note.length < 5)) {
    return reply(400, { error: 'Review, decision, and rejection reason are required.' });
  }
  const { data, error } = await access.client.from('reviews')
    .update({
      moderation_status: action === 'approve' ? 'approved' : 'rejected',
      is_approved: action === 'approve',
      moderated_at: new Date().toISOString(),
      moderated_by: access.user.id,
      moderation_note: note || null,
    })
    .eq('id', reviewId).eq('moderation_status', 'pending')
    .select('id,moderation_status').maybeSingle();
  if (error) {
    console.error('Staff review moderation failed:', error.code || 'database');
    return reply(503, { error: 'Moderation could not be saved.' });
  }
  if (!data) return reply(409, { error: 'Review is no longer pending or is not accessible.' });
  return reply(200, { success: true, status: data.moderation_status });
}
