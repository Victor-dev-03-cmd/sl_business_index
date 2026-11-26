/**
 * Public search metadata, never an authorization grant.
 * Published listings only. Model output and owner-supplied URLs are untrusted.
 */
export const SLBI_PUBLIC_ORIGIN = 'https://www.slbusinessindex.com' as const;

export interface PublicBusinessSEO {
  id: string;
  slug?: string | null;
  name?: string | null;
  category?: string | null;
  description?: string | null;
  address?: string | null;
  status?: string | null;
  image_url?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  phone?: string | null;
}

export const isPublicApprovedBusiness = (business: Pick<PublicBusinessSEO,'status'> | null | undefined): boolean =>
  business?.status === 'approved';

export function getPublicBusinessCanonical(business: Pick<PublicBusinessSEO,'id'|'slug'>): string {
  const identifier = business.slug?.trim() || business.id;
  return SLBI_PUBLIC_ORIGIN + '/business/' + encodeURIComponent(identifier);
}

function normalize(value: string | null | undefined, max: number): string {
  return (value || '').replace(/\s+/g,' ').trim().slice(0,max);
}

export function getPublicBusinessSEO(business: PublicBusinessSEO): {
  title:string; description:string;canonical:string;
} {
  const name = normalize(business.name,95) || 'Business';
  const category = normalize(business.category,65);
  const address = normalize(business.address,120);
  const snippet = normalize(business.description,115);
  const location = address ? ' in '+address : ' in Sri Lanka';
  const title = [name,category,'SL Business Index'].filter(Boolean).join(' | ');
  const description = normalize(
    'Discover '+name+(category?' ('+category+')':'')+location+'. '+
    (snippet || 'View its verified public listing, services and contact details on SL Business Index.'),
    160,
  );
  return {title,description,canonical:getPublicBusinessCanonical(business)};
}

export function getSafeBusinessGeo(business: PublicBusinessSEO): { '@type':'GeoCoordinates';latitude:number;longitude:number } | undefined {
  const latitude=business.latitude,longitude=business.longitude;
  if(typeof latitude!=='number'||typeof longitude!=='number'||!Number.isFinite(latitude)||!Number.isFinite(longitude)||
    latitude < -90||latitude > 90||longitude < -180||longitude > 180)return undefined;
  return {'@type':'GeoCoordinates',latitude,longitude};
}

export function getPublicBusinessJsonLd(business: PublicBusinessSEO): Record<string,unknown> | null {
  if(!isPublicApprovedBusiness(business))return null;
  const {canonical}=getPublicBusinessSEO(business);
  const geo=getSafeBusinessGeo(business);
  const address=normalize(business.address,250);
  const result:Record<string,unknown>={
    '@context':'https://schema.org',
    '@type':'LocalBusiness',
    '@id':canonical+'#business',
    url:canonical,
    name:normalize(business.name,160)||'Business',
    ...(normalize(business.description,1000)?{description:normalize(business.description,1000)}:{}),
    ...(business.image_url&&/^https:\/\//i.test(business.image_url)?{image:business.image_url}:{}),
    ...(business.phone&&/^\+?[0-9 ()-]{7,25}$/.test(business.phone)?{telephone:business.phone}:{}),
    ...(address?{address:{'@type':'PostalAddress',streetAddress:address,addressCountry:'LK'}}:{}),
    ...(geo?{geo}:{}),
  };
  // Intentionally omit aggregateRating until published-review moderation,
  // summary cache parity and Google schema policy can be verified.
  // Never fabricate reviews, coordinates, opening hours or site ownership.
  return result;
}
