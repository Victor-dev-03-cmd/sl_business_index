import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/server'
import HomePageClient from './HomePageClient'

export const revalidate = 300

export default async function HomePage() {
  const queryClient = new QueryClient()
  const supabase = await createClient()

  // Prefetch independent datasets in parallel to reduce initial response latency.
  await Promise.all([
  queryClient.prefetchQuery({
    queryKey: ['categories-home'],
    queryFn: async () => {
      const { data } = await supabase
        .from('categories')
        .select('id, name, icon, parent_id')
        .order('name', { ascending: true })
      return data ?? []
    },
  }),

  queryClient.prefetchQuery({
    queryKey: ['featured-businesses-home'],
    queryFn: async () => {
      const { data } = await supabase
        .from('featured_listings')
        .select(
          'business_id, businesses(id, slug, name, category, address, image_url, logo_url, rating, is_verified, status, can_show_badge)'
        )
        .order('order_index', { ascending: true })
        .limit(18)
      return (data ?? [])
        .map((item: any) => item.businesses)
        .filter((b: any) => b && b.status === 'approved')
    },
  }),
  ])

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <HomePageClient />
    </HydrationBoundary>
  )
}
