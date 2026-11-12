import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Public, metadata-free readiness probe for the controlled P0 rollout.
// A deliberately invalid RPC payload returns false before any write. This
// verifies that the server-only Supabase key can execute a privileged P0 RPC.
// No secret, customer record, database row or error body is returned.
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const headers = {
    'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=300',
    'X-Content-Type-Options': 'nosniff',
  };
  if (!url || !key) {
    return Response.json({ ready: false, component: 'p0' }, { status: 503, headers });
  }
  try {
    const server = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });
    const { data, error } = await server.rpc('slbi_record_growth_event', {
      p_event_id: null,
      p_business_id: null,
      p_event_type: null,
      p_channel: null,
      p_rate_bucket: null,
    });
    const ready = !error && data === false;
    return Response.json({ ready, component: 'p0' }, {
      status: ready ? 200 : 503,
      headers,
    });
  } catch {
    return Response.json({ ready: false, component: 'p0' }, { status: 503, headers });
  }
}

export function POST() {
  return Response.json({ error: 'method-not-allowed' }, { status: 405, headers: {'Cache-Control':'no-store'} });
}
