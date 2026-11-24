/** Client-only, non-blocking factual review of the Free Campaign Planner draft.
 * No network calls, data persistence, AI, posting or platform approval claims.
 */
import {SHARE_CAPTION_MAX_LENGTH,SHARE_CAPTION_MAX_TITLE} from './campaign-manual-share.ts';

export type CampaignCaptionReviewInput={
  businessName:string;
  message:string;
  cta:string;
  terms:string;
  objective:'awareness'|'promotion'|'enquiries'|'announcement';
  preview:string;
};
export type CampaignCaptionReview={
  characters:number;
  hasBusiness:boolean;
  hasMessage:boolean;
  hasCta:boolean;
  hasTerms:boolean;
  needsTermsReview:boolean;
  titleTooLong:boolean;
  exceedsShareLimit:boolean;
  canShare:boolean;
};
const filled=(value:string)=>typeof value==='string'&&value.trim().length>0;
export function reviewCampaignCaption(input:CampaignCaptionReviewInput):CampaignCaptionReview{
  const name=typeof input.businessName==='string'?input.businessName.trim():'';
  const caption=typeof input.preview==='string'?input.preview.trim():'';
  const hasBusiness=Boolean(name);
  const hasMessage=filled(input.message);
  const hasCta=filled(input.cta);
  const hasTerms=filled(input.terms);
  const titleTooLong=name.length>SHARE_CAPTION_MAX_TITLE;
  // Match Web Share's UTF-16 string-length limit; count visible Unicode code points separately.
  const exceedsShareLimit=caption.length>SHARE_CAPTION_MAX_LENGTH;
  return {
    characters:Array.from(caption).length,
    hasBusiness,hasMessage,hasCta,hasTerms,
    needsTermsReview:input.objective==='promotion'&&!hasTerms,
    titleTooLong,exceedsShareLimit,
    canShare:hasBusiness&&!titleTooLong&&(hasMessage||hasCta)&&Boolean(caption)&&!exceedsShareLimit,
  };
}
