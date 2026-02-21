import { createClient } from '../../lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const requestUrl = new URL(request.url)
  const supabase = await createClient()

  await supabase.auth.signOut()

  return NextResponse.redirect(`${requestUrl.origin}/login`, {
    // See https://github.com/vercel/next.js/blob/canary/docs/api-reference/next/server/next-response.md#nextresponseredirecturl-status
    status: 302,
  })
}
