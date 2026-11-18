import type {CaptionLanguage} from './caption-contract.ts';
import {labels} from './caption-workspace.ts';

export type CaptionIssue={language:CaptionLanguage;status:number;code:string;detail:string};
export function captionIssueMessage(issue:CaptionIssue):string{
  const name=labels[issue.language];
  const detail=issue.detail.toLowerCase();
  if(issue.code==='CTA_PHONE_NOT_VERIFIED')
    return name+' caption: use your saved business phone in the CTA and retry.';
  if(detail.includes('brand profile')&&detail.includes('language'))
    return name+' caption: enable this language in your Brand Profile and retry.';
  if(detail.includes('brand profile'))
    return name+' caption: complete your Brand Profile before retrying.';
  if(issue.status===401||issue.status===403)
    return name+' caption: sign in and check your Caption Lab access.';
  if(issue.status===429)
    return name+' caption: AI credits or quota are currently unavailable. Try later.';
  if(issue.status===400||issue.status===413)
    return name+' caption: review the brief, terms and CTA, then retry.';
  return name+' caption is temporarily unavailable. Please try again.';
}

/** Keep all successful language results even if a different one fails. */
export function failedCaptionLanguages(issues:readonly CaptionIssue[]):CaptionLanguage[]{
  return Array.from(new Set(issues.map(item=>item.language)));
}
