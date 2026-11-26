import type { MetadataRoute } from 'next';
import { createClient } from '@/lib/supabase/server';
import {getPublicBusinessCanonical,SLBI_PUBLIC_ORIGIN} from '@/lib/seo/public-business';

// Newly approved/updated businesses join the sitemap automatically after a
// short refresh. This is a discovery hint, NOT a guaranteed Google index push.
export const revalidate=300;

const slugify=(name:string)=>name.toLowerCase().trim()
  .replace(/ & /g,'-').replace(/ /g,'-').replace(/,/g,'').replace(/[^\w-]+/g,'');

export default async function sitemap():Promise<MetadataRoute.Sitemap>{
  const supabase=await createClient();
  const base=SLBI_PUBLIC_ORIGIN;
  const [businessResult,categoryResult]=await Promise.all([
    supabase.from('businesses').select('id,slug,updated_at,city').eq('status','approved'),
    supabase.from('categories').select('name,updated_at').order('name',{ascending:true}),
  ]);

  // Strict public approval filter even when an authenticated owner's cookie
  // would otherwise expose their own private/pending rows.
  const businessEntries:MetadataRoute.Sitemap=businessResult.error?[]:
    (businessResult.data||[]).filter(b=>Boolean(b.id))
    .map(b=>({
      url:getPublicBusinessCanonical({id:b.id,slug:b.slug}),
      ...(b.updated_at?{lastModified:b.updated_at}:{}),
    }));
  const categories:MetadataRoute.Sitemap=categoryResult.error?[]:
    (categoryResult.data||[]).filter(c=>Boolean(c.name))
    .map(c=>({
      url:`${base}/category/${slugify(c.name)}`,
      ...(c.updated_at?{lastModified:c.updated_at}:{}),
    }));
  const cities:MetadataRoute.Sitemap=businessResult.error?[]:
    [...new Set((businessResult.data||[]).map(b=>b.city).filter((city):city is string=>typeof city==='string'&&Boolean(city.trim())))]
    .map(city=>({url:`${base}/city/${slugify(city)}`}));

  const staticPages=[
    '/', '/business-news', '/about', '/register-business',
    '/terms-of-service', '/privacy-policy','/contact','/pricing-plans','/faq',
  ];
  return [
    ...staticPages.map(path=>({url:base+(path==='/'?'':path)})),
    ...categories,
    ...cities,
    ...businessEntries,
  ];
}
