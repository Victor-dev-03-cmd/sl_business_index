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

  // Check the verified Auth identity and protected database staff role.
  // The database policy independently enforces publishing permission.
  const { data: profile } = await supabase.from('profiles')
    .select('role').eq('id', user.id).maybeSingle()

  if (!profile || !['admin', 'ceo'].includes(profile.role)) notFound()

  return <AdminNewsEditor />
}
