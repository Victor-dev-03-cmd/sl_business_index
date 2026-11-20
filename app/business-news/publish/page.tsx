import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * One publishing entry point for every Business News CTA.
 *
 * Resolve the official editor from a verified Supabase Auth identity and
 * protected profile role on the server. An admin's previous business listing
 * is intentionally irrelevant to newsroom access.
 *
 * Other users keep the existing vendor news editor, which still requires an
 * approved/verified business. This route never bypasses publishing RLS.
 */
export default async function BusinessNewsPublishPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login?next=%2Fbusiness-news%2Fpublish')
  }

  if (user.email?.trim().toLowerCase() === 'slbusinessindex@gmail.com') {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (!profileError && profile?.role === 'admin') {
      redirect('/admin/business-news')
    }
  }

  redirect('/business-news?post=vendor')
}
