import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { billingNoStoreHeaders, getBillingPool, hybridBillingEnabled, safeDbError, sameOrigin } from '@/lib/billing/postgres'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: billingNoStoreHeaders })

async function requireStaff() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return { user: null, denied: 401 } as const
  const { data: profile, error: profileError } = await supabase.from('profiles')
    .select('role').eq('id', user.id).maybeSingle()
  if (profileError) return { user: null, denied: 503 } as const
  if (!profile || !['admin','ceo'].includes(profile.role)) {
    return { user: null, denied: 403 } as const
  }
  return { user, denied: 0 } as const
}

export async function GET() {
  if (!hybridBillingEnabled()) return json({ error: 'Billing V2 is not enabled.' }, 503)
  const auth = await requireStaff()
  if (!auth.user) return json({ error: 'Admin or CEO access is required.' }, auth.denied)
  try {
    const results = await getBillingPool('staff').query('SELECT billing.staff_queue() AS data')
    return json({ requests: results.rows[0]?.data ?? [] })
  } catch (error) {
    console.error('Hybrid staff queue failed', (error as { code?: string })?.code || 'unavailable')
    return json({ error: 'Billing staff queue is temporarily unavailable.' }, 503)
  }
}

export async function POST(request: Request) {
  if (!hybridBillingEnabled()) return json({ error: 'Billing V2 is not enabled.' }, 503)
  if (!sameOrigin(request)) return json({ error: 'Cross-origin requests are not allowed.' }, 403)
  const auth = await requireStaff()
  if (!auth.user) return json({ error: 'Admin or CEO access is required.' }, auth.denied)
  if (!(request.headers.get('content-type') || '').includes('application/json')) {
    return json({ error: 'A JSON body is required.' }, 415)
  }
  let body: { requestId?: unknown; action?: unknown; note?: unknown; bankReference?: unknown; verified?: unknown }
  try { body = await request.json() } catch { return json({ error: 'Invalid JSON.' }, 400) }
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  const action = body?.action
  const requestId = body?.requestId
  const note = body?.note
  const bankReference = body?.bankReference
  const verified = body?.verified
  if (typeof requestId !== 'string' || !uuid.test(requestId) ||
      !['review','request_payment','reject','activate'].includes(String(action)) ||
      typeof note !== 'string' || note.length > 2000 ||
      (bankReference !== undefined && (typeof bankReference !== 'string' || bankReference.length > 160))) {
    return json({ error: 'Invalid billing action.' }, 400)
  }
  if (action === 'activate' && (verified !== true || note.trim().length < 20 ||
      typeof bankReference !== 'string' || bankReference.trim().length < 6)) {
    return json({ error: 'Independently reconciled bank evidence and audit note are required.' }, 400)
  }
  try {
    // A separate DB staff connection can invoke staff_action. Other API
    // endpoints only have EXECUTE grants for customer-scoped functions.
    const result = await getBillingPool('staff').query(
      'SELECT billing.staff_action($1::uuid,$2::uuid,$3::text,$4::text,$5::text,$6::boolean) AS data',
      [auth.user.id, requestId, action, note, bankReference ?? null, verified === true],
    )
    return json({ result: result.rows[0]?.data })
  } catch (error) {
    const mapped = safeDbError(error)
    console.error('Hybrid staff action failed', (error as { code?: string })?.code || 'unavailable')
    return json({ error: mapped.message }, mapped.status)
  }
}
