import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function BusinessNewsPublishPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login?next=%2Fbusiness-news%2Fpublish')
  const { data: profile, error: roleError } = await supabase.from('profiles')
    .select('role').eq('id', user.id).maybeSingle()
  // A failed role lookup must never silently send staff to vendor verification.
  if (roleError || !profile) throw new Error('Publishing access could not be verified. Please reload and try again.')
  if (profile.role === 'admin' || profile.role === 'ceo') redirect('/admin/business-news')
  redirect('/business-news?post=vendor')
}
