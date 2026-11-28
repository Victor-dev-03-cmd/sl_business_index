import type {EmailCampaignType,EmailLanguage} from './email-studio';
import type {EmailTemplateLayout} from './email-template-contract';

/** No recipients, OAuth tokens, tracking pixels or PII are ever stored by this contract.
 * Persisted browser drafts are convenience previews, NOT server campaigns. */
export type EmailBlockType='headline'|'body'|'poster'|'button'|'offers'|'divider'|'image'|'spacer'|'quote'|'link'|'columns';
export const EMAIL_FONT_FAMILIES={
  arial:'Arial, Helvetica, sans-serif',
  poppins:'Poppins, Arial, Helvetica, sans-serif',
  outfit:'Outfit, Arial, Helvetica, sans-serif',
  inter:'Inter, Arial, Helvetica, sans-serif',
  monospace:'Courier New, Courier, monospace',
  // Legacy drafts remain readable; these older families are not offered in the new editor.
  georgia:'Georgia, Times New Roman, serif',
  verdana:'Verdana, Geneva, sans-serif',
  tahoma:'Tahoma, Arial, sans-serif',
  times:'Times New Roman, Times, serif',
  courier:'Courier New, Courier, monospace',
  unicode:'Arial, Noto Sans Tamil, Noto Sans Sinhala, sans-serif',
} as const;
export type EmailFontFamily=keyof typeof EMAIL_FONT_FAMILIES;
export const EMAIL_EDITOR_FONTS=[{id:'arial',label:'Arial'},{id:'poppins',label:'Poppins'},{id:'outfit',label:'Outfit'},{id:'inter',label:'Inter'},{id:'monospace',label:'Monospace'}] as const;
export type EmailTypography={
  font:EmailFontFamily;fontSize:number;fontWeight:400|700;
  italic:boolean;underline:boolean;color:string;
  align:'left'|'center'|'right'|'justify';lineHeight:number;letterSpacing:number;
};
const fontKeys=Object.keys(EMAIL_FONT_FAMILIES);
export function normalizeEmailTypography(raw:unknown):EmailTypography|null{
  if(!raw||typeof raw!=='object'||Array.isArray(raw))return null;
  const v=raw as Record<string,unknown>;
  if(typeof v.font!=='string'||!fontKeys.includes(v.font)||
    typeof v.fontSize!=='number'||!Number.isInteger(v.fontSize)||v.fontSize<10||v.fontSize>64||
    (v.fontWeight!==400&&v.fontWeight!==700)||typeof v.italic!=='boolean'||typeof v.underline!=='boolean'||
    typeof v.color!=='string'||!/^#[0-9a-f]{6}$/i.test(v.color)||
    typeof v.align!=='string'||!['left','center','right','justify'].includes(v.align)||
    typeof v.lineHeight!=='number'||!Number.isFinite(v.lineHeight)||v.lineHeight<1||v.lineHeight>2.5||
    typeof v.letterSpacing!=='number'||!Number.isFinite(v.letterSpacing)||v.letterSpacing<0||v.letterSpacing>4)return null;
  return {font:v.font as EmailFontFamily,fontSize:v.fontSize,fontWeight:v.fontWeight,italic:v.italic,underline:v.underline,
    color:v.color,align:v.align as EmailTypography['align'],lineHeight:v.lineHeight,letterSpacing:v.letterSpacing};
}
export function defaultEmailTypography(type:EmailBlockType):EmailTypography{
  return {font:'arial',fontSize:type==='headline'?23:type==='body'||type==='quote'||type==='columns'?14:type==='button'?13:12,
    fontWeight:type==='headline'||type==='button'?700:400,italic:false,underline:false,
    color:type==='button'?'#FFFFFF':type==='headline'?'#111827':'#374151',
    align:type==='button'?'center':'left',lineHeight:type==='headline'?1.3:type==='body'?1.8:1.5,letterSpacing:0};
}
export function emailBlockTypography(block:EmailVisualBlock):EmailTypography{
  return normalizeEmailTypography(block.typography)||defaultEmailTypography(block.type);
}
export function emailTypographyStyle(block:EmailVisualBlock){
  const t=emailBlockTypography(block);
  return {fontFamily:EMAIL_FONT_FAMILIES[t.font],fontSize:t.fontSize,fontWeight:t.fontWeight,
    fontStyle:t.italic?'italic' as const:'normal' as const,textDecoration:t.underline?'underline':'none',
    color:t.color,textAlign:t.align,lineHeight:t.lineHeight,letterSpacing:t.letterSpacing};
}
export function emailTypographyCss(block:EmailVisualBlock):string{
  const t=emailTypographyStyle(block);
  return 'font-family:'+t.fontFamily+';font-size:'+t.fontSize+'px;font-weight:'+t.fontWeight+
    ';font-style:'+t.fontStyle+';text-decoration:'+t.textDecoration+';color:'+t.color+
    ';text-align:'+t.textAlign+';line-height:'+t.lineHeight+';letter-spacing:'+t.letterSpacing+'px';
}
export const validEmailCanvasWidth=(value:unknown):value is number=>
  typeof value==='number'&&Number.isInteger(value)&&value>=480&&value<=720;
export type EmailVisualBlock={
  id:string;type:EmailBlockType;text:string;secondText?:string;typography?:EmailTypography;
  imageId?:string;imageWidth?:number;imageAlign?:'left'|'center'|'right';linkUrl?:string;spacing?:number;
};
export type LocalEmailCampaign={
  id:string;ownerScope:string;businessId:string;title:string;
  subject:string;preheader:string;ctaUrl:string;
  language:EmailLanguage;kind:EmailCampaignType;
  layout:EmailTemplateLayout;
  blocks:EmailVisualBlock[];
  posterId:string|null;
  buttonColor?:string;logoSize?:number;canvasWidth?:number;
  createdAt:string;updatedAt:string;
  status:'local_draft';
};
export const LOCAL_EMAIL_CAMPAIGN_LIMIT=30;
export function isSafeEmailCta(text:string):boolean{
  try{
    const url=new URL(text);
    return url.protocol==='https:'&&Boolean(url.hostname)&&!url.username&&!url.password;
  }catch{return false}
}
export const EMAIL_BLOCK_TYPES:readonly {type:EmailBlockType;title:string;description:string}[]=[
  {type:'headline',title:'Heading',description:'Lead with a clear message'},
  {type:'body',title:'Text',description:'Write paragraphs directly on the email'},
  {type:'poster',title:'Poster',description:'Choose an image from Poster Studio'},
  {type:'button',title:'Button',description:'Add a linked call to action'},
  {type:'offers',title:'Two offers',description:'Show two services side by side'},
  {type:'divider',title:'Divider',description:'Separate content sections'},
  {type:'image',title:'Upload image',description:'Choose a local JPG, PNG or WebP'},
  {type:'spacer',title:'Spacer',description:'Adjust whitespace between blocks'},
  {type:'quote',title:'Quote',description:'Highlight a testimonial or message'},
  {type:'link',title:'Text link',description:'Add an independent HTTPS link'},
  {type:'columns',title:'Two columns',description:'Two editable text columns'},
] as const;
const ID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const newEmailBlock=(type:EmailBlockType,body=''):EmailVisualBlock=>({
  id:crypto.randomUUID(),type,
  text:type==='headline'?'A new update':type==='body'?body:
    type==='button'?'View our business':type==='offers'?'Offer or service one':type==='quote'?'Add your quote':type==='link'?'Learn more':type==='columns'?'First column':'',
  ...(type==='offers'?{secondText:'Offer or service two'}:type==='columns'?{secondText:'Second column'}:{}),
  ...(type==='image'?{imageWidth:100,imageAlign:'center' as const}:{}),
  ...(type==='spacer'?{spacing:24}:{}),
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
    typeof v.ctaUrl!=='string'||v.ctaUrl.length>600||!isSafeEmailCta(v.ctaUrl)||
    !['en','ta','si'].includes(String(v.language))||
    !['offer','launch','followup','newsletter'].includes(String(v.kind))||
    !['minimal','hero','offers','custom'].includes(String(v.layout))||
    typeof v.createdAt!=='string'||!Number.isFinite(Date.parse(v.createdAt))||
    typeof v.updatedAt!=='string'||!Number.isFinite(Date.parse(v.updatedAt))||
    !Array.isArray(v.blocks)||v.blocks.length>20||!v.blocks.length)return null;
  if(v.posterId!==null&&(typeof v.posterId!=='string'||!ID.test(v.posterId)))return null;
  if(v.buttonColor!==undefined&&(typeof v.buttonColor!=='string'||!/^#[0-9a-f]{6}$/i.test(v.buttonColor)))return null;
  if(v.logoSize!==undefined&&(typeof v.logoSize!=='number'||!Number.isFinite(v.logoSize)||v.logoSize<40||v.logoSize>100))return null;
  if(v.canvasWidth!==undefined&&!validEmailCanvasWidth(v.canvasWidth))return null;
  const blocks:EmailVisualBlock[]=[];
  const used=new Set<string>();
  for(const block of v.blocks){
    if(!block||typeof block!=='object'||Array.isArray(block))return null;
    const b=block as Record<string,unknown>;
    if(typeof b.id!=='string'||!ID.test(b.id)||used.has(b.id)||
      !EMAIL_BLOCK_TYPES.some(x=>x.type===b.type)||
      typeof b.text!=='string'||b.text.length>3000||
      (b.secondText!==undefined&&(typeof b.secondText!=='string'||b.secondText.length>1000)))return null;
    const typography=b.typography===undefined?undefined:normalizeEmailTypography(b.typography);
    if(b.typography!==undefined&&!typography)return null;
    if(b.imageId!==undefined&&(b.type!=='image'||typeof b.imageId!=='string'||!ID.test(b.imageId)))return null;
    if(b.imageWidth!==undefined&&(b.type!=='image'||typeof b.imageWidth!=='number'||!Number.isInteger(b.imageWidth)||b.imageWidth<25||b.imageWidth>100))return null;
    if(b.imageAlign!==undefined&&(b.type!=='image'||typeof b.imageAlign!=='string'||!['left','center','right'].includes(b.imageAlign)))return null;
    if(b.linkUrl!==undefined&&(!['image','link','button'].includes(String(b.type))||typeof b.linkUrl!=='string'||b.linkUrl.length>600||!isSafeEmailCta(b.linkUrl)))return null;
    if(b.spacing!==undefined&&(b.type!=='spacer'||typeof b.spacing!=='number'||!Number.isInteger(b.spacing)||b.spacing<8||b.spacing>80))return null;
    used.add(b.id);
    blocks.push({id:b.id,type:b.type as EmailBlockType,text:b.text,
      ...(typeof b.secondText==='string'?{secondText:b.secondText}:{}),
      ...(typography?{typography}:{}),
      ...(typeof b.imageId==='string'?{imageId:b.imageId}:{}),
      ...(typeof b.imageWidth==='number'?{imageWidth:b.imageWidth}:{}),
      ...(typeof b.imageAlign==='string'?{imageAlign:b.imageAlign as EmailVisualBlock['imageAlign']}:{}),
      ...(typeof b.linkUrl==='string'?{linkUrl:b.linkUrl}:{}),
      ...(typeof b.spacing==='number'?{spacing:b.spacing}:{})});
  }
  return {id:v.id,ownerScope:owner,businessId:v.businessId,
    title:v.title,subject:v.subject,preheader:v.preheader,ctaUrl:v.ctaUrl,
    language:v.language as EmailLanguage,kind:v.kind as EmailCampaignType,
    layout:v.layout as EmailTemplateLayout,
    blocks,posterId:v.posterId as string|null,
    ...(typeof v.buttonColor==='string'?{buttonColor:v.buttonColor}:{}),
    ...(typeof v.logoSize==='number'?{logoSize:v.logoSize}:{}),
    ...(validEmailCanvasWidth(v.canvasWidth)?{canvasWidth:v.canvasWidth}:{}),
    createdAt:v.createdAt,updatedAt:v.updatedAt,status:'local_draft'};
}
export function briefFromBlocks(blocks:EmailVisualBlock[]):string{
  return blocks.filter(b=>b.type==='headline'||b.type==='body'||b.type==='offers'||b.type==='columns'||b.type==='quote')
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
