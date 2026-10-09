// lib/turnstile.ts
export async function verifyTurnstileToken(token: string): Promise<boolean> {
  if (!token) return false

  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      secret: process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY,
      response: token,
    }),
  })

  if (!res.ok) return false
  const data = await res.json()
  return data.success === true
}
