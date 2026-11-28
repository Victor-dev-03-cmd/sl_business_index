import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query'
import {getPublicCategories,getPublicFeatured} from '@/lib/discovery/public-cache'
import {publicCategoryKey} from '@/lib/discovery/category-query'
import HomePageClient from './HomePageClient'

// Fresh HTML; cache only anonymous category data, not the account or page.
export const revalidate = 0
export default async function HomePage(){
 const queryClient=new QueryClient()
 await Promise.all([
  queryClient.prefetchQuery({queryKey:publicCategoryKey,queryFn:getPublicCategories}),
  queryClient.prefetchQuery({queryKey:['featured-businesses-home'],queryFn:getPublicFeatured}),
 ])
 return <HydrationBoundary state={dehydrate(queryClient)}><HomePageClient/></HydrationBoundary>
}
