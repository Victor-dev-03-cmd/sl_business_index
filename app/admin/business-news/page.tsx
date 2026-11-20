import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminNewsEditor from './AdminNewsEditor'

export const metadata: Metadata = {
  title: 'Official Newsroom | SL Business Index Admin',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function AdminBusinessNewsPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login?next=%2Fadmin%2Fbusiness-news')

  // Check both trusted Auth identity and DB role on the server. The insert
  // policy repeats this check to prevent a client from bypassing the page.
  const { data: profile } = await supabase.from('profiles')
    .select('role').eq('id', user.id).maybeSingle()

  if (user.email?.toLowerCase() !== 'slbusinessindex@gmail.com' ||
      profile?.role?.toLowerCase() !== 'admin') notFound()

  return <AdminNewsEditor />
}
