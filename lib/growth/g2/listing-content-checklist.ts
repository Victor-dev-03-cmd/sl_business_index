/**
 * G2-01 first user-facing Growth action: a content checklist, NOT GrowthScore.
 * The only input is the already authenticated, owner-scoped G1 knowledge API.
 * No raw DB reads, no AI, no credits, no provider operations, no persistence.
 */
import type {G1ReadOnlyKnowledge,G1Field} from '../g1/read-only-knowledge';

export const G2_CONTENT_CHECKLIST_VERSION='g2-listing-content-checks-v1' as const;
export type G2CheckState='ready'|'needs_details'|'unavailable';
export type G2ContentCheck=Readonly<{
  key:'name'|'category'|'description'|'services'|'gallery';
  title:string;
  state:G2CheckState;
  actionLabel:string;
  href:string;
}>;
export type G2ContentChecklist=Readonly<{
  version:typeof G2_CONTENT_CHECKLIST_VERSION;
  businessId:string;
  observedCount:number;
  readyCount:number;
  unavailableCount:number;
  totalChecks:5;
  checks:readonly G2ContentCheck[];
  nextActions:readonly G2ContentCheck[];
  description:string;
}>;

const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const textState=(field:G1Field<string>):G2CheckState=>
  field.state==='withheld'?'unavailable':
  field.state==='missing'||field.value===null||!field.value.trim()?'needs_details':'ready';
const listState=(field:G1Field<readonly string[]>):G2CheckState=>
  field.state==='withheld'?'unavailable':
  field.value===null||field.value.length===0?'needs_details':'ready';
const countState=(field:G1Field<number>):G2CheckState=>
  field.state==='withheld'?'unavailable':
  field.value===null?'needs_details':field.value>0?'ready':'needs_details';

/**
 * Five content availability checks only. Missing content creates a task,
 * not an assumed failure in visibility, quality, sales or business health.
 * Verification status/paid plan, views, leads and brand claims are excluded.
 */
export function buildG2ContentChecklist(
  context:G1ReadOnlyKnowledge,
):G2ContentChecklist|null{
  if(context?.schemaVersion!=='g1-knowledge-preview-v0'
     ||context.usage!=='owner_preview_only'
     ||!UUID.test(context.businessId))return null;
  const edit='/vendor/my-businesses/'+encodeURIComponent(context.businessId)+'/edit';
  const gallery='/vendor/gallery-services?business='+encodeURIComponent(context.businessId);
  const checks:G2ContentCheck[]=[
    {key:'name',title:'Business name',state:textState(context.listing.name),actionLabel:'Edit business',href:edit},
    {key:'category',title:'Business category',state:textState(context.listing.category),actionLabel:'Edit category',href:edit},
    {key:'description',title:'Business description',state:textState(context.listing.description),actionLabel:'Add description',href:edit},
    {key:'services',title:'Services',state:listState(context.services),actionLabel:'Add services',href:gallery},
    {key:'gallery',title:'Gallery images',state:countState(context.galleryImageCount),actionLabel:'Add photos',href:gallery},
  ];
  const readyCount=checks.filter(item=>item.state==='ready').length;
  const unavailableCount=checks.filter(item=>item.state==='unavailable').length;
  return {
    version:G2_CONTENT_CHECKLIST_VERSION,
    businessId:context.businessId,
    readyCount,
    unavailableCount,
    observedCount:checks.length-unavailableCount,
    totalChecks:5,
    checks,
    nextActions:checks.filter(item=>item.state==='needs_details'),
    description:'Content availability only; not a GrowthScore, SEO ranking, sales outcome or verified customer satisfaction.',
  };
}
