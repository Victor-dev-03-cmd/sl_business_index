import {coarseLocation} from '@/lib/live/presence-geo'
export const dynamic='force-dynamic'
export const runtime='nodejs'
export function GET(request:Request){
  // Hosting network estimates: only country and, within Sri Lanka, province.
  // Do not read lat/longitude, street, postal code, IP or city headers.
  const country=request.headers.get('x-vercel-ip-country')
  const region=request.headers.get('x-vercel-ip-country-region')
  return Response.json({location:coarseLocation(country,region)}, {headers:{
    'Cache-Control':'private, no-store, max-age=0', 'Vary':'x-vercel-ip-country, x-vercel-ip-country-region'
  }})
}
