import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { billingNoStoreHeaders, getBillingPool, hybridBillingEnabled, safeDbError, sameOrigin } from '@/lib/billing/postgres'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: billingNoStoreHeaders })

async function signedInVendor() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return { user: null, denied: 401 } as const
  const { count, error: ownedError } = await supabase.from('businesses')
    .select('id', { head: true, count: 'exact' }).eq('owner_id', user.id)
  if (ownedError) return { user: null, denied: 503 } as const
  if (!count) return { user: null, denied: 403 } as const
  return { user, denied: 0 } as const
}

export async function GET() {
  if (!hybridBillingEnabled()) return json({ error: 'New billing service is not enabled.' }, 503)
  const auth = await signedInVendor()
  if (!auth.user) return json({ error: 'Sign in with a registered business account.' }, auth.denied)
  try {
    const db = getBillingPool()
    const [plans, account] = await Promise.all([
      db.query('SELECT billing.published_plans() AS data'),
      db.query('SELECT billing.account_snapshot($1::uuid) AS data', [auth.user.id]),
    ])
    return json({ plans: plans.rows[0]?.data ?? [], account: account.rows[0]?.data ?? {} })
  } catch (error) {
    console.error('Hybrid Billing GET failed', (error as { code?: string })?.code || 'unavailable')
    return json({ error: 'Billing records are temporarily unavailable.' }, 503)
  }
}

export async function POST(request: Request) {
  if (!hybridBillingEnabled()) return json({ error: 'New billing service is not enabled.' }, 503)
  if (!sameOrigin(request)) return json({ error: 'Cross-origin requests are not allowed.' }, 403)
  const auth = await signedInVendor()
  if (!auth.user) return json({ error: 'Sign in with a registered business account.' }, auth.denied)
  if (!(request.headers.get('content-type') || '').includes('application/json')) {
    return json({ error: 'A JSON request is required.' }, 415)
  }
  let body: { planId?: unknown; billingCycle?: unknown; idempotencyKey?: unknown }
  try { body = await request.json() } catch { return json({ error: 'Invalid JSON.' }, 400) }
  const planId = body?.planId
  const billingCycle = body?.billingCycle
  const idempotencyKey = body?.idempotencyKey
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (typeof planId !== 'string' || !uuid.test(planId) ||
      !['monthly', 'yearly'].includes(String(billingCycle)) ||
      typeof idempotencyKey !== 'string' ||
      !/^[a-zA-Z0-9_-]{12,128}$/.test(idempotencyKey)) {
    return json({ error: 'Invalid plan, cycle or request reference.' }, 400)
  }
  try {
    // The account ID is taken only from verified Supabase Auth, never the body.
    const result = await getBillingPool().query(
      'SELECT billing.submit_request($1::uuid,$2::uuid,$3::text,$4::text) AS id',
      [auth.user.id, planId, billingCycle, idempotencyKey],
    )
    return json({
      requestId: result.rows[0]?.id,
      status: 'submitted',
      message: 'Your billing request is recorded. No payment has been collected or activated.',
    }, 201)
  } catch (error) {
    const mapped = safeDbError(error)
    console.error('Hybrid Billing POST failed', (error as { code?: string })?.code || 'unavailable')
    return json({ error: mapped.message }, mapped.status)
  }
}
