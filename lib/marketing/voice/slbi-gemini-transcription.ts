import 'server-only';

/**
 * Single backend provider adapter for every SLBI GrowthOS voice consumer.
 * Cost invariant: the API route reserves quota ONCE. Transient upstream retry
 * happens inside that reservation and never calls the quota RPC again.
 */
export const SLBI_GEMINI_VOICE_MODEL='gemini-2.5-flash';
export const SLBI_TRANSCRIPT_MAX_CHARS=12_000;
const TRY_TIMEOUT_MS=14_500;
const RETRY_WAIT_MS=350;
const MAX_RESPONSE_BYTES=55_000;
export type SlbiVoiceLanguage='ta'|'si'|'en'|'auto';
type OwnedBusinessContext={name:string;category?:string|null;city?:string|null};

export class SlbiVoiceProviderError extends Error{
  constructor(readonly code:
    'VOICE_PROVIDER_QUOTA'|'VOICE_AUDIO_REJECTED'|'VOICE_PROVIDER_AUTH'|
    'VOICE_PROVIDER_UNAVAILABLE'|'VOICE_BAD_RESPONSE'|'VOICE_EMPTY_RESULT'|
    'VOICE_TRANSCRIPT_TOO_LONG'|'VOICE_TIMEOUT'|'VOICE_NETWORK',
    readonly status:number,
    message:string){
    super(message);this.name='SlbiVoiceProviderError';
  }
}
const safe=(value:unknown,max:number)=>typeof value==='string'?
  value.replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,max):'';

export function sriLankaGeminiVoicePrompt(business:OwnedBusinessContext,language:SlbiVoiceLanguage){
  const context=[
    safe(business.name,100),
    safe(business.category,80),
    safe(business.city,80),
    'Sri Lanka',
  ].filter(Boolean).join(' · ');
  const system=[
    'You are an expert Sri Lankan multilingual audio transcriber for SL Business Index.',
    'Accurately transcribe the vendor’s spoken brief into readable, editable text.',
    'The speaker may mix Sri Lankan Tamil, Sinhala, English, Tanglish and Singlish.',
    'Use native Tamil script for Tamil and native Sinhala script for Sinhala.',
    'Preserve clearly spoken English business words such as Offer, Discount,',
    'WhatsApp, Delivery, Admissions, Online and brand names in readable English.',
    'Preserve EVERY stated number, discount percentage, price, date, branch,',
    'phone number and scope exactly. Never invent, translate or alter facts.',
    'Remove ONLY unambiguous hesitations or repeated filler sounds;',
    'never discard meaningful words, terms, corrections or clauses.',
    'Use natural punctuation, but do not rewrite the sales message.',
    'Context is a vocabulary hint, NOT permission to fill missing audio.',
    'If recording is silent, unclear or noise-only, return exactly an empty string.',
    'No hallucination. No translations. No commentary or labels.',
    'Output ONLY the transcript text. Do not prefix Transcript: or use markdown.',
  ].join(' ');
  const task='Vocabulary hint (untrusted listing): '+context+
    '. Preferred script/language: '+language+
    '. Transcribe the attached audio faithfully and verbatim where facts matter.';
  return {system,task};
}

type GeminiResult={
  candidates?:Array<{content?:{parts?:Array<{text?:string}>};finishReason?:string}>;
  promptFeedback?:{blockReason?:string};
};
const message=(code:SlbiVoiceProviderError['code'],status:number,text:string)=>
  new SlbiVoiceProviderError(code,status,text);
const endpoint='https://generativelanguage.googleapis.com/v1beta/models/'+
  SLBI_GEMINI_VOICE_MODEL+':generateContent';

export async function transcribeSlbiVendorAudio(input:{
  key:string;bytes:Uint8Array;mime:string;
  business:OwnedBusinessContext;language:SlbiVoiceLanguage;
}):Promise<string>{
  const instructions=sriLankaGeminiVoicePrompt(input.business,input.language);
  const payload=JSON.stringify({
    systemInstruction:{parts:[{text:instructions.system}]},
    contents:[{role:'user',parts:[
      {text:instructions.task},
      {inlineData:{mimeType:input.mime,data:Buffer.from(input.bytes).toString('base64')}},
    ]}],
    generationConfig:{
      temperature:0,maxOutputTokens:4096,
      // Gemini 2.5 Flash supports disabling reasoning for verbatim STT:
      // preserve tokens and latency for the actual transcript.
      thinkingConfig:{thinkingBudget:0},
    },
  });
  for(let attempt=0;attempt<2;attempt++){
    let provider:Response;
    try{
      provider=await fetch(endpoint,{
        method:'POST',cache:'no-store',redirect:'error',
        signal:AbortSignal.timeout(TRY_TIMEOUT_MS),
        headers:{'x-goog-api-key':input.key,'Content-Type':'application/json'},
        body:payload,
      });
    }catch(e){
      const timedOut=e instanceof Error&&
        (e.name==='TimeoutError'||e.name==='AbortError');
      if(attempt===0){await new Promise(resolve=>setTimeout(resolve,RETRY_WAIT_MS));continue;}
      console.warn('SLBI Gemini voice transport',timedOut?'timeout':'network');
      throw message(timedOut?'VOICE_TIMEOUT':'VOICE_NETWORK',timedOut?504:503,
        'The voice connection was interrupted. Retry your saved recording.');
    }
    if(provider.status===429)throw message('VOICE_PROVIDER_QUOTA',429,
      'Gemini voice quota is exhausted. Retain the recording and retry later.');
    if(provider.status===400||provider.status===415)throw message('VOICE_AUDIO_REJECTED',422,
      'Gemini could not read this recording format. Try another browser or a shorter clip.');
    if(provider.status===401||provider.status===403)throw message('VOICE_PROVIDER_AUTH',503,
      'Voice service configuration needs an administrator check.');
    if(!provider.ok){
      console.warn('SLBI Gemini voice upstream HTTP',provider.status);
      if(attempt===0&&[500,502,503,504].includes(provider.status)){
        await new Promise(resolve=>setTimeout(resolve,RETRY_WAIT_MS));continue;
      }
      throw message('VOICE_PROVIDER_UNAVAILABLE',503,
        'Gemini voice service is busy. Retry the retained recording without speaking again.');
    }
    let data:GeminiResult;
    try{
      const raw=await provider.text();
      if(raw.length>MAX_RESPONSE_BYTES)throw Error('Oversized upstream response');
      data=JSON.parse(raw) as GeminiResult;
      if(!data||typeof data!=='object')throw Error('Invalid upstream response');
    }catch{
      if(attempt===0){await new Promise(resolve=>setTimeout(resolve,RETRY_WAIT_MS));continue;}
      throw message('VOICE_BAD_RESPONSE',502,
        'The voice service returned an invalid response. Retry the retained recording.');
    }
    if(data.candidates?.[0]?.finishReason==='MAX_TOKENS')
      throw message('VOICE_TRANSCRIPT_TOO_LONG',422,
        'This recording is too long to transcribe completely. Use two shorter clips; no partial text was inserted.');
    const transcript=(data.candidates?.[0]?.content?.parts||[])
      .map(part=>part.text||'').join(' ').trim()
      .replace(/^Transcript\s*:\s*/i,'').trim();
    // Audio without speech is a valid result: allow the UI to give an
    // actionable prompt rather than hallucinating offer facts.
    if(!transcript||transcript==='""')
      throw message('VOICE_EMPTY_RESULT',422,
        'No clear speech detected. Speak closer to the microphone and try again.');
    if(transcript.length>SLBI_TRANSCRIPT_MAX_CHARS)
      throw message('VOICE_TRANSCRIPT_TOO_LONG',422,
        'The complete transcript exceeds the supported review length. Use shorter recordings.');
    return transcript;
  }
  throw message('VOICE_NETWORK',503,'Voice service unavailable. Retry the retained audio.');
}
