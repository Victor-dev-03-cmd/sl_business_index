/**
 * Content-first layout geometry for a premium poster glass card.
 *
 * The former renderer used a fixed-height bottom card and pinned the CTA
 * near the contact footer, leaving hundreds of empty pixels after a short
 * offer. This planner anchors a compact card to the bottom safe area and
 * positions its CTA immediately after the service line.
 *
 * No model inference, browser Canvas, or verified business content needed.
 */
export type StackedCardFormat='square'|'portrait'|'story';
export type StackedCardInput={
  format:StackedCardFormat;
  canvasHeight:number;
  scale:number;
  brandHeight:number;
  offerHeight:number;
  serviceHeight:number;
  hasCta:boolean;
  contactRows:number;
  /** Default preserves historical layout; Studio opts into content-led sizing. */
  contentFocus?:boolean;
};
export type StackedCardPlan={
  top:number;
  bottom:number;
  height:number;
  brandY:number;
  offerY:number|null;
  serviceY:number|null;
  ctaY:number|null;
  ctaHeight:number;
  dividerY:number|null;
  contactsY:number|null;
  contactsHeight:number;
  maxContentGap:number;
};
export function planStackedCard(input:StackedCardInput):StackedCardPlan{
  const {canvasHeight:h,format,scale:s}=input;
  if(!(h>0&&s>0)||input.contactRows<0||input.contactRows>3||
     [input.brandHeight,input.offerHeight,input.serviceHeight].some(v=>!Number.isFinite(v)||v<0))
    throw Error('Invalid premium poster layout dimensions.');
  const topPad=(input.contentFocus?32:36)*s,bottomPad=(input.contentFocus?31:27)*s;
  const ctaHeight=input.hasCta?(input.contentFocus?94:74)*s:0;
  const footerSize=Math.max(13,Math.round((input.contentFocus?34:24)*s));
  const contactsHeight=input.contactRows*footerSize*(input.contentFocus?1.80:1.65);
  const brandGap=(input.contentFocus?13:14)*s;
  const offerGap=(input.contentFocus?12:14)*s;
  const buttonGap=(input.contentFocus?17:22)*s;
  const contactsGap=(input.contentFocus?23:24)*s;
  let cursor=topPad;
  const brandOffset=cursor;
  cursor+=input.brandHeight;
  let offerOffset:number|null=null;
  let serviceOffset:number|null=null;
  let ctaOffset:number|null=null;
  let dividerOffset:number|null=null;
  let contactsOffset:number|null=null;
  let maxContentGap=0;
  if(input.offerHeight>0){
    cursor+=brandGap;maxContentGap=Math.max(maxContentGap,brandGap);
    offerOffset=cursor;cursor+=input.offerHeight;
  }
  if(input.serviceHeight>0){
    const gap=(input.offerHeight>0?offerGap:brandGap);
    cursor+=gap;maxContentGap=Math.max(maxContentGap,gap);
    serviceOffset=cursor;cursor+=input.serviceHeight;
  }
  if(input.hasCta){
    cursor+=buttonGap;maxContentGap=Math.max(maxContentGap,buttonGap);
    ctaOffset=cursor;cursor+=ctaHeight;
  }
  if(input.contactRows){
    cursor+=contactsGap;maxContentGap=Math.max(maxContentGap,contactsGap);
    dividerOffset=cursor-contactsGap*.5;
    contactsOffset=cursor;cursor+=contactsHeight;
  }
  const cardHeight=cursor+bottomPad;
  // Higher footer and a taller content card shift visual priority from the
  // greeting to the actual business offer (without covering the hero).
  const bottom=h*(input.contentFocus?.922:.948);
  const top=bottom-cardHeight;
  const minTop=h*(input.contentFocus?
    (format==='story'?.43:format==='portrait'?.37:.32):
    (format==='story'?.47:format==='portrait'?.44:.42));
  if(top<minTop)
    throw Error('Approved copy needs a taller glass card than this format allows. Shorten the offer or CTA, hide an optional contact, or choose a taller poster size.');
  const absolute=(offset:number|null)=>offset===null?null:top+offset;
  return {
    top,bottom,height:cardHeight,
    brandY:top+brandOffset,
    offerY:absolute(offerOffset),
    serviceY:absolute(serviceOffset),
    ctaY:absolute(ctaOffset),
    ctaHeight,dividerY:absolute(dividerOffset),
    contactsY:absolute(contactsOffset),contactsHeight,maxContentGap,
  };
}

/** Responsive, facts-only contact cells; no invented placeholders or truncation.
 * Same order for Tamil, Sinhala and English. The full-width second-row email
 * visually matches the owner's 9:16 festival poster reference.
 */
export type PosterContactKind='globe'|'phone'|'mail';
export type PosterContactCell={kind:PosterContactKind;text:string;share:number};
export type PosterContactRow=PosterContactCell[];
export function planPosterContactRows(copy:{website?:string;phone?:string;email?:string}):PosterContactRow[]{
  const website=copy.website?.trim()||'';
  const phone=copy.phone?.trim()||'';
  const email=copy.email?.trim()||'';
  const web=website?{kind:'globe' as const,text:website,share:.63}:null;
  const tel=phone?{kind:'phone' as const,text:phone,share:.37}:null;
  const mail=email?{kind:'mail' as const,text:email,share:1}:null;
  if(web&&tel&&mail)return [[web,tel],[mail]];
  if(web&&tel)return [[web,tel]];
  if(tel&&mail)return [[{...tel,share:.41},{...mail,share:.59}]];
  if(web&&mail)return [[{...web,share:.61},{...mail,share:.39}]];
  if(web)return [[{...web,share:1}]];
  if(tel)return [[{...tel,share:1}]];
  if(mail)return [[mail]];
  return [];
}
