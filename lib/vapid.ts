// lib/vapid.ts
export function getVapidPublicKey(): string {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!key) throw new Error('NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set')
  return key
}
