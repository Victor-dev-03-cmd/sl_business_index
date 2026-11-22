import {removeHashtags,withHashtags,normalizedTag,type AngleSet} from './caption-workspace.ts';
export function preparePlannerCaption(caption:string,tags:readonly string[],includeTags:boolean):{ok:true;text:string}|{ok:false;error:string}{
  const text=includeTags?withHashtags(caption,tags):removeHashtags(caption);
  if(!text.trim())return {ok:false,error:'Write a caption before saving.'};
  if(text.length>3000)return {ok:false,error:'Campaign Planner accepts up to 3,000 characters. Shorten the combined copy or save each language separately. Nothing was removed.'};
  return {ok:true,text};
}
export async function captionRequestIdentity(signature:string,language:string){
  const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(signature+'|'+language));
  return 'slbi-caption-pending:'+Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');
}
export function serializeEditedCaption(angles:AngleSet,tags:readonly string[]):{ok:true;text:string}|{ok:false;error:string}{
  const {hook,story,short}=angles;
  if(!hook.trim()||hook.length>900||story.length>1100||short.length>600||[hook,story,short].some(v=>/\[\[(?:HOOK|STORY|SHORT|HASHTAGS)\]\]/i.test(v)))return {ok:false,error:'Keep Hook, Story and Short within 900, 1,100 and 600 characters. Remove reserved angle markers.'};
  if(!story.trim()||!short.trim())return {ok:false,error:'Complete all three angles before saving the AI draft. You can save a single caption to Planner instead.'};
  const text=['[[HOOK]] '+hook.trim(),'[[STORY]] '+story.trim(),'[[SHORT]] '+short.trim(),'[[HASHTAGS]] '+tags.filter(t=>normalizedTag(t)===t).slice(0,8).join(' ')].join('\n');
  if(text.length>3000)return {ok:false,error:'The saved three-angle draft exceeds 3,000 characters. Shorten your copy; no text was removed.'};
  return {ok:true,text};
}

export function isCurrentPosterOutput(input:{hasBlob:boolean;stage:string;generating:boolean;composing:boolean;artworkKey:string;creativeKey:string;completedRenderKey:string;renderKey:string;copyLanguageConsistent:boolean;serviceFocusApproved:boolean}):boolean{
  return input.hasBlob&&input.stage==='ready'&&!input.generating&&!input.composing&&Boolean(input.artworkKey)&&input.artworkKey===input.creativeKey&&Boolean(input.completedRenderKey)&&input.completedRenderKey===input.renderKey&&input.copyLanguageConsistent&&input.serviceFocusApproved;
}
