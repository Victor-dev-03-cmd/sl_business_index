import { Pool, type PoolConfig } from 'pg'

type BillingPoolKind = 'customer' | 'staff'
declare global {
  var __slbiBillingPools: Partial<Record<BillingPoolKind, Pool>> | undefined
}

/**
 * Independent PostgreSQL for Billing ONLY.
 * Do not expose these URLs in NEXT_PUBLIC_* variables or import from client UI.
 * Production: use provider's TLS pooled endpoints and separate least-privilege
 * customer / staff database roles. Never use a database owner connection here.
 */
export function getBillingPool(kind: BillingPoolKind = 'customer'): Pool {
  const connectionString = kind === 'staff'
    ? process.env.BILLING_SETTLEMENT_DATABASE_URL
    : process.env.BILLING_DATABASE_URL

  if (!connectionString) {
    throw new Error('Independent Billing PostgreSQL is not configured')
  }
  const pools = globalThis.__slbiBillingPools ??= {}
  if (!pools[kind]) {
    const config: PoolConfig = {
      connectionString,
      max: 3,
      idleTimeoutMillis: 15000,
      connectionTimeoutMillis: 6000,
      allowExitOnIdle: true,
      application_name: kind === 'staff' ? 'slbi-billing-settlement' : 'slbi-billing-api',
    }
    pools[kind] = new Pool(config)
    pools[kind]?.on('error', () => {
      // Avoid logging connection strings, authentication details or PII.
      console.error('Independent Billing PostgreSQL idle connection error')
    })
  }
  return pools[kind]!
}

export const hybridBillingEnabled = () =>
  process.env.BILLING_HYBRID_ENABLED === 'true'

export const billingNoStoreHeaders = {
  'Cache-Control': 'private, no-store, max-age=0',
}

export function sameOrigin(request: Request) {
  try {
    const origin = request.headers.get('origin')
    if (!origin) return false
    const actual = new URL(request.url)
    const supplied = new URL(origin)
    return supplied.origin === actual.origin && supplied.protocol === 'https:'
      || process.env.NODE_ENV !== 'production'
         && supplied.origin === actual.origin
         && supplied.protocol === 'http:'
  } catch {
    return false
  }
}

export function safeDbError(error: unknown): { status: number; message: string } {
  const code = typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code?: unknown }).code) : ''
  if (code === 'P0001') return { status: 429, message: 'Too many recent billing requests.' }
  if (code === '23505') return { status: 409, message: 'This billing request or payment reference already exists.' }
  if (code === '22023') return { status: 400, message: 'Billing request or state transition is not valid.' }
  if (code === '42501') return { status: 403, message: 'Billing action is not permitted.' }
  return { status: 503, message: 'Billing service is temporarily unavailable.' }
}
