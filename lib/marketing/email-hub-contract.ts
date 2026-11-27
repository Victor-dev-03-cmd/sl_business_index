import type {EmailCampaignType,EmailLanguage} from './email-studio';
import type {EmailTemplateLayout} from './email-template-contract';

/** No recipients, OAuth tokens, tracking pixels or PII are ever stored by this contract.
 * Persisted browser drafts are convenience previews, NOT server campaigns. */
export type EmailBlockType='headline'|'body'|'poster'|'button'|'offers'|'divider';
export type EmailVisualBlock={
  id:string;type:EmailBlockType;text:string;secondText?:string;
};
export type LocalEmailCampaign={
  id:string;ownerScope:string;businessId:string;title:string;
  subject:string;preheader:string;ctaUrl:string;
  language:EmailLanguage;kind:EmailCampaignType;
  layout:EmailTemplateLayout;
  blocks:EmailVisualBlock[];
  posterId:string|null;
  createdAt:string;updatedAt:string;
  status:'local_draft';
};
export const LOCAL_EMAIL_CAMPAIGN_LIMIT=30;
export const EMAIL_BLOCK_TYPES:readonly {type:EmailBlockType;title:string;description:string}[]=[
  {type:'headline',title:'Heading',description:'Lead with a clear message'},
  {type:'body',title:'Text',description:'Write paragraphs directly on the email'},
  {type:'poster',title:'Poster',description:'Choose an image from Poster Studio'},
  {type:'button',title:'Button',description:'Add a linked call to action'},
  {type:'offers',title:'Two offers',description:'Show two services side by side'},
  {type:'divider',title:'Divider',description:'Separate content sections'},
] as const;
const ID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;
export const newEmailBlock=(type:EmailBlockType,body=''):EmailVisualBlock=>({
  id:crypto.randomUUID(),type,
  text:type==='headline'?'A new update':type==='body'?body:
    type==='button'?'View our business':type==='offers'?'Offer or service one':'',
  ...(type==='offers'?{secondText:'Offer or service two'}:{}),
});
export function initialEmailBlocks(layout:EmailTemplateLayout,body:string):EmailVisualBlock[]{
  const blocks:EmailVisualBlock[]=[
    newEmailBlock('headline'),newEmailBlock('body',body),newEmailBlock('button'),
  ];
  if(layout==='hero')blocks.splice(1,0,newEmailBlock('poster'));
  if(layout==='offers')blocks.splice(1,0,newEmailBlock('offers'));
  return blocks;
}
export function moveEmailBlock(blocks:EmailVisualBlock[],id:string,delta:number):EmailVisualBlock[]{
  const from=blocks.findIndex(x=>x.id===id);
  const to=from+delta;
  if(from<0||to<0||to>=blocks.length||!Number.isInteger(delta))return blocks;
  const copy=blocks.slice();const [block]=copy.splice(from,1);copy.splice(to,0,block);return copy;
}
export const emailLocalStorageKey=(ownerScope:string):string=>
  'slbi.email-v4.local-drafts.'+ownerScope;
export function normalizeLocalCampaign(raw:unknown,owner:string,approvedBusinessIds:readonly string[]):LocalEmailCampaign|null{
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||!ID.test(owner))return null;
  const v=raw as Record<string,unknown>;
  if(v.ownerScope!==owner||typeof v.businessId!=='string'||!approvedBusinessIds.includes(v.businessId)||
    typeof v.id!=='string'||!ID.test(v.id)||v.status!=='local_draft'||
    typeof v.title!=='string'||v.title.length>100||
    typeof v.subject!=='string'||v.subject.length>140||
    typeof v.preheader!=='string'||v.preheader.length>180||
    typeof v.ctaUrl!=='string'||v.ctaUrl.length>600||
    !['en','ta','si'].includes(String(v.language))||
    !['offer','launch','followup','newsletter'].includes(String(v.kind))||
    !['minimal','hero','offers','custom'].includes(String(v.layout))||
    typeof v.createdAt!=='string'||!Number.isFinite(Date.parse(v.createdAt))||
    typeof v.updatedAt!=='string'||!Number.isFinite(Date.parse(v.updatedAt))||
    !Array.isArray(v.blocks)||v.blocks.length>20||!v.blocks.length)return null;
  if(v.posterId!==null&&(typeof v.posterId!=='string'||!ID.test(v.posterId)))return null;
  const blocks:EmailVisualBlock[]=[];
  const used=new Set<string>();
  for(const block of v.blocks){
    if(!block||typeof block!=='object'||Array.isArray(block))return null;
    const b=block as Record<string,unknown>;
    if(typeof b.id!=='string'||!ID.test(b.id)||used.has(b.id)||
      !EMAIL_BLOCK_TYPES.some(x=>x.type===b.type)||
      typeof b.text!=='string'||b.text.length>3000||
      (b.secondText!==undefined&&(typeof b.secondText!=='string'||b.secondText.length>1000)))return null;
    used.add(b.id);
    blocks.push({id:b.id,type:b.type as EmailBlockType,text:b.text,
      ...(typeof b.secondText==='string'?{secondText:b.secondText}:{})});
  }
  return {id:v.id,ownerScope:owner,businessId:v.businessId,
    title:v.title,subject:v.subject,preheader:v.preheader,ctaUrl:v.ctaUrl,
    language:v.language as EmailLanguage,kind:v.kind as EmailCampaignType,
    layout:v.layout as EmailTemplateLayout,
    blocks,posterId:v.posterId as string|null,
    createdAt:v.createdAt,updatedAt:v.updatedAt,status:'local_draft'};
}
export function briefFromBlocks(blocks:EmailVisualBlock[]):string{
  return blocks.filter(b=>b.type==='headline'||b.type==='body'||b.type==='offers')
    .flatMap(b=>[b.text,...(b.secondText?[b.secondText]:[])])
    .map(x=>x.trim()).filter(Boolean).join('\n').slice(0,1600);
}
export function readLocalEmailDrafts(
  raw:string|null,owner:string,approvedBusinessIds:readonly string[],
):LocalEmailCampaign[]{
  if(!raw||raw.length>400000)return [];
  try{
    const items:unknown=JSON.parse(raw);
    if(!Array.isArray(items))return [];
    const unique=new Set<string>();
    return items.slice(0,LOCAL_EMAIL_CAMPAIGN_LIMIT*2)
      .map(v=>normalizeLocalCampaign(v,owner,approvedBusinessIds))
      .filter((v):v is LocalEmailCampaign=>Boolean(v))
      .filter(v=>{if(unique.has(v.id))return false;unique.add(v.id);return true})
      .slice(0,LOCAL_EMAIL_CAMPAIGN_LIMIT);
  }catch{return []}
}
