/**
 * Vendor-facing SEO preparation checks. This is deterministic, advisory and
 * never an index-status signal, a Google ranking, or an authorization grant.
 */
export interface SeoOwnedListing {
  id: string | number;
  slug?: string | null;
  name?: string | null;
  category?: string | null;
  description?: string | null;
  address?: string | null;
  phone?: string | null;
  logo_url?: string | null;
  image_url?: string | null;
  working_hours?: string | null;
  website_url?: string | null;
  status?: string | null;
  is_verified?: boolean | null;
}

export interface SeoPreparationCheck {
  key: string;
  label: string;
  why: string;
  complete: boolean;
  points: number;
}

const hasText = (value:string | null | undefined, minimum=1) =>
  typeof value==='string' && value.trim().length>=minimum;

export function getSeoPreparation(listing:SeoOwnedListing) {
  const checks:SeoPreparationCheck[]=[
    {key:'name',label:'Business name',why:'Use the name customers actually search for.',complete:hasText(listing.name,3),points:15},
    {key:'category',label:'Business category',why:'Choose the category that matches the services you provide.',complete:hasText(listing.category,3),points:10},
    {key:'description',label:'Business description',why:'Describe your real services and customers in at least 80 characters.',complete:hasText(listing.description,80),points:25},
    {key:'address',label:'Business location',why:'Keep your publicly shared business address accurate.',complete:hasText(listing.address,8),points:15},
    {key:'phone',label:'Contact number',why:'Let customers contact your business.',complete:hasText(listing.phone,7),points:10},
    {key:'photo',label:'Logo or business photo',why:'Show an authentic image of your business.',complete:hasText(listing.logo_url)||hasText(listing.image_url),points:10},
    {key:'hours',label:'Opening hours',why:'Provide your real opening hours if they apply.',complete:hasText(listing.working_hours),points:10},
    {key:'website',label:'Website (optional)',why:'Add a genuine website if you own one; no site is required for an SLBI listing.',complete:hasText(listing.website_url),points:5},
  ];
  const score=checks.reduce((sum,c)=>sum+(c.complete?c.points:0),0);
  const published=listing.status==='approved';
  return {
    checks,
    score,
    missing:checks.filter(c=>!c.complete),
    published,
    // Verified badge is neither an SEO score feature nor a requirement.
    listingVisibility:published?'published':'not_public',
    googleIndexed:'unknown' as const,
    domainConnected:false as const,
  };
}

/** Display-only hostname normalization. NEVER treat this as ownership proof. */
export function getWebsiteGuideHostname(raw:string):string|null {
  const value=raw.trim();
  if(!value || value.length>250 || /[\s@\\]/.test(value))return null;
  try {
    const input=/^https?:\/\//i.test(value)?value:'https://'+value;
    const parsed=new URL(input);
    const name=parsed.hostname.toLowerCase().replace(/\.$/,'');
    if(!['http:','https:'].includes(parsed.protocol)||parsed.username||parsed.password||
      parsed.port || parsed.search || parsed.hash || parsed.pathname!=='/' ||
      name==='localhost'||name.endsWith('.localhost')||name.endsWith('.local')||
      /^(?:\d+\.){3}\d+$/.test(name)||!name.includes('.'))return null;
    const labels=name.split('.');
    if(labels.some(label=>!label||label.length>63||!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label)))return null;
    const tld=labels[labels.length-1];
    if(tld.length<2 || /^\d+$/.test(tld))return null;
    return name;
  }catch {return null}
}
