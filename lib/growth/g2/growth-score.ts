/**
 * G2-02: deterministic owner-only GrowthScore (readiness v1), NOT a ranking,
 * commercial performance, lead conversion, verified status or revenue estimate.
 * All 13 signals are sourced from approved/owned existing business records and
 * the G1 allowlisted read-only knowledge contract; missing != unavailable.
 * Weight normalization is always paired with explicit source coverage.
 */
import type {G1Field,G1ReadOnlyKnowledge} from '../g1/read-only-knowledge';

export const G2_GROWTH_SCORE_VERSION='g2-growth-readiness-v1' as const;
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;

export type G2ContactEvidence=Readonly<{
  businessId:string;
  source:'businesses';
  phone:boolean|null;
  address:boolean|null;
  mapPin:boolean|null;
  hours:boolean|null;
  website:boolean|null;
  logo:boolean|null;
}>;
export type G2ScoreDimension='content'|'findability'|'identity';
export type G2ScoreState='ready'|'missing'|'unavailable';
export type G2ScoreSignal=Readonly<{
  key:string;title:string;dimension:G2ScoreDimension;weight:number;
  state:G2ScoreState;source:'businesses'|'business_profile_content'|'social_brand_profiles'|'none';
  href:string;actionLabel:string;
}>;
export type G2ScoreSummary=Readonly<{
  dimension:G2ScoreDimension;label:string;earnedWeight:number;observedWeight:number;
  totalWeight:number;coveragePercent:number;score:number|null;
}>;
export type G2GrowthScore=Readonly<{
  version:typeof G2_GROWTH_SCORE_VERSION;
  businessId:string;
  score:number|null;
  status:'ready'|'insufficient_data';
  evidenceCoveragePercent:number;
  observedWeight:number;earnedWeight:number;
  totalWeight:100;
  dimensions:readonly G2ScoreSummary[];
  signals:readonly G2ScoreSignal[];
  recommendations:readonly G2ScoreSignal[];
  description:string;
}>;

function stringState(field:G1Field<string>):G2ScoreState{
  if(!field||field.state==='withheld')return 'unavailable';
  return field.value!==null && typeof field.value==='string' && field.value.trim()?'ready':'missing';
}
function serviceState(field:G1Field<readonly string[]>):G2ScoreState{
  if(!field||field.state==='withheld')return 'unavailable';
  if(field.value===null)return 'missing';
  return Array.isArray(field.value) && field.value.length>0?'ready':'missing';
}
function countState(field:G1Field<number>):G2ScoreState{
  if(!field||field.state==='withheld')return 'unavailable';
  if(field.value===null)return 'missing';
  return typeof field.value==='number' && Number.isFinite(field.value) && field.value>0?'ready':'missing';
}
function evidenceState(signal:boolean|null):G2ScoreState{
  return signal===null?'unavailable':signal?'ready':'missing';
}
function sourceOf(field:G1Field<unknown>):G2ScoreSignal['source']{
  return field?.state==='withheld'?'none':field?.source||'none';
}
const display:Record<G2ScoreDimension,string>={
  content:'Listing content', findability:'Contact & discovery', identity:'Business identity',
};

/** A value is shown only with >=75% evidence coverage; no fabricated zeros. */
export function buildG2GrowthScore(
  knowledge:G1ReadOnlyKnowledge,
  contact:G2ContactEvidence,
):G2GrowthScore|null{
  if(!knowledge||knowledge.schemaVersion!=='g1-knowledge-preview-v0'
    ||knowledge.usage!=='owner_preview_only'||!UUID.test(knowledge.businessId)
    ||!contact||contact.source!=='businesses'||contact.businessId!==knowledge.businessId
    ||!(['phone','address','mapPin','hours','website','logo'] as const)
      .every(key=>contact[key]===null||typeof contact[key]==='boolean'))return null;
  const id=encodeURIComponent(knowledge.businessId);
  const edit='/vendor/my-businesses/'+id+'/edit';
  const gallery='/vendor/gallery-services?business='+id;
  const brand='/vendor/marketing/brand?business='+id;

  const field=(key:string,title:string,dimension:G2ScoreDimension,weight:number,
    value:G1Field<string>|G1Field<readonly string[]>|G1Field<number>,
    state:G2ScoreState,href:string,actionLabel:string):G2ScoreSignal=>({
    key,title,dimension,weight,state,source:sourceOf(value),href,actionLabel,
  });
  const contactSignal=(key:keyof Omit<G2ContactEvidence,'businessId'|'source'>,
    title:string,weight:number,actionLabel:string):G2ScoreSignal=>({
    key,title,dimension:'findability',weight,
    state:evidenceState(contact[key]),source:contact[key]===null?'none':'businesses',
    href:edit,actionLabel,
  });
  const ls=knowledge.listing,br=knowledge.brand;
  const signals:G2ScoreSignal[]=[
    field('name','Business name','content',5,ls.name,stringState(ls.name),edit,'Add business name'),
    field('category','Category','content',5,ls.category,stringState(ls.category),edit,'Choose category'),
    field('description','Description','content',12,ls.description,stringState(ls.description),edit,'Write description'),
    field('services','Services','content',10,knowledge.services,serviceState(knowledge.services),gallery,'Add services'),
    field('gallery','Gallery photos','content',8,knowledge.galleryImageCount,countState(knowledge.galleryImageCount),gallery,'Add gallery photos'),
    contactSignal('phone','Phone number',10,'Add phone number'),
    contactSignal('address','Business address',10,'Complete address'),
    contactSignal('mapPin','Map location',10,'Set location pin'),
    contactSignal('hours','Opening hours',5,'Set opening hours'),
    contactSignal('website','Website URL',5,'Add website'),
    contactSignal('logo','Business logo',8,'Upload logo'),
    field('brandName','Brand name','identity',6,br.name,stringState(br.name),brand,'Add brand name'),
    field('languages','Brand languages','identity',6,br.languages,serviceState(br.languages),brand,'Set brand languages'),
  ].map(item=>item.key==='logo'?{...item,dimension:'identity' as const}:item);
  const totalWeight=signals.reduce((sum,item)=>sum+item.weight,0);
  // Content 40, findability 40, identity 20. Reject changed weights instead of
  // silently presenting a score with a non-100 denominator.
  if(totalWeight!==100)return null;
  const observed=signals.filter(item=>item.state!=='unavailable');
  const observedWeight=observed.reduce((sum,item)=>sum+item.weight,0);
  const earnedWeight=observed.filter(item=>item.state==='ready')
    .reduce((sum,item)=>sum+item.weight,0);
  const evidenceCoveragePercent=Math.round(observedWeight);
  const score=observedWeight>=75?Math.round(100*earnedWeight/observedWeight):null;
  const dimensions:G2ScoreSummary[]=(['content','findability','identity'] as const)
    .map(dimension=>{
      const subset=signals.filter(item=>item.dimension===dimension);
      const totalWeight=subset.reduce((sum,item)=>sum+item.weight,0);
      const observed=subset.filter(item=>item.state!=='unavailable');
      const observedWeight=observed.reduce((sum,item)=>sum+item.weight,0);
      const earnedWeight=observed.filter(item=>item.state==='ready')
        .reduce((sum,item)=>sum+item.weight,0);
      return {dimension,label:display[dimension],totalWeight,observedWeight,earnedWeight,
        coveragePercent:Math.round(100*observedWeight/totalWeight),
        score:observedWeight?Math.round(100*earnedWeight/observedWeight):null};
    });
  const recommendations=signals.filter(item=>item.state==='missing')
    .sort((a,b)=>b.weight-a.weight||a.key.localeCompare(b.key));
  return {
    version:G2_GROWTH_SCORE_VERSION,businessId:knowledge.businessId,score,
    status:score===null?'insufficient_data':'ready',
    evidenceCoveragePercent,observedWeight,earnedWeight,totalWeight:100,
    dimensions,signals,recommendations,
    description:'GrowthScore is a listing-readiness estimate from observed owner-approved content, contact/location and brand facts. It is not a measure of views, sales, search ranking, customer satisfaction or future growth.',
  };
}
