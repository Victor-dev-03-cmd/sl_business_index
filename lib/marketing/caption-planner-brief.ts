import type {CaptionLanguage,CaptionObjective} from './caption-contract.ts';

/** Strict schema mirror of marketing_campaign_brief_shape_v2.
 * Extra UI-only keys (captionBundle, posterLocalKey, hashtags etc.) MUST NOT
 * be written into brief. Full chosen copy is stored in banner_text and each
 * generated angle remains in the owner's marketing_ai_drafts records.
 */
export function plannerBriefFromCaption(input:{
  caption:string;cta:string;terms:string;
  language:CaptionLanguage;objective:CaptionObjective;format?:string;palette?:string;
}){
  const language={ta:'தமிழ்',si:'සිංහල',en:'English'}[input.language];
  return {
    offer:input.caption.trim().slice(0,240),
    cta:input.cta.trim().slice(0,130),
    terms:input.terms.trim().slice(0,220),
    language,
    objective:input.objective,
    format:(['square','portrait','story','landscape'].includes(input.format||'')?input.format:'portrait') as 'square'|'portrait'|'story'|'landscape',
    palette:(['forest','navy','cream'].includes(input.palette||'')?input.palette:'navy') as 'forest'|'navy'|'cream',
  };
}
