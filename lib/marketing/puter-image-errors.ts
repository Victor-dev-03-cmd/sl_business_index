/**
 * Puter.js may reject with {message,code,errorCode}, {msg,error}, an Error,
 * or a nested failure object. Never rely on instanceof Error alone.
 *
 * All displayed messages are stage-specific, terse and free of raw provider
 * payloads. Do not log prompts, account data or auth tokens.
 */
export type PuterImageErrorStage='sign_in'|'image_request'|'sample_preview';
export type PuterImageFailure={message:string;code:string;retryable:boolean};

function record(value:unknown):Record<string,unknown>|null{
  if(value===null||typeof value!=='object'||Array.isArray(value))return null;
  return value as Record<string,unknown>;
}
function safeToken(value:unknown):string{
  if(typeof value!=='string')return '';
  return /^[a-z][a-z0-9_-]{1,65}$/i.test(value)?value.toLowerCase():'';
}
function text(value:unknown):string{
  return typeof value==='string'?value.trim().slice(0,300):'';
}
function extract(value:unknown):{code:string;message:string}{
  const root=record(value);
  if(!root)return {code:'',message:text(value)};
  const nested=record(root.error);
  const code=safeToken(root.errorCode)||safeToken(root.code)||
    safeToken(root.error)||safeToken(nested?.errorCode)||safeToken(nested?.code)||'';
  const message=text(root.message)||text(root.msg)||text(root.error_description)||
    text(nested?.message)||text(nested?.msg)||'';
  return {code,message};
}

/** A few predictable codes are safe to surface in "details"; never print
 * arbitrary provider objects, full URLs, headers or credential-like strings. */
export function describePuterImageError(value:unknown,stage:PuterImageErrorStage):PuterImageFailure{
  const extracted=extract(value);
  const code=extracted.code;
  const m=extracted.message.toLowerCase();
  const is=(...values:string[])=>values.includes(code);
  const contains=(...values:string[])=>values.some(part=>m.includes(part));

  if(is('popup_blocked')||contains('popup blocked'))
    return {code:code||'popup_blocked',retryable:true,
      message:'Puter sign-in popup was blocked. Allow pop-ups for this website, then tap Generate again.'};
  if(is('auth_window_closed','auth_canceled','access_denied')||
     contains('sign-in cancelled','sign in cancelled','login cancelled','authorization cancelled'))
    return {code:code||'auth_canceled',retryable:true,
      message:'Puter sign-in was cancelled or permission was denied. Reopen Generate and complete the Puter sign-in window.'};
  if(is('unauthorized','authentication_required','not_authenticated','invalid_token')||
     contains('unauthorized','not signed in','session expired'))
    return {code:code||'authentication_required',retryable:true,
      message:'Your Puter session needs to be connected again. Complete Puter sign-in and retry.'};
  if(is('insufficient_funds','payment_required')||contains('insufficient funds','insufficient balance'))
    return {code:code||'insufficient_funds',retryable:false,
      message:'Your connected Puter account does not have enough AI balance for this image model. Check its balance or choose another model; no automatic retry was made.'};
  if(is('moderation_flagged','content_policy_violation')||
     contains('moderation_flagged','safety policy','content policy'))
    return {code:code||'moderation_flagged',retryable:false,
      message:'The selected image model did not allow this prompt. Revise the campaign description before generating again.'};
  if(is('bad_request','invalid_model','model_not_found','unsupported_model','invalid_parameters')||
      contains('model not found','model not supported','unsupported model','invalid model','invalid ratio'))
    return {code:code||'bad_request',retryable:false,
      message:'The image model rejected the generation settings. Change Artwork Model or remove the optional reference image and retry.'};
  if(is('too_many_requests','rate_limited','quota_exceeded')||
     contains('rate limit','too many requests','quota exceeded'))
    return {code:code||'rate_limited',retryable:true,
      message:'Puter image generation is rate-limited right now. Retry later; no automatic paid retry was started.'};
  if(is('upstream_failed','upstream_unavailable','service_unavailable','timeout','network_error')||
     contains('upstream','timed out','network error','network request failed','fetch failed'))
    return {code:code||'upstream_failed',retryable:true,
      message:'The image provider or network could not complete this request. Your brief is unchanged; retry the same model later or manually select another one.'};
  if(is('unsupported_origin')||contains('unsupported origin'))
    return {code:code||'unsupported_origin',retryable:false,
      message:'Puter cannot authorize this website origin. Open the production Studio directly in a normal HTTPS browser tab.'};

  return {code:code||'unknown_provider_error',retryable:true,
    message:stage==='sign_in'?
      'Puter sign-in could not complete. Check popup permissions and your Puter session, then retry.':
      stage==='sample_preview'?
      'Puter sample generation did not complete. A local SLBI reference preview can be used without AI credits.':
      'The image provider could not complete generation. Check your Puter account and selected model, then retry. No automatic paid retry was made.'};
}
