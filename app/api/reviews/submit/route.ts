import { createClient } from '@/lib/supabase/server';
import { isSameOrigin } from '@/lib/growth/ingestion-contract';
import { validateReviewSubmission } from '@/lib/reviews/submission-contract';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const reply = (status: number, body: Record<string, unknown>) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'private, no-store, max-age=0' } });

/**
 * The ONLY reviewed browser submission path.
 * Existing client-supplied is_approved/sentiment/user_id are not accepted.
 * Reviews remain invisible until a staff member approves them. This route
 * fails closed until DB INSERT/RLS/column grants have been promoted and tested.
 */
export async function POST(request: Request) {
  if (process.env.SLBI_REVIEW_MODERATION_READY !== 'true') {
    return reply(503, { error: 'Review submissions are unavailable until security verification is complete.' });
  }
  if (!isSameOrigin(request.url, request.headers.get('origin'))) {
    return reply(403, { error: 'Cross-origin review submission rejected.' });
  }
  if (!(request.headers.get('content-type') || '').toLowerCase().startsWith('application/json')) {
    return reply(415, { error: 'JSON is required.' });
  }
  const length = Number(request.headers.get('content-length') || 0);
  if (!Number.isFinite(length) || length > 6_000) {
    return reply(413, { error: 'Review is too large.' });
  }

  let payload: unknown;
  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw, 'utf8') > 6_000) return reply(413, { error: 'Review is too large.' });
    payload = JSON.parse(raw);
  } catch { return reply(400, { error: 'Invalid review request.' }); }

  const checked = validateReviewSubmission(payload);
  if (!checked.ok) return reply(400, { error: checked.reason });

  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return reply(401, { error: 'Sign in to submit a review.' });

    const review = checked.value;
    const { data: business, error: businessError } = await supabase.from('businesses')
      .select('id,owner_id,status')
      .eq('id', review.businessId).eq('status', 'approved').maybeSingle();
    if (businessError) return reply(503, { error: 'Unable to verify this business.' });
    if (!business) return reply(404, { error: 'This listing is not available for reviews.' });
    if (business.owner_id === user.id) return reply(403, { error: 'You cannot review your own business.' });

    const { data, error } = await supabase.from('reviews').insert({
      business_id: review.businessId,
      user_id: user.id,
      user_name: review.userName,
      rating: review.rating,
      comment: review.comment,
      is_approved: false,
      moderation_status: 'pending',
    }).select('id').single();

    if (error) {
      if (error.code === '23505') {
        return reply(409, { error: 'You have already submitted a review for this business.' });
      }
      console.error('Secure review submission failed:', error.code || 'database');
      return reply(503, { error: 'Unable to save the review securely. Please retry.' });
    }
    if (!data?.id) return reply(503, { error: 'Review save could not be verified.' });
    return reply(201, { success: true, status: 'pending', id: data.id });
  } catch {
    return reply(503, { error: 'Review service temporarily unavailable.' });
  }
}

export function GET() {
  return reply(405, { error: 'Method not supported.' });
}
