import type {CampaignLanguage} from './campaign-language';
export type G1PlannerFacts=Readonly<{businessId:string;brandName:string|null;services:readonly string[];galleryCount:number|null;verified:boolean}>;
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const obj=(v:unknown):Record<string,unknown>|null=>v!==null&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:null;
const v=(p:Record<string,unknown>,k:string):unknown=>obj(p[k])?.value;
const safe=(s:unknown):s is string=>typeof s==='string'&&s.trim().length>0&&s.length<=100&&!/[<>\r\n\u0000-\u001f]/.test(s);

/** G1 preview's strict, owner/business-bound display allowlist. Never return offers, guidelines, PII or image paths. */
export function readG1PlannerFacts(response:unknown,businessId:string):G1PlannerFacts|null{
 const ctx=obj(obj(response)?.context);
 if(!ctx||!uuid.test(businessId)||ctx.businessId!==businessId||
    ctx.schemaVersion!=='g1-knowledge-preview-v0'||ctx.usage!=='owner_preview_only')return null;
 const brand=obj(ctx.brand),listing=obj(ctx.listing),services=obj(ctx.services),gallery=obj(ctx.galleryImageCount);
 if(!brand||!listing||!services||!gallery)return null;
 const name=v(brand,'name'),items=services.value,count=gallery.value,verified=v(listing,'verification');
 if(name!==null&&!safe(name))return null;
 if(items!==null&&(!Array.isArray(items)||items.length>10||!items.every(safe)))return null;
 if(count!==null&&(!Number.isInteger(count)||(count as number)<0||(count as number)>12))return null;
 if(typeof verified!=='boolean')return null;
 return {businessId,brandName:name as string|null,
   services:items===null?[]:Array.from(new Set(items as string[])),
   galleryCount:count as number|null,verified};
}
/** User-clicked editable neutral starter; deliberately not a marketing claim or AI prompt. */
export function servicePlannerMessage(service:string,lang:CampaignLanguage):string|null{
 if(!safe(service))return null;
 const out:Record<CampaignLanguage,string>={
  English:'We provide '+service+'. Contact us for details.',
  'தமிழ்':'எங்களின் '+service+' சேவை பற்றிய விவரங்களுக்கு எங்களைத் தொடர்புகொள்ளுங்கள்.',
  'සිංහල':'අපගේ '+service+' සේවාව පිළිබඳ විස්තර සඳහා අප අමතන්න.',
 };
 return out[lang].length<=240?out[lang]:null;
}
