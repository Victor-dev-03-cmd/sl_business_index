/**
 * G2 owner-contact evidence adapter. Run only AFTER SSR auth.getUser and
 * approved owner_id filter; exposes presence flags, never raw contact values.
 */
import type {G2ContactEvidence} from './growth-score';

export type G2OwnerContactRow=Readonly<{
  id:string;owner_id:string;status:string;
  phone:unknown;address:unknown;latitude:unknown;longitude:unknown;
  working_hours:unknown;website_url:unknown;logo_url:unknown;
}>;
const nonEmpty=(value:unknown):boolean=>
  typeof value==='string' && value.trim().length>0;
const hasHours=(value:unknown):boolean=>
  nonEmpty(value)||
  (Array.isArray(value) && value.some(item=>item!==null&&item!==''))||
  (value!==null && typeof value==='object' && !Array.isArray(value)&&
    Object.values(value as Record<string,unknown>).some(item=>item!==null && item!==''));
const validUrl=(value:unknown):boolean=>{
  if(!nonEmpty(value))return false;
  try{
    const url=new URL(value as string);
    return (url.protocol==='https:'||url.protocol==='http:') && Boolean(url.hostname.includes('.'));
  }catch{return false;}
};
const num=(value:unknown):number|null=>{
  if(typeof value==='number')return Number.isFinite(value)?value:null;
  if(typeof value==='string'&&value.trim()) {
    const parsed=Number(value);
    return Number.isFinite(parsed)?parsed:null;
  }
  return null;
};
/** Approximate Sri Lankan bounding box; never score a 0,0 default pin. */
const mapAvailable=(lat:unknown,lng:unknown):boolean=>{
  const a=num(lat),b=num(lng);
  return a!==null&&b!==null&&a>=5.6&&a<=10.2&&b>=79.2&&b<=82.2;
};

export function ownerContactEvidence(
  row:G2OwnerContactRow|null,
  requesterUserId:string,
  requestedBusinessId:string,
):G2ContactEvidence|null{
  if(!row||row.owner_id!==requesterUserId||
    row.id!==requestedBusinessId||row.status!=='approved')return null;
  return {
    businessId:row.id,source:'businesses',
    phone:nonEmpty(row.phone),
    address:nonEmpty(row.address),
    mapPin:mapAvailable(row.latitude,row.longitude),
    hours:hasHours(row.working_hours),
    website:validUrl(row.website_url),
    logo:nonEmpty(row.logo_url),
  };
}
